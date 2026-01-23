using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents common areas that can be reserved (pools, gyms, party rooms, etc.)
/// </summary>
public class CommonArea : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public int MaxCapacity { get; private set; }
    public decimal? ReservationFee { get; private set; }
    public bool RequiresApproval { get; private set; }
    public bool IsActive { get; private set; } = true;
    
    // Operating hours
    public TimeSpan OpeningTime { get; private set; }
    public TimeSpan ClosingTime { get; private set; }
    
    private readonly List<CommonAreaReservation> _reservations = new();
    public IReadOnlyCollection<CommonAreaReservation> Reservations => _reservations.AsReadOnly();

    private CommonArea() { } // EF Core

    public static CommonArea Create(
        Guid condominiumId,
        string name,
        int maxCapacity,
        TimeSpan openingTime,
        TimeSpan closingTime,
        decimal? reservationFee = null,
        bool requiresApproval = false,
        string? description = null)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NegativeOrZero(maxCapacity, nameof(maxCapacity));

        var commonArea = new CommonArea
        {
            CondominiumId = condominiumId,
            Name = name,
            Description = description,
            MaxCapacity = maxCapacity,
            ReservationFee = reservationFee,
            RequiresApproval = requiresApproval,
            OpeningTime = openingTime,
            ClosingTime = closingTime,
            IsActive = true
        };

        return commonArea;
    }

    public void Update(string name, string? description, int maxCapacity, decimal? reservationFee, bool requiresApproval)
    {
        Name = Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Description = description;
        MaxCapacity = Guard.Against.NegativeOrZero(maxCapacity, nameof(maxCapacity));
        ReservationFee = reservationFee;
        RequiresApproval = requiresApproval;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
