using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Api.Security;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Entities.Operations;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/packages")]
public class PackagesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccess;
    private readonly IOperationalNotifier _notifier;

    public PackagesController(ApplicationDbContext context, ITenantAccessService tenantAccess, IOperationalNotifier notifier)
    {
        _context = context;
        _tenantAccess = tenantAccess;
        _notifier = notifier;
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var items = await _context.PackageDeliveries.AsNoTracking()
            .Where(item => item.CondominiumId == condominiumId)
            .OrderByDescending(item => item.ReceivedAt)
            .ToListAsync();
        return Ok(ApiResponse<List<PackageDto>>.SuccessResponse(items.Select(Map).ToList()));
    }

    [HttpGet("unit/{unitId:guid}")]
    public async Task<IActionResult> GetByUnit(Guid unitId)
    {
        if (!await _tenantAccess.CanAccessUnitAsync(User, unitId))
            return Forbid();

        var items = await _context.PackageDeliveries.AsNoTracking()
            .Where(item => item.UnitId == unitId)
            .OrderByDescending(item => item.ReceivedAt)
            .ToListAsync();
        return Ok(ApiResponse<List<PackageDto>>.SuccessResponse(items.Select(Map).ToList()));
    }

    [HttpPost]
    [Authorize(Roles = "admin,superadmin,security")]
    public async Task<IActionResult> Create([FromBody] CreatePackageRequest request)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccess.CanAccessUnitAsync(User, request.UnitId))
            return Forbid();

        var unit = await _context.Units.AsNoTracking().FirstOrDefaultAsync(item => item.Id == request.UnitId);
        if (unit == null)
            return NotFound(ApiResponse<object>.FailureResponse("Unidad no encontrada"));

        var package = PackageDelivery.Create(
            request.CondominiumId, unit.Id, unit.UnitNumber, request.Carrier, request.Description, request.TrackingCode);
        _context.PackageDeliveries.Add(package);
        await _context.SaveChangesAsync();

        var userIds = await _context.Residents.AsNoTracking()
            .Where(resident => resident.UnitId == unit.Id && resident.UserId != null && resident.IsActive)
            .Select(resident => resident.UserId!.Value)
            .ToListAsync();
        await _notifier.NotifyUsersAsync(
            userIds,
            request.CondominiumId,
            NotificationType.General,
            "Paquete recibido",
            $"{request.Carrier}: {request.Description}",
            "Package",
            package.Id,
            "/resident/packages");

        return Ok(ApiResponse<Guid>.SuccessResponse(package.Id, "Paquete registrado"));
    }

    private static PackageDto Map(PackageDelivery item) => new(
        item.Id, item.CondominiumId, item.UnitId, item.UnitNumber, item.Carrier,
        item.Description, item.TrackingCode, item.Status, item.Status == 0 ? "Recibido" : "Entregado", item.ReceivedAt);
}

[ApiController]
[Authorize]
[Route("api/parking")]
public class ParkingController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccess;

    public ParkingController(ApplicationDbContext context, ITenantAccessService tenantAccess)
    {
        _context = context;
        _tenantAccess = tenantAccess;
    }

    [HttpGet("spots/{condominiumId:guid}")]
    public async Task<IActionResult> GetSpots(Guid condominiumId)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var items = await _context.ParkingSpots.AsNoTracking()
            .Where(item => item.CondominiumId == condominiumId)
            .OrderBy(item => item.Code)
            .ToListAsync();
        return Ok(ApiResponse<List<ParkingSpotDto>>.SuccessResponse(items.Select(item =>
            new ParkingSpotDto(item.Id, item.CondominiumId, item.Code, item.AssignedPlate)).ToList()));
    }

    [HttpPost("spots")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> CreateSpot([FromBody] CreateSpotRequest request)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, request.CondominiumId))
            return Forbid();

        var spot = ParkingSpot.Create(request.CondominiumId, request.Code);
        _context.ParkingSpots.Add(spot);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<Guid>.SuccessResponse(spot.Id, "Cajón registrado"));
    }

    [HttpGet("vehicles/condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetVehicles(Guid condominiumId)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var items = await _context.ResidentVehicles.AsNoTracking()
            .Where(item => item.CondominiumId == condominiumId)
            .OrderBy(item => item.Plate)
            .ToListAsync();
        return Ok(ApiResponse<List<VehicleDto>>.SuccessResponse(items.Select(MapVehicle).ToList()));
    }

    [HttpGet("vehicles/unit/{unitId:guid}")]
    public async Task<IActionResult> GetUnitVehicles(Guid unitId)
    {
        if (!await _tenantAccess.CanAccessUnitAsync(User, unitId))
            return Forbid();

        var items = await _context.ResidentVehicles.AsNoTracking()
            .Where(item => item.UnitId == unitId)
            .OrderBy(item => item.Plate)
            .ToListAsync();
        return Ok(ApiResponse<List<VehicleDto>>.SuccessResponse(items.Select(MapVehicle).ToList()));
    }

    [HttpPost("vehicles")]
    public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleRequest request)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccess.CanAccessUnitAsync(User, request.UnitId))
            return Forbid();

        var vehicle = ResidentVehicle.Create(
            request.CondominiumId, request.UnitId, request.Plate, request.Brand, request.Color, request.SpotCode);
        _context.ResidentVehicles.Add(vehicle);

        if (!string.IsNullOrWhiteSpace(request.SpotCode))
        {
            var code = request.SpotCode.Trim().ToUpperInvariant();
            var spot = await _context.ParkingSpots.FirstOrDefaultAsync(item =>
                item.CondominiumId == request.CondominiumId && item.Code == code);
            spot?.Assign(vehicle.Plate);
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse<Guid>.SuccessResponse(vehicle.Id, "Vehículo registrado"));
    }

    private static VehicleDto MapVehicle(ResidentVehicle item) =>
        new(item.Id, item.CondominiumId, item.UnitId, item.Plate, item.Brand, item.Color, item.SpotCode);
}

[ApiController]
[Authorize(Roles = "admin,superadmin,security")]
[Route("api/security-rounds")]
public class SecurityRoundsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccess;

    public SecurityRoundsController(ApplicationDbContext context, ITenantAccessService tenantAccess)
    {
        _context = context;
        _tenantAccess = tenantAccess;
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var items = await _context.SecurityRounds.AsNoTracking()
            .Where(item => item.CondominiumId == condominiumId)
            .OrderByDescending(item => item.StartedAt)
            .ToListAsync();
        return Ok(ApiResponse<List<SecurityRoundDto>>.SuccessResponse(items.Select(item =>
            new SecurityRoundDto(item.Id, item.CondominiumId, item.Area, item.Notes, item.StartedAt)).ToList()));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoundRequest request)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, request.CondominiumId))
            return Forbid();

        var userId = GetUserId();
        if (!userId.HasValue)
            return Unauthorized();

        var round = SecurityRound.Create(request.CondominiumId, userId.Value, request.Area, request.Notes);
        _context.SecurityRounds.Add(round);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<Guid>.SuccessResponse(round.Id, "Ronda registrada"));
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var userId) ? userId : null;
    }
}

[ApiController]
[Authorize(Roles = "admin,superadmin")]
[Route("api/fines")]
public class FinesController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccess;
    private readonly IOperationalNotifier _notifier;

    public FinesController(ApplicationDbContext context, ITenantAccessService tenantAccess, IOperationalNotifier notifier)
    {
        _context = context;
        _tenantAccess = tenantAccess;
        _notifier = notifier;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateFineRequest request)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccess.CanAccessUnitAsync(User, request.UnitId))
            return Forbid();

        var now = DateTime.UtcNow;
        var charge = Charge.Create(
            request.CondominiumId,
            request.UnitId,
            request.Concept,
            FeeType.Fine,
            request.Amount,
            now.AddDays(15),
            now.Month,
            now.Year,
            description: request.Description);
        _context.Charges.Add(charge);
        await _context.SaveChangesAsync();

        var userIds = await _context.Residents.AsNoTracking()
            .Where(resident => resident.UnitId == request.UnitId && resident.UserId != null && resident.IsActive)
            .Select(resident => resident.UserId!.Value)
            .ToListAsync();
        await _notifier.NotifyUsersAsync(
            userIds,
            request.CondominiumId,
            NotificationType.PaymentReminder,
            "Nueva multa",
            request.Concept,
            "Charge",
            charge.Id,
            "/resident/payments");

        return Ok(ApiResponse<Guid>.SuccessResponse(charge.Id, "Multa registrada"));
    }
}

public record PackageDto(Guid Id, Guid CondominiumId, Guid UnitId, string UnitNumber, string Carrier, string Description, string? TrackingCode, int Status, string StatusName, DateTime ReceivedAt);
public record CreatePackageRequest(Guid CondominiumId, Guid UnitId, string Carrier, string Description, string? TrackingCode);
public record ParkingSpotDto(Guid Id, Guid CondominiumId, string Code, string? AssignedPlate);
public record CreateSpotRequest(Guid CondominiumId, string Code);
public record VehicleDto(Guid Id, Guid CondominiumId, Guid UnitId, string Plate, string Brand, string? Color, string? SpotCode);
public record CreateVehicleRequest(Guid CondominiumId, Guid UnitId, string Plate, string Brand, string? Color, string? SpotCode);
public record SecurityRoundDto(Guid Id, Guid CondominiumId, string Area, string Notes, DateTime StartedAt);
public record CreateRoundRequest(Guid CondominiumId, string Area, string Notes);
public record CreateFineRequest(Guid CondominiumId, Guid UnitId, string Concept, decimal Amount, string? Description);
