using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Authentication;

/// <summary>
/// Represents permission overrides for specific users
/// Can grant additional permissions or revoke inherited ones
/// </summary>
public class UserPermission : BaseEntity
{
    public Guid UserId { get; private set; }
    public Guid PermissionId { get; private set; }
    
    /// <summary>Condominium scope (null = all condominiums)</summary>
    public Guid? CondominiumId { get; private set; }
    
    /// <summary>Is this permission granted (true) or revoked (false)?</summary>
    public bool IsGranted { get; private set; }
    
    /// <summary>Expiration date for temporary permissions</summary>
    public DateTime? ExpiresAt { get; private set; }
    
    /// <summary>Reason for the permission override</summary>
    public string? Reason { get; private set; }
    
    // Navigation
    public virtual User User { get; private set; } = null!;
    public virtual Permission Permission { get; private set; } = null!;

    private UserPermission() { }

    public static UserPermission Grant(
        Guid userId, 
        Guid permissionId, 
        Guid? condominiumId = null,
        DateTime? expiresAt = null,
        string? reason = null)
    {
        return new UserPermission
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PermissionId = permissionId,
            CondominiumId = condominiumId,
            IsGranted = true,
            ExpiresAt = expiresAt,
            Reason = reason,
            CreatedAt = DateTime.UtcNow
        };
    }

    public static UserPermission Revoke(
        Guid userId, 
        Guid permissionId, 
        Guid? condominiumId = null,
        string? reason = null)
    {
        return new UserPermission
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            PermissionId = permissionId,
            CondominiumId = condominiumId,
            IsGranted = false,
            Reason = reason,
            CreatedAt = DateTime.UtcNow
        };
    }

    public bool IsExpired() => ExpiresAt.HasValue && ExpiresAt.Value < DateTime.UtcNow;

    public void Extend(DateTime newExpirationDate)
    {
        ExpiresAt = newExpirationDate;
        UpdatedAt = DateTime.UtcNow;
    }
}
