using Mediator;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Condominiums.Queries.GetCondominium;

public record GetCondominiumQuery(Guid CondominiumId) : IRequest<Result<CondominiumDetailDto>>;

public record CondominiumDetailDto(
    Guid Id,
    string Name,
    string? Description,
    AddressDto Address,
    bool IsActive,
    int TotalBuildings,
    int TotalUnits,
    DateTime CreatedAt,
    List<BuildingDetailDto> Buildings);

public record AddressDto(
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country,
    Guid? CountryId,
    Guid? StateId);

public record BuildingDetailDto(
    Guid Id,
    string Name,
    string? Description,
    int TotalFloors,
    bool StartsAtGroundFloor,
    int TotalUnits,
    List<UnitDetailDto> Units);

public record UnitDetailDto(
    Guid Id,
    string UnitNumber,
    int Floor,
    decimal? Area,
    int? Bedrooms,
    int? Bathrooms,
    bool HasOwner,
    bool HasRegisteredResident,
    int TotalResidents);
