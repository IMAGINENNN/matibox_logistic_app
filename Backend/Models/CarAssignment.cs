namespace Backend.Models;

public class CarAssignment
{
    public int Id { get; set; }

    public int CarId { get; set; }
    public Car Car { get; set; } = null!;

    public string DriverId { get; set; } = string.Empty;
    public ApplicationUser Driver { get; set; } = null!;

    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
