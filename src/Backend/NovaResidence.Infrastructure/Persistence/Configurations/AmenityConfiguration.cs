using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Condominiums;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class AmenityConfiguration : IEntityTypeConfiguration<Amenity>
{
    public void Configure(EntityTypeBuilder<Amenity> builder)
    {
        builder.ToTable("Amenities");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(a => a.Description)
            .HasMaxLength(500);

        builder.Property(a => a.Type)
            .IsRequired();

        builder.Property(a => a.Capacity)
            .IsRequired();

        builder.Property(a => a.RequiresReservation)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(a => a.IsActive)
            .IsRequired()
            .HasDefaultValue(true);

        builder.Property(a => a.ReservationFee)
            .HasColumnType("decimal(18,2)");

        builder.Property(a => a.MinReservationHours)
            .HasDefaultValue(1);

        builder.Property(a => a.MaxReservationHours)
            .HasDefaultValue(4);

        builder.Property(a => a.Rules)
            .HasMaxLength(2000);

        builder.Property(a => a.PhotoUrls)
            .HasMaxLength(4000);

        builder.HasOne(a => a.Condominium)
            .WithMany()
            .HasForeignKey(a => a.CondominiumId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(a => a.Reservations)
            .WithOne(r => r.Amenity)
            .HasForeignKey(r => r.AmenityId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(a => a.CondominiumId);
        builder.HasIndex(a => a.Type);
        builder.HasIndex(a => a.IsActive);
    }
}

public class ReservationConfiguration : IEntityTypeConfiguration<Reservation>
{
    public void Configure(EntityTypeBuilder<Reservation> builder)
    {
        builder.ToTable("Reservations");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.StartDateTime)
            .IsRequired();

        builder.Property(r => r.EndDateTime)
            .IsRequired();

        builder.Property(r => r.NumberOfGuests)
            .IsRequired()
            .HasDefaultValue(1);

        builder.Property(r => r.Notes)
            .HasMaxLength(500);

        builder.Property(r => r.Status)
            .IsRequired();

        builder.Property(r => r.Fee)
            .HasColumnType("decimal(18,2)");

        builder.Property(r => r.IsPaid)
            .HasDefaultValue(false);

        builder.Property(r => r.CancellationReason)
            .HasMaxLength(500);

        builder.HasOne(r => r.Unit)
            .WithMany()
            .HasForeignKey(r => r.UnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(r => r.AmenityId);
        builder.HasIndex(r => r.UnitId);
        builder.HasIndex(r => r.StartDateTime);
        builder.HasIndex(r => r.Status);
    }
}
