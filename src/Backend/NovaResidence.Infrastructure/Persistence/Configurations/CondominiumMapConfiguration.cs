using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Entities.Maps;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class CondominiumCommonAreaConfiguration : IEntityTypeConfiguration<CondominiumCommonArea>
{
    public void Configure(EntityTypeBuilder<CondominiumCommonArea> builder)
    {
        builder.ToTable("CondominiumCommonAreas");

        builder.HasKey(ca => ca.Id);

        builder.Property(ca => ca.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(ca => ca.Description)
            .HasMaxLength(1000);

        builder.Property(ca => ca.Level)
            .HasMaxLength(100);

        builder.Property(ca => ca.ImageUrlsJson)
            .HasMaxLength(4000);

        builder.Property(ca => ca.CoordinateX)
            .HasPrecision(10, 4);

        builder.Property(ca => ca.CoordinateY)
            .HasPrecision(10, 4);

        builder.HasOne<Building>()
            .WithMany()
            .HasForeignKey(ca => ca.BuildingId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(ca => ca.CondominiumId);
        builder.HasIndex(ca => ca.BuildingId);
        builder.HasIndex(ca => ca.IsActive);
        builder.HasIndex(ca => ca.Type);
    }
}

public class CondominiumMapConfiguration : IEntityTypeConfiguration<CondominiumMap>
{
    public void Configure(EntityTypeBuilder<CondominiumMap> builder)
    {
        builder.ToTable("CondominiumMaps");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Name)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(m => m.Description)
            .HasMaxLength(1000);

        builder.Property(m => m.ScopeReference)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(m => m.BackgroundImageUrl)
            .HasMaxLength(1000);

        builder.HasMany(m => m.Markers)
            .WithOne()
            .HasForeignKey(mm => mm.CondominiumMapId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => m.CondominiumId);
        builder.HasIndex(m => m.ScopeType);
        builder.HasIndex(m => m.IsActive);
    }
}

public class CondominiumMapMarkerConfiguration : IEntityTypeConfiguration<CondominiumMapMarker>
{
    public void Configure(EntityTypeBuilder<CondominiumMapMarker> builder)
    {
        builder.ToTable("CondominiumMapMarkers");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Label)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(m => m.Tooltip)
            .HasMaxLength(1000);

        builder.Property(m => m.MarkerColor)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(m => m.LayerName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(m => m.ExternalReference)
            .HasMaxLength(150);

        builder.Property(m => m.CoordinateX)
            .HasPrecision(10, 4);

        builder.Property(m => m.CoordinateY)
            .HasPrecision(10, 4);

        builder.HasIndex(m => m.CondominiumMapId);
        builder.HasIndex(m => m.LayerName);
        builder.HasIndex(m => m.MarkerType);
        builder.HasIndex(m => m.IsActive);
    }
}
