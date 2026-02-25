using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Maps;

public class CondominiumMap : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public MapScopeType ScopeType { get; private set; }
    public string ScopeReference { get; private set; } = string.Empty;
    public string? BackgroundImageUrl { get; private set; }
    public bool IsActive { get; private set; } = true;

    private readonly List<CondominiumMapMarker> _markers = new();
    public IReadOnlyCollection<CondominiumMapMarker> Markers => _markers.AsReadOnly();

    private CondominiumMap() { }

    public static CondominiumMap Create(
        Guid condominiumId,
        string name,
        MapScopeType scopeType,
        string scopeReference,
        string? description = null,
        string? backgroundImageUrl = null)
    {
        Guard.Against.Default(condominiumId, nameof(condominiumId));
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NullOrWhiteSpace(scopeReference, nameof(scopeReference));

        return new CondominiumMap
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            Name = name,
            Description = description,
            ScopeType = scopeType,
            ScopeReference = scopeReference,
            BackgroundImageUrl = backgroundImageUrl,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
    }

    public void Update(
        string name,
        MapScopeType scopeType,
        string scopeReference,
        string? description,
        string? backgroundImageUrl,
        bool isActive)
    {
        Name = Guard.Against.NullOrWhiteSpace(name, nameof(name));
        ScopeType = scopeType;
        ScopeReference = Guard.Against.NullOrWhiteSpace(scopeReference, nameof(scopeReference));
        Description = description;
        BackgroundImageUrl = backgroundImageUrl;
        IsActive = isActive;
        UpdatedAt = DateTime.UtcNow;
    }
}
