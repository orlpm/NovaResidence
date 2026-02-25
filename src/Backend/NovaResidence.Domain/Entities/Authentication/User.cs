using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Authentication;

/// <summary>
/// Represents a user in the system (Auth Module)
/// Multi-tenant aware entity
/// </summary>
public class User : BaseEntity
{
    public string Email { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string FirstName { get; private set; } = string.Empty;
    public string LastName { get; private set; } = string.Empty;
    public string? PhoneNumber { get; private set; }
    public bool IsEmailConfirmed { get; private set; }
    public bool IsActive { get; private set; } = true;
    public DateTime? LastLoginAt { get; private set; }
    public string? RefreshToken { get; private set; }
    public DateTime? RefreshTokenExpiryTime { get; private set; }
    public string DefaultRole { get; private set; } = "User"; // Admin, User, Resident
    
    // Multi-tenant: User can belong to multiple condominiums with different roles
    private readonly List<UserCondominiumRole> _condominiumRoles = new();
    public IReadOnlyCollection<UserCondominiumRole> CondominiumRoles => _condominiumRoles.AsReadOnly();

    private User() { } // EF Core

    public static User Create(string email, string passwordHash, string firstName, string lastName, string? phoneNumber = null, string? role = null)
    {
        Guard.Against.NullOrWhiteSpace(email, nameof(email));
        Guard.Against.NullOrWhiteSpace(passwordHash, nameof(passwordHash));
        Guard.Against.NullOrWhiteSpace(firstName, nameof(firstName));
        Guard.Against.NullOrWhiteSpace(lastName, nameof(lastName));

        var user = new User
        {
            Email = email.ToLowerInvariant(),
            PasswordHash = passwordHash,
            FirstName = firstName,
            LastName = lastName,
            PhoneNumber = phoneNumber,
            IsEmailConfirmed = false,
            IsActive = true,
            DefaultRole = role ?? "User"
        };

        return user;
    }

    public void UpdateProfile(string firstName, string lastName, string? phoneNumber)
    {
        FirstName = Guard.Against.NullOrWhiteSpace(firstName, nameof(firstName));
        LastName = Guard.Against.NullOrWhiteSpace(lastName, nameof(lastName));
        PhoneNumber = phoneNumber;
    }

    public void ConfirmEmail()
    {
        IsEmailConfirmed = true;
    }

    public void UpdateLastLogin()
    {
        LastLoginAt = DateTime.UtcNow;
    }

    public void SetRefreshToken(string refreshToken, DateTime expiryTime)
    {
        RefreshToken = refreshToken;
        RefreshTokenExpiryTime = expiryTime;
    }

    public void AddCondominiumRole(Guid condominiumId, UserRole role)
    {
        if (_condominiumRoles.Any(cr => cr.CondominiumId == condominiumId && cr.Role == role))
            return;

        _condominiumRoles.Add(new UserCondominiumRole(condominiumId, role));
    }

    public void RemoveCondominiumRole(Guid condominiumId, UserRole role)
    {
        var roleToRemove = _condominiumRoles.FirstOrDefault(cr => cr.CondominiumId == condominiumId && cr.Role == role);
        if (roleToRemove != null)
        {
            _condominiumRoles.Remove(roleToRemove);
        }
    }

    public void UpdatePassword(string newPasswordHash)
    {
        Guard.Against.NullOrWhiteSpace(newPasswordHash, nameof(newPasswordHash));
        PasswordHash = newPasswordHash;
    }

    public void SetDefaultRole(string role)
    {
        DefaultRole = Guard.Against.NullOrWhiteSpace(role, nameof(role));
    }

    public void Activate()
    {
        IsActive = true;
    }

    public void Deactivate()
    {
        IsActive = false;
    }
}

/// <summary>
/// Value object representing user's role in a specific condominium
/// </summary>
public class UserCondominiumRole
{
    public Guid CondominiumId { get; private set; }
    public UserRole Role { get; private set; }
    public DateTime AssignedAt { get; private set; }

    private UserCondominiumRole() { } // EF Core

    public UserCondominiumRole(Guid condominiumId, UserRole role)
    {
        CondominiumId = condominiumId;
        Role = role;
        AssignedAt = DateTime.UtcNow;
    }
}
