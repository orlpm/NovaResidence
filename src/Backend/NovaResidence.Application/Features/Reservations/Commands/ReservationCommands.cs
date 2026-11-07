using Mediator;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Reservations.Commands;

public record CreateReservationCommand(
    Guid AmenityId,
    Guid ResidentId,
    Guid UnitId,
    DateOnly ReservationDate,
    TimeOnly StartTime,
    TimeOnly EndTime,
    int NumberOfGuests,
    string? Notes
) : IRequest<Result<Guid>>;

public record CancelReservationCommand(
    Guid ReservationId,
    string CancellationReason
) : IRequest<Result>;

public record ApproveReservationCommand(
    Guid ReservationId,
    Guid ApprovedByUserId
) : IRequest<Result>;

public record RejectReservationCommand(
    Guid ReservationId,
    Guid RejectedByUserId,
    string RejectionReason
) : IRequest<Result>;
