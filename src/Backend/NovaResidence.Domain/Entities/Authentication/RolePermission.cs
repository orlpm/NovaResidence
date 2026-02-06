using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Authentication;

/// <summary>
/// Represents default permissions for a role across all condominiums
/// </summary>
public class RolePermission : BaseEntity
{
    public UserRole Role { get; private set; }
    public Guid PermissionId { get; private set; }
    
    /// <summary>Can this permission be overridden at condominium level?</summary>
    public bool CanOverride { get; private set; }
    
    // Navigation
    public virtual Permission Permission { get; private set; } = null!;

    private RolePermission() { }

    public static RolePermission Create(UserRole role, Guid permissionId, bool canOverride = true)
    {
        return new RolePermission
        {
            Id = Guid.NewGuid(),
            Role = role,
            PermissionId = permissionId,
            CanOverride = canOverride,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void UpdateCanOverride(bool canOverride)
    {
        CanOverride = canOverride;
        UpdatedAt = DateTime.UtcNow;
    }
}
