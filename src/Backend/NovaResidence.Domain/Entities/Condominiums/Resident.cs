using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents a resident (owner or tenant) of a unit
/// Can be registered independently without a full user account
/// </summary>
public class Resident : BaseEntity
{
    public Guid UnitId { get; private set; }
    public Unit? Unit { get; private set; }
    
    // Contact information - the core data we need
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string Email { get; private set; } = string.Empty;
    public string PhoneNumber { get; private set; } = string.Empty;
    
    // Type of resident
    public ResidentType Type { get; private set; }
    
    // Link to user account (optional - set when they register)
    public Guid? UserId { get; private set; }
    
    // Registration status
    public bool IsRegistered { get; private set; }
    public string? InvitationToken { get; private set; }
    public DateTime? InvitationSentAt { get; private set; }
    public DateTime? RegisteredAt { get; private set; }
    
    // Status
    public bool IsActive { get; private set; } = true;
    public DateTime? MoveInDate { get; private set; }
    public DateTime? MoveOutDate { get; private set; }

    private Resident() { } // EF Core

    public static Resident Create(
        Guid unitId,
        string firstName,
        string lastName,
        string email,
        string phoneNumber,
        ResidentType type)
    {
        Guard.Against.NullOrWhiteSpace(firstName, nameof(firstName));
        Guard.Against.NullOrWhiteSpace(lastName, nameof(lastName));
        Guard.Against.NullOrWhiteSpace(email, nameof(email));

        var resident = new Resident
        {
            UnitId = unitId,
            FirstName = firstName,
            LastName = lastName,
            Email = email.ToLowerInvariant(),
            PhoneNumber = phoneNumber ?? string.Empty,
            Type = type,
            IsActive = true,
            IsRegistered = false,
            MoveInDate = DateTime.UtcNow
        };

        return resident;
    }

    public string FullName => $"{FirstName} {LastName}";

    public void Update(string firstName, string lastName, string email, string phoneNumber)
    {
        Guard.Against.NullOrWhiteSpace(firstName, nameof(firstName));
        Guard.Against.NullOrWhiteSpace(lastName, nameof(lastName));
        Guard.Against.NullOrWhiteSpace(email, nameof(email));

        FirstName = firstName;
        LastName = lastName;
        Email = email.ToLowerInvariant();
        PhoneNumber = phoneNumber ?? string.Empty;
    }

    public void GenerateInvitationToken()
    {
        InvitationToken = Guid.NewGuid().ToString("N");
        InvitationSentAt = DateTime.UtcNow;
    }

    public void MarkAsRegistered(Guid userId)
    {
        UserId = userId;
        IsRegistered = true;
        RegisteredAt = DateTime.UtcNow;
        InvitationToken = null; // Clear the token after registration
    }

    public void Deactivate(DateTime? moveOutDate = null)
    {
        IsActive = false;
        MoveOutDate = moveOutDate ?? DateTime.UtcNow;
    }

    public void Reactivate()
    {
        IsActive = true;
        MoveOutDate = null;
    }

    public void ChangeType(ResidentType newType)
    {
        Type = newType;
    }
}

/// <summary>
/// Type of resident
/// </summary>
public enum ResidentType
{
    Owner = 1,
    Tenant = 2,
    FamilyMember = 3,
    Authorized = 4 // Authorized person (e.g., employee, caretaker)
}
