namespace Backend.DTOs;

public record CarDriverInfoDto(
    string Id,
    string Name,
    string Color
);

public record CarDto(
    int Id,
    string Name,
    string NumberPlate,
    string? DriverId,
    string? DriverName,
    List<CarDriverInfoDto> Drivers
);

public record SaveCarRequest(
    string Name,
    string NumberPlate,
    List<string>? DriverIds
);

public record TakeDropCarRequest(
    string? DriverId
);
