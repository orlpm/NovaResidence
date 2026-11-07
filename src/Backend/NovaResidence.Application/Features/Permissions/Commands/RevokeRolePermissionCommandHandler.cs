using Ardalis.Result;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;

namespace NovaResidence.Application.Features.Permissions.Commands;

public class RevokeRolePermissionCommandHandler : IRequestHandler<RevokeRolePermissionCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public RevokeRolePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result> Handle(RevokeRolePermissionCommand request, CancellationToken cancellationToken)
    {
        var permission = await _context.Permissions
            .FirstOrDefaultAsync(p => p.Code == request.PermissionCode, cancellationToken);

        if (permission == null)
            return Result.NotFound("Permission not found");

        var existing = await _context.RolePermissions
            .FirstOrDefaultAsync(rp => rp.Role == request.Role && rp.PermissionId == permission.Id, cancellationToken);

        if (existing == null)
            return Result.NotFound("Role permission not found");

        _context.RolePermissions.Remove(existing);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
