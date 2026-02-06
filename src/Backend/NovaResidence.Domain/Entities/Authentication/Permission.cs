using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Authentication;

/// <summary>
/// Represents a permission that can be assigned to roles or users
/// </summary>
public class Permission : BaseEntity
{
    /// <summary>Unique code for the permission (e.g., "billing.create_charges")</summary>
    public string Code { get; private set; } = string.Empty;
    
    /// <summary>Display name</summary>
    public string Name { get; private set; } = string.Empty;
    
    /// <summary>Description of what this permission allows</summary>
    public string? Description { get; private set; }
    
    /// <summary>Permission category/module (e.g., "Billing", "Communications")</summary>
    public string Category { get; private set; } = string.Empty;
    
    /// <summary>Is this a system permission that cannot be deleted?</summary>
    public bool IsSystem { get; private set; }
    
    /// <summary>Is this permission active?</summary>
    public bool IsActive { get; private set; }
    
    // Navigation properties
    public virtual ICollection<RolePermission> RolePermissions { get; private set; } = new List<RolePermission>();
    public virtual ICollection<UserPermission> UserPermissions { get; private set; } = new List<UserPermission>();
    public virtual ICollection<CondominiumRolePermission> CondominiumRolePermissions { get; private set; } = new List<CondominiumRolePermission>();

    private Permission() { } // EF Core

    public static Permission Create(
        string code,
        string name,
        string category,
        string? description = null,
        bool isSystem = false)
    {
        return new Permission
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = name,
            Category = category,
            Description = description,
            IsSystem = isSystem,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(string name, string? description = null)
    {
        Name = name;
        Description = description;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }
}
