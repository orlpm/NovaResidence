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
        var residentIds = items.Where(item => item.ResidentId.HasValue).Select(item => item.ResidentId!.Value).Distinct().ToList();
        var residents = await _context.Residents.AsNoTracking()
            .Where(resident => residentIds.Contains(resident.Id))
            .Select(resident => new { resident.Id, resident.FirstName, resident.LastName, resident.UnitId })
            .ToListAsync();
        var unitIds = items.Where(item => item.UnitId.HasValue).Select(item => item.UnitId!.Value)
            .Concat(residents.Select(resident => resident.UnitId))
            .Distinct()
            .ToList();
        var units = await _context.Units.AsNoTracking()
            .Where(unit => unitIds.Contains(unit.Id))
            .Select(unit => new { unit.Id, unit.UnitNumber })
            .ToListAsync();

        var result = items.Select(item =>
        {
            var resident = residents.FirstOrDefault(entry => entry.Id == item.ResidentId);
            var unitId = item.UnitId ?? resident?.UnitId;
            var unit = units.FirstOrDefault(entry => entry.Id == unitId);
            var name = resident == null ? null : $"{resident.FirstName} {resident.LastName}".Trim();
            return new ParkingSpotDto(item.Id, item.CondominiumId, item.Code, item.AssignedPlate, unitId, item.ResidentId, unit?.UnitNumber, name);
        }).ToList();
        return Ok(ApiResponse<List<ParkingSpotDto>>.SuccessResponse(result));
    }

    [HttpPut("spots/{id:guid}/assign")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> AssignSpot(Guid id, [FromBody] AssignSpotRequest request)
    {
        var spot = await _context.ParkingSpots.FirstOrDefaultAsync(item => item.Id == id);
        if (spot == null)
            return NotFound(ApiResponse<object>.FailureResponse("Cajón no encontrado"));
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, spot.CondominiumId))
            return Forbid();

        var parked = await _context.ResidentVehicles
            .Where(item => item.CondominiumId == spot.CondominiumId && item.SpotCode == spot.Code)
            .ToListAsync();
        foreach (var parkedVehicle in parked)
            parkedVehicle.ParkAt(null);

        if (!request.ResidentId.HasValue)
        {
            spot.Release();
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null!, "Cajón liberado"));
        }

        var resident = await _context.Residents.FirstOrDefaultAsync(item => item.Id == request.ResidentId && item.IsActive);
        if (resident == null)
            return BadRequest(ApiResponse<object>.FailureResponse("Residente no encontrado"));

        var belongs = await (
            from unit in _context.Units
            join building in _context.Buildings on unit.BuildingId equals building.Id
            where unit.Id == resident.UnitId && building.CondominiumId == spot.CondominiumId
            select unit.Id).AnyAsync();
        if (!belongs)
            return BadRequest(ApiResponse<object>.FailureResponse("El residente no pertenece a este condominio"));

        var vehicle = await _context.ResidentVehicles
            .Where(item => item.UnitId == resident.UnitId && (item.ResidentId == resident.Id || item.ResidentId == null))
            .OrderBy(item => item.Plate)
            .FirstOrDefaultAsync();
        var previousCode = vehicle?.SpotCode;
        vehicle?.ParkAt(spot.Code);
        if (!string.IsNullOrWhiteSpace(previousCode) && previousCode != spot.Code)
        {
            var previous = await _context.ParkingSpots.FirstOrDefaultAsync(item =>
                item.CondominiumId == spot.CondominiumId && item.Code == previousCode && item.ResidentId == resident.Id);
            previous?.Release();
        }
        spot.AssignToResident(resident.UnitId, resident.Id, vehicle?.Plate);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<object>.SuccessResponse(null!, "Cajón asignado"));
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
        return Ok(ApiResponse<List<VehicleDto>>.SuccessResponse(await MapVehiclesAsync(items)));
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
        return Ok(ApiResponse<List<VehicleDto>>.SuccessResponse(await MapVehiclesAsync(items)));
    }

    [HttpPost("vehicles")]
    public async Task<IActionResult> CreateVehicle([FromBody] CreateVehicleRequest request)
    {
        if (!await _tenantAccess.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccess.CanAccessUnitAsync(User, request.UnitId))
            return Forbid();

        if (request.ResidentId.HasValue)
        {
            var ownsUnit = await _context.Residents.AnyAsync(item =>
                item.Id == request.ResidentId && item.UnitId == request.UnitId && item.IsActive);
            if (!ownsUnit)
                return BadRequest(ApiResponse<object>.FailureResponse("El residente no pertenece a la unidad"));
        }

        var residentId = request.ResidentId ?? await ResidentIdForCurrentUserAsync(request.UnitId);
        var vehicle = ResidentVehicle.Create(
            request.CondominiumId, request.UnitId, request.Plate, request.Brand, request.Color, request.SpotCode, residentId);
        _context.ResidentVehicles.Add(vehicle);

        if (!string.IsNullOrWhiteSpace(vehicle.SpotCode))
        {
            var spot = await _context.ParkingSpots.FirstOrDefaultAsync(item =>
                item.CondominiumId == request.CondominiumId && item.Code == vehicle.SpotCode);
            if (spot?.ResidentId != null && spot.ResidentId != residentId)
                return BadRequest(ApiResponse<object>.FailureResponse("El cajón ya está asignado a otro residente"));
            if (spot != null && residentId.HasValue)
                spot.AssignToResident(request.UnitId, residentId.Value, vehicle.Plate);
            else
                spot?.Assign(vehicle.Plate);
        }

        await _context.SaveChangesAsync();
        return Ok(ApiResponse<Guid>.SuccessResponse(vehicle.Id, "Vehículo registrado"));
    }

    private async Task<Guid?> ResidentIdForCurrentUserAsync(Guid unitId)
    {
        var value = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(value, out var userId))
            return null;
        return await _context.Residents.AsNoTracking()
            .Where(item => item.UnitId == unitId && item.UserId == userId && item.IsActive)
            .Select(item => (Guid?)item.Id)
            .FirstOrDefaultAsync();
    }

    private async Task<List<VehicleDto>> MapVehiclesAsync(List<ResidentVehicle> items)
    {
        if (items.Count == 0)
            return [];

        var condominiumId = items[0].CondominiumId;
        var residentIds = items.Where(item => item.ResidentId.HasValue).Select(item => item.ResidentId!.Value).Distinct().ToList();
        var residents = await _context.Residents.AsNoTracking()
            .Where(resident => residentIds.Contains(resident.Id))
            .Select(resident => new { resident.Id, resident.FirstName, resident.LastName })
            .ToListAsync();
        var unitIds = items.Select(item => item.UnitId).Distinct().ToList();
        var units = await _context.Units.AsNoTracking()
            .Where(unit => unitIds.Contains(unit.Id))
            .Select(unit => new { unit.Id, unit.UnitNumber })
            .ToListAsync();
        var plates = await _context.Visits.AsNoTracking()
            .Where(visit => visit.CondominiumId == condominiumId && visit.VehiclePlate != null)
            .Select(visit => visit.VehiclePlate!)
            .ToListAsync();
        var visitCounts = plates
            .GroupBy(plate => plate.Trim().ToUpperInvariant())
            .ToDictionary(group => group.Key, group => group.Count());

        return items.Select(item =>
        {
            var resident = residents.FirstOrDefault(entry => entry.Id == item.ResidentId);
            var unit = units.FirstOrDefault(entry => entry.Id == item.UnitId);
            visitCounts.TryGetValue(item.Plate, out var relatedVisits);
            return new VehicleDto(
                item.Id,
                item.CondominiumId,
                item.UnitId,
                item.Plate,
                item.Brand,
                item.Color,
                item.SpotCode,
                item.ResidentId,
                resident == null ? null : $"{resident.FirstName} {resident.LastName}".Trim(),
                unit?.UnitNumber,
                relatedVisits);
        }).ToList();
    }
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
public record ParkingSpotDto(Guid Id, Guid CondominiumId, string Code, string? AssignedPlate, Guid? UnitId, Guid? ResidentId, string? UnitNumber, string? ResidentName);
public record CreateSpotRequest(Guid CondominiumId, string Code);
public record AssignSpotRequest(Guid? ResidentId);
public record VehicleDto(Guid Id, Guid CondominiumId, Guid UnitId, string Plate, string Brand, string? Color, string? SpotCode, Guid? ResidentId, string? ResidentName, string? UnitNumber, int RelatedVisits);
public record CreateVehicleRequest(Guid CondominiumId, Guid UnitId, string Plate, string Brand, string? Color, string? SpotCode, Guid? ResidentId = null);
public record SecurityRoundDto(Guid Id, Guid CondominiumId, string Area, string Notes, DateTime StartedAt);
public record CreateRoundRequest(Guid CondominiumId, string Area, string Notes);
public record CreateFineRequest(Guid CondominiumId, Guid UnitId, string Concept, decimal Amount, string? Description);
