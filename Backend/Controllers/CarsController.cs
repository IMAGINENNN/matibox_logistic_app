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
public class CarsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IHubContext<LogisticsHub> _hub;

    public CarsController(
        AppDbContext db,
        UserManager<ApplicationUser> userManager,
        IHubContext<LogisticsHub> hub)
    {
        _db = db;
        _userManager = userManager;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<List<CarDto>>> GetAll()
    {
        var cars = await _db.Cars
            .Include(c => c.CarAssignments)
                .ThenInclude(ca => ca.Driver)
            .OrderBy(c => c.Name)
            .ThenBy(c => c.NumberPlate)
            .ThenBy(c => c.Id)
            .ToListAsync();

        var dtos = cars.Select(MapToCarDto).ToList();
        return Ok(dtos);
    }

    /// <summary>
    /// Only Admin and Dispatcher can create cars. Drivers cannot add cars.
    /// </summary>
    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPost]
    public async Task<ActionResult<CarDto>> Create([FromBody] SaveCarRequest request)
    {
        var car = new Car
        {
            Name = request.Name.Trim(),
            NumberPlate = request.NumberPlate.Trim(),
            DriverId = null
        };

        _db.Cars.Add(car);
        await _db.SaveChangesAsync();

        var driverIds = (request.DriverIds ?? [])
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .Select(id => id.Trim())
            .Distinct()
            .ToList();

        foreach (var dId in driverIds)
        {
            _db.CarAssignments.Add(new CarAssignment
            {
                CarId = car.Id,
                DriverId = dId,
                AssignedAt = DateTime.UtcNow
            });
        }

        if (driverIds.Count > 0)
        {
            await _db.SaveChangesAsync();
            foreach (var dId in driverIds)
            {
                await SyncDriverVehicleSummaryAsync(dId);
            }
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "CarCreated", id = car.Id });

        var dto = await GetSingleCarDtoAsync(car.Id);
        return Ok(dto);
    }

    /// <summary>
    /// Only Admin and Dispatcher can edit cars. Drivers cannot edit cars.
    /// </summary>
    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<CarDto>> Update(int id, [FromBody] SaveCarRequest request)
    {
        var car = await _db.Cars
            .Include(c => c.CarAssignments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (car == null)
            return NotFound();

        car.Name = request.Name.Trim();
        car.NumberPlate = request.NumberPlate.Trim();

        var affectedDriverIds = car.CarAssignments.Select(ca => ca.DriverId).ToHashSet();

        if (request.DriverIds != null)
        {
            var desiredDriverIds = request.DriverIds
                .Where(d => !string.IsNullOrWhiteSpace(d))
                .Select(d => d.Trim())
                .Distinct()
                .ToHashSet();

            var toRemove = car.CarAssignments.Where(ca => !desiredDriverIds.Contains(ca.DriverId)).ToList();
            _db.CarAssignments.RemoveRange(toRemove);

            var existingIds = car.CarAssignments.Select(ca => ca.DriverId).ToHashSet();
            foreach (var dId in desiredDriverIds.Where(d => !existingIds.Contains(d)))
            {
                _db.CarAssignments.Add(new CarAssignment
                {
                    CarId = car.Id,
                    DriverId = dId,
                    AssignedAt = DateTime.UtcNow
                });
                affectedDriverIds.Add(dId);
            }
        }

        await _db.SaveChangesAsync();

        foreach (var dId in affectedDriverIds)
        {
            await SyncDriverVehicleSummaryAsync(dId);
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "CarUpdated", id = car.Id });

        var dto = await GetSingleCarDtoAsync(car.Id);
        return Ok(dto);
    }

    /// <summary>
    /// Driver (or Admin/Dispatcher on behalf of a driver) TAKES a car.
    /// Several drivers can take the same car simultaneously.
    /// </summary>
    [HttpPost("{id:int}/take")]
    public async Task<ActionResult<CarDto>> TakeCar(int id, [FromBody] TakeDropCarRequest? request)
    {
        var car = await _db.Cars
            .Include(c => c.CarAssignments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (car == null)
            return NotFound();

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdminOrDispatcher = User.IsInRole("Admin") || User.IsInRole("Dispatcher");
        var targetDriverId = isAdminOrDispatcher && !string.IsNullOrWhiteSpace(request?.DriverId)
            ? request!.DriverId!.Trim()
            : currentUserId;

        if (string.IsNullOrEmpty(targetDriverId))
            return Unauthorized();

        var alreadyAssigned = await _db.CarAssignments
            .AnyAsync(ca => ca.CarId == id && ca.DriverId == targetDriverId);

        if (!alreadyAssigned)
        {
            _db.CarAssignments.Add(new CarAssignment
            {
                CarId = id,
                DriverId = targetDriverId,
                AssignedAt = DateTime.UtcNow
            });
            await _db.SaveChangesAsync();
            await SyncDriverVehicleSummaryAsync(targetDriverId);
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "CarTaken",
            id = car.Id,
            driverId = targetDriverId
        });

        var dto = await GetSingleCarDtoAsync(car.Id);
        return Ok(dto);
    }

    /// <summary>
    /// Driver (or Admin/Dispatcher on behalf of a driver) DROPS a car.
    /// Only removes that driver from the car, leaving other drivers who share the car untouched.
    /// </summary>
    [HttpPost("{id:int}/drop")]
    public async Task<ActionResult<CarDto>> DropCar(int id, [FromBody] TakeDropCarRequest? request)
    {
        var car = await _db.Cars.FindAsync(id);
        if (car == null)
            return NotFound();

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var isAdminOrDispatcher = User.IsInRole("Admin") || User.IsInRole("Dispatcher");
        var targetDriverId = isAdminOrDispatcher && !string.IsNullOrWhiteSpace(request?.DriverId)
            ? request!.DriverId!.Trim()
            : currentUserId;

        if (string.IsNullOrEmpty(targetDriverId))
            return Unauthorized();

        var existing = await _db.CarAssignments
            .FirstOrDefaultAsync(ca => ca.CarId == id && ca.DriverId == targetDriverId);

        if (existing != null)
        {
            _db.CarAssignments.Remove(existing);
            await _db.SaveChangesAsync();
            await SyncDriverVehicleSummaryAsync(targetDriverId);
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new
        {
            type = "CarDropped",
            id = car.Id,
            driverId = targetDriverId
        });

        var dto = await GetSingleCarDtoAsync(car.Id);
        return Ok(dto);
    }

    /// <summary>
    /// Only Admin and Dispatcher can delete cars. Drivers cannot delete cars.
    /// </summary>
    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var car = await _db.Cars
            .Include(c => c.CarAssignments)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (car == null)
            return NotFound();

        var affectedDriverIds = car.CarAssignments.Select(ca => ca.DriverId).ToList();

        _db.Cars.Remove(car);
        await _db.SaveChangesAsync();

        foreach (var dId in affectedDriverIds)
        {
            await SyncDriverVehicleSummaryAsync(dId);
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "CarDeleted", id });

        return NoContent();
    }

    private async Task SyncDriverVehicleSummaryAsync(string driverId)
    {
        var driver = await _userManager.FindByIdAsync(driverId);
        if (driver == null)
            return;

        var assignedCars = await _db.CarAssignments
            .Where(ca => ca.DriverId == driverId)
            .Include(ca => ca.Car)
            .OrderByDescending(ca => ca.AssignedAt)
            .Select(ca => ca.Car)
            .ToListAsync();

        if (assignedCars.Count > 0)
        {
            driver.Car = string.Join(", ", assignedCars.Select(c => $"{c.Name} ({c.NumberPlate})"));
        }
        else
        {
            driver.Car = "Unassigned Vehicle";
        }

        await _userManager.UpdateAsync(driver);
    }

    private async Task<CarDto?> GetSingleCarDtoAsync(int id)
    {
        var c = await _db.Cars
            .Include(x => x.CarAssignments)
                .ThenInclude(ca => ca.Driver)
            .FirstOrDefaultAsync(x => x.Id == id);

        return c == null ? null : MapToCarDto(c);
    }

    private static CarDto MapToCarDto(Car c)
    {
        var drivers = c.CarAssignments
            .Where(ca => ca.Driver != null)
            .OrderBy(ca => ca.Driver.Name)
            .Select(ca => new CarDriverInfoDto(
                ca.DriverId,
                ca.Driver.Name,
                ca.Driver.Color ?? "#276EF1"
            ))
            .ToList();

        var firstDriverId = drivers.FirstOrDefault()?.Id;
        var summaryNames = drivers.Count > 0
            ? string.Join(", ", drivers.Select(d => d.Name))
            : null;

        return new CarDto(
            c.Id,
            c.Name,
            c.NumberPlate,
            firstDriverId,
            summaryNames,
            drivers
        );
    }
}
