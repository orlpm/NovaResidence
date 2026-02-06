using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Application.Features.Permissions.Commands;

public class GrantUserPermissionCommandHandler : IRequestHandler<GrantUserPermissionCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public GrantUserPermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(GrantUserPermissionCommand request, CancellationToken cancellationToken)
    {
        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);

        if (user == null)
            return Result.NotFound();

        var permission = await _context.Permissions
            .FirstOrDefaultAsync(p => p.Code == request.PermissionCode, cancellationToken);

        if (permission == null)
            return Result.NotFound();

        // Remove existing permission with same scope
        var existing = await _context.UserPermissions
            .Where(up => up.UserId == request.UserId 
                && up.PermissionId == permission.Id
                && up.CondominiumId == request.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        if (existing != null)
            _context.UserPermissions.Remove(existing);

        var userPermission = UserPermission.Grant(
            request.UserId,
            permission.Id,
            request.CondominiumId,
            request.ExpiresAt,
            request.Reason);

        _context.UserPermissions.Add(userPermission);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
