using Backend.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Backend.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<Kindergarten> Kindergartens => Set<Kindergarten>();
    public DbSet<DeliveryAssignment> DeliveryAssignments => Set<DeliveryAssignment>();
    public DbSet<Car> Cars => Set<Car>();
    public DbSet<CarAssignment> CarAssignments => Set<CarAssignment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<DeliveryAssignment>(entity =>
        {
            entity.HasIndex(d => new { d.KindergartenId, d.DeliveryDate }).IsUnique();

            entity.HasOne(d => d.Kindergarten)
                .WithMany(k => k.DeliveryAssignments)
                .HasForeignKey(d => d.KindergartenId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(d => d.Driver)
                .WithMany(u => u.DeliveryAssignments)
                .HasForeignKey(d => d.DriverId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<Car>(entity =>
        {
            entity.HasOne(c => c.Driver)
                .WithMany(u => u.Cars)
                .HasForeignKey(c => c.DriverId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        builder.Entity<CarAssignment>(entity =>
        {
            entity.ToTable("CarAssignments");

            entity.HasIndex(ca => new { ca.CarId, ca.DriverId }).IsUnique();

            entity.HasOne(ca => ca.Car)
                .WithMany(c => c.CarAssignments)
                .HasForeignKey(ca => ca.CarId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(ca => ca.Driver)
                .WithMany(u => u.CarAssignments)
                .HasForeignKey(ca => ca.DriverId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
