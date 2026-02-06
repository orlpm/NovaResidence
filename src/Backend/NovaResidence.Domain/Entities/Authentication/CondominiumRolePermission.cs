using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Authentication;

/// <summary>
/// Allows condominium-specific permission customization for roles
/// Overrides default RolePermissions for specific condominiums
/// </summary>
public class CondominiumRolePermission : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public UserRole Role { get; private set; }
    public Guid PermissionId { get; private set; }
    
    /// <summary>Is this permission granted or revoked for this role in this condominium?</summary>
    public bool IsGranted { get; private set; }
    
    // Navigation
    public virtual Permission Permission { get; private set; } = null!;

    private CondominiumRolePermission() { }

    public static CondominiumRolePermission Create(
        Guid condominiumId,
        UserRole role,
        Guid permissionId,
        bool isGranted)
    {
        return new CondominiumRolePermission
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            Role = role,
            PermissionId = permissionId,
            IsGranted = isGranted,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Toggle()
    {
        IsGranted = !IsGranted;
        UpdatedAt = DateTime.UtcNow;
    }
}
