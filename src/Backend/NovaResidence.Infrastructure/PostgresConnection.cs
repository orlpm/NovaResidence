using Microsoft.Extensions.Configuration;
using Npgsql;

namespace NovaResidence.Infrastructure;

/// <summary>
/// Resolves a standard Postgres connection. ConnectionStrings:Postgres wins, so the
/// same code can point at Neon today and at Azure Database for PostgreSQL later.
/// ConnectionStrings:Neon remains as the current fallback.
/// </summary>
public static class PostgresConnection
{
    public static string? Resolve(IConfiguration configuration) =>
        Normalize(First(configuration, "Postgres", "Neon"));

    public static string? ResolveDirect(IConfiguration configuration) =>
        Normalize(First(configuration, "PostgresDirect", "NeonDirect")) ?? Resolve(configuration);

    public static string? Normalize(string? connectionString)
    {
        if (string.IsNullOrWhiteSpace(connectionString))
            return connectionString;

        var value = connectionString.Trim();
        if (!value.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase)
            && !value.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
            return value;

        var uri = new Uri(value);
        var userInfo = uri.UserInfo.Split(':', 2);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.Port > 0 ? uri.Port : 5432,
            Database = uri.AbsolutePath.Trim('/'),
            Username = Uri.UnescapeDataString(userInfo[0]),
            Password = userInfo.Length > 1 ? Uri.UnescapeDataString(userInfo[1]) : string.Empty,
            SslMode = SslMode.Require
        };

        var query = uri.Query.TrimStart('?');
        foreach (var part in query.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var pair = part.Split('=', 2);
            if (pair.Length != 2 || !pair[0].Equals("sslmode", StringComparison.OrdinalIgnoreCase))
                continue;

            builder.SslMode = Uri.UnescapeDataString(pair[1]).ToLowerInvariant() switch
            {
                "disable" => SslMode.Disable,
                "allow" => SslMode.Allow,
                "prefer" => SslMode.Prefer,
                "verify-ca" => SslMode.VerifyCA,
                "verify-full" => SslMode.VerifyFull,
                _ => SslMode.Require
            };
        }

        return builder.ConnectionString;
    }

    private static string? First(IConfiguration configuration, params string[] names)
    {
        foreach (var name in names)
        {
            var value = configuration.GetConnectionString(name);
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        return null;
    }
}
