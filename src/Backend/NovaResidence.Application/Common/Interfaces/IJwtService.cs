using System.Security.Claims;

namespace NovaResidence.Application.Common.Interfaces;

/// <summary>
/// JWT token generation and validation service
/// </summary>
public interface IJwtService
{
    /// <summary>
    /// Generate a JWT access token for the user
    /// </summary>
    string GenerateAccessToken(Guid userId, string email, string role, string? firstName = null, string? lastName = null);

    /// <summary>
    /// Generate a refresh token
    /// </summary>
    string GenerateRefreshToken();

    /// <summary>
    /// Validate a JWT token and return the claims principal
    /// </summary>
    ClaimsPrincipal? ValidateToken(string token);

    /// <summary>
    /// Get user ID from token claims
    /// </summary>
    Guid? GetUserIdFromToken(string token);

    /// <summary>
    /// Get expiration time in seconds for access tokens
    /// </summary>
    int GetAccessTokenExpirationSeconds();
}
