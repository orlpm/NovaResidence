using Ardalis.Result;
using Mediator;

namespace NovaResidence.Application.Features.Permissions.Queries;

public record GetUserPermissionsQuery(
    Guid UserId,
    Guid? CondominiumId = null
) : IRequest<Result<List<string>>>;
