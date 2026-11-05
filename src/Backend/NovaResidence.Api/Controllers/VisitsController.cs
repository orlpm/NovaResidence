using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Api.Security;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Visits;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VisitsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VisitsController> _logger;
    private readonly ITenantAccessService _tenantAccessService;
    private readonly IOperationalNotifier _notifier;

    public VisitsController(
        ApplicationDbContext context,
        ILogger<VisitsController> logger,
        ITenantAccessService tenantAccessService,
        IOperationalNotifier notifier)
    {
        _context = context;
        _logger = logger;
        _tenantAccessService = tenantAccessService;
        _notifier = notifier;
    }

    /// <summary>
    /// Get all visits for a condominium (admin/security view)
    /// </summary>
    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(
        Guid condominiumId,
        [FromQuery] VisitStatus? status = null,
        [FromQuery] VisitType? type = null,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        try
        {
            var query = _context.Visits
                .Where(v => v.CondominiumId == condominiumId)
                .AsNoTracking();

            if (status.HasValue) query = query.Where(v => v.Status == status.Value);
            if (type.HasValue) query = query.Where(v => v.Type == type.Value);
            if (fromDate.HasValue) query = query.Where(v => v.ExpectedArrival >= fromDate.Value);
            if (toDate.HasValue) query = query.Where(v => v.ExpectedArrival <= toDate.Value);

            var visits = await query
                .OrderByDescending(v => v.ExpectedArrival)
                .Select(v => new VisitListDto(
                    v.Id,
                    v.CondominiumId,
                    v.UnitId,
                    v.RequestedById,
                    v.VisitorName,
                    v.VisitorPhone,
                    v.VisitorCount,
                    v.VehiclePlate,
                    v.Type,
                    GetVisitTypeName(v.Type),
                    v.Status,
                    GetVisitStatusName(v.Status),
                    v.Purpose,
                    v.ExpectedArrival,
                    v.ExpectedDeparture,
                    v.CheckInAt,
                    v.CheckOutAt,
                    v.CreatedAt
                ))
                .ToListAsync();

            return Ok(ApiResponse<List<VisitListDto>>.SuccessResponse(visits));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading visits for condominium {CondominiumId}", condominiumId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar visitas"));
        }
    }

    /// <summary>
    /// Get visits for a specific unit
    /// </summary>
    [HttpGet("unit/{unitId:guid}")]
    public async Task<IActionResult> GetByUnit(Guid unitId)
    {
        if (!await _tenantAccessService.CanAccessUnitAsync(User, unitId))
            return TenantForbidden();

        try
        {
            var visits = await _context.Visits
                .Where(v => v.UnitId == unitId)
                .OrderByDescending(v => v.ExpectedArrival)
                .AsNoTracking()
                .Select(v => new VisitListDto(
                    v.Id,
                    v.CondominiumId,
                    v.UnitId,
                    v.RequestedById,
                    v.VisitorName,
                    v.VisitorPhone,
                    v.VisitorCount,
                    v.VehiclePlate,
                    v.Type,
                    GetVisitTypeName(v.Type),
                    v.Status,
                    GetVisitStatusName(v.Status),
                    v.Purpose,
                    v.ExpectedArrival,
                    v.ExpectedDeparture,
                    v.CheckInAt,
                    v.CheckOutAt,
                    v.CreatedAt
                ))
                .ToListAsync();

            return Ok(ApiResponse<List<VisitListDto>>.SuccessResponse(visits));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading visits for unit {UnitId}", unitId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar visitas"));
        }
    }

    /// <summary>
    /// Get visits requested by a specific user (resident portal)
    /// </summary>
    [HttpGet("my-visits/{userId:guid}")]
    public async Task<IActionResult> GetMyVisits(Guid userId)
    {
        if (!await _tenantAccessService.CanAccessUserAsync(User, userId))
            return TenantForbidden();

        try
        {
            var visits = await _context.Visits
                .Where(v => v.RequestedById == userId)
                .OrderByDescending(v => v.ExpectedArrival)
                .AsNoTracking()
                .Select(v => new VisitListDto(
                    v.Id,
                    v.CondominiumId,
                    v.UnitId,
                    v.RequestedById,
                    v.VisitorName,
                    v.VisitorPhone,
                    v.VisitorCount,
                    v.VehiclePlate,
                    v.Type,
                    GetVisitTypeName(v.Type),
                    v.Status,
                    GetVisitStatusName(v.Status),
                    v.Purpose,
                    v.ExpectedArrival,
                    v.ExpectedDeparture,
                    v.CheckInAt,
                    v.CheckOutAt,
                    v.CreatedAt
                ))
                .ToListAsync();

            return Ok(ApiResponse<List<VisitListDto>>.SuccessResponse(visits));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading visits for user {UserId}", userId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar visitas"));
        }
    }

    /// <summary>
    /// Get visit by ID (detail view)
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id))
            return TenantForbidden();

        try
        {
            var v = await _context.Visits
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.Id == id);

            if (v == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            var result = new VisitDetailDto(
                v.Id,
                v.CondominiumId,
                v.UnitId,
                v.RequestedById,
                v.VisitorName,
                v.VisitorIdentification,
                v.VisitorPhone,
                v.VisitorEmail,
                v.VisitorCount,
                v.VehiclePlate,
                v.VehicleDescription,
                v.Type,
                GetVisitTypeName(v.Type),
                v.Status,
                GetVisitStatusName(v.Status),
                v.Purpose,
                v.Notes,
                v.ExpectedArrival,
                v.ExpectedDeparture,
                v.CheckInAt,
                v.CheckOutAt,
                v.CheckedInById,
                v.CheckedOutById,
                v.ApprovedById,
                v.ApprovedAt,
                v.RejectedById,
                v.RejectedAt,
                v.RejectionReason,
                v.CreatedAt
            );

            return Ok(ApiResponse<VisitDetailDto>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar visita"));
        }
    }

    /// <summary>
    /// Create a new visit request (resident)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateVisitRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccessService.CanAccessUnitAsync(User, request.UnitId)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.RequestedById))
        {
            return TenantForbidden();
        }

        try
        {
            var visit = Visit.Create(
                request.CondominiumId,
                request.UnitId,
                request.RequestedById,
                request.VisitorName,
                request.Type,
                request.ExpectedArrival,
                request.ExpectedDeparture,
                request.VisitorIdentification,
                request.VisitorPhone,
                request.VisitorEmail,
                request.VisitorCount,
                request.VehiclePlate,
                request.VehicleDescription,
                request.Purpose,
                request.Notes);
            await LinkVehicleAsync(visit, request.UnitId, request.ResidentVehicleId);

            _context.Visits.Add(visit);
            await _context.SaveChangesAsync();
            await _notifier.NotifyRoleAsync(
                visit.CondominiumId,
                UserRole.SecurityGuard,
                NotificationType.General,
                "Nueva visita",
                visit.VisitorName,
                "Visit",
                visit.Id,
                "/security/access-control");

            return Ok(ApiResponse<Guid>.SuccessResponse(visit.Id, "Visita registrada exitosamente"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating visit");
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al registrar visita"));
        }
    }

    /// <summary>
    /// Update a visit (only pending ones)
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateVisitRequest request)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id))
            return TenantForbidden();

        try
        {
            var visit = await _context.Visits.FindAsync(id);
            if (visit == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            visit.Update(
                request.VisitorName,
                request.Type,
                request.ExpectedArrival,
                request.ExpectedDeparture,
                request.VisitorIdentification,
                request.VisitorPhone,
                request.VisitorEmail,
                request.VisitorCount,
                request.VehiclePlate,
                request.VehicleDescription,
                request.Purpose,
                request.Notes);
            if (request.ResidentVehicleId.HasValue)
                await LinkVehicleAsync(visit, visit.UnitId, request.ResidentVehicleId);
            else
                visit.UnlinkResidentVehicle();

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Visita actualizada exitosamente"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al actualizar visita"));
        }
    }

    /// <summary>
    /// Approve a visit (admin)
    /// </summary>
    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, [FromBody] ApproveVisitRequest request)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.ApprovedById))
        {
            return TenantForbidden();
        }

        try
        {
            var visit = await _context.Visits.FindAsync(id);
            if (visit == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            visit.Approve(request.ApprovedById);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Visita aprobada"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error approving visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al aprobar visita"));
        }
    }

    /// <summary>
    /// Reject a visit (admin)
    /// </summary>
    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, [FromBody] RejectVisitRequest request)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.RejectedById))
        {
            return TenantForbidden();
        }

        try
        {
            var visit = await _context.Visits.FindAsync(id);
            if (visit == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            visit.Reject(request.RejectedById, request.Reason);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Visita rechazada"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rejecting visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al rechazar visita"));
        }
    }

    /// <summary>
    /// Check in a visitor (security guard)
    /// </summary>
    [HttpPost("{id:guid}/check-in")]
    public async Task<IActionResult> CheckIn(Guid id, [FromBody] CheckInVisitRequest request)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.SecurityGuardId))
        {
            return TenantForbidden();
        }

        try
        {
            var visit = await _context.Visits.FindAsync(id);
            if (visit == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            visit.CheckIn(request.SecurityGuardId);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Entrada registrada"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking in visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al registrar entrada"));
        }
    }

    /// <summary>
    /// Check out a visitor (security guard)
    /// </summary>
    [HttpPost("{id:guid}/check-out")]
    public async Task<IActionResult> CheckOut(Guid id, [FromBody] CheckOutVisitRequest request)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.SecurityGuardId))
        {
            return TenantForbidden();
        }

        try
        {
            var visit = await _context.Visits.FindAsync(id);
            if (visit == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            visit.CheckOut(request.SecurityGuardId);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Salida registrada"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking out visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al registrar salida"));
        }
    }

    /// <summary>
    /// Cancel a visit
    /// </summary>
    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id))
            return TenantForbidden();

        try
        {
            var visit = await _context.Visits.FindAsync(id);
            if (visit == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            visit.Cancel();
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Visita cancelada"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cancelar visita"));
        }
    }

    /// <summary>
    /// Delete a visit (soft delete)
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id))
            return TenantForbidden();

        try
        {
            var visit = await _context.Visits.FindAsync(id);
            if (visit == null)
                return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

            _context.Visits.Remove(visit);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Visita eliminada"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting visit {VisitId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al eliminar visita"));
        }
    }

    /// <summary>
    /// Get the QR access pass of a visit (resident shares it with the visitor)
    /// </summary>
    [HttpGet("{id:guid}/access-pass")]
    public async Task<IActionResult> GetAccessPass(Guid id)
    {
        if (!await _tenantAccessService.CanAccessVisitAsync(User, id))
            return TenantForbidden();

        var visit = await _context.Visits.FindAsync(id);
        if (visit == null)
            return NotFound(ApiResponse<object>.FailureResponse("Visita no encontrada"));

        if (visit.EnsureAccessCode())
            await _context.SaveChangesAsync();

        var code = Visit.FormatAccessCode(visit.AccessCode!);
        return Ok(ApiResponse<VisitAccessPassDto>.SuccessResponse(new VisitAccessPassDto(
            visit.Id,
            visit.VisitorName,
            code,
            visit.AccessValidFrom,
            visit.AccessValidUntil,
            visit.Status,
            GetVisitStatusName(visit.Status),
            visit.GetEntryDenialReason(DateTime.UtcNow) == null)));
    }

    /// <summary>
    /// Validate a scanned or typed QR access code (security booth)
    /// </summary>
    [HttpPost("access/scan")]
    [Authorize(Roles = "admin,superadmin,security")]
    public async Task<IActionResult> ScanAccessCode([FromBody] VisitAccessCodeRequest request)
    {
        var visit = await FindVisitByAccessCodeAsync(request.Code);
        if (visit == null)
            return InvalidAccessCode();

        return Ok(ApiResponse<VisitAccessScanDto>.SuccessResponse(await BuildScanResultAsync(visit)));
    }

    /// <summary>
    /// Register the visitor entry from a QR access code
    /// </summary>
    [HttpPost("access/check-in")]
    [Authorize(Roles = "admin,superadmin,security")]
    public async Task<IActionResult> CheckInWithAccessCode([FromBody] VisitAccessCodeRequest request)
    {
        var guardId = GetCurrentUserId();
        if (guardId == null)
            return Unauthorized(ApiResponse<object>.FailureResponse("Sesión inválida"));

        var visit = await FindVisitByAccessCodeAsync(request.Code);
        if (visit == null)
            return InvalidAccessCode();

        var denialReason = visit.GetEntryDenialReason(DateTime.UtcNow);
        if (denialReason != null)
            return BadRequest(ApiResponse<object>.FailureResponse(denialReason));

        visit.CheckIn(guardId.Value);
        await _context.SaveChangesAsync();

        await _notifier.NotifyUsersAsync(
            new[] { visit.RequestedById },
            visit.CondominiumId,
            NotificationType.General,
            "Tu visita llegó",
            $"{visit.VisitorName} ingresó con su pase QR",
            "Visit",
            visit.Id,
            $"/resident/visits/{visit.Id}");

        return Ok(ApiResponse<VisitAccessScanDto>.SuccessResponse(await BuildScanResultAsync(visit), "Entrada registrada"));
    }

    /// <summary>
    /// Register the visitor exit from a QR access code
    /// </summary>
    [HttpPost("access/check-out")]
    [Authorize(Roles = "admin,superadmin,security")]
    public async Task<IActionResult> CheckOutWithAccessCode([FromBody] VisitAccessCodeRequest request)
    {
        var guardId = GetCurrentUserId();
        if (guardId == null)
            return Unauthorized(ApiResponse<object>.FailureResponse("Sesión inválida"));

        var visit = await FindVisitByAccessCodeAsync(request.Code);
        if (visit == null)
            return InvalidAccessCode();

        if (visit.Status != VisitStatus.CheckedIn)
            return BadRequest(ApiResponse<object>.FailureResponse("El visitante no está dentro del condominio"));

        visit.CheckOut(guardId.Value);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<VisitAccessScanDto>.SuccessResponse(await BuildScanResultAsync(visit), "Salida registrada"));
    }

    private async Task<Visit?> FindVisitByAccessCodeAsync(string? rawCode)
    {
        var code = Visit.NormalizeAccessCode(rawCode);
        if (code == null)
            return null;

        var visit = await _context.Visits.FirstOrDefaultAsync(v => v.AccessCode == code);
        if (visit == null || !await _tenantAccessService.CanAccessCondominiumAsync(User, visit.CondominiumId))
            return null;

        return visit;
    }

    private async Task<VisitAccessScanDto> BuildScanResultAsync(Visit visit)
    {
        var unitNumber = await _context.Units.AsNoTracking()
            .Where(u => u.Id == visit.UnitId)
            .Select(u => u.UnitNumber)
            .FirstOrDefaultAsync();
        var denialReason = visit.GetEntryDenialReason(DateTime.UtcNow);

        return new VisitAccessScanDto(
            visit.Id,
            visit.VisitorName,
            visit.VisitorCount,
            visit.VehiclePlate,
            unitNumber,
            visit.Purpose,
            visit.ExpectedArrival,
            visit.ExpectedDeparture,
            visit.Status,
            GetVisitStatusName(visit.Status),
            denialReason == null,
            visit.Status == VisitStatus.CheckedIn,
            denialReason);
    }

    private Guid? GetCurrentUserId()
    {
        var value = User.FindFirst("userId")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    private IActionResult InvalidAccessCode() =>
        NotFound(ApiResponse<object>.FailureResponse("Código QR no válido para este condominio"));

    /// <summary>
    /// Get today's visits for a condominium (security dashboard)
    /// </summary>
    [HttpGet("today/{condominiumId:guid}")]
    public async Task<IActionResult> GetTodayVisits(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        try
        {
            var today = TimeZoneInfo.ConvertTimeToUtc(DateTime.Today);
            var tomorrow = TimeZoneInfo.ConvertTimeToUtc(DateTime.Today.AddDays(1));

            var visits = await _context.Visits
                .Where(v => v.CondominiumId == condominiumId && 
                       v.ExpectedArrival >= today && 
                       v.ExpectedArrival < tomorrow &&
                       v.Status != VisitStatus.Cancelled &&
                       v.Status != VisitStatus.Rejected)
                .OrderBy(v => v.ExpectedArrival)
                .AsNoTracking()
                .Select(v => new VisitListDto(
                    v.Id,
                    v.CondominiumId,
                    v.UnitId,
                    v.RequestedById,
                    v.VisitorName,
                    v.VisitorPhone,
                    v.VisitorCount,
                    v.VehiclePlate,
                    v.Type,
                    GetVisitTypeName(v.Type),
                    v.Status,
                    GetVisitStatusName(v.Status),
                    v.Purpose,
                    v.ExpectedArrival,
                    v.ExpectedDeparture,
                    v.CheckInAt,
                    v.CheckOutAt,
                    v.CreatedAt
                ))
                .ToListAsync();

            return Ok(ApiResponse<List<VisitListDto>>.SuccessResponse(visits));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading today's visits for condominium {CondominiumId}", condominiumId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar visitas de hoy"));
        }
    }

    // Helper methods for enum display names
    private static string GetVisitTypeName(VisitType type) => type switch
    {
        VisitType.Personal => "Personal",
        VisitType.Delivery => "Entrega/Delivery",
        VisitType.Service => "Servicio",
        VisitType.Contractor => "Contratista",
        VisitType.RealEstate => "Inmobiliaria",
        VisitType.Medical => "Médica",
        VisitType.Other => "Otro",
        _ => "Desconocido"
    };

    private static string GetVisitStatusName(VisitStatus status) => status switch
    {
        VisitStatus.Pending => "Pendiente",
        VisitStatus.Approved => "Aprobada",
        VisitStatus.Rejected => "Rechazada",
        VisitStatus.CheckedIn => "En el sitio",
        VisitStatus.CheckedOut => "Finalizada",
        VisitStatus.Cancelled => "Cancelada",
        VisitStatus.Expired => "Expirada",
        _ => "Desconocido"
    };

    private async Task LinkVehicleAsync(Visit visit, Guid unitId, Guid? residentVehicleId)
    {
        if (!residentVehicleId.HasValue)
            return;

        var vehicle = await _context.ResidentVehicles.FirstOrDefaultAsync(item =>
            item.Id == residentVehicleId && item.UnitId == unitId);
        if (vehicle == null)
            throw new InvalidOperationException("El vehículo no pertenece a la unidad");

        var description = string.Join(' ', new[] { vehicle.Brand, vehicle.Color }.Where(part => !string.IsNullOrWhiteSpace(part)));
        visit.LinkResidentVehicle(vehicle.Id, vehicle.Plate, description);
    }

    private IActionResult TenantForbidden()
    {
        return StatusCode(StatusCodes.Status403Forbidden,
            ApiResponse<object>.FailureResponse("No tienes acceso a este condominio"));
    }
}

// DTOs
public record VisitListDto(
    Guid Id,
    Guid CondominiumId,
    Guid UnitId,
    Guid RequestedById,
    string VisitorName,
    string? VisitorPhone,
    int VisitorCount,
    string? VehiclePlate,
    VisitType Type,
    string TypeName,
    VisitStatus Status,
    string StatusName,
    string? Purpose,
    DateTime ExpectedArrival,
    DateTime? ExpectedDeparture,
    DateTime? CheckInAt,
    DateTime? CheckOutAt,
    DateTime CreatedAt
);

public record VisitDetailDto(
    Guid Id,
    Guid CondominiumId,
    Guid UnitId,
    Guid RequestedById,
    string VisitorName,
    string? VisitorIdentification,
    string? VisitorPhone,
    string? VisitorEmail,
    int VisitorCount,
    string? VehiclePlate,
    string? VehicleDescription,
    VisitType Type,
    string TypeName,
    VisitStatus Status,
    string StatusName,
    string? Purpose,
    string? Notes,
    DateTime ExpectedArrival,
    DateTime? ExpectedDeparture,
    DateTime? CheckInAt,
    DateTime? CheckOutAt,
    Guid? CheckedInById,
    Guid? CheckedOutById,
    Guid? ApprovedById,
    DateTime? ApprovedAt,
    Guid? RejectedById,
    DateTime? RejectedAt,
    string? RejectionReason,
    DateTime CreatedAt
);

public record CreateVisitRequest(
    Guid CondominiumId,
    Guid UnitId,
    Guid RequestedById,
    string VisitorName,
    VisitType Type,
    DateTime ExpectedArrival,
    DateTime? ExpectedDeparture = null,
    string? VisitorIdentification = null,
    string? VisitorPhone = null,
    string? VisitorEmail = null,
    int VisitorCount = 1,
    string? VehiclePlate = null,
    string? VehicleDescription = null,
    string? Purpose = null,
    string? Notes = null,
    Guid? ResidentVehicleId = null
);

public record UpdateVisitRequest(
    string VisitorName,
    VisitType Type,
    DateTime ExpectedArrival,
    DateTime? ExpectedDeparture = null,
    string? VisitorIdentification = null,
    string? VisitorPhone = null,
    string? VisitorEmail = null,
    int VisitorCount = 1,
    string? VehiclePlate = null,
    string? VehicleDescription = null,
    string? Purpose = null,
    string? Notes = null,
    Guid? ResidentVehicleId = null
);

public record ApproveVisitRequest(Guid ApprovedById);
public record RejectVisitRequest(Guid RejectedById, string? Reason = null);
public record CheckInVisitRequest(Guid SecurityGuardId);
public record CheckOutVisitRequest(Guid SecurityGuardId);
public record VisitAccessCodeRequest(string? Code);

public record VisitAccessPassDto(
    Guid VisitId,
    string VisitorName,
    string AccessCode,
    DateTime ValidFrom,
    DateTime ValidUntil,
    VisitStatus Status,
    string StatusName,
    bool IsUsable
);

public record VisitAccessScanDto(
    Guid VisitId,
    string VisitorName,
    int VisitorCount,
    string? VehiclePlate,
    string? UnitNumber,
    string? Purpose,
    DateTime ExpectedArrival,
    DateTime? ExpectedDeparture,
    VisitStatus Status,
    string StatusName,
    bool CanCheckIn,
    bool CanCheckOut,
    string? Message
);
