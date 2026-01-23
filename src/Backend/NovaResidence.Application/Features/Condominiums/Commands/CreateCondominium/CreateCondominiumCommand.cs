using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Condominiums.Commands.CreateCondominium;

public record CreateCondominiumCommand(
    Guid UserId,
    string Name,
    string? Description,
    // Address
    string Street,
    string City,
    string State,
    string PostalCode,
    string Country,
    string? Neighborhood,
    // Buildings and Units
    List<CreateBuildingDto> Buildings
) : IRequest<Result<CreateCondominiumResponse>>;

public record CreateBuildingDto(
    string Name,
    string Type, // "vertical" or "horizontal"
    string? Section,
    int TotalFloors,
    List<CreateUnitDto> Units
);

public record CreateUnitDto(
    string UnitNumber,
    int Floor,
    bool IsCommercial,
    decimal Area,
    int Bedrooms,
    int Bathrooms,
    decimal MonthlyMaintenanceFee
);

public record CreateCondominiumResponse(
    Guid CondominiumId,
    string Name,
    int TotalBuildings,
    int TotalUnits
);
