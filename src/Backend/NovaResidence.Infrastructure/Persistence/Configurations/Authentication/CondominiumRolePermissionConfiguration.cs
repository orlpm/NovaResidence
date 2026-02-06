using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Infrastructure.Persistence.Configurations.Authentication;

public class CondominiumRolePermissionConfiguration : IEntityTypeConfiguration<CondominiumRolePermission>
{
    public void Configure(EntityTypeBuilder<CondominiumRolePermission> builder)
    {
        builder.ToTable("CondominiumRolePermissions", "auth");
        
        builder.HasKey(crp => crp.Id);
        
        builder.Property(crp => crp.CondominiumId)
            .IsRequired();
        
        builder.Property(crp => crp.Role)
            .IsRequired();
        
        builder.Property(crp => crp.PermissionId)
            .IsRequired();
        
        builder.Property(crp => crp.IsGranted)
            .IsRequired();
        
        builder.HasIndex(crp => new { crp.CondominiumId, crp.Role, crp.PermissionId })
            .IsUnique();
        
        builder.HasOne(crp => crp.Permission)
            .WithMany(p => p.CondominiumRolePermissions)
            .HasForeignKey(crp => crp.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasQueryFilter(crp => !crp.IsDeleted);
    }
}
