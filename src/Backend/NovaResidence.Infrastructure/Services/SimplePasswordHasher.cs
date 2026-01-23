using NovaResidence.Application.Common.Interfaces;
using System.Text;

namespace NovaResidence.Infrastructure.Services;

/// <summary>
/// Simple password hasher implementation
/// TODO: Replace with BCrypt or ASP.NET Identity password hasher in production
/// </summary>
public class SimplePasswordHasher : IPasswordHasher
{
    public string HashPassword(string password)
    {
        // Simple Base64 encoding - matches the hash used during registration
        // TODO: Replace with BCrypt or proper hashing in production
        return Convert.ToBase64String(Encoding.UTF8.GetBytes(password));
    }

    public bool VerifyPassword(string password, string passwordHash)
    {
        var hashedInput = HashPassword(password);
        return hashedInput == passwordHash;
    }
}
