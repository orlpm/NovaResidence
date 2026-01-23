using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("Users", "auth");

        builder.HasKey(u => u.Id);

        builder.Property(u => u.Email)
            .IsRequired()
            .HasMaxLength(256);

        builder.HasIndex(u => u.Email)
            .IsUnique();

        builder.Property(u => u.PasswordHash)
            .IsRequired()
            .HasMaxLength(512);

        builder.Property(u => u.FirstName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.LastName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(u => u.PhoneNumber)
            .HasMaxLength(20);

        // Owned collection for UserCondominiumRole
        builder.OwnsMany(u => u.CondominiumRoles, cr =>
        {
            cr.ToTable("UserCondominiumRoles", "auth");
            cr.WithOwner().HasForeignKey("UserId");
            cr.Property<int>("Id").ValueGeneratedOnAdd();
            cr.HasKey("Id");
            
            cr.Property(x => x.CondominiumId).IsRequired();
            cr.Property(x => x.Role).IsRequired();
            cr.Property(x => x.AssignedAt).IsRequired();
            
            cr.HasIndex(x => new { x.CondominiumId, x.Role });
        });

        // Audit fields
        builder.Property(u => u.CreatedAt).IsRequired();
        builder.Property(u => u.UpdatedAt);
        builder.Property(u => u.DeletedAt);

        // Soft delete
        builder.Property(u => u.IsDeleted).HasDefaultValue(false);
        builder.HasIndex(u => u.IsDeleted);
    }
}
