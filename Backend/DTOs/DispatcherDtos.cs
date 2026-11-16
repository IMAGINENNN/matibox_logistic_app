namespace Backend.DTOs;

public record DispatcherDto(
    string Id,
    string Name,
    string Email,
    string Contact
);

public record CreateDispatcherRequest(
    string Name,
    string Email,
    string Password,
    string Contact
);

public record UpdateDispatcherRequest(
    string Name,
    string Email,
    string? Password,
    string Contact
);
