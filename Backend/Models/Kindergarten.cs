using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Kindergarten
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(250)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Contact { get; set; } = string.Empty;

    /// <summary>
    /// Delivery deadline time in "HH:mm" format (e.g., "08:30"), used for sorting priority.
    /// </summary>
    [Required]
    [MaxLength(10)]
    public string Time { get; set; } = "09:00";

    /// <summary>
    /// Number of meals/crates to deliver.
    /// </summary>
    public int Total { get; set; }

    public double Latitude { get; set; }
    public double Longitude { get; set; }

    [MaxLength(500)]
    public string GoogleMapsUrl { get; set; } = string.Empty;

    public ICollection<DeliveryAssignment> DeliveryAssignments { get; set; } = new List<DeliveryAssignment>();
}
