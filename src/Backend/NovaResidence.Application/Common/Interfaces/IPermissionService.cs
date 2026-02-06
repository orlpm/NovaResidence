using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Common.Interfaces;

/// <summary>
/// Service for checking and managing user permissions
/// </summary>
public interface IPermissionService
{
    /// <summary>
    /// Check if user has a specific permission in a condominium context
    /// Resolution order: UserPermission > CondominiumRolePermission > RolePermission
    /// </summary>
    Task<bool> HasPermissionAsync(Guid userId, string permissionCode, Guid? condominiumId = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if user has any of the specified permissions
    /// </summary>
    Task<bool> HasAnyPermissionAsync(Guid userId, string[] permissionCodes, Guid? condominiumId = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check if user has all of the specified permissions
    /// </summary>
    Task<bool> HasAllPermissionsAsync(Guid userId, string[] permissionCodes, Guid? condominiumId = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get all effective permissions for a user in a condominium
    /// </summary>
    Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId, Guid? condominiumId = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get user's role in a specific condominium (from Residents table)
    /// </summary>
    Task<UserRole?> GetUserRoleInCondominiumAsync(Guid userId, Guid condominiumId, CancellationToken cancellationToken = default);
}
