using Mediator;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Condominiums.Queries.GetUserCondominiums;

public record GetUserCondominiumsQuery(Guid UserId) : IRequest<Result<List<UserCondominiumDto>>>;

public record UserCondominiumDto(
    Guid Id,
    string Name,
    string? Description,
    string Address,
    bool IsActive,
    int TotalBuildings,
    int TotalUnits,
    DateTime CreatedAt
);
