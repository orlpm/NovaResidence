using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.ValueObjects;

/// <summary>
/// Value object representing an address
/// </summary>
public class Address : ValueObject
{
    public string Street { get; private set; } = string.Empty;
    public string? ExteriorNumber { get; private set; }
    public string? InteriorNumber { get; private set; }
    public string City { get; private set; } = string.Empty;
    public string State { get; private set; } = string.Empty;
    public string PostalCode { get; private set; } = string.Empty;
    public string Country { get; private set; } = string.Empty;
    public string? Neighborhood { get; private set; }

    private Address() { } // EF Core

    public static Address Create(
        string street,
        string city,
        string state,
        string postalCode,
        string country,
        string? exteriorNumber = null,
        string? interiorNumber = null,
        string? neighborhood = null)
    {
        Guard.Against.NullOrWhiteSpace(street, nameof(street));
        Guard.Against.NullOrWhiteSpace(city, nameof(city));
        Guard.Against.NullOrWhiteSpace(state, nameof(state));
        Guard.Against.NullOrWhiteSpace(postalCode, nameof(postalCode));
        Guard.Against.NullOrWhiteSpace(country, nameof(country));

        return new Address
        {
            Street = street,
            ExteriorNumber = exteriorNumber,
            InteriorNumber = interiorNumber,
            City = city,
            State = state,
            PostalCode = postalCode,
            Country = country,
            Neighborhood = neighborhood
        };
    }

    protected override IEnumerable<object?> GetEqualityComponents()
    {
        yield return Street;
        yield return ExteriorNumber;
        yield return InteriorNumber;
        yield return City;
        yield return State;
        yield return PostalCode;
        yield return Country;
        yield return Neighborhood;
    }

    public override string ToString()
    {
        var address = $"{Street}";
        if (!string.IsNullOrWhiteSpace(ExteriorNumber))
            address += $" #{ExteriorNumber}";
        if (!string.IsNullOrWhiteSpace(InteriorNumber))
            address += $" Int. {InteriorNumber}";
        if (!string.IsNullOrWhiteSpace(Neighborhood))
            address += $", {Neighborhood}";
        
        address += $", {City}, {State} {PostalCode}, {Country}";
        
        return address;
    }
}
