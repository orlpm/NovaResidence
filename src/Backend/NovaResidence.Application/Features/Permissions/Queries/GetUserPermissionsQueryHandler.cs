using Ardalis.Result;
using Mediator;
using NovaResidence.Application.Common.Interfaces;

namespace NovaResidence.Application.Features.Permissions.Queries;

public class GetUserPermissionsQueryHandler : IRequestHandler<GetUserPermissionsQuery, Result<List<string>>>
{
    private readonly IPermissionService _permissionService;

    public GetUserPermissionsQueryHandler(IPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    public async ValueTask<Result<List<string>>> Handle(GetUserPermissionsQuery request, CancellationToken cancellationToken)
    {
        var permissions = await _permissionService.GetUserPermissionsAsync(
            request.UserId,
            request.CondominiumId,
            cancellationToken);

        return Result.Success(permissions.ToList());
    }
}
