using NovaResidence.Application.Common.Interfaces;
using Microsoft.AspNetCore.Identity;
using System.Security.Cryptography;
using System.Text;

namespace NovaResidence.Infrastructure.Services;

/// <summary>
/// Password hasher backed by ASP.NET Core Identity.
/// Keeps backward compatibility with legacy Base64 hashes and marks them for upgrade.
/// </summary>
public class SimplePasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<object> _passwordHasher = new();
    private static readonly object PasswordHasherUser = new();

    public string HashPassword(string password)
    {
        return _passwordHasher.HashPassword(PasswordHasherUser, password);
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            return false;
        }

        if (IsLegacyBase64Hash(passwordHash))
        {
            var hashedInput = Convert.ToBase64String(Encoding.UTF8.GetBytes(password));
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(hashedInput),
                Encoding.UTF8.GetBytes(passwordHash));
        }

        var result = _passwordHasher.VerifyHashedPassword(PasswordHasherUser, passwordHash, password);
        return result == PasswordVerificationResult.Success
            || result == PasswordVerificationResult.SuccessRehashNeeded;
    }

    public bool NeedsRehash(string passwordHash)
    {
        return IsLegacyBase64Hash(passwordHash);
    }

    private static bool IsLegacyBase64Hash(string passwordHash)
    {
        if (passwordHash.StartsWith("AQAAAA", StringComparison.Ordinal))
        {
            return false;
        }

        try
        {
            var bytes = Convert.FromBase64String(passwordHash);
            var roundTrip = Convert.ToBase64String(bytes);
            return string.Equals(roundTrip, passwordHash, StringComparison.Ordinal);
        }
        catch
        {
            return false;
        }
    }
}
