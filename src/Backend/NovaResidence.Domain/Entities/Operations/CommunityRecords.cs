using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Operations;

public class PackageDelivery : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid UnitId { get; private set; }
    public string UnitNumber { get; private set; } = string.Empty;
    public string Carrier { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string? TrackingCode { get; private set; }
    public int Status { get; private set; }
    public DateTime ReceivedAt { get; private set; }

    private PackageDelivery() { }

    public static PackageDelivery Create(
        Guid condominiumId,
        Guid unitId,
        string unitNumber,
        string carrier,
        string description,
        string? trackingCode)
    {
        return new PackageDelivery
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            UnitId = unitId,
            UnitNumber = unitNumber,
            Carrier = carrier.Trim(),
            Description = description.Trim(),
            TrackingCode = string.IsNullOrWhiteSpace(trackingCode) ? null : trackingCode.Trim(),
            Status = 0,
            ReceivedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void MarkPickedUp()
    {
        Status = 1;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class ParkingSpot : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Code { get; private set; } = string.Empty;
    public string? AssignedPlate { get; private set; }
    public Guid? UnitId { get; private set; }
    public Guid? ResidentId { get; private set; }

    private ParkingSpot() { }

    public static ParkingSpot Create(Guid condominiumId, string code)
    {
        return new ParkingSpot
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            Code = code.Trim().ToUpperInvariant(),
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Assign(string plate)
    {
        AssignedPlate = plate.Trim().ToUpperInvariant();
        UpdatedAt = DateTime.UtcNow;
    }

    public void AssignToResident(Guid unitId, Guid residentId, string? plate)
    {
        UnitId = unitId;
        ResidentId = residentId;
        AssignedPlate = string.IsNullOrWhiteSpace(plate) ? null : plate.Trim().ToUpperInvariant();
        UpdatedAt = DateTime.UtcNow;
    }

    public void Release()
    {
        UnitId = null;
        ResidentId = null;
        AssignedPlate = null;
        UpdatedAt = DateTime.UtcNow;
    }
}

public class ResidentVehicle : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid UnitId { get; private set; }
    public Guid? ResidentId { get; private set; }
    public string Plate { get; private set; } = string.Empty;
    public string Brand { get; private set; } = string.Empty;
    public string? Color { get; private set; }
    public string? SpotCode { get; private set; }

    private ResidentVehicle() { }

    public static ResidentVehicle Create(
        Guid condominiumId,
        Guid unitId,
        string plate,
        string brand,
        string? color,
        string? spotCode,
        Guid? residentId)
    {
        return new ResidentVehicle
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            UnitId = unitId,
            ResidentId = residentId,
            Plate = plate.Trim().ToUpperInvariant(),
            Brand = brand.Trim(),
            Color = string.IsNullOrWhiteSpace(color) ? null : color.Trim(),
            SpotCode = string.IsNullOrWhiteSpace(spotCode) ? null : spotCode.Trim().ToUpperInvariant(),
            CreatedAt = DateTime.UtcNow
        };
    }

    public void ParkAt(string? spotCode)
    {
        SpotCode = string.IsNullOrWhiteSpace(spotCode) ? null : spotCode.Trim().ToUpperInvariant();
        UpdatedAt = DateTime.UtcNow;
    }
}

public class SecurityRound : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid GuardUserId { get; private set; }
    public string Area { get; private set; } = string.Empty;
    public string Notes { get; private set; } = string.Empty;
    public DateTime StartedAt { get; private set; }

    private SecurityRound() { }

    public static SecurityRound Create(Guid condominiumId, Guid guardUserId, string area, string notes)
    {
        return new SecurityRound
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            GuardUserId = guardUserId,
            Area = area.Trim(),
            Notes = notes.Trim(),
            StartedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
    }
}
