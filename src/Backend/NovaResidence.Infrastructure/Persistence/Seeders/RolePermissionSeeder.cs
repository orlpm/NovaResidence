using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Constants;
using NovaResidence.Domain.Entities.Authentication;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Infrastructure.Persistence.Seeders;

public class RolePermissionSeeder
{
    private readonly IApplicationDbContext _context;

    public RolePermissionSeeder(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SeedAsync()
    {
        // Check if role permissions already exist
        var existingCount = await _context.RolePermissions.CountAsync();
        if (existingCount > 0) return;

        // Get all permissions
        var permissions = await _context.Permissions.ToListAsync();
        var permissionDict = permissions.ToDictionary(p => p.Code, p => p.Id);

        var rolePermissions = new List<RolePermission>();

        // SuperAdmin - Gets all permissions (handled in service, but we seed for consistency)
        foreach (var permCode in permissionDict.Keys)
        {
            rolePermissions.Add(RolePermission.Create(UserRole.SuperAdmin, permissionDict[permCode], false));
        }

        // CondominiumAdmin - Full control within their condominium
        var adminPermissions = new[]
        {
            // Billing - Full access
            PermissionCodes.BILLING_VIEW,
            PermissionCodes.BILLING_CREATE_CHARGES,
            PermissionCodes.BILLING_EDIT_CHARGES,
            PermissionCodes.BILLING_DELETE_CHARGES,
            PermissionCodes.BILLING_RECORD_PAYMENTS,
            PermissionCodes.BILLING_CANCEL_CHARGES,
            PermissionCodes.BILLING_FORGIVE_CHARGES,
            PermissionCodes.BILLING_EXPORT,
            PermissionCodes.BILLING_VIEW_ALL_UNITS,
            
            // Residents - Full access
            PermissionCodes.RESIDENTS_VIEW,
            PermissionCodes.RESIDENTS_CREATE,
            PermissionCodes.RESIDENTS_EDIT,
            PermissionCodes.RESIDENTS_DELETE,
            PermissionCodes.RESIDENTS_REGISTER_ACCOUNTS,
            PermissionCodes.RESIDENTS_VIEW_SENSITIVE_DATA,
            
            // Communications - Full access
            PermissionCodes.COMMUNICATIONS_VIEW_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_CREATE_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_EDIT_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_DELETE_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_PUBLISH_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_VIEW_POLLS,
            PermissionCodes.COMMUNICATIONS_CREATE_POLLS,
            PermissionCodes.COMMUNICATIONS_MANAGE_POLLS,
            PermissionCodes.COMMUNICATIONS_VIEW_POLL_RESULTS,
            PermissionCodes.COMMUNICATIONS_VIEW_MEETINGS,
            PermissionCodes.COMMUNICATIONS_CREATE_MEETINGS,
            PermissionCodes.COMMUNICATIONS_MANAGE_MEETINGS,
            PermissionCodes.COMMUNICATIONS_VIEW_MEETING_MINUTES,
            PermissionCodes.COMMUNICATIONS_VIEW_FORUM,
            PermissionCodes.COMMUNICATIONS_POST_FORUM,
            PermissionCodes.COMMUNICATIONS_MODERATE_FORUM,
            
            // Incidents - Full access
            PermissionCodes.INCIDENTS_VIEW,
            PermissionCodes.INCIDENTS_CREATE,
            PermissionCodes.INCIDENTS_EDIT,
            PermissionCodes.INCIDENTS_ASSIGN,
            PermissionCodes.INCIDENTS_CLOSE,
            PermissionCodes.INCIDENTS_DELETE,
            PermissionCodes.INCIDENTS_VIEW_ALL,
            
            // Security - Full access
            PermissionCodes.SECURITY_VIEW_ACCESS_LOG,
            PermissionCodes.SECURITY_MANAGE_VISITORS,
            PermissionCodes.SECURITY_MANAGE_ACCESS_CONTROL,
            PermissionCodes.SECURITY_VIEW_CAMERAS,
            
            // Reservations - Full access
            PermissionCodes.RESERVATIONS_VIEW,
            PermissionCodes.RESERVATIONS_CREATE,
            PermissionCodes.RESERVATIONS_EDIT,
            PermissionCodes.RESERVATIONS_DELETE,
            PermissionCodes.RESERVATIONS_MANAGE,
            PermissionCodes.RESERVATIONS_VIEW_ALL,
            
            // Settings - Full access
            PermissionCodes.SETTINGS_VIEW,
            PermissionCodes.SETTINGS_EDIT_CONDOMINIUM,
            PermissionCodes.SETTINGS_MANAGE_USERS,
            PermissionCodes.SETTINGS_MANAGE_ROLES,
            PermissionCodes.SETTINGS_MANAGE_BUILDINGS,
            PermissionCodes.SETTINGS_MANAGE_UNITS,
            PermissionCodes.SETTINGS_MANAGE_AMENITIES,
            PermissionCodes.SETTINGS_MANAGE_FEE_CONFIGS,
            
            // Reports - Full access
            PermissionCodes.REPORTS_VIEW,
            PermissionCodes.REPORTS_EXPORT,
            PermissionCodes.REPORTS_FINANCIAL,
            PermissionCodes.REPORTS_OPERATIONAL,
            PermissionCodes.REPORTS_CUSTOM
        };
        
        foreach (var permCode in adminPermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.CondominiumAdmin, permissionDict[permCode], true));
        }

        // CondominiumSubAdmin - Limited access (can be customized per condominium)
        var subAdminPermissions = new[]
        {
            PermissionCodes.BILLING_VIEW,
            PermissionCodes.BILLING_CREATE_CHARGES,
            PermissionCodes.BILLING_RECORD_PAYMENTS,
            PermissionCodes.BILLING_VIEW_ALL_UNITS,
            PermissionCodes.RESIDENTS_VIEW,
            PermissionCodes.RESIDENTS_CREATE,
            PermissionCodes.RESIDENTS_EDIT,
            PermissionCodes.COMMUNICATIONS_VIEW_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_CREATE_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_VIEW_POLLS,
            PermissionCodes.COMMUNICATIONS_VIEW_MEETINGS,
            PermissionCodes.INCIDENTS_VIEW,
            PermissionCodes.INCIDENTS_CREATE,
            PermissionCodes.INCIDENTS_VIEW_ALL,
            PermissionCodes.RESERVATIONS_VIEW,
            PermissionCodes.RESERVATIONS_VIEW_ALL,
            PermissionCodes.REPORTS_VIEW,
            PermissionCodes.REPORTS_EXPORT
        };
        
        foreach (var permCode in subAdminPermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.SubAdmin, permissionDict[permCode], true));
        }

        // Owner - Basic resident permissions + billing view
        var ownerPermissions = new[]
        {
            PermissionCodes.BILLING_VIEW,
            PermissionCodes.COMMUNICATIONS_VIEW_ANNOUNCEMENTS,
            PermissionCodes.COMMUNICATIONS_VIEW_POLLS,
            PermissionCodes.COMMUNICATIONS_VIEW_MEETINGS,
            PermissionCodes.COMMUNICATIONS_VIEW_FORUM,
            PermissionCodes.COMMUNICATIONS_POST_FORUM,
            PermissionCodes.INCIDENTS_VIEW,
            PermissionCodes.INCIDENTS_CREATE,
            PermissionCodes.RESERVATIONS_VIEW,
            PermissionCodes.RESERVATIONS_CREATE
        };
        
        foreach (var permCode in ownerPermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.Owner, permissionDict[permCode], true));
        }

        // Tenant - Similar to Owner
        foreach (var permCode in ownerPermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.Tenant, permissionDict[permCode], true));
        }

        // SecurityGuard - Security and visitor management
        var securityPermissions = new[]
        {
            PermissionCodes.SECURITY_VIEW_ACCESS_LOG,
            PermissionCodes.SECURITY_MANAGE_VISITORS,
            PermissionCodes.SECURITY_VIEW_CAMERAS,
            PermissionCodes.INCIDENTS_VIEW,
            PermissionCodes.INCIDENTS_CREATE,
            PermissionCodes.RESERVATIONS_VIEW
        };
        
        foreach (var permCode in securityPermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.SecurityGuard, permissionDict[permCode], true));
        }

        // Maintenance - Incident management
        var maintenancePermissions = new[]
        {
            PermissionCodes.INCIDENTS_VIEW,
            PermissionCodes.INCIDENTS_CREATE,
            PermissionCodes.INCIDENTS_EDIT,
            PermissionCodes.INCIDENTS_CLOSE,
            PermissionCodes.RESERVATIONS_VIEW
        };
        
        foreach (var permCode in maintenancePermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.Maintenance, permissionDict[permCode], true));
        }

        // ServiceProvider - Limited incident view
        var serviceProviderPermissions = new[]
        {
            PermissionCodes.INCIDENTS_VIEW,
            PermissionCodes.INCIDENTS_CREATE
        };
        
        foreach (var permCode in serviceProviderPermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.ServiceProvider, permissionDict[permCode], true));
        }

        // Accountant - Financial reports and billing
        var accountantPermissions = new[]
        {
            PermissionCodes.BILLING_VIEW,
            PermissionCodes.BILLING_CREATE_CHARGES,
            PermissionCodes.BILLING_RECORD_PAYMENTS,
            PermissionCodes.BILLING_EXPORT,
            PermissionCodes.BILLING_VIEW_ALL_UNITS,
            PermissionCodes.REPORTS_VIEW,
            PermissionCodes.REPORTS_EXPORT,
            PermissionCodes.REPORTS_FINANCIAL
        };
        
        foreach (var permCode in accountantPermissions)
        {
            if (permissionDict.ContainsKey(permCode))
                rolePermissions.Add(RolePermission.Create(UserRole.Accountant, permissionDict[permCode], true));
        }

        _context.RolePermissions.AddRange(rolePermissions);
        await _context.SaveChangesAsync(CancellationToken.None);
    }
}
