using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Models;
using Backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DeliveriesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly RouteOptimizerService _optimizer;
    private readonly IHubContext<LogisticsHub> _hub;

    public DeliveriesController(
        AppDbContext db,
        RouteOptimizerService optimizer,
        IHubContext<LogisticsHub> hub)
    {
        _db = db;
        _optimizer = optimizer;
        _hub = hub;
    }

    private bool IsAdminOrDispatcher =>
        User.IsInRole("Admin") || User.IsInRole("Dispatcher");

    [HttpGet]
    public async Task<ActionResult<List<DeliveryAssignmentDto>>> GetByDate([FromQuery] string? date)
    {
        var targetDate = ParseDateOrToday(date);
        await EnsureDailyAssignmentsExistAsync(targetDate);

        var items = await LoadAssignmentsForDateAsync(targetDate);
        return Ok(items);
    }

    /// <summary>
    /// Driver self-claims an unassigned stop for their route.
    /// Automatically sorts the driver's route by Time priority + Haversine distance.
    /// </summary>
    [HttpPost("{id:int}/claim")]
    public async Task<ActionResult<DeliveryAssignmentDto>> ClaimStop(
        int id,
        [FromQuery] double? lat,
        [FromQuery] double? lng)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var assignment = await _db.DeliveryAssignments
            .Include(d => d.Kindergarten)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (assignment == null)
            return NotFound();

        if (!string.IsNullOrEmpty(assignment.DriverId) && assignment.DriverId != userId && !IsAdminOrDispatcher)
        {
            return BadRequest(new { message = "This kindergarten is already claimed by another driver." });
        }

        assignment.DriverId = userId;
        await _db.SaveChangesAsync();

        await OptimizeDriverRouteInternalAsync(userId, assignment.DeliveryDate, lat, lng);

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "StopClaimed",
            assignmentId = id,
            driverId = userId
        });

        var updated = await GetSingleDtoAsync(id);
        return Ok(updated);
    }

    /// <summary>
    /// Driver releases a stop back into the unassigned general pool.
    /// </summary>
    [HttpPost("{id:int}/unclaim")]
    public async Task<ActionResult<DeliveryAssignmentDto>> UnclaimStop(int id)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var assignment = await _db.DeliveryAssignments.FirstOrDefaultAsync(d => d.Id == id);
        if (assignment == null)
            return NotFound();

        if (assignment.DriverId != userId && !IsAdminOrDispatcher)
        {
            return Forbid();
        }

        var previousDriverId = assignment.DriverId;
        var deliveryDate = assignment.DeliveryDate;

        assignment.DriverId = null;
        assignment.SequenceOrder = 0;
        assignment.IsDelivered = false;
        assignment.DeliveredAt = null;
        await _db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(previousDriverId))
        {
            await ResequenceDriverStopsAsync(previousDriverId, deliveryDate);
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "StopUnclaimed",
            assignmentId = id,
            driverId = previousDriverId
        });

        var updated = await GetSingleDtoAsync(id);
        return Ok(updated);
    }

    /// <summary>
    /// Admin or Dispatcher manually assigns or unassigns a kindergarten to any driver.
    /// </summary>
    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPost("{id:int}/assign")]
    public async Task<ActionResult<DeliveryAssignmentDto>> AssignStop(int id, [FromBody] AssignDriverRequest request)
    {
        var assignment = await _db.DeliveryAssignments
            .Include(d => d.Kindergarten)
            .FirstOrDefaultAsync(d => d.Id == id);

        if (assignment == null)
            return NotFound();

        var previousDriverId = assignment.DriverId;
        var newDriverId = string.IsNullOrWhiteSpace(request.DriverId) ? null : request.DriverId;

        assignment.DriverId = newDriverId;
        if (newDriverId == null)
        {
            assignment.SequenceOrder = 0;
            assignment.IsDelivered = false;
            assignment.DeliveredAt = null;
        }

        await _db.SaveChangesAsync();

        if (!string.IsNullOrEmpty(previousDriverId) && previousDriverId != newDriverId)
        {
            await ResequenceDriverStopsAsync(previousDriverId, assignment.DeliveryDate);
        }

        if (!string.IsNullOrEmpty(newDriverId))
        {
            await OptimizeDriverRouteInternalAsync(newDriverId, assignment.DeliveryDate, null, null);
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "StopAssigned",
            assignmentId = id,
            driverId = newDriverId
        });

        var updated = await GetSingleDtoAsync(id);
        return Ok(updated);
    }

    /// <summary>
    /// Hybrid Priority (Time Deadline) + Haversine Distance optimization from live GPS or Oslo kitchen fallback.
    /// </summary>
    [HttpPost("optimize")]
    public async Task<ActionResult<List<DeliveryAssignmentDto>>> OptimizeRoute([FromBody] OptimizeRouteRequest request)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var targetDriverId = IsAdminOrDispatcher && !string.IsNullOrWhiteSpace(request.DriverId)
            ? request.DriverId
            : currentUserId;

        if (string.IsNullOrEmpty(targetDriverId))
            return BadRequest(new { message = "Driver ID is required." });

        var targetDate = ParseDateOrToday(request.Date);

        await OptimizeDriverRouteInternalAsync(
            targetDriverId,
            targetDate,
            request.StartLatitude,
            request.StartLongitude);

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "RouteOptimized",
            driverId = targetDriverId
        });

        var items = await LoadAssignmentsForDateAsync(targetDate);
        return Ok(items);
    }

    /// <summary>
    /// Manual override of SequenceOrder by Driver, Admin, or Dispatcher.
    /// </summary>
    [HttpPut("reorder")]
    public async Task<ActionResult<List<DeliveryAssignmentDto>>> ReorderRoute([FromBody] ReorderRouteRequest request)
    {
        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var targetDriverId = IsAdminOrDispatcher && !string.IsNullOrWhiteSpace(request.DriverId)
            ? request.DriverId
            : currentUserId;

        if (string.IsNullOrEmpty(targetDriverId))
            return BadRequest(new { message = "Driver ID is required." });

        var targetDate = ParseDateOrToday(request.Date);

        var driverAssignments = await _db.DeliveryAssignments
            .Where(d => d.DeliveryDate == targetDate && d.DriverId == targetDriverId)
            .ToListAsync();

        int seq = 1;
        foreach (var assignmentId in request.OrderedAssignmentIds)
        {
            var match = driverAssignments.FirstOrDefault(a => a.Id == assignmentId);
            if (match != null)
            {
                match.SequenceOrder = seq++;
            }
        }

        // Any stops not in OrderedAssignmentIds get appended at the end
        foreach (var remaining in driverAssignments.Where(a => !request.OrderedAssignmentIds.Contains(a.Id)).OrderBy(a => a.SequenceOrder))
        {
            remaining.SequenceOrder = seq++;
        }

        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "RouteReordered",
            driverId = targetDriverId
        });

        var items = await LoadAssignmentsForDateAsync(targetDate);
        return Ok(items);
    }

    /// <summary>
    /// Toggle IsDelivered status and broadcast immediately to Admin, Dispatchers & Drivers via SignalR.
    /// </summary>
    [HttpPatch("{id:int}/toggle-delivered")]
    public async Task<ActionResult<DeliveryAssignmentDto>> ToggleDelivered(
        int id,
        [FromBody] ToggleDeliveredRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var assignment = await _db.DeliveryAssignments.FirstOrDefaultAsync(d => d.Id == id);
        if (assignment == null)
            return NotFound();

        if (!IsAdminOrDispatcher && assignment.DriverId != userId)
        {
            return Forbid();
        }

        assignment.IsDelivered = request.IsDelivered;
        assignment.DeliveredAt = request.IsDelivered ? DateTime.UtcNow : null;

        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "DeliveryStatusToggled",
            assignmentId = id,
            isDelivered = assignment.IsDelivered,
            driverId = assignment.DriverId
        });

        var updated = await GetSingleDtoAsync(id);
        return Ok(updated);
    }

    /// <summary>
    /// Resets all assignments for the specified date back to default (Unassigned pool, no driver, not delivered).
    /// </summary>
    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPost("reset")]
    public async Task<ActionResult<List<DeliveryAssignmentDto>>> ResetDateAssignments([FromQuery] string? date)
    {
        var targetDate = ParseDateOrToday(date);
        await EnsureDailyAssignmentsExistAsync(targetDate);

        var assignments = await _db.DeliveryAssignments
            .Where(d => d.DeliveryDate == targetDate)
            .ToListAsync();

        foreach (var a in assignments)
        {
            a.DriverId = null;
            a.SequenceOrder = 0;
            a.IsDelivered = false;
            a.DeliveredAt = null;
        }

        await _db.SaveChangesAsync();

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "AssignmentsReset",
            date = targetDate.ToString("yyyy-MM-dd")
        });

        var items = await LoadAssignmentsForDateAsync(targetDate);
        return Ok(items);
    }

    private async Task EnsureDailyAssignmentsExistAsync(DateOnly date)
    {
        var allKindergartenIds = await _db.Kindergartens.Select(k => k.Id).ToListAsync();
        var existingIds = await _db.DeliveryAssignments
            .Where(d => d.DeliveryDate == date)
            .Select(d => d.KindergartenId)
            .ToListAsync();

        var missingIds = allKindergartenIds.Except(existingIds).ToList();
        if (missingIds.Count > 0)
        {
            foreach (var kId in missingIds)
            {
                _db.DeliveryAssignments.Add(new DeliveryAssignment
                {
                    KindergartenId = kId,
                    DriverId = null,
                    DeliveryDate = date,
                    SequenceOrder = 0,
                    IsDelivered = false
                });
            }
            await _db.SaveChangesAsync();
        }
    }

    private async Task OptimizeDriverRouteInternalAsync(
        string driverId,
        DateOnly date,
        double? startLat,
        double? startLng)
    {
        var stops = await _db.DeliveryAssignments
            .Include(d => d.Kindergarten)
            .Where(d => d.DeliveryDate == date && d.DriverId == driverId)
            .ToListAsync();

        _optimizer.OptimizeDriverStops(stops, startLat, startLng);
        await _db.SaveChangesAsync();
    }

    private async Task ResequenceDriverStopsAsync(string driverId, DateOnly date)
    {
        var stops = await _db.DeliveryAssignments
            .Include(d => d.Kindergarten)
            .Where(d => d.DeliveryDate == date && d.DriverId == driverId)
            .OrderBy(d => d.SequenceOrder)
            .ThenBy(d => d.Kindergarten.Time)
            .ToListAsync();

        int seq = 1;
        foreach (var stop in stops)
        {
            stop.SequenceOrder = seq++;
        }
        await _db.SaveChangesAsync();
    }

    private async Task<List<DeliveryAssignmentDto>> LoadAssignmentsForDateAsync(DateOnly date)
    {
        return await _db.DeliveryAssignments
            .Include(d => d.Kindergarten)
            .Include(d => d.Driver)
            .Where(d => d.DeliveryDate == date)
            .OrderBy(d => d.DriverId == null ? 1 : 0)
            .ThenBy(d => d.Driver != null ? d.Driver.Name : string.Empty)
            .ThenBy(d => d.SequenceOrder)
            .ThenBy(d => d.Kindergarten.Time)
            .Select(d => new DeliveryAssignmentDto(
                d.Id,
                d.KindergartenId,
                new KindergartenDto(
                    d.Kindergarten.Id,
                    d.Kindergarten.Name,
                    d.Kindergarten.Address,
                    d.Kindergarten.Contact,
                    d.Kindergarten.Time,
                    d.Kindergarten.Total,
                    d.Kindergarten.Latitude,
                    d.Kindergarten.Longitude,
                    d.Kindergarten.GoogleMapsUrl
                ),
                d.DriverId,
                d.Driver != null ? d.Driver.Name : null,
                d.Driver != null ? d.Driver.Car : null,
                d.Driver != null ? (d.Driver.Color ?? "#276EF1") : null,
                d.DeliveryDate.ToString("yyyy-MM-dd"),
                d.SequenceOrder,
                d.IsDelivered,
                d.DeliveredAt
            ))
            .ToListAsync();
    }

    private async Task<DeliveryAssignmentDto?> GetSingleDtoAsync(int id)
    {
        var d = await _db.DeliveryAssignments
            .Include(x => x.Kindergarten)
            .Include(x => x.Driver)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (d == null)
            return null;

        return new DeliveryAssignmentDto(
            d.Id,
            d.KindergartenId,
            new KindergartenDto(
                d.Kindergarten.Id,
                d.Kindergarten.Name,
                d.Kindergarten.Address,
                d.Kindergarten.Contact,
                d.Kindergarten.Time,
                d.Kindergarten.Total,
                d.Kindergarten.Latitude,
                d.Kindergarten.Longitude,
                d.Kindergarten.GoogleMapsUrl
            ),
            d.DriverId,
            d.Driver?.Name,
            d.Driver?.Car,
            d.Driver != null ? (d.Driver.Color ?? "#276EF1") : null,
            d.DeliveryDate.ToString("yyyy-MM-dd"),
            d.SequenceOrder,
            d.IsDelivered,
            d.DeliveredAt
        );
    }

    private static DateOnly ParseDateOrToday(string? dateStr)
    {
        if (!string.IsNullOrWhiteSpace(dateStr) && DateOnly.TryParse(dateStr, out var parsed))
        {
            return parsed;
        }
        return DateOnly.FromDateTime(DateTime.UtcNow.AddHours(1));
    }
}
