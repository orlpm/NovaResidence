using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Visits;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class VisitConfiguration : IEntityTypeConfiguration<Visit>
{
    public void Configure(EntityTypeBuilder<Visit> builder)
    {
        builder.ToTable("Visits");

        builder.HasKey(v => v.Id);

        builder.Property(v => v.VisitorName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(v => v.VisitorIdentification)
            .HasMaxLength(50);

        builder.Property(v => v.VisitorPhone)
            .HasMaxLength(20);

        builder.Property(v => v.VisitorEmail)
            .HasMaxLength(200);

        builder.Property(v => v.VehiclePlate)
            .HasMaxLength(20);

        builder.Property(v => v.VehicleDescription)
            .HasMaxLength(200);

        builder.Property(v => v.Purpose)
            .HasMaxLength(500);

        builder.Property(v => v.Notes)
            .HasMaxLength(1000);

        builder.Property(v => v.RejectionReason)
            .HasMaxLength(500);

        builder.Property(v => v.AccessCode)
            .HasMaxLength(Visit.AccessCodeLength);

        builder.Ignore(v => v.AccessValidFrom);
        builder.Ignore(v => v.AccessValidUntil);

        builder.Property(v => v.Type)
            .IsRequired();

        builder.Property(v => v.Status)
            .IsRequired();

        builder.HasIndex(v => v.CondominiumId);
        builder.HasIndex(v => v.UnitId);
        builder.HasIndex(v => v.RequestedById);
        builder.HasIndex(v => v.Status);
        builder.HasIndex(v => v.ExpectedArrival);
        builder.HasIndex(v => v.Type);
        builder.HasIndex(v => v.AccessCode).IsUnique();
    }
}
