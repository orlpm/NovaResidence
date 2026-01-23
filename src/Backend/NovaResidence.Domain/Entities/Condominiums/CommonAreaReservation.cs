using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents a reservation for a common area (Reservations Module)
/// </summary>
public class CommonAreaReservation : BaseEntity
{
    public Guid CommonAreaId { get; private set; }
    public Guid UserId { get; private set; }
    public Guid UnitId { get; private set; }
    public DateTime ReservationDate { get; private set; }
    public TimeSpan StartTime { get; private set; }
    public TimeSpan EndTime { get; private set; }
    public int NumberOfGuests { get; private set; }
    public decimal? Fee { get; private set; }
    public ReservationStatus Status { get; private set; }
    public string? Notes { get; private set; }
    public string? RejectionReason { get; private set; }
    public Guid? ApprovedBy { get; private set; }
    public DateTime? ApprovedAt { get; private set; }

    private CommonAreaReservation() { } // EF Core

    public static CommonAreaReservation Create(
        Guid commonAreaId,
        Guid userId,
        Guid unitId,
        DateTime reservationDate,
        TimeSpan startTime,
        TimeSpan endTime,
        int numberOfGuests,
        decimal? fee = null,
        string? notes = null)
    {
        Guard.Against.OutOfRange(numberOfGuests, nameof(numberOfGuests), 1, int.MaxValue);

        var reservation = new CommonAreaReservation
        {
            CommonAreaId = commonAreaId,
            UserId = userId,
            UnitId = unitId,
            ReservationDate = reservationDate.Date,
            StartTime = startTime,
            EndTime = endTime,
            NumberOfGuests = numberOfGuests,
            Fee = fee,
            Notes = notes,
            Status = ReservationStatus.Pending
        };

        return reservation;
    }

    public void Approve(Guid approvedBy)
    {
        Status = ReservationStatus.Approved;
        ApprovedBy = approvedBy;
        ApprovedAt = DateTime.UtcNow;
    }

    public void Reject(string reason, Guid rejectedBy)
    {
        Guard.Against.NullOrWhiteSpace(reason, nameof(reason));
        Status = ReservationStatus.Rejected;
        RejectionReason = reason;
        ApprovedBy = rejectedBy;
        ApprovedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        Status = ReservationStatus.Cancelled;
    }

    public void Complete()
    {
        Status = ReservationStatus.Completed;
    }
}
