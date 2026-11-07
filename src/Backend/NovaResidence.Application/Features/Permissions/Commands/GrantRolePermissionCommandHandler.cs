using Ardalis.Result;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Application.Features.Permissions.Commands;

public class GrantRolePermissionCommandHandler : IRequestHandler<GrantRolePermissionCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public GrantRolePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result> Handle(GrantRolePermissionCommand request, CancellationToken cancellationToken)
    {
        var permission = await _context.Permissions
            .FirstOrDefaultAsync(p => p.Code == request.PermissionCode, cancellationToken);

        if (permission == null)
            return Result.NotFound();

        // Check for existing permission including soft-deleted ones
        var existing = await _context.RolePermissions
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(rp => rp.Role == request.Role && rp.PermissionId == permission.Id, cancellationToken);

        if (existing != null)
        {
            if (!existing.IsDeleted)
            {
                // Permission already granted and active
                return Result.Invalid(new ValidationError("Permission already granted to this role"));
            }
            
            // Restore the soft-deleted permission
            existing.Restore();
            existing.UpdateCanOverride(request.CanOverride);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }

        // Create new role permission
        var rolePermission = RolePermission.Create(request.Role, permission.Id, request.CanOverride);
        _context.RolePermissions.Add(rolePermission);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
