using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.ValueObjects;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents a Condominium complex (Condominium Module)
/// This is the main tenant entity in the multi-tenant architecture
/// </summary>
public class Condominium : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public Address Address { get; private set; } = null!;
    public Guid? CountryId { get; private set; }
    public Guid? StateId { get; private set; }
    public string? TaxId { get; private set; } // RFC in Mexico
    public string? LegalName { get; private set; }
    public bool IsActive { get; private set; } = true;
    
    // Subscription info
    public Guid SubscriptionPlanId { get; private set; }
    public DateTime SubscriptionStartDate { get; private set; }
    public DateTime? SubscriptionEndDate { get; private set; }
    
    private readonly List<Building> _buildings = new();
    public IReadOnlyCollection<Building> Buildings => _buildings.AsReadOnly();
    
    private readonly List<CommonArea> _commonAreas = new();
    public IReadOnlyCollection<CommonArea> CommonAreas => _commonAreas.AsReadOnly();

    private Condominium() { } // EF Core

    public static Condominium Create(
        string name, 
        Address address, 
        Guid subscriptionPlanId,
        string? description = null,
        string? taxId = null,
        string? legalName = null,
        Guid? countryId = null,
        Guid? stateId = null)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.Null(address, nameof(address));

        var condominium = new Condominium
        {
            Name = name,
            Description = description,
            Address = address,
            CountryId = countryId,
            StateId = stateId,
            TaxId = taxId,
            LegalName = legalName,
            SubscriptionPlanId = subscriptionPlanId,
            SubscriptionStartDate = DateTime.UtcNow,
            IsActive = true
        };

        return condominium;
    }

    public void Update(string name, string? description, Address address, string? taxId, string? legalName, Guid? countryId = null, Guid? stateId = null)
    {
        Name = Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Description = description;
        Address = Guard.Against.Null(address, nameof(address));
        CountryId = countryId;
        StateId = stateId;
        TaxId = taxId;
        LegalName = legalName;
    }

    public void AddBuilding(Building building)
    {
        Guard.Against.Null(building, nameof(building));
        _buildings.Add(building);
    }

    public void AddCommonArea(CommonArea commonArea)
    {
        Guard.Against.Null(commonArea, nameof(commonArea));
        _commonAreas.Add(commonArea);
    }

    public void Deactivate()
    {
        IsActive = false;
    }

    public void Activate()
    {
        IsActive = true;
    }
}
