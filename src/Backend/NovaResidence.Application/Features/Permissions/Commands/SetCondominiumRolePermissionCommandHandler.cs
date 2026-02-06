using Ardalis.Result;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Application.Features.Permissions.Commands;

public class SetCondominiumRolePermissionCommandHandler : IRequestHandler<SetCondominiumRolePermissionCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public SetCondominiumRolePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(SetCondominiumRolePermissionCommand request, CancellationToken cancellationToken)
    {
        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(c => c.Id == request.CondominiumId, cancellationToken);

        if (condominium == null)
            return Result.NotFound();

        var permission = await _context.Permissions
            .FirstOrDefaultAsync(p => p.Code == request.PermissionCode, cancellationToken);

        if (permission == null)
            return Result.NotFound();

        var existing = await _context.CondominiumRolePermissions
            .FirstOrDefaultAsync(
                crp => crp.CondominiumId == request.CondominiumId 
                    && crp.Role == request.Role 
                    && crp.PermissionId == permission.Id,
                cancellationToken);

        if (existing != null)
        {
            if (existing.IsGranted != request.IsGranted)
            {
                existing.Toggle();
                await _context.SaveChangesAsync(cancellationToken);
            }
        }
        else
        {
            var condominiumRolePermission = CondominiumRolePermission.Create(
                request.CondominiumId,
                request.Role,
                permission.Id,
                request.IsGranted);

            _context.CondominiumRolePermissions.Add(condominiumRolePermission);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Result.Success();
    }
}
