using Mediator;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Reservations.Commands;

public class CreateReservationCommandHandler : IRequestHandler<CreateReservationCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public CreateReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<Guid>> Handle(CreateReservationCommand request, CancellationToken cancellationToken)
    {
        // Validate amenity exists and is active
        var amenity = await _context.Amenities
            .FirstOrDefaultAsync(a => a.Id == request.AmenityId, cancellationToken);

        if (amenity == null)
            return Result.NotFound("Amenity not found");

        if (!amenity.IsActive)
            return Result.Invalid(new ValidationError("Amenity is not available for reservations"));

        if (!amenity.RequiresReservation)
            return Result.Invalid(new ValidationError("This amenity does not accept reservations"));

        // Validate resident exists
        var resident = await _context.Residents
            .FirstOrDefaultAsync(r => r.Id == request.ResidentId, cancellationToken);

        if (resident == null)
            return Result.NotFound("Resident not found");

        // Validate unit exists
        var unit = await _context.Units
            .FirstOrDefaultAsync(u => u.Id == request.UnitId, cancellationToken);

        if (unit == null)
            return Result.NotFound("Unit not found");

        // Validate times
        if (request.StartTime >= request.EndTime)
            return Result.Invalid(new ValidationError("End time must be after start time"));

        if (request.StartTime < TimeOnly.FromTimeSpan(amenity.OpeningTime) ||
            request.EndTime > TimeOnly.FromTimeSpan(amenity.ClosingTime))
            return Result.Invalid(new ValidationError($"Reservations must be within operating hours ({amenity.OpeningTime:hh\\:mm} - {amenity.ClosingTime:hh\\:mm})"));

        // Validate reservation date
        if (request.ReservationDate < DateOnly.FromDateTime(DateTime.Now))
            return Result.Invalid(new ValidationError("Cannot create reservations for past dates"));

        if (request.NumberOfGuests <= 0)
            return Result.Invalid(new ValidationError("Number of guests must be greater than zero"));

        // Check for conflicting reservations in the Reservations table
        var startDateTime = request.ReservationDate.ToDateTime(request.StartTime);
        var endDateTime = request.ReservationDate.ToDateTime(request.EndTime);
        var reservationDuration = endDateTime - startDateTime;

        if (reservationDuration < TimeSpan.FromHours(amenity.MinReservationHours))
            return Result.Invalid(new ValidationError($"Reservations must be at least {amenity.MinReservationHours} hour(s)"));

        if (reservationDuration > TimeSpan.FromHours(amenity.MaxReservationHours))
            return Result.Invalid(new ValidationError($"Reservations cannot exceed {amenity.MaxReservationHours} hour(s)"));
        
        var hasConflict = await _context.Reservations
            .AnyAsync(r => 
                r.AmenityId == request.AmenityId &&
                r.Status != ReservationStatus.Cancelled &&
                r.Status != ReservationStatus.Rejected &&
                ((startDateTime >= r.StartDateTime && startDateTime < r.EndDateTime) ||
                 (endDateTime > r.StartDateTime && endDateTime <= r.EndDateTime) ||
                 (startDateTime <= r.StartDateTime && endDateTime >= r.EndDateTime)),
                cancellationToken);

        if (hasConflict)
            return Result.Invalid(new ValidationError("This time slot is already reserved"));

        // Validate number of guests against capacity
        if (request.NumberOfGuests > amenity.Capacity)
            return Result.Invalid(new ValidationError($"Number of guests exceeds amenity capacity of {amenity.Capacity}"));

        // Create reservation using the Reservation entity (linked to Amenity)
        var reservation = Reservation.Create(
            request.AmenityId,
            request.UnitId,
            request.ResidentId,
            startDateTime,
            endDateTime,
            request.NumberOfGuests,
            amenity.RequiresApproval,
            amenity.ReservationFee,
            request.Notes
        );

        _context.Reservations.Add(reservation);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(reservation.Id);
    }
}

public class CancelReservationCommandHandler : IRequestHandler<CancelReservationCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public CancelReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result> Handle(CancelReservationCommand request, CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (reservation == null)
            return Result.NotFound("Reservation not found");

        if (reservation.Status == ReservationStatus.Cancelled)
            return Result.Invalid(new ValidationError("Reservation is already cancelled"));

        if (reservation.Status == ReservationStatus.Completed)
            return Result.Invalid(new ValidationError("Cannot cancel a completed reservation"));

        reservation.Cancel(request.CancellationReason);

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class ApproveReservationCommandHandler : IRequestHandler<ApproveReservationCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ApproveReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result> Handle(ApproveReservationCommand request, CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (reservation == null)
            return Result.NotFound("Reservación no encontrada");

        if (reservation.Status != ReservationStatus.Pending)
            return Result.Invalid(new ValidationError("Solo se pueden aprobar reservaciones pendientes"));

        reservation.Approve();

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}

public class RejectReservationCommandHandler : IRequestHandler<RejectReservationCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public RejectReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result> Handle(RejectReservationCommand request, CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(r => r.Id == request.ReservationId, cancellationToken);

        if (reservation == null)
            return Result.NotFound("Reservación no encontrada");

        if (reservation.Status != ReservationStatus.Pending)
            return Result.Invalid(new ValidationError("Solo se pueden rechazar reservaciones pendientes"));

        reservation.Reject(request.RejectionReason);

        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
