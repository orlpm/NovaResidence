using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Localization;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class GeoCountryConfiguration : IEntityTypeConfiguration<GeoCountry>
{
    public void Configure(EntityTypeBuilder<GeoCountry> builder)
    {
        builder.ToTable("GeoCountries", "catalog");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Code)
            .IsRequired()
            .HasMaxLength(8);

        builder.Property(c => c.Name)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(c => c.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(c => c.Code)
            .IsUnique();

        builder.HasIndex(c => c.Name);
    }
}

public class GeoStateConfiguration : IEntityTypeConfiguration<GeoState>
{
    public void Configure(EntityTypeBuilder<GeoState> builder)
    {
        builder.ToTable("GeoStates", "catalog");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Code)
            .IsRequired()
            .HasMaxLength(16);

        builder.Property(s => s.Name)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(s => s.IsActive)
            .HasDefaultValue(true);

        builder.HasOne(s => s.Country)
            .WithMany(c => c.States)
            .HasForeignKey(s => s.CountryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(s => new { s.CountryId, s.Code })
            .IsUnique();

        builder.HasIndex(s => new { s.CountryId, s.Name });
    }
}
