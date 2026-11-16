namespace Backend.DTOs;

public record DeliveryAssignmentDto(
    int Id,
    int KindergartenId,
    KindergartenDto Kindergarten,
    string? DriverId,
    string? DriverName,
    string? DriverCar,
    string? DriverColor,
    string DeliveryDate,
    int SequenceOrder,
    bool IsDelivered,
    DateTime? DeliveredAt
);

public record AssignDriverRequest(string? DriverId);

public record OptimizeRouteRequest(
    string? DriverId,
    string? Date,
    double? StartLatitude,
    double? StartLongitude
);

public record ReorderRouteRequest(
    string? DriverId,
    string? Date,
    List<int> OrderedAssignmentIds
);

public record ToggleDeliveredRequest(bool IsDelivered);
