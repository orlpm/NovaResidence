using System.Diagnostics;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Entities.Incidents;
using NovaResidence.Domain.Entities.Subscriptions;
using NovaResidence.Domain.Entities.Visits;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "superadmin")]
public class SuperAdminController : ControllerBase
{
    private static readonly DateTime ProcessStartedAt = DateTime.UtcNow;
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private readonly ApplicationDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;

    public SuperAdminController(ApplicationDbContext context, IWebHostEnvironment environment, IConfiguration configuration)
    {
        _context = context;
        _environment = environment;
        _configuration = configuration;
    }

    [HttpGet("monitoring")]
    public async Task<ActionResult<MonitoringSummaryDto>> GetMonitoringSummary()
    {
        var now = DateTime.UtcNow;

        var totalUsers = await _context.Users.CountAsync();
        var activeUsers = await _context.Users.CountAsync(u => u.IsActive);
        var totalCondominiums = await _context.Condominiums.CountAsync();
        var activeSubscriptions = await _context.Subscriptions.CountAsync(s => s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial);
        var openIncidents = await _context.Incidents.CountAsync(i => i.Status != IncidentStatus.Closed && i.Status != IncidentStatus.Cancelled);
        var pendingVisits = await _context.Visits.CountAsync(v => v.Status == VisitStatus.Pending || v.Status == VisitStatus.Approved);
        var unverifiedPayments = await _context.Payments.CountAsync(p => !p.IsVerified && !p.IsRefunded);

        var canConnect = await _context.Database.CanConnectAsync();
        var pendingMigrations = (await _context.Database.GetPendingMigrationsAsync()).Count();

        var process = Process.GetCurrentProcess();
        var processMemoryMb = Math.Round(process.WorkingSet64 / 1024d / 1024d, 2);

        var response = new MonitoringSummaryDto(
            ProcessStartedAt,
            Math.Round((now - ProcessStartedAt).TotalMinutes, 2),
            processMemoryMb,
            totalUsers,
            activeUsers,
            totalCondominiums,
            activeSubscriptions,
            openIncidents,
            pendingVisits,
            unverifiedPayments,
            canConnect,
            pendingMigrations,
            now
        );

        return Ok(response);
    }

    [HttpGet("system/settings")]
    public async Task<ActionResult<SystemSettingsDto>> GetSystemSettings()
    {
        var settings = await LoadSystemSettingsAsync();
        return Ok(settings);
    }

    [HttpPut("system/settings")]
    public async Task<ActionResult<SystemSettingsDto>> UpdateSystemSettings([FromBody] UpdateSystemSettingsRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SupportEmail))
            return BadRequest("SupportEmail es obligatorio");

        if (request.SessionTimeoutMinutes < 5 || request.SessionTimeoutMinutes > 1440)
            return BadRequest("SessionTimeoutMinutes debe estar entre 5 y 1440 minutos");

        if (string.IsNullOrWhiteSpace(request.DefaultTimeZone))
            return BadRequest("DefaultTimeZone es obligatorio");

        var updated = new SystemSettingsDto(
            request.MaintenanceMode,
            request.EnableNewRegistrations,
            request.SessionTimeoutMinutes,
            request.SupportEmail.Trim(),
            request.DefaultTimeZone.Trim(),
            request.AnnouncementBanner?.Trim() ?? string.Empty,
            DateTime.UtcNow
        );

        await SaveSystemSettingsAsync(updated);

        return Ok(updated);
    }

    [HttpGet("database")]
    public async Task<ActionResult<DatabaseOverviewDto>> GetDatabaseOverview()
    {
        var canConnect = await _context.Database.CanConnectAsync();
        var providerName = _context.Database.ProviderName ?? "Unknown";
        var pendingMigrations = (await _context.Database.GetPendingMigrationsAsync()).ToList();
        var appliedMigrations = (await _context.Database.GetAppliedMigrationsAsync()).ToList();

        var tableStats = new List<TableStatDto>
        {
            new("Users", await _context.Users.CountAsync()),
            new("Condominiums", await _context.Condominiums.CountAsync()),
            new("Buildings", await _context.Buildings.CountAsync()),
            new("Units", await _context.Units.CountAsync()),
            new("Residents", await _context.Residents.CountAsync()),
            new("Visits", await _context.Visits.CountAsync()),
            new("Incidents", await _context.Incidents.CountAsync()),
            new("Reservations", await _context.Reservations.CountAsync()),
            new("Charges", await _context.Charges.CountAsync()),
            new("Payments", await _context.Payments.CountAsync()),
            new("Subscriptions", await _context.Subscriptions.CountAsync())
        };

        var result = new DatabaseOverviewDto(
            providerName,
            canConnect,
            appliedMigrations.Count,
            pendingMigrations.Count,
            pendingMigrations,
            tableStats,
            DateTime.UtcNow
        );

        return Ok(result);
    }

    [HttpPost("database/migrate")]
    public async Task<ActionResult<DatabaseMigrateResultDto>> ApplyPendingMigrations()
    {
        var pending = (await _context.Database.GetPendingMigrationsAsync()).ToList();
        if (pending.Count == 0)
        {
            return Ok(new DatabaseMigrateResultDto(0, Array.Empty<string>(), DateTime.UtcNow, "No hay migraciones pendientes"));
        }

        await _context.Database.MigrateAsync();

        return Ok(new DatabaseMigrateResultDto(pending.Count, pending, DateTime.UtcNow, "Migraciones aplicadas exitosamente"));
    }

    private string GetSettingsFilePath()
    {
        var folder = Path.Combine(_environment.ContentRootPath, "config");
        if (!Directory.Exists(folder))
            Directory.CreateDirectory(folder);

        return Path.Combine(folder, "system-settings.json");
    }

    private async Task<SystemSettingsDto> LoadSystemSettingsAsync()
    {
        var path = GetSettingsFilePath();
        if (!System.IO.File.Exists(path))
        {
            var defaults = new SystemSettingsDto(
                MaintenanceMode: false,
                EnableNewRegistrations: true,
                SessionTimeoutMinutes: 60,
                SupportEmail: _configuration["SystemDefaults:SupportEmail"] ?? "contacto@domuscond.com",
                DefaultTimeZone: _configuration["SystemDefaults:DefaultTimeZone"] ?? "America/Mexico_City",
                AnnouncementBanner: string.Empty,
                UpdatedAt: DateTime.UtcNow
            );

            await SaveSystemSettingsAsync(defaults);
            return defaults;
        }

        var json = await System.IO.File.ReadAllTextAsync(path);
        var settings = JsonSerializer.Deserialize<SystemSettingsDto>(json, JsonOptions);

        if (settings == null)
        {
            return new SystemSettingsDto(false, true, 60, "contacto@domuscond.com", "America/Mexico_City", string.Empty, DateTime.UtcNow);
        }

        return settings;
    }

    private async Task SaveSystemSettingsAsync(SystemSettingsDto settings)
    {
        var path = GetSettingsFilePath();
        var json = JsonSerializer.Serialize(settings, JsonOptions);
        await System.IO.File.WriteAllTextAsync(path, json);
    }
}

public record MonitoringSummaryDto(
    DateTime ProcessStartedAt,
    double UptimeMinutes,
    double ProcessMemoryMb,
    int TotalUsers,
    int ActiveUsers,
    int TotalCondominiums,
    int ActiveSubscriptions,
    int OpenIncidents,
    int PendingVisits,
    int UnverifiedPayments,
    bool DatabaseConnected,
    int PendingMigrations,
    DateTime GeneratedAt
);

public record SystemSettingsDto(
    bool MaintenanceMode,
    bool EnableNewRegistrations,
    int SessionTimeoutMinutes,
    string SupportEmail,
    string DefaultTimeZone,
    string AnnouncementBanner,
    DateTime UpdatedAt
);

public record UpdateSystemSettingsRequest(
    bool MaintenanceMode,
    bool EnableNewRegistrations,
    int SessionTimeoutMinutes,
    string SupportEmail,
    string DefaultTimeZone,
    string? AnnouncementBanner
);

public record TableStatDto(string Table, int Count);

public record DatabaseOverviewDto(
    string Provider,
    bool CanConnect,
    int AppliedMigrationsCount,
    int PendingMigrationsCount,
    IReadOnlyList<string> PendingMigrations,
    IReadOnlyList<TableStatDto> TableStats,
    DateTime GeneratedAt
);

public record DatabaseMigrateResultDto(
    int AppliedCount,
    IReadOnlyList<string> AppliedMigrations,
    DateTime AppliedAt,
    string Message
);
