using Backend.DTOs;
using Backend.Hubs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Dispatcher")]
public class DispatchersController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IHubContext<LogisticsHub> _hub;

    public DispatchersController(
        UserManager<ApplicationUser> userManager,
        IHubContext<LogisticsHub> hub)
    {
        _userManager = userManager;
        _hub = hub;
    }

    [HttpGet]
    public async Task<ActionResult<List<DispatcherDto>>> GetAll()
    {
        var dispatchers = await _userManager.GetUsersInRoleAsync("Dispatcher");
        var dtos = dispatchers
            .OrderBy(d => d.Name)
            .Select(d => new DispatcherDto(
                d.Id,
                d.Name,
                d.Email ?? string.Empty,
                d.Contact
            ))
            .ToList();

        return Ok(dtos);
    }

    /// <summary>
    /// Only the primary Admin can create Dispatchers. Dispatchers cannot create other dispatchers.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<ActionResult<DispatcherDto>> Create([FromBody] CreateDispatcherRequest request)
    {
        var existing = await _userManager.FindByEmailAsync(request.Email.Trim());
        if (existing != null)
        {
            return BadRequest(new { message = "A user with this email already exists." });
        }

        var dispatcher = new ApplicationUser
        {
            UserName = request.Email.Trim(),
            Email = request.Email.Trim(),
            EmailConfirmed = true,
            Name = request.Name.Trim(),
            Contact = request.Contact.Trim(),
            Car = null
        };

        var result = await _userManager.CreateAsync(dispatcher, request.Password.Trim());
        if (!result.Succeeded)
        {
            var errors = string.Join("; ", result.Errors.Select(e => e.Description));
            return BadRequest(new { message = errors });
        }

        await _userManager.AddToRoleAsync(dispatcher, "Dispatcher");
        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "DispatcherCreated", id = dispatcher.Id });

        return Ok(new DispatcherDto(
            dispatcher.Id,
            dispatcher.Name,
            dispatcher.Email ?? string.Empty,
            dispatcher.Contact
        ));
    }

    /// <summary>
    /// Only the primary Admin can update Dispatchers.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<ActionResult<DispatcherDto>> Update(string id, [FromBody] UpdateDispatcherRequest request)
    {
        var dispatcher = await _userManager.FindByIdAsync(id);
        if (dispatcher == null)
            return NotFound();

        dispatcher.Name = request.Name.Trim();
        dispatcher.Email = request.Email.Trim();
        dispatcher.UserName = request.Email.Trim();
        dispatcher.NormalizedEmail = _userManager.NormalizeEmail(dispatcher.Email);
        dispatcher.NormalizedUserName = _userManager.NormalizeName(dispatcher.UserName);
        dispatcher.Contact = request.Contact.Trim();

        if (!string.IsNullOrWhiteSpace(request.Password))
        {
            var newPassword = request.Password.Trim();
            dispatcher.PasswordHash = _userManager.PasswordHasher.HashPassword(dispatcher, newPassword);
            dispatcher.SecurityStamp = Guid.NewGuid().ToString();
        }

        var updateRes = await _userManager.UpdateAsync(dispatcher);
        if (!updateRes.Succeeded)
        {
            var errors = string.Join("; ", updateRes.Errors.Select(e => e.Description));
            return BadRequest(new { message = errors });
        }

        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "DispatcherUpdated", id = dispatcher.Id });

        return Ok(new DispatcherDto(
            dispatcher.Id,
            dispatcher.Name,
            dispatcher.Email ?? string.Empty,
            dispatcher.Contact
        ));
    }

    /// <summary>
    /// Only the primary Admin can delete Dispatchers.
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(string id)
    {
        var dispatcher = await _userManager.FindByIdAsync(id);
        if (dispatcher == null)
            return NotFound();

        var roles = await _userManager.GetRolesAsync(dispatcher);
        if (roles.Contains("Admin"))
        {
            return BadRequest(new { message = "Cannot delete the main Administrator account." });
        }

        await _userManager.DeleteAsync(dispatcher);
        await _hub.Clients.All.SendAsync("LogisticsChanged", new { type = "DispatcherDeleted", id });

        return NoContent();
    }
}
