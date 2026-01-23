using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents an amenity/facility available for residents to use
/// </summary>
public class Amenity : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Condominium? Condominium { get; private set; }
    
    public string Name { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public AmenityType Type { get; private set; }
    
    public int Capacity { get; private set; }
    public bool RequiresReservation { get; private set; }
    public bool IsActive { get; private set; }
    
    public decimal? ReservationFee { get; private set; }
    public int MaxReservationHours { get; private set; }
    public int MinReservationHours { get; private set; }
    
    public string? Rules { get; private set; }
    public string? PhotoUrls { get; private set; } // JSON array
    
    public TimeSpan OpeningTime { get; private set; }
    public TimeSpan ClosingTime { get; private set; }
    
    public ICollection<Reservation> Reservations { get; private set; } = new List<Reservation>();
    
    private Amenity() { }
    
    public static Amenity Create(
        Guid condominiumId,
        string name,
        string description,
        AmenityType type,
        int capacity,
        bool requiresReservation,
        TimeSpan openingTime,
        TimeSpan closingTime,
        decimal? reservationFee = null)
    {
        Guard.Against.Default(condominiumId, nameof(condominiumId));
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NegativeOrZero(capacity, nameof(capacity));
        
        var amenity = new Amenity
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            Name = name,
            Description = description,
            Type = type,
            Capacity = capacity,
            RequiresReservation = requiresReservation,
            IsActive = true,
            ReservationFee = reservationFee,
            MaxReservationHours = 4,
            MinReservationHours = 1,
            OpeningTime = openingTime,
            ClosingTime = closingTime,
            CreatedAt = DateTime.UtcNow
        };
        
        return amenity;
    }
    
    public void Update(string name, string description, int capacity, TimeSpan openingTime, TimeSpan closingTime)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NegativeOrZero(capacity, nameof(capacity));
        
        Name = name;
        Description = description;
        Capacity = capacity;
        OpeningTime = openingTime;
        ClosingTime = closingTime;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void SetReservationLimits(int minHours, int maxHours, decimal? fee)
    {
        Guard.Against.NegativeOrZero(minHours, nameof(minHours));
        Guard.Against.NegativeOrZero(maxHours, nameof(maxHours));
        
        MinReservationHours = minHours;
        MaxReservationHours = maxHours;
        ReservationFee = fee;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Represents a reservation of an amenity by a resident
/// </summary>
public class Reservation : BaseEntity
{
    public Guid AmenityId { get; private set; }
    public Amenity? Amenity { get; private set; }
    
    public Guid UnitId { get; private set; }
    public Unit? Unit { get; private set; }
    
    public Guid ReservedByUserId { get; private set; }
    
    public DateTime StartDateTime { get; private set; }
    public DateTime EndDateTime { get; private set; }
    
    public int NumberOfGuests { get; private set; }
    public string? Notes { get; private set; }
    
    public ReservationStatus Status { get; private set; }
    
    public decimal? Fee { get; private set; }
    public bool IsPaid { get; private set; }
    public DateTime? PaidAt { get; private set; }
    
    public DateTime? CancelledAt { get; private set; }
    public string? CancellationReason { get; private set; }
    
    private Reservation() { }
    
    public static Reservation Create(
        Guid amenityId,
        Guid unitId,
        Guid reservedByUserId,
        DateTime startDateTime,
        DateTime endDateTime,
        int numberOfGuests,
        decimal? fee = null,
        string? notes = null)
    {
        Guard.Against.Default(amenityId, nameof(amenityId));
        Guard.Against.Default(unitId, nameof(unitId));
        Guard.Against.Default(reservedByUserId, nameof(reservedByUserId));
        
        if (endDateTime <= startDateTime)
        {
            throw new ArgumentException("End date must be after start date");
        }
        
        var reservation = new Reservation
        {
            Id = Guid.NewGuid(),
            AmenityId = amenityId,
            UnitId = unitId,
            ReservedByUserId = reservedByUserId,
            StartDateTime = startDateTime,
            EndDateTime = endDateTime,
            NumberOfGuests = numberOfGuests,
            Notes = notes,
            Status = ReservationStatus.Pending,
            Fee = fee,
            IsPaid = fee == null || fee == 0,
            CreatedAt = DateTime.UtcNow
        };
        
        return reservation;
    }
    
    public void Approve()
    {
        Status = ReservationStatus.Confirmed;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Cancel(string reason)
    {
        Guard.Against.NullOrWhiteSpace(reason, nameof(reason));
        
        Status = ReservationStatus.Cancelled;
        CancelledAt = DateTime.UtcNow;
        CancellationReason = reason;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void MarkAsPaid()
    {
        IsPaid = true;
        PaidAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void Complete()
    {
        Status = ReservationStatus.Completed;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum AmenityType
{
    Pool = 1,
    Gym = 2,
    PartyRoom = 3,
    Playground = 4,
    SportsCourt = 5,
    BBQArea = 6,
    ConferenceRoom = 7,
    Theater = 8,
    Other = 99
}
