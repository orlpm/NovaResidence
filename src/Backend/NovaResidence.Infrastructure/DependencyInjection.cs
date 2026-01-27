using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
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
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            var useSqlite = configuration.GetValue<bool>("UseSqlite");
            
            if (useSqlite || connectionString?.Contains("Data Source=") == true)
            {
                // Use SQLite for Azure App Service (free tier)
                var sqliteConnection = connectionString ?? "Data Source=novaresidence.db";
                options.UseSqlite(sqliteConnection, sqliteOptions =>
                {
                    sqliteOptions.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName);
                });
            }
            else
            {
                // Use SQL Server for local development or production
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

        // Repositories
        services.AddScoped<IUserRepository, UserRepository>();
        services.AddScoped<ICondominiumRepository, CondominiumRepository>();
        services.AddScoped<IBuildingRepository, BuildingRepository>();
        services.AddScoped<IUnitRepository, UnitRepository>();
        services.AddScoped<IResidentRepository, ResidentRepository>();
        services.AddScoped<IUnitOfWork, UnitOfWork>();

        // Password Hasher
        services.AddScoped<IPasswordHasher, SimplePasswordHasher>();

        // Azure Services
        AddAzureServices(services, configuration);

        // External Services
        services.AddScoped<IEmailService, EmailService>();
        services.AddScoped<ISmsService, SmsService>();
        services.AddScoped<IBlobStorageService, AzureBlobStorageService>();
        services.AddScoped<IEventBusService, AzureServiceBusService>();
        services.AddScoped<IPaymentGatewayService, PaymentGatewayService>();
        services.AddScoped<ICacheService, RedisCacheService>();

        return services;
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
