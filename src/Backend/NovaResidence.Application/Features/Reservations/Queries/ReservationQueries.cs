using MediatR;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Reservations.Queries;

// DTOs
public record ReservationListDto(
    Guid Id,
    string AmenityName,
    string ReservationDate,
    string StartTime,
    string EndTime,
    ReservationStatus Status,
    string StatusName,
    int NumberOfGuests,
    string ResidentName,
    string? UnitNumber,
    decimal? TotalCost,
    DateTime CreatedAt
);

public record ReservationDetailDto(
    Guid Id,
    Guid CondominiumId,
    Guid AmenityId,
    string AmenityName,
    Guid ResidentId,
    string ResidentName,
    Guid UnitId,
    string UnitNumber,
    string ReservationDate,
    string StartTime,
    string EndTime,
    ReservationStatus Status,
    int NumberOfGuests,
    string? Notes,
    DateTime CreatedAt,
    DateTime? CancelledAt,
    string? CancellationReason,
    string? CancelledBy
);

// Queries
public record GetReservationQuery(Guid ReservationId) : IRequest<Result<ReservationDetailDto>>;

public record GetUnitReservationsQuery(Guid UnitId) : IRequest<Result<List<ReservationListDto>>>;

public record GetCondominiumReservationsQuery(Guid CondominiumId) : IRequest<Result<List<ReservationListDto>>>;
