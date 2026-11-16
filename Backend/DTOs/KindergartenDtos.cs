namespace Backend.DTOs;

public record KindergartenDto(
    int Id,
    string Name,
    string Address,
    string Contact,
    string Time,
    int Total,
    double Latitude,
    double Longitude,
    string GoogleMapsUrl
);

public record SaveKindergartenRequest(
    string Name,
    string Address,
    string Contact,
    string Time,
    int Total,
    double Latitude,
    double Longitude,
    string? GoogleMapsUrl
);
