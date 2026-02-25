using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Condominiums;

public class CondominiumCommonArea : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid? BuildingId { get; private set; }

    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public CommonAreaType Type { get; private set; }
    public string? Level { get; private set; }
    public bool IsActive { get; private set; } = true;

    public decimal? CoordinateX { get; private set; }
    public decimal? CoordinateY { get; private set; }
    public string? ImageUrlsJson { get; private set; }

    private CondominiumCommonArea() { }

    public static CondominiumCommonArea Create(
        Guid condominiumId,
        string name,
        CommonAreaType type,
        string? description = null,
        Guid? buildingId = null,
        string? level = null,
        decimal? coordinateX = null,
        decimal? coordinateY = null,
        string? imageUrlsJson = null)
    {
        Guard.Against.Default(condominiumId, nameof(condominiumId));
        Guard.Against.NullOrWhiteSpace(name, nameof(name));

        return new CondominiumCommonArea
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            Name = name,
            Description = description,
            Type = type,
            BuildingId = buildingId,
            Level = level,
            CoordinateX = coordinateX,
            CoordinateY = coordinateY,
            ImageUrlsJson = imageUrlsJson,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string name,
        CommonAreaType type,
        string? description,
        Guid? buildingId,
        string? level,
        decimal? coordinateX,
        decimal? coordinateY,
        string? imageUrlsJson,
        bool isActive)
    {
        Name = Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Type = type;
        Description = description;
        BuildingId = buildingId;
        Level = level;
        CoordinateX = coordinateX;
        CoordinateY = coordinateY;
        ImageUrlsJson = imageUrlsJson;
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetStatus(bool isActive)
    {
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }
}
