using Microsoft.Extensions.Configuration;

namespace NovaResidence.Infrastructure.Services;

public static class JwtSigningKey
{
    public static string Require(IConfiguration configuration)
    {
        var key = configuration["Jwt:SecretKey"];
        if (string.IsNullOrWhiteSpace(key) || key.Length < 32)
        {
            throw new InvalidOperationException(
                "Falta Jwt:SecretKey de al menos 32 caracteres. En Azure se define como Jwt__SecretKey. En local va en user-secrets. No la guardes en appsettings.");
        }

        return key;
    }
}
