using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents a building/tower within a condominium
/// </summary>
public class Building : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public int TotalFloors { get; private set; }
    
    private readonly List<Unit> _units = new();
    public IReadOnlyCollection<Unit> Units => _units.AsReadOnly();

    private Building() { } // EF Core

    public static Building Create(Guid condominiumId, string name, int totalFloors, string? description = null)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NegativeOrZero(totalFloors, nameof(totalFloors));

        var building = new Building
        {
            CondominiumId = condominiumId,
            Name = name,
            Description = description,
            TotalFloors = totalFloors
        };

        return building;
    }

    public void AddUnit(Unit unit)
    {
        Guard.Against.Null(unit, nameof(unit));
        _units.Add(unit);
    }
}
