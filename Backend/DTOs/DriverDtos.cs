namespace Backend.DTOs;

public record DriverDto(
    string Id,
    string Name,
    string Email,
    string Contact,
    string Car,
    string Color,
    double? LastLatitude,
    double? LastLongitude,
    DateTime? LocationUpdatedAt,
    bool IsOnline
);

public record CreateDriverRequest(
    string Name,
    string Email,
    string Password,
    string Contact,
    string Car,
    string? Color
);

public record UpdateDriverRequest(
    string Name,
    string Email,
    string? Password,
    string Contact,
    string Car,
    string? Color
);

public record UpdateDriverColorRequest(
    string Color
);

public record UpdateDriverLocationRequest(
    double Latitude,
    double Longitude
);
