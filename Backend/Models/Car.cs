using System.ComponentModel.DataAnnotations;

namespace Backend.Models;

public class Car
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string NumberPlate { get; set; } = string.Empty;

    /// <summary>
    /// Legacy nullable FK kept for backward compatibility; multi-driver assignments are stored in CarAssignments.
    /// </summary>
    public string? DriverId { get; set; }
    public ApplicationUser? Driver { get; set; }

    public ICollection<CarAssignment> CarAssignments { get; set; } = new List<CarAssignment>();
}
