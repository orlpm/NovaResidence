using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents a unit/apartment within a building
/// </summary>
public class Unit : BaseEntity
{
    public Guid BuildingId { get; private set; }
    public string UnitNumber { get; private set; } = string.Empty;
    public int Floor { get; private set; }
    public decimal Area { get; private set; } // Square meters
    public int Bedrooms { get; private set; }
    public int Bathrooms { get; private set; }
    public UnitStatus Status { get; private set; }
    
    // Ownership
    public Guid? OwnerId { get; private set; }
    public Guid? TenantId { get; private set; }
    
    // Charges configuration
    public decimal MonthlyMaintenanceFee { get; private set; }
    public bool IsExemptFromFees { get; private set; }

    // Navigation property
    public Building? Building { get; private set; }

    private Unit() { } // EF Core

    public static Unit Create(
        Guid buildingId,
        string unitNumber,
        int floor,
        decimal area,
        int bedrooms,
        int bathrooms,
        decimal monthlyMaintenanceFee)
    {
        Guard.Against.NullOrWhiteSpace(unitNumber, nameof(unitNumber));
        Guard.Against.Negative(floor, nameof(floor));
        Guard.Against.NegativeOrZero(area, nameof(area));

        var unit = new Unit
        {
            BuildingId = buildingId,
            UnitNumber = unitNumber,
            Floor = floor,
            Area = area,
            Bedrooms = bedrooms,
            Bathrooms = bathrooms,
            MonthlyMaintenanceFee = monthlyMaintenanceFee,
            Status = UnitStatus.Available,
            IsExemptFromFees = false
        };

        return unit;
    }

    public void AssignOwner(Guid ownerId)
    {
        OwnerId = ownerId;
        Status = UnitStatus.Occupied;
    }

    public void AssignTenant(Guid tenantId)
    {
        TenantId = tenantId;
        Status = UnitStatus.Occupied;
    }

    public void RemoveTenant()
    {
        TenantId = null;
        Status = OwnerId.HasValue ? UnitStatus.Occupied : UnitStatus.Vacant;
    }

    public void UpdateMaintenanceFee(decimal newFee)
    {
        Guard.Against.Negative(newFee, nameof(newFee));
        MonthlyMaintenanceFee = newFee;
    }

    public void SetFeeExemption(bool isExempt)
    {
        IsExemptFromFees = isExempt;
    }
}
