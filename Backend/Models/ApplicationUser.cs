using Microsoft.AspNetCore.Identity;

namespace Backend.Models;

public class ApplicationUser : IdentityUser
{
    public string Name { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
    public string? Car { get; set; }

    /// <summary>
    /// Custom hex color for this driver's route and pins on the global map.
    /// </summary>
    public string? Color { get; set; } = "#276EF1";

    /// <summary>
    /// Live GPS coordinates shared when driver is online.
    /// </summary>
    public double? LastLatitude { get; set; }
    public double? LastLongitude { get; set; }
    public DateTime? LocationUpdatedAt { get; set; }
    public bool IsOnline { get; set; }

    public ICollection<DeliveryAssignment> DeliveryAssignments { get; set; } = new List<DeliveryAssignment>();
    public ICollection<Car> Cars { get; set; } = new List<Car>();
    public ICollection<CarAssignment> CarAssignments { get; set; } = new List<CarAssignment>();
}
