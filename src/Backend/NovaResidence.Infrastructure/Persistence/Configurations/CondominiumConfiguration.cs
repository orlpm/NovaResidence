using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Condominiums;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class CondominiumConfiguration : IEntityTypeConfiguration<Condominium>
{
    public void Configure(EntityTypeBuilder<Condominium> builder)
    {
        builder.ToTable("Condominiums", "condo");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(c => c.Description)
            .HasMaxLength(1000);

        builder.Property(c => c.TaxId)
            .HasMaxLength(50);

        builder.Property(c => c.LegalName)
            .HasMaxLength(300);

        builder.Property(c => c.CountryId);
        builder.Property(c => c.StateId);

        // Address as owned entity (Value Object)
        builder.OwnsOne(c => c.Address, address =>
        {
            address.Property(a => a.Street).IsRequired().HasMaxLength(200).HasColumnName("Street");
            address.Property(a => a.ExteriorNumber).HasMaxLength(20).HasColumnName("ExteriorNumber");
            address.Property(a => a.InteriorNumber).HasMaxLength(20).HasColumnName("InteriorNumber");
            address.Property(a => a.City).IsRequired().HasMaxLength(100).HasColumnName("City");
            address.Property(a => a.State).IsRequired().HasMaxLength(100).HasColumnName("State");
            address.Property(a => a.PostalCode).IsRequired().HasMaxLength(20).HasColumnName("PostalCode");
            address.Property(a => a.Country).IsRequired().HasMaxLength(100).HasColumnName("Country");
            address.Property(a => a.Neighborhood).HasMaxLength(100).HasColumnName("Neighborhood");
        });

        builder.Property(c => c.IsActive).HasDefaultValue(true);

        builder.HasOne<NovaResidence.Domain.Entities.Localization.GeoCountry>()
            .WithMany()
            .HasForeignKey(c => c.CountryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<NovaResidence.Domain.Entities.Localization.GeoState>()
            .WithMany()
            .HasForeignKey(c => c.StateId)
            .OnDelete(DeleteBehavior.Restrict);

        // Relationships
        builder.HasMany(c => c.Buildings)
            .WithOne()
            .HasForeignKey(b => b.CondominiumId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(c => c.CommonAreas)
            .WithOne()
            .HasForeignKey(ca => ca.CondominiumId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(c => c.IsActive);
        builder.HasIndex(c => c.SubscriptionPlanId);
        builder.HasIndex(c => c.CountryId);
        builder.HasIndex(c => c.StateId);

        // Audit fields
        builder.Property(c => c.CreatedAt).IsRequired();
        builder.Property(c => c.IsDeleted).HasDefaultValue(false);
    }
}

public class BuildingConfiguration : IEntityTypeConfiguration<Building>
{
    public void Configure(EntityTypeBuilder<Building> builder)
    {
        builder.ToTable("Buildings", "condo");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.Description)
            .HasMaxLength(500);

        builder.HasMany(b => b.Units)
            .WithOne()
            .HasForeignKey(u => u.BuildingId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(b => b.CondominiumId);
    }
}

public class UnitConfiguration : IEntityTypeConfiguration<Unit>
{
    public void Configure(EntityTypeBuilder<Unit> builder)
    {
        builder.ToTable("Units", "condo");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.UnitNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(u => u.Area)
            .HasPrecision(10, 2);

        builder.Property(u => u.MonthlyMaintenanceFee)
            .HasPrecision(18, 2);

        // Configure the relationship with Building using the existing BuildingId
        builder.HasOne(u => u.Building)
            .WithMany(b => b.Units)
            .HasForeignKey(u => u.BuildingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(u => new { u.BuildingId, u.UnitNumber })
            .IsUnique();

        builder.HasIndex(u => u.OwnerId);
        builder.HasIndex(u => u.TenantId);
        builder.HasIndex(u => u.Status);
    }
}

public class ResidentConfiguration : IEntityTypeConfiguration<Resident>
{
    public void Configure(EntityTypeBuilder<Resident> builder)
    {
        builder.ToTable("Residents", "condo");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(r => r.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.Property(r => r.PhoneNumber)
            .HasMaxLength(20);

        builder.Property(r => r.InvitationToken)
            .HasMaxLength(64);

        // Relationship with Unit
        builder.HasOne(r => r.Unit)
            .WithMany()
            .HasForeignKey(r => r.UnitId)
            .OnDelete(DeleteBehavior.Cascade);

        // Indexes
        builder.HasIndex(r => r.UnitId);
        builder.HasIndex(r => r.Email);
        builder.HasIndex(r => r.InvitationToken)
            .IsUnique()
            .HasFilter("[InvitationToken] IS NOT NULL");
        builder.HasIndex(r => r.UserId)
            .HasFilter("[UserId] IS NOT NULL");
        builder.HasIndex(r => new { r.UnitId, r.IsActive });
    }
}

public class CommonAreaConfiguration : IEntityTypeConfiguration<CommonArea>
{
    public void Configure(EntityTypeBuilder<CommonArea> builder)
    {
        builder.ToTable("CommonAreas", "condo");

        builder.HasKey(ca => ca.Id);

        builder.Property(ca => ca.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ca => ca.ReservationFee)
            .HasPrecision(18, 2);

        builder.HasMany(ca => ca.Reservations)
            .WithOne()
            .HasForeignKey(r => r.CommonAreaId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ca => ca.CondominiumId);
        builder.HasIndex(ca => ca.IsActive);
    }
}

public class CommonAreaReservationConfiguration : IEntityTypeConfiguration<CommonAreaReservation>
{
    public void Configure(EntityTypeBuilder<CommonAreaReservation> builder)
    {
        builder.ToTable("CommonAreaReservations", "condo");

        builder.HasKey(r => r.Id);

        builder.Property(r => r.Fee)
            .HasPrecision(18, 2);

        builder.Property(r => r.Notes)
            .HasMaxLength(1000);

        builder.Property(r => r.RejectionReason)
            .HasMaxLength(500);

        builder.HasIndex(r => new { r.CommonAreaId, r.ReservationDate });
        builder.HasIndex(r => r.UserId);
        builder.HasIndex(r => r.UnitId);
        builder.HasIndex(r => r.Status);
    }
}
