using Ardalis.Result;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;

namespace NovaResidence.Application.Features.Permissions.Queries;

public class GetRolePermissionsQueryHandler : IRequestHandler<GetRolePermissionsQuery, Result<List<string>>>
{
    private readonly IApplicationDbContext _context;

    public GetRolePermissionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<string>>> Handle(GetRolePermissionsQuery request, CancellationToken cancellationToken)
    {
        var permissions = await _context.RolePermissions
            .Where(rp => rp.Role == request.Role)
            .Include(rp => rp.Permission)
            .Where(rp => rp.Permission.IsActive)
            .Select(rp => rp.Permission.Code)
            .ToListAsync(cancellationToken);

        return Result.Success(permissions);
    }
}
