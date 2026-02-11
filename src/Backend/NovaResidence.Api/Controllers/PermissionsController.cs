using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Application.Features.Permissions.Commands;
using NovaResidence.Application.Features.Permissions.Queries;
using NovaResidence.Domain.Enums;

namespace NovaResidence.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PermissionsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IPermissionService _permissionService;

    public PermissionsController(IMediator mediator, IPermissionService permissionService)
    {
        _mediator = mediator;
        _permissionService = permissionService;
    }

    /// <summary>
    /// Get all available permissions
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllPermissions()
    {
        var result = await _mediator.Send(new GetAllPermissionsQuery());
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }

    /// <summary>
    /// Get permissions for a specific role
    /// </summary>
    [HttpGet("role/{role}")]
    public async Task<IActionResult> GetRolePermissions(UserRole role)
    {
        var result = await _mediator.Send(new GetRolePermissionsQuery(role));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }

    /// <summary>
    /// Grant permission to a role
    /// </summary>
    [HttpPost("role/{role}/grant")]
    public async Task<IActionResult> GrantRolePermission(
        UserRole role,
        [FromBody] GrantRolePermissionRequest request)
    {
        // Only SuperAdmins can modify permissions for SuperAdmin and CondominiumAdmin roles
        if (role == UserRole.SuperAdmin || role == UserRole.CondominiumAdmin)
        {
            var callerRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                          ?? User.FindFirst("role")?.Value;
            if (callerRole == null || !callerRole.Equals("superadmin", StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }
        }

        var command = new GrantRolePermissionCommand(role, request.PermissionCode, request.CanOverride);
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok() : BadRequest(result.Errors);
    }

    /// <summary>
    /// Revoke permission from a role
    /// </summary>
    [HttpPost("role/{role}/revoke")]
    public async Task<IActionResult> RevokeRolePermission(
        UserRole role,
        [FromBody] RevokeRolePermissionRequest request)
    {
        // Only SuperAdmins can modify permissions for SuperAdmin and CondominiumAdmin roles
        if (role == UserRole.SuperAdmin || role == UserRole.CondominiumAdmin)
        {
            var callerRole = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
                          ?? User.FindFirst("role")?.Value;
            if (callerRole == null || !callerRole.Equals("superadmin", StringComparison.OrdinalIgnoreCase))
            {
                return Forbid();
            }
        }

        var command = new RevokeRolePermissionCommand(role, request.PermissionCode);
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok() : BadRequest(result.Errors);
    }

    /// <summary>
    /// Get effective permissions for a user
    /// </summary>
    [HttpGet("user/{userId}")]
    public async Task<IActionResult> GetUserPermissions(Guid userId, [FromQuery] Guid? condominiumId = null)
    {
        var result = await _mediator.Send(new GetUserPermissionsQuery(userId, condominiumId));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }

    /// <summary>
    /// Check if user has a specific permission
    /// </summary>
    [HttpGet("user/{userId}/check/{permissionCode}")]
    public async Task<IActionResult> CheckUserPermission(
        Guid userId, 
        string permissionCode, 
        [FromQuery] Guid? condominiumId = null)
    {
        var hasPermission = await _permissionService.HasPermissionAsync(userId, permissionCode, condominiumId);
        return Ok(new { hasPermission });
    }

    /// <summary>
    /// Grant permission to a specific user
    /// </summary>
    [HttpPost("user/{userId}/grant")]
    public async Task<IActionResult> GrantUserPermission(
        Guid userId,
        [FromBody] GrantUserPermissionRequest request)
    {
        var command = new GrantUserPermissionCommand(
            userId,
            request.PermissionCode,
            request.CondominiumId,
            request.ExpiresAt,
            request.Reason);
        
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok() : BadRequest(result.Errors);
    }

    /// <summary>
    /// Revoke permission from a specific user
    /// </summary>
    [HttpPost("user/{userId}/revoke")]
    public async Task<IActionResult> RevokeUserPermission(
        Guid userId,
        [FromBody] RevokeUserPermissionRequest request)
    {
        var command = new RevokeUserPermissionCommand(
            userId,
            request.PermissionCode,
            request.CondominiumId,
            request.Reason);
        
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok() : BadRequest(result.Errors);
    }

    /// <summary>
    /// Override permission for a role in a specific condominium
    /// </summary>
    [HttpPost("condominium/{condominiumId}/role/{role}/set")]
    public async Task<IActionResult> SetCondominiumRolePermission(
        Guid condominiumId,
        UserRole role,
        [FromBody] SetCondominiumRolePermissionRequest request)
    {
        var command = new SetCondominiumRolePermissionCommand(
            condominiumId,
            role,
            request.PermissionCode,
            request.IsGranted);
        
        var result = await _mediator.Send(command);
        return result.IsSuccess ? Ok() : BadRequest(result.Errors);
    }
}

// Request DTOs
public record GrantRolePermissionRequest(string PermissionCode, bool CanOverride = true);
public record RevokeRolePermissionRequest(string PermissionCode);
public record GrantUserPermissionRequest(string PermissionCode, Guid? CondominiumId = null, DateTime? ExpiresAt = null, string? Reason = null);
public record RevokeUserPermissionRequest(string PermissionCode, Guid? CondominiumId = null, string? Reason = null);
public record SetCondominiumRolePermissionRequest(string PermissionCode, bool IsGranted);
