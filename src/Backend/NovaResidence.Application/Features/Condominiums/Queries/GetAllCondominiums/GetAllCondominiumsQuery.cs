using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Condominiums.Queries.GetAllCondominiums;

public record GetAllCondominiumsQuery : IRequest<Result<List<CondominiumListDto>>>;

public record CondominiumListDto(
    Guid Id,
    string Name,
    string? Description,
    string Address,
    string? TaxId,
    string? LegalName,
    bool IsActive,
    int TotalBuildings,
    int TotalUnits,
    int TotalUsers,
    DateTime CreatedAt,
    string? AdminEmail);
