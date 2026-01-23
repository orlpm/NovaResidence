using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.UpdateAmenity;

public record UpdateAmenityCommand(
    Guid AmenityId,
    string Name,
    string Description,
    int Capacity,
    TimeSpan OpeningTime,
    TimeSpan ClosingTime,
    bool RequiresReservation,
    decimal? ReservationFee = null,
    int MinReservationHours = 1,
    int MaxReservationHours = 4,
    string? Rules = null
) : IRequest<Result<UpdateAmenityResponse>>;

public record UpdateAmenityResponse(
    Guid AmenityId,
    string Name,
    bool IsActive
);
