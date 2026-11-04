using NovaResidence.Api.Middleware;
using NovaResidence.Api.Security;
using NovaResidence.Application;
using NovaResidence.Infrastructure;
using Microsoft.OpenApi.Models;
using Azure.Monitor.OpenTelemetry.AspNetCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddScoped<ITenantAccessService, TenantAccessService>();
builder.Services.AddEndpointsApiExplorer();

// Swagger/OpenAPI configuration
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "DomusCond API",
        Version = "v1",
        Description = "Condominium Management Platform - SaaS Solution",
        Contact = new OpenApiContact
        {
            Name = "DomusCond",
            Email = "contacto@domuscond.com"
        }
    });

    // JWT Bearer authentication
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Example: \"Authorization: Bearer {token}\"",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Application layer
builder.Services.AddApplication();

// Infrastructure layer
builder.Services.AddInfrastructure(builder.Configuration);

// CORS configuration for React frontend
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins(
                builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>())
            .AllowAnyMethod()
            .AllowAnyHeader()
            .AllowCredentials();
    });
});

// Health checks
builder.Services.AddHealthChecks()
    .AddDbContextCheck<NovaResidence.Infrastructure.Persistence.ApplicationDbContext>();

// Azure Application Insights (Optional)
if (!string.IsNullOrEmpty(builder.Configuration["ApplicationInsights:ConnectionString"]))
{
    builder.Services.AddOpenTelemetry()
        .UseAzureMonitor();
}

var app = builder.Build();

// Apply migrations and ensure database is created
using (var scope = app.Services.CreateScope())
{
    var context = scope.ServiceProvider.GetRequiredService<NovaResidence.Infrastructure.Persistence.ApplicationDbContext>();
    var dbContext = scope.ServiceProvider.GetRequiredService<NovaResidence.Application.Common.Interfaces.IApplicationDbContext>();
    var postgresConnection = NovaResidence.Infrastructure.PostgresConnection.Resolve(builder.Configuration);
    var useSqlite = builder.Configuration.GetValue<bool>("UseSqlite");

    if (!string.IsNullOrWhiteSpace(postgresConnection))
    {
        var creator = context.GetService<Microsoft.EntityFrameworkCore.Storage.IRelationalDatabaseCreator>();
        if (!await creator.ExistsAsync())
        {
            await creator.CreateAsync();
        }

        var connection = context.Database.GetDbConnection();
        var openedHere = connection.State != System.Data.ConnectionState.Open;
        if (openedHere)
        {
            await connection.OpenAsync();
        }

        await using var command = connection.CreateCommand();
        command.CommandText = """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'auth' AND table_name = 'Users'
            )
            """;
        var appTablesExist = (bool)(await command.ExecuteScalarAsync())!;
        if (openedHere)
        {
            await connection.CloseAsync();
        }

        if (!appTablesExist)
        {
            await creator.CreateTablesAsync();
        }

        await NovaResidence.Infrastructure.Persistence.PostgresSchemaPatch.ApplyAsync(context);
    }
    else if (useSqlite)
    {
        // Ensure the data directory exists for SQLite
        var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
        if (!string.IsNullOrEmpty(connectionString) && connectionString.Contains("Data Source="))
        {
            var dbPath = connectionString.Replace("Data Source=", "");
            var directory = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(directory) && !Directory.Exists(directory))
            {
                Directory.CreateDirectory(directory);
            }
        }
        
        // Ensure database is created (for SQLite)
        context.Database.EnsureCreated();
        await NovaResidence.Infrastructure.Persistence.SqliteSchemaPatch.ApplyAsync(context);
    }
    else
    {
        // Apply migrations for SQL Server
        context.Database.Migrate();
    }
    
    // Seed permissions and role permissions
    var geoCatalogSeeder = new NovaResidence.Infrastructure.Persistence.Seeders.GeoCatalogSeeder(dbContext);
    await geoCatalogSeeder.SeedAsync();

    var permissionSeeder = new NovaResidence.Infrastructure.Persistence.Seeders.PermissionSeeder(dbContext);
    await permissionSeeder.SeedAsync();
    
    var rolePermissionSeeder = new NovaResidence.Infrastructure.Persistence.Seeders.RolePermissionSeeder(dbContext);
    await rolePermissionSeeder.SeedAsync();
    
    // Seed subscription plans
    var subscriptionPlanSeeder = new NovaResidence.Infrastructure.Persistence.Seeders.SubscriptionPlanSeeder(dbContext);
    await subscriptionPlanSeeder.SeedAsync();

    // Seed jurisdictional procedure templates
    var procedureTemplateSeeder = new NovaResidence.Infrastructure.Persistence.Seeders.ProcedureTemplateSeeder(dbContext);
    await procedureTemplateSeeder.SeedAsync();

    if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("Demo:SeedOnStartup"))
    {
        var passwordHasher = scope.ServiceProvider.GetRequiredService<NovaResidence.Application.Common.Interfaces.IPasswordHasher>();
        var demoLogger = scope.ServiceProvider.GetRequiredService<ILogger<NovaResidence.Infrastructure.Persistence.Seeders.DemoScenarioSeeder>>();
        var demoSeeder = new NovaResidence.Infrastructure.Persistence.Seeders.DemoScenarioSeeder(context, passwordHasher, demoLogger);
        await demoSeeder.SeedAsync();
        await demoSeeder.EnsureShowcaseAsync();
    }
}

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "DomusCond API v1");
    });
}

// Disable HTTPS redirection in development to avoid certificate issues
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.UseCors("AllowFrontend");

var webRoot = app.Environment.WebRootPath;
if (!string.IsNullOrEmpty(webRoot) && Directory.Exists(webRoot))
{
    app.UseDefaultFiles();
    app.UseStaticFiles();
}

// Serve uploaded files (payment proofs, etc.)
var uploadsPath = Path.Combine(app.Environment.ContentRootPath, "uploads");
if (!Directory.Exists(uploadsPath)) Directory.CreateDirectory(uploadsPath);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
    RequestPath = "/uploads"
});

// Custom middleware
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseMiddleware<TenantResolutionMiddleware>();

app.UseAuthentication();
app.UseAuthorization();

// Subscription validation (after auth, so we have user claims)
app.UseMiddleware<SubscriptionValidationMiddleware>();

app.MapControllers();
app.MapHealthChecks("/health");
app.MapFallbackToFile("index.html");

app.Run();
