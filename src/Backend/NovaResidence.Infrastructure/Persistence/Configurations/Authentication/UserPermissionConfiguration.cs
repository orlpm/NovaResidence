using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Infrastructure.Persistence.Configurations.Authentication;

public class UserPermissionConfiguration : IEntityTypeConfiguration<UserPermission>
{
    public void Configure(EntityTypeBuilder<UserPermission> builder)
    {
        builder.ToTable("UserPermissions", "auth");
        
        builder.HasKey(up => up.Id);
        
        builder.Property(up => up.UserId)
            .IsRequired();
        
        builder.Property(up => up.PermissionId)
            .IsRequired();
        
        builder.Property(up => up.IsGranted)
            .IsRequired();
        
        builder.Property(up => up.Reason)
            .HasMaxLength(500);
        
        builder.HasIndex(up => new { up.UserId, up.PermissionId, up.CondominiumId })
            .IsUnique();
        
        builder.HasOne(up => up.User)
            .WithMany()
            .HasForeignKey(up => up.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasOne(up => up.Permission)
            .WithMany(p => p.UserPermissions)
            .HasForeignKey(up => up.PermissionId)
            .OnDelete(DeleteBehavior.Cascade);
        
        builder.HasQueryFilter(up => !up.IsDeleted);
    }
}
