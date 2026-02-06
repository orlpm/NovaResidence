using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Infrastructure.Persistence.Configurations.Authentication;

public class PermissionConfiguration : IEntityTypeConfiguration<Permission>
{
    public void Configure(EntityTypeBuilder<Permission> builder)
    {
        builder.ToTable("Permissions", "auth");
        
        builder.HasKey(p => p.Id);
        
        builder.Property(p => p.Code)
            .IsRequired()
            .HasMaxLength(100);
        
        builder.HasIndex(p => p.Code)
            .IsUnique();
        
        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(200);
        
        builder.Property(p => p.Description)
            .HasMaxLength(500);
        
        builder.Property(p => p.Category)
            .IsRequired()
            .HasMaxLength(50);
        
        builder.Property(p => p.IsSystem)
            .IsRequired();
        
        builder.Property(p => p.IsActive)
            .IsRequired();
        
        builder.HasQueryFilter(p => !p.IsDeleted);
    }
}
