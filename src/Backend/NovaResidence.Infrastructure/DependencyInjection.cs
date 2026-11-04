using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using System.Net.Http.Headers;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Infrastructure.Persistence.Repositories;
using NovaResidence.Infrastructure.Services;
using Azure.Identity;
using Azure.Storage.Blobs;
using Azure.Messaging.ServiceBus;

namespace NovaResidence.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        // Database Context
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            var postgresConnection = PostgresConnection.Resolve(configuration);
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            var useSqlite = configuration.GetValue<bool>("UseSqlite");

            if (string.IsNullOrWhiteSpace(postgresConnection)
                && !useSqlite
                && string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "No hay cadena de Postgres. Define ConnectionStrings:Postgres o ejecuta scripts/set-neon-connection.ps1.");
            }

            if (!string.IsNullOrWhiteSpace(postgresConnection))
            {
                options.UseNpgsql(postgresConnection, npgsqlOptions =>
                {
                    npgsqlOptions.EnableRetryOnFailure(5, TimeSpan.FromSeconds(10), null);
                    npgsqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                });
            }
            else if (useSqlite || connectionString?.Contains("Data Source=") == true)
            {
                var sqliteConnection = connectionString ?? "Data Source=novaresidence.db";
                options.UseSqlite(sqliteConnection, sqliteOptions =>
                {
                    sqliteOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                });
            }
            else
            {
                options.UseSqlServer(connectionString, sqlOptions =>
                {
                    sqlOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(30),
                        errorNumbersToAdd: null);
                    sqlOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                });
            }
        });

        services.AddScoped<IApplicationDbContext>(provider => 
            provider.GetRequiredService<ApplicationDbContext>());

        services.AddHttpClient("BrevoEmail", client =>
        {
            client.BaseAddress = new Uri("https://api.brevo.com/");
        }).ConfigureHttpClient((provider, client) =>
        {
            var apiKey = configuration["Email:BrevoApiKey"];
            if (!string.IsNullOrWhiteSpace(apiKey))
            {
                client.DefaultRequestHeaders.Remove("api-key");
                client.DefaultRequestHeaders.Add("api-key", apiKey);
            }
        });

        services.Configure<OpenPaySettings>(configuration.GetSection("OpenPay"));
        services.AddHttpClient<IOpenPaySubscriptionService, OpenPaySubscriptionService>((provider, client) =>
        {
            var settings = configuration.GetSection("OpenPay").Get<OpenPaySettings>() ?? new OpenPaySettings();
            var baseApi = settings.UseSandbox
                ? "https://sandbox-api.openpay.mx/v1/"
                : "https://api.openpay.mx/v1/";

            client.BaseAddress = new Uri(baseApi);
            client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            client.Timeout = TimeSpan.FromSeconds(30);
        });

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICondominiumRepository, CondominiumRepository>();
        services.AddScoped<IBuildingRepository, BuildingRepository>();
        services.AddScoped<IUnitRepository, UnitRepository>();
        services.AddScoped<IResidentRepository, ResidentRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Password Hasher
        services.AddScoped<IPasswordHasher, SimplePasswordHasher>();

        // JWT Service
        services.AddScoped<IJwtService, JwtService>();

        // Configure JWT Authentication
        AddJwtAuthentication(services, configuration);

        // Azure Services
        AddAzureServices(services, configuration);

        // External Services
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<ISmsService, SmsService>();
        services.AddScoped<IBlobStorageService, AzureBlobStorageService>();
        services.AddScoped<IEventBusService, AzureServiceBusService>();
        services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();
        services.AddScoped<ICacheService, RedisCacheService>();
        
        // Permission Service
        services.AddMemoryCache(); // For permission caching
        services.AddScoped<IPermissionService, PermissionService>();
        services.AddScoped<IOperationalNotifier, OperationalNotifier>();

        return services;
    }

    private static void AddJwtAuthentication(IServiceCollection services, IConfiguration configuration)
    {
        var jwtSettings = configuration.GetSection("Jwt");
        var secretKey = jwtSettings["SecretKey"] ?? "NovaResidence-Super-Secret-Key-2024-Min32Chars!@#";
        var issuer = jwtSettings["Issuer"] ?? "NovaResidence";
        var audience = jwtSettings["Audience"] ?? "NovaResidenceApp";

        // Ensure minimum key length
        if (secretKey.Length < 32)
        {
            secretKey = secretKey.PadRight(32, '!');
        }

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
            options.DefaultScheme = JwtBearerDefaults.AuthenticationScheme;
        })
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateLifetime = true,
                ValidateIssuerSigningKey = true,
                ValidIssuer = issuer,
                ValidAudience = audience,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
                ClockSkew = TimeSpan.Zero
            };

            options.Events = new JwtBearerEvents
            {
                OnAuthenticationFailed = context =>
                {
                    if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                    {
                        context.Response.Headers["Token-Expired"] = "true";
                    }
                    return Task.CompletedTask;
                }
            };
        });

        services.AddAuthorization();
    }

    private static void AddAzureServices(IServiceCollection services, IConfiguration configuration)
    {
        var azureConfig = configuration.GetSection("Azure");

        // Azure Blob Storage
        services.AddSingleton(x =>
        {
            var storageAccountName = azureConfig["StorageAccountName"];
            var blobServiceUri = new Uri($"https://{storageAccountName}.blob.core.windows.net");
            return new BlobServiceClient(blobServiceUri, new DefaultAzureCredential());
        });

        // Azure Service Bus
        services.AddSingleton(x =>
        {
            var serviceBusNamespace = azureConfig["ServiceBusNamespace"];
            var fullyQualifiedNamespace = $"{serviceBusNamespace}.servicebus.windows.net";
            return new ServiceBusClient(fullyQualifiedNamespace, new DefaultAzureCredential());
        });

        // TODO: Add Azure Cache for Redis
        // TODO: Add Azure Key Vault
        // TODO: Add Azure Application Insights
    }
}
