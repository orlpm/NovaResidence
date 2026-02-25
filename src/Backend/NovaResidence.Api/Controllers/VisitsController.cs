using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Domain.Entities.Visits;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VisitsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VisitsController> _logger;

    public VisitsController(ApplicationDbContext context, ILogger<VisitsController> logger)
    {
        _context = context;
        _logger = logger;
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

            _context.Visits.Add(visit);
            await _context.SaveChangesAsync();

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
    /// Get today's visits for a condominium (security dashboard)
    /// </summary>
    [HttpGet("today/{condominiumId:guid}")]
    public async Task<IActionResult> GetTodayVisits(Guid condominiumId)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var tomorrow = today.AddDays(1);

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
    string? Notes = null
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
    string? Notes = null
);

public record ApproveVisitRequest(Guid ApprovedById);
public record RejectVisitRequest(Guid RejectedById, string? Reason = null);
public record CheckInVisitRequest(Guid SecurityGuardId);
public record CheckOutVisitRequest(Guid SecurityGuardId);
