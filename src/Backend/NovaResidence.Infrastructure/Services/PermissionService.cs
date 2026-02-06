using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Infrastructure.Services;

public class PermissionService : IPermissionService
{
    private readonly IApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(15);

    public PermissionService(IApplicationDbContext context, IMemoryCache cache)
    {
        _context = context;
        _cache = cache;
    }

    public async Task<bool> HasPermissionAsync(Guid userId, string permissionCode, Guid? condominiumId = null, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"permission_{userId}_{permissionCode}_{condominiumId}";
        
        if (_cache.TryGetValue(cacheKey, out bool cachedResult))
            return cachedResult;

        // Get user
        var user = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        
        if (user == null) return false;

        // Check if user is SuperAdmin or Admin by DefaultRole (case-insensitive)
        var isAdmin = user.DefaultRole != null && 
            (user.DefaultRole.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) || 
             user.DefaultRole.Equals("admin", StringComparison.OrdinalIgnoreCase));
        if (isAdmin)
        {
            _cache.Set(cacheKey, true, _cacheExpiration);
            return true;
        }

        // Get permission
        var permission = await _context.Permissions
            .FirstOrDefaultAsync(p => p.Code == permissionCode && p.IsActive, cancellationToken);
        
        if (permission == null) return false;

        // 1. Check UserPermission (highest priority)
        var userPermission = await _context.UserPermissions
            .Where(up => up.UserId == userId && up.PermissionId == permission.Id)
            .Where(up => condominiumId == null || up.CondominiumId == null || up.CondominiumId == condominiumId)
            .Where(up => !up.ExpiresAt.HasValue || up.ExpiresAt.Value > DateTime.UtcNow)
            .OrderByDescending(up => up.CondominiumId.HasValue) // Condominium-specific first
            .FirstOrDefaultAsync(cancellationToken);

        if (userPermission != null)
        {
            _cache.Set(cacheKey, userPermission.IsGranted, _cacheExpiration);
            return userPermission.IsGranted;
        }

        // 2. Check CondominiumRolePermission (if condominium context provided)
        if (condominiumId.HasValue)
        {
            var userCondoRole = user.CondominiumRoles.FirstOrDefault(cr => cr.CondominiumId == condominiumId.Value);
            
            if (userCondoRole != null)
            {
                var condominiumRolePermission = await _context.CondominiumRolePermissions
                    .FirstOrDefaultAsync(
                        crp => crp.CondominiumId == condominiumId.Value 
                            && crp.Role == userCondoRole.Role 
                            && crp.PermissionId == permission.Id,
                        cancellationToken);

                if (condominiumRolePermission != null)
                {
                    _cache.Set(cacheKey, condominiumRolePermission.IsGranted, _cacheExpiration);
                    return condominiumRolePermission.IsGranted;
                }
            }
        }

        // 3. Check RolePermission (base defaults) - use role from condominium or default
        UserRole? roleToCheck = null;
        if (condominiumId.HasValue)
        {
            var userCondoRole = user.CondominiumRoles.FirstOrDefault(cr => cr.CondominiumId == condominiumId.Value);
            if (userCondoRole != null)
                roleToCheck = userCondoRole.Role;
        }
        
        // If no condominium-specific role, check if SuperAdmin by role string
        if (!roleToCheck.HasValue && user.DefaultRole == "SuperAdmin")
            roleToCheck = UserRole.SuperAdmin;
        
        // Default to Owner if no specific role found
        roleToCheck ??= UserRole.Owner;

        var rolePermission = await _context.RolePermissions
            .FirstOrDefaultAsync(
                rp => rp.Role == roleToCheck.Value && rp.PermissionId == permission.Id,
                cancellationToken);

        var result = rolePermission != null;
        _cache.Set(cacheKey, result, _cacheExpiration);
        return result;
    }

    public async Task<bool> HasAnyPermissionAsync(Guid userId, string[] permissionCodes, Guid? condominiumId = null, CancellationToken cancellationToken = default)
    {
        foreach (var code in permissionCodes)
        {
            if (await HasPermissionAsync(userId, code, condominiumId, cancellationToken))
                return true;
        }
        return false;
    }

    public async Task<bool> HasAllPermissionsAsync(Guid userId, string[] permissionCodes, Guid? condominiumId = null, CancellationToken cancellationToken = default)
    {
        foreach (var code in permissionCodes)
        {
            if (!await HasPermissionAsync(userId, code, condominiumId, cancellationToken))
                return false;
        }
        return true;
    }

    public async Task<IEnumerable<string>> GetUserPermissionsAsync(Guid userId, Guid? condominiumId = null, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"user_permissions_{userId}_{condominiumId}";
        
        if (_cache.TryGetValue(cacheKey, out IEnumerable<string>? cachedPermissions) && cachedPermissions != null)
            return cachedPermissions;

        var user = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        
        if (user == null) return Array.Empty<string>();

        // SuperAdmin or admin gets all active permissions (case-insensitive)
        var isAdmin = user.DefaultRole != null && 
            (user.DefaultRole.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) || 
             user.DefaultRole.Equals("admin", StringComparison.OrdinalIgnoreCase));
        if (isAdmin)
        {
            var allPermissions = await _context.Permissions
                .Where(p => p.IsActive)
                .Select(p => p.Code)
                .ToListAsync(cancellationToken);
            
            _cache.Set(cacheKey, allPermissions, _cacheExpiration);
            return allPermissions;
        }

        var permissions = new HashSet<string>();

        // Determine user's role
        UserRole userRole = UserRole.Owner; // Default
        if (condominiumId.HasValue)
        {
            var userCondoRole = user.CondominiumRoles.FirstOrDefault(cr => cr.CondominiumId == condominiumId.Value);
            if (userCondoRole != null)
                userRole = userCondoRole.Role;
        }

        // Get base role permissions
        var rolePermissions = await _context.RolePermissions
            .Where(rp => rp.Role == userRole)
            .Include(rp => rp.Permission)
            .Where(rp => rp.Permission.IsActive)
            .Select(rp => rp.Permission.Code)
            .ToListAsync(cancellationToken);

        foreach (var perm in rolePermissions)
            permissions.Add(perm);

        // Apply condominium-specific overrides
        if (condominiumId.HasValue)
        {
            var userCondoRole = user.CondominiumRoles.FirstOrDefault(cr => cr.CondominiumId == condominiumId.Value);
            
            if (userCondoRole != null)
            {
                var condominiumRolePerms = await _context.CondominiumRolePermissions
                    .Where(crp => crp.CondominiumId == condominiumId.Value && crp.Role == userCondoRole.Role)
                    .Include(crp => crp.Permission)
                    .Where(crp => crp.Permission.IsActive)
                    .ToListAsync(cancellationToken);

                foreach (var crp in condominiumRolePerms)
                {
                    if (crp.IsGranted)
                        permissions.Add(crp.Permission.Code);
                    else
                        permissions.Remove(crp.Permission.Code);
                }
            }
        }

        // Apply user-specific overrides
        var userPermissions = await _context.UserPermissions
            .Where(up => up.UserId == userId)
            .Where(up => condominiumId == null || up.CondominiumId == null || up.CondominiumId == condominiumId)
            .Where(up => !up.ExpiresAt.HasValue || up.ExpiresAt.Value > DateTime.UtcNow)
            .Include(up => up.Permission)
            .Where(up => up.Permission.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var up in userPermissions)
        {
            if (up.IsGranted)
                permissions.Add(up.Permission.Code);
            else
                permissions.Remove(up.Permission.Code);
        }

        var result = permissions.ToList();
        _cache.Set(cacheKey, result, _cacheExpiration);
        return result;
    }

    public async Task<UserRole?> GetUserRoleInCondominiumAsync(Guid userId, Guid condominiumId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"user_role_{userId}_{condominiumId}";
        
        if (_cache.TryGetValue(cacheKey, out UserRole? cachedRole))
            return cachedRole;

        var user = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        
        if (user == null)
            return null;

        // Get role from user's condominium roles
        var condoRole = user.CondominiumRoles.FirstOrDefault(cr => cr.CondominiumId == condominiumId);
        
        if (condoRole != null)
        {
            _cache.Set(cacheKey, condoRole.Role, _cacheExpiration);
            return condoRole.Role;
        }

        return null;
    }
}
