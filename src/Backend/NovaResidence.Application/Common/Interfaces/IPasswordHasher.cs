namespace NovaResidence.Application.Common.Interfaces;

/// <summary>
/// Interface for password hashing and verification
/// </summary>
public interface IPasswordHasher
{
    /// <summary>
    /// Hash a password
    /// </summary>
    string HashPassword(string password);

    /// <summary>
    /// Verify a password against a hash
    /// </summary>
    bool VerifyPassword(string password, string passwordHash);
}
