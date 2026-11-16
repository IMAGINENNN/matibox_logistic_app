using System.Globalization;
using Backend.Data;
using Backend.DTOs;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class KindergartensController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<LogisticsHub> _hub;

    public KindergartensController(AppDbContext db, IHubContext<LogisticsHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<List<KindergartenDto>>> GetAll()
    {
        var list = await _db.Kindergartens
            .OrderBy(k => k.Time)
            .ThenBy(k => k.Name)
            .Select(k => new KindergartenDto(
                k.Id,
                k.Name,
                k.Address,
                k.Contact,
                k.Time,
                k.Total,
                k.Latitude,
                k.Longitude,
                k.GoogleMapsUrl
            ))
            .ToListAsync();

        return Ok(list);
    }

    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPost]
    public async Task<ActionResult<KindergartenDto>> Create([FromBody] SaveKindergartenRequest request)
    {
        var mapsUrl = string.IsNullOrWhiteSpace(request.GoogleMapsUrl)
            ? BuildGoogleMapsUrl(request.Latitude, request.Longitude)
            : request.GoogleMapsUrl.Trim();

        var kindergarten = new Kindergarten
        {
            Name = request.Name.Trim(),
            Address = request.Address.Trim(),
            Contact = request.Contact.Trim(),
            Time = request.Time.Trim(),
            Total = request.Total,
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            GoogleMapsUrl = mapsUrl
        };

        _db.Kindergartens.Add(kindergarten);
        await _db.SaveChangesAsync();

        // Automatically create today's delivery assignment so it shows up in the live pool immediately
        var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(1));
        var existsToday = await _db.DeliveryAssignments
            .AnyAsync(d => d.KindergartenId == kindergarten.Id && d.DeliveryDate == today);

        if (!existsToday)
        {
            _db.DeliveryAssignments.Add(new DeliveryAssignment
            {
                KindergartenId = kindergarten.Id,
                DriverId = null,
                DeliveryDate = today,
                SequenceOrder = 0,
                IsDelivered = false
            });
            await _db.SaveChangesAsync();
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "KindergartenCreated", id = kindergarten.Id });

        return CreatedAtAction(nameof(GetAll), new { id = kindergarten.Id }, ToDto(kindergarten));
    }

    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpPut("{id:int}")]
    public async Task<ActionResult<KindergartenDto>> Update(int id, [FromBody] SaveKindergartenRequest request)
    {
        var kindergarten = await _db.Kindergartens.FindAsync(id);
        if (kindergarten == null)
            return NotFound();

        kindergarten.Name = request.Name.Trim();
        kindergarten.Address = request.Address.Trim();
        kindergarten.Contact = request.Contact.Trim();
        kindergarten.Time = request.Time.Trim();
        kindergarten.Total = request.Total;
        kindergarten.Latitude = request.Latitude;
        kindergarten.Longitude = request.Longitude;
        kindergarten.GoogleMapsUrl = string.IsNullOrWhiteSpace(request.GoogleMapsUrl)
            ? BuildGoogleMapsUrl(request.Latitude, request.Longitude)
            : request.GoogleMapsUrl.Trim();

        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "KindergartenUpdated", id = kindergarten.Id });

        return Ok(ToDto(kindergarten));
    }

    [Authorize(Roles = "Admin,Dispatcher")]
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var kindergarten = await _db.Kindergartens.FindAsync(id);
        if (kindergarten == null)
            return NotFound();

        _db.Kindergartens.Remove(kindergarten);
        await _db.SaveChangesAsync();
        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "KindergartenDeleted", id });

        return NoContent();
    }

    private static string BuildGoogleMapsUrl(double lat, double lng)
    {
        var latStr = lat.ToString(CultureInfo.InvariantCulture);
        var lngStr = lng.ToString(CultureInfo.InvariantCulture);
        return $"https://www.google.com/maps/dir/?api=1&destination={latStr},{lngStr}";
    }

    private static KindergartenDto ToDto(Kindergarten k) => new(
        k.Id,
        k.Name,
        k.Address,
        k.Contact,
        k.Time,
        k.Total,
        k.Latitude,
        k.Longitude,
        k.GoogleMapsUrl
    );
}
