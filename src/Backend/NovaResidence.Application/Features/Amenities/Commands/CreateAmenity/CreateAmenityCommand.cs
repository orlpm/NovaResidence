using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Amenities.Commands.CreateAmenity;

public record CreateAmenityCommand(
    Guid CondominiumId,
    string Name,
    string Description,
    int Type,
    int Capacity,
    bool RequiresReservation,
    bool RequiresApproval,
    TimeSpan OpeningTime,
    TimeSpan ClosingTime,
    decimal? ReservationFee = null,
    int MinReservationHours = 1,
    int MaxReservationHours = 4,
    string? Rules = null
) : IRequest<Result<CreateAmenityResponse>>;

public record CreateAmenityResponse(
    Guid AmenityId,
    string Name,
    string Type,
    bool IsActive
);
