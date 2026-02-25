using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Maps;

public class CondominiumMapMarker : BaseEntity
{
    public Guid CondominiumMapId { get; private set; }
    public string Label { get; private set; } = string.Empty;
    public string? Tooltip { get; private set; }
    public CondominiumMarkerType MarkerType { get; private set; }
    public string MarkerColor { get; private set; } = "#0ea5e9";
    public decimal CoordinateX { get; private set; }
    public decimal CoordinateY { get; private set; }
    public string LayerName { get; private set; } = "General";
    public bool LayerEnabledByDefault { get; private set; } = true;

    public Guid? AmenityId { get; private set; }
    public Guid? CommonAreaId { get; private set; }
    public Guid? BuildingId { get; private set; }
    public Guid? UnitId { get; private set; }
    public string? ExternalReference { get; private set; }
    public bool IsActive { get; private set; } = true;

    private CondominiumMapMarker() { }

    public static CondominiumMapMarker Create(
        Guid condominiumMapId,
        string label,
        CondominiumMarkerType markerType,
        decimal coordinateX,
        decimal coordinateY,
        string markerColor,
        string layerName,
        bool layerEnabledByDefault,
        string? tooltip = null,
        Guid? amenityId = null,
        Guid? commonAreaId = null,
        Guid? buildingId = null,
        Guid? unitId = null,
        string? externalReference = null)
    {
        Guard.Against.Default(condominiumMapId, nameof(condominiumMapId));
        Guard.Against.NullOrWhiteSpace(label, nameof(label));
        Guard.Against.NullOrWhiteSpace(markerColor, nameof(markerColor));
        Guard.Against.NullOrWhiteSpace(layerName, nameof(layerName));

        return new CondominiumMapMarker
        {
            Id = Guid.NewGuid(),
            CondominiumMapId = condominiumMapId,
            Label = label,
            Tooltip = tooltip,
            MarkerType = markerType,
            CoordinateX = coordinateX,
            CoordinateY = coordinateY,
            MarkerColor = markerColor,
            LayerName = layerName,
            LayerEnabledByDefault = layerEnabledByDefault,
            AmenityId = amenityId,
            CommonAreaId = commonAreaId,
            BuildingId = buildingId,
            UnitId = unitId,
            ExternalReference = externalReference,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string label,
        CondominiumMarkerType markerType,
        decimal coordinateX,
        decimal coordinateY,
        string markerColor,
        string layerName,
        bool layerEnabledByDefault,
        string? tooltip,
        Guid? amenityId,
        Guid? commonAreaId,
        Guid? buildingId,
        Guid? unitId,
        string? externalReference,
        bool isActive)
    {
        Label = Guard.Against.NullOrWhiteSpace(label, nameof(label));
        MarkerType = markerType;
        CoordinateX = coordinateX;
        CoordinateY = coordinateY;
        MarkerColor = Guard.Against.NullOrWhiteSpace(markerColor, nameof(markerColor));
        LayerName = Guard.Against.NullOrWhiteSpace(layerName, nameof(layerName));
        LayerEnabledByDefault = layerEnabledByDefault;
        Tooltip = tooltip;
        AmenityId = amenityId;
        CommonAreaId = commonAreaId;
        BuildingId = buildingId;
        UnitId = unitId;
        ExternalReference = externalReference;
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }
}
