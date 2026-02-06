using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Reservations.Queries;

public class GetReservationQueryHandler : IRequestHandler<GetReservationQuery, Result<ReservationDetailDto>>
{
    private readonly IApplicationDbContext _context;

    public GetReservationQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ReservationDetailDto>> Handle(GetReservationQuery request, CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .Include(r => r.Amenity)
            .Include(r => r.Unit)
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (reservation == null)
            return Result.NotFound("Reservation not found");

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == reservation.ReservedByUserId, cancellationToken);

        var residentName = user == null ? "Usuario" : $"{user.FirstName} {user.LastName}";

        var dto = new ReservationDetailDto(
            reservation.Id,
            reservation.Amenity?.CondominiumId ?? Guid.Empty,
            reservation.AmenityId,
            reservation.Amenity?.Name ?? string.Empty,
            reservation.ReservedByUserId,
            residentName,
            reservation.UnitId,
            reservation.Unit?.UnitNumber ?? string.Empty,
            reservation.StartDateTime.ToString("yyyy-MM-dd"),
            reservation.StartDateTime.ToString("HH:mm"),
            reservation.EndDateTime.ToString("HH:mm"),
            reservation.Status,
            reservation.NumberOfGuests,
            reservation.Notes,
            reservation.CreatedAt,
            reservation.CancelledAt,
            reservation.CancellationReason,
            null
        );

        return Result.Success(dto);
    }
}

public class GetUnitReservationsQueryHandler : IRequestHandler<GetUnitReservationsQuery, Result<List<ReservationListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetUnitReservationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ReservationListDto>>> Handle(GetUnitReservationsQuery request, CancellationToken cancellationToken)
    {
        var reservations = await (
            from r in _context.Reservations
            join u in _context.Users on r.ReservedByUserId equals u.Id into userJoin
            from u in userJoin.DefaultIfEmpty()
            where r.UnitId == request.UnitId
            orderby r.StartDateTime descending
            select new ReservationListDto(
                r.Id,
                r.Amenity != null ? r.Amenity.Name : string.Empty,
                r.StartDateTime.ToString("yyyy-MM-dd"),
                r.StartDateTime.ToString("HH:mm"),
                r.EndDateTime.ToString("HH:mm"),
                r.Status,
                GetStatusName(r.Status),
                r.NumberOfGuests,
                u == null ? "Usuario" : $"{u.FirstName} {u.LastName}",
                r.Unit != null ? r.Unit.UnitNumber : string.Empty,
                r.Fee,
                r.CreatedAt
            )
        ).ToListAsync(cancellationToken);

        return Result.Success(reservations);
    }

    private static string GetStatusName(ReservationStatus status)
    {
        return status switch
        {
            ReservationStatus.Pending => "Pendiente",
            ReservationStatus.Confirmed => "Confirmada",
            ReservationStatus.InProgress => "En progreso",
            ReservationStatus.Rejected => "Rechazada",
            ReservationStatus.Cancelled => "Cancelada",
            ReservationStatus.Completed => "Completada",
            ReservationStatus.NoShow => "No se presentó",
            _ => status.ToString()
        };
    }
}

public class GetCondominiumReservationsQueryHandler : IRequestHandler<GetCondominiumReservationsQuery, Result<List<ReservationListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetCondominiumReservationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<List<ReservationListDto>>> Handle(GetCondominiumReservationsQuery request, CancellationToken cancellationToken)
    {
        var reservations = await (
            from r in _context.Reservations
            join u in _context.Users on r.ReservedByUserId equals u.Id into userJoin
            from u in userJoin.DefaultIfEmpty()
            where r.Amenity != null && r.Amenity.CondominiumId == request.CondominiumId
            orderby r.StartDateTime descending
            select new ReservationListDto(
                r.Id,
                r.Amenity != null ? r.Amenity.Name : string.Empty,
                r.StartDateTime.ToString("yyyy-MM-dd"),
                r.StartDateTime.ToString("HH:mm"),
                r.EndDateTime.ToString("HH:mm"),
                r.Status,
                GetStatusName(r.Status),
                r.NumberOfGuests,
                u == null ? "Usuario" : $"{u.FirstName} {u.LastName}",
                r.Unit != null ? r.Unit.UnitNumber : string.Empty,
                r.Fee,
                r.CreatedAt
            )
        ).ToListAsync(cancellationToken);

        return Result.Success(reservations);
    }

    private static string GetStatusName(ReservationStatus status)
    {
        return status switch
        {
            ReservationStatus.Pending => "Pendiente",
            ReservationStatus.Confirmed => "Confirmada",
            ReservationStatus.InProgress => "En progreso",
            ReservationStatus.Rejected => "Rechazada",
            ReservationStatus.Cancelled => "Cancelada",
            ReservationStatus.Completed => "Completada",
            ReservationStatus.NoShow => "No se presentó",
            _ => status.ToString()
        };
    }
}
