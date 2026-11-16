namespace Backend.DTOs;

public record LoginRequest(string Email, string Password);

public record UserDto(
    string Id,
    string Name,
    string Email,
    string Role,
    string Contact,
    string? Car,
    string? Color
);

public record AuthResponse(string Token, UserDto User);
