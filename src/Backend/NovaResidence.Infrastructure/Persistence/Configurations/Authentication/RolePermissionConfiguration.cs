using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Infrastructure.Persistence.Configurations.Authentication;

public class RolePermissionConfiguration : IEntityTypeConfiguration<RolePermission>
{
    public void Configure(EntityTypeBuilder<RolePermission> builder)
    {
        builder.ToTable("RolePermissions", "auth");
        
        builder.HasKey(rp => rp.Id);
        
        builder.Property(rp => rp.Role)
            .IsRequired();
        
        builder.Property(rp => rp.PermissionId)
            .IsRequired();
        
        builder.Property(rp => rp.CanOverride)
            .IsRequired();
        
        builder.HasIndex(rp => new { rp.Role, rp.PermissionId })
            .IsUnique();
        
        builder.HasOne(rp => rp.Permission)
            .WithMany(p => p.RolePermissions)
            .HasForeignKey(rp => rp.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasQueryFilter(rp => !rp.IsDeleted);
    }
}
