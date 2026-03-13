using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Entities.Localization;

namespace NovaResidence.Domain.Entities.Procedures;

public class ProcedureTemplate : BaseEntity
{
    public string Code { get; private set; } = string.Empty;
    public string Name { get; private set; } = string.Empty;
    public string AuthorityName { get; private set; } = string.Empty;
    public string Description { get; private set; } = string.Empty;
    public string Requirements { get; private set; } = string.Empty;
    public ProcedureType Type { get; private set; }
    public bool IsMandatoryDefault { get; private set; }
    public bool IsActive { get; private set; } = true;

    public Guid? CountryId { get; private set; }
    public GeoCountry? Country { get; private set; }

    public Guid? StateId { get; private set; }
    public GeoState? State { get; private set; }

    private ProcedureTemplate() { }

    public static ProcedureTemplate Create(
        string code,
        string name,
        string authorityName,
        string description,
        string requirements,
        ProcedureType type,
        bool isMandatoryDefault,
        Guid? countryId = null,
        Guid? stateId = null)
    {
        Guard.Against.NullOrWhiteSpace(code, nameof(code));
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NullOrWhiteSpace(authorityName, nameof(authorityName));
        Guard.Against.NullOrWhiteSpace(description, nameof(description));

        return new ProcedureTemplate
        {
            Code = code.Trim().ToUpperInvariant(),
            Name = name.Trim(),
            AuthorityName = authorityName.Trim(),
            Description = description.Trim(),
            Requirements = requirements?.Trim() ?? string.Empty,
            Type = type,
            IsMandatoryDefault = isMandatoryDefault,
            CountryId = countryId,
            StateId = stateId,
            IsActive = true
        };
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;
}
