namespace Backend.Models;

public class DeliveryAssignment
{
    public int Id { get; set; }

    public int KindergartenId { get; set; }
    public Kindergarten Kindergarten { get; set; } = null!;

    /// <summary>
    /// Nullable FK to ApplicationUser. If null, it is unassigned and in the general pool for drivers to pick.
    /// </summary>
    public string? DriverId { get; set; }
    public ApplicationUser? Driver { get; set; }

    public DateOnly DeliveryDate { get; set; }

    /// <summary>
    /// Sorted by best Time / route order, and adjustable by the driver or admin.
    /// </summary>
    public int SequenceOrder { get; set; }

    public bool IsDelivered { get; set; }

    public DateTime? DeliveredAt { get; set; }
}
