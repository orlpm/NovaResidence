using Ardalis.Result;
using MediatR;
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

    public async Task<Result> Handle(GrantRolePermissionCommand request, CancellationToken cancellationToken)
    {
        var permission = await _context.Permissions
            .FirstOrDefaultAsync(p => p.Code == request.PermissionCode, cancellationToken);

        if (permission == null)
            return Result.NotFound();

        var existing = await _context.RolePermissions
            .FirstOrDefaultAsync(rp => rp.Role == request.Role && rp.PermissionId == permission.Id, cancellationToken);

        if (existing != null)
            return Result.Invalid(new ValidationError("Permission already granted to this role"));

        var rolePermission = RolePermission.Create(request.Role, permission.Id, request.CanOverride);
        _context.RolePermissions.Add(rolePermission);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
