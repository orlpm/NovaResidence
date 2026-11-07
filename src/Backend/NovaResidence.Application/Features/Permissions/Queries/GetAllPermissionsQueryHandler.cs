using Ardalis.Result;
using Mediator;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;

namespace NovaResidence.Application.Features.Permissions.Queries;

public class GetAllPermissionsQueryHandler : IRequestHandler<GetAllPermissionsQuery, Result<List<PermissionDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetAllPermissionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<PermissionDto>>> Handle(GetAllPermissionsQuery request, CancellationToken cancellationToken)
    {
        var permissions = await _context.Permissions
            .OrderBy(p => p.Category)
            .ThenBy(p => p.Name)
            .Select(p => new PermissionDto
            {
                Id = p.Id,
                Code = p.Code,
                Name = p.Name,
                Description = p.Description,
                Category = p.Category,
                IsSystem = p.IsSystem,
                IsActive = p.IsActive
            })
            .ToListAsync(cancellationToken);

        return Result.Success(permissions);
    }
}
