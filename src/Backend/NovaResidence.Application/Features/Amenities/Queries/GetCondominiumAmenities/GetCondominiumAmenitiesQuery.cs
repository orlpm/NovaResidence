using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Queries.GetCondominiumAmenities;

public record GetCondominiumAmenitiesQuery(Guid CondominiumId) : IRequest<Result<List<AmenityListDto>>>;

public record AmenityListDto(
    Guid Id,
    string Name,
    string Description,
    string Type,
    int TypeId,
    int Capacity,
    bool RequiresReservation,
    bool RequiresApproval,
    bool IsActive,
    decimal? ReservationFee,
    string OpeningTime,
    string ClosingTime
);
