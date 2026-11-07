using Mediator;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Queries.GetAmenity;

public record GetAmenityQuery(Guid AmenityId) : IRequest<Result<AmenityDetailDto>>;

public record AmenityDetailDto(
    Guid Id,
    Guid CondominiumId,
    string Name,
    string Description,
    string Type,
    int TypeId,
    int Capacity,
    bool RequiresReservation,
    bool RequiresApproval,
    bool IsActive,
    decimal? ReservationFee,
    int MinReservationHours,
    int MaxReservationHours,
    string? Rules,
    string OpeningTime,
    string ClosingTime,
    DateTime CreatedAt
);
