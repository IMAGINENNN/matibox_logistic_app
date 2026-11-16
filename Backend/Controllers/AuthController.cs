using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Backend.DTOs;
using Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly IConfiguration _configuration;

    public AuthController(UserManager<ApplicationUser> userManager, IConfiguration configuration)
    {
        _userManager = userManager;
        _configuration = configuration;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
    {
        var email = request.Email.Trim();
        var password = request.Password.Trim();
        var user = await _userManager.FindByEmailAsync(email);
        if (user == null || !await _userManager.CheckPasswordAsync(user, password))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.Contains("Admin")
            ? "Admin"
            : roles.Contains("Dispatcher")
                ? "Dispatcher"
                : roles.FirstOrDefault() ?? "Driver";

        var token = GenerateJwtToken(user, role);
        var userDto = new UserDto(
            user.Id,
            user.Name,
            user.Email ?? string.Empty,
            role,
            user.Contact,
            user.Car,
            user.Color ?? "#276EF1"
        );

        return Ok(new AuthResponse(token, userDto));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user == null)
            return Unauthorized();

        var roles = await _userManager.GetRolesAsync(user);
        var role = roles.Contains("Admin")
            ? "Admin"
            : roles.Contains("Dispatcher")
                ? "Dispatcher"
                : roles.FirstOrDefault() ?? "Driver";

        return Ok(new UserDto(
            user.Id,
            user.Name,
            user.Email ?? string.Empty,
            role,
            user.Contact,
            user.Car,
            user.Color ?? "#276EF1"
        ));
    }

    private string GenerateJwtToken(ApplicationUser user, string role)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Key missing");
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "MatiboxLogisticsApi";
        var jwtAudience = _configuration["Jwt:Audience"] ?? "MatiboxLogisticsClient";
        var expiryMinutes = int.TryParse(_configuration["Jwt:ExpiryMinutes"], out var mins) ? mins : 1440;

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.Name),
            new(ClaimTypes.Role, role)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtAudience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(expiryMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
