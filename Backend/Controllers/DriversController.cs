using System.Security.Claims;
using Backend.Data;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DriversController : ControllerBase
{
    private static readonly string[] DefaultDriverPalette =
    [
        "#276EF1", // Uber Blue
        "#A855F7", // Vivid Purple
        "#EC4899", // Hot Pink
        "#06B6D4", // Cyan
        "#F97316", // Vibrant Orange
        "#EAB308", // Gold
        "#14B8A6", // Teal
        "#6366F1"  // Indigo
    ];

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;
    private readonly IHubContext<LogisticsHub> _hub;

    public DriversController(
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        IHubContext<LogisticsHub> hub)
    {
        _userManager = userManager;
        _db = db;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<List<DriverDto>>> GetAll()
    {
        var drivers = await _userManager.GetUsersInRoleAsync("Driver");
        var now = DateTime.UtcNow;

        var dtos = drivers
            .OrderBy(d => d.Name)
            .Select((d, idx) =>
            {
                var isRecentlyOnline = d.IsOnline &&
                    d.LocationUpdatedAt.HasValue &&
                    (now - d.LocationUpdatedAt.Value).TotalMinutes <= 15;

                return new DriverDto(
                    d.Id,
                    d.Name,
                    d.Email ?? string.Empty,
                    d.Contact,
                    d.Car ?? string.Empty,
                    !string.IsNullOrWhiteSpace(d.Color)
                        ? d.Color!
                        : DefaultDriverPalette[idx % DefaultDriverPalette.Length],
                    d.LastLatitude,
                    d.LastLongitude,
                    d.LocationUpdatedAt,
                    isRecentlyOnline
                );
            })
            .ToList();

        return Ok(dtos);
    }

    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPost]
    public async Task<ActionResult<DriverDto>> Create([FromBody] CreateDriverRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (existing != null)
        {
            return BadRequest(new { message = "A user with this email already exists." });
        }

        var existingDrivers = await _userManager.GetUsersInRoleAsync("Driver");
        var defaultColor = DefaultDriverPalette[existingDrivers.Count % DefaultDriverPalette.Length];

        var driver = new ApplicationUser
        {
            UserName = request.Email.Trim(),
            Email = request.Email.Trim(),
            EmailConfirmed = true,
            Name = request.Name.Trim(),
            Contact = request.Contact.Trim(),
            Car = string.IsNullOrWhiteSpace(request.Car) ? "Unassigned Vehicle" : request.Car.Trim(),
            Color = !string.IsNullOrWhiteSpace(request.Color) ? request.Color.Trim() : defaultColor
        };

        var result = await _userManager.CreateAsync(driver, request.Password);
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            return BadRequest(new { message = errors });
        }

        await _userManager.AddToRoleAsync(driver, "Driver");
        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "DriverCreated", id = driver.Id });

        return Ok(ToDto(driver));
    }

    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPut("{id}")]
    public async Task<ActionResult<DriverDto>> Update(string id, [FromBody] UpdateDriverRequest request)
    {
        var driver = await _userManager.FindByIdAsync(id);
        if (driver == null)
            return NotFound();

        driver.Name = request.Name.Trim();
        driver.Email = request.Email.Trim();
        driver.UserName = request.Email.Trim();
        driver.NormalizedEmail = _userManager.NormalizeEmail(driver.Email);
        driver.NormalizedUserName = _userManager.NormalizeName(driver.UserName);
        driver.Contact = request.Contact.Trim();
        driver.Car = request.Car.Trim();

        if (!string.IsNullOrWhiteSpace(request.Color))
        {
            driver.Color = request.Color.Trim();
        }

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            var newPassword = request.Password.Trim();
            driver.PasswordHash = _userManager.PasswordHasher.HashPassword(driver, newPassword);
            driver.SecurityStamp = Guid.NewGuid().ToString();
        }

        var updateRes = await _userManager.UpdateAsync(driver);
        if (!updateRes.Succeeded)
        {
            var errors = string.Join("; ", updateRes.Errors.Select(e => e.Description));
            return BadRequest(new { message = errors });
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "DriverUpdated", id = driver.Id });

        return Ok(ToDto(driver));
    }

    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPatch("{id}/color")]
    public async Task<ActionResult<DriverDto>> UpdateColor(string id, [FromBody] UpdateDriverColorRequest request)
    {
        var driver = await _userManager.FindByIdAsync(id);
        if (driver == null)
            return NotFound();

        if (!string.IsNullOrWhiteSpace(request.Color))
        {
            driver.Color = request.Color.Trim();
            await _userManager.UpdateAsync(driver);
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "DriverColorChanged",
            id = driver.Id,
            color = driver.Color
        });

        return Ok(ToDto(driver));
    }

    /// <summary>
    /// Driver shares live GPS location while online. Broadcasts immediately to Dispatch.
    /// </summary>
    [HttpPost("location")]
    public async Task<ActionResult<DriverDto>> UpdateLocation([FromBody] UpdateDriverLocationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var driver = await _userManager.FindByIdAsync(userId);
        if (driver == null)
            return NotFound();

        driver.LastLatitude = request.Latitude;
        driver.LastLongitude = request.Longitude;
        driver.LocationUpdatedAt = DateTime.UtcNow;
        driver.IsOnline = true;

        await _userManager.UpdateAsync(driver);

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "DriverLocationUpdated",
            driverId = driver.Id,
            latitude = driver.LastLatitude,
            longitude = driver.LastLongitude,
            isOnline = true
        });

        return Ok(ToDto(driver));
    }

    /// <summary>
    /// Marks driver offline when exiting or stopping location sharing.
    /// </summary>
    [HttpPost("offline")]
    public async Task<IActionResult> GoOffline()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var driver = await _userManager.FindByIdAsync(userId);
        if (driver == null)
            return NotFound();

        driver.IsOnline = false;
        await _userManager.UpdateAsync(driver);

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "DriverOffline",
            driverId = driver.Id
        });

        return NoContent();
    }

    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var driver = await _userManager.FindByIdAsync(id);
        if (driver == null)
            return NotFound();

        // Unassign any deliveries assigned to this driver before deleting
        var assignedDeliveries = await _db.DeliveryAssignments
            .Where(d => d.DriverId == id)
            .ToListAsync();

        foreach (var delivery in assignedDeliveries)
        {
            delivery.DriverId = null;
            delivery.SequenceOrder = 0;
        }
        await _db.SaveChangesAsync();

        await _userManager.DeleteAsync(driver);
        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "DriverDeleted", id });

        return NoContent();
    }

    private static DriverDto ToDto(ApplicationUser d) => new(
        d.Id,
        d.Name,
        d.Email ?? string.Empty,
        d.Contact,
        d.Car ?? string.Empty,
        d.Color ?? "#276EF1",
        d.LastLatitude,
        d.LastLongitude,
        d.LocationUpdatedAt,
        d.IsOnline && d.LocationUpdatedAt.HasValue && (DateTime.UtcNow - d.LocationUpdatedAt.Value).TotalMinutes <= 15
    );
}
