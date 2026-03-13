using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Api.Security;
using NovaResidence.Domain.Entities.Procedures;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProceduresController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ProceduresController> _logger;
    private readonly ITenantAccessService _tenantAccessService;

    public ProceduresController(ApplicationDbContext context, ILogger<ProceduresController> logger, ITenantAccessService tenantAccessService)
    {
        _context = context;
        _logger = logger;
        _tenantAccessService = tenantAccessService;
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates([FromQuery] Guid? condominiumId = null)
    {
        if (!CanManageProcedures())
            return Forbid();

        if (condominiumId.HasValue && !await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId.Value))
            return TenantForbidden();

        Guid? countryId = null;
        Guid? stateId = null;

        if (condominiumId.HasValue)
        {
            var condominium = await _context.Condominiums
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == condominiumId.Value);

            if (condominium == null)
                return NotFound(ApiResponse<object>.FailureResponse("Condominio no encontrado"));

            countryId = condominium.CountryId;
            stateId = condominium.StateId;
        }

        var templatesQuery = _context.ProcedureTemplates
            .AsNoTracking()
            .Include(t => t.Country)
            .Include(t => t.State)
            .Where(t => t.IsActive);

        if (countryId.HasValue)
        {
            templatesQuery = templatesQuery.Where(t => t.CountryId == null || t.CountryId == countryId.Value);
        }

        if (stateId.HasValue)
        {
            templatesQuery = templatesQuery.Where(t => t.StateId == null || t.StateId == stateId.Value);
        }

        var templates = await templatesQuery
            .OrderBy(t => t.Name)
            .Select(t => new ProcedureTemplateDto(
                t.Id,
                t.Code,
                t.Name,
                t.AuthorityName,
                t.Description,
                t.Requirements,
                t.Type,
                GetTypeName(t.Type),
                t.IsMandatoryDefault,
                t.CountryId,
                t.Country != null ? t.Country.Name : null,
                t.StateId,
                t.State != null ? t.State.Name : null
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<ProcedureTemplateDto>>.SuccessResponse(templates));
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId, [FromQuery] Guid? residentId = null, [FromQuery] ProcedureStatus? status = null)
    {
        if (!CanManageProcedures())
            return Forbid();

        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var query = _context.ResidentProcedures
            .AsQueryable()
            .Where(p => p.CondominiumId == condominiumId);

        if (residentId.HasValue)
            query = query.Where(p => p.ResidentId == residentId.Value);

        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);

        var procedures = await query
            .OrderByDescending(p => p.DueDate)
            .ToListAsync();

        foreach (var procedure in procedures)
            procedure.EvaluateOverdue();

        await _context.SaveChangesAsync();

        var residentIds = procedures.Select(p => p.ResidentId).Distinct().ToList();
        var residents = await _context.Residents
            .Where(r => residentIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r);

        var result = procedures.Select(p => new ProcedureDto(
            p.Id,
            p.CondominiumId,
            p.ResidentId,
            residents.TryGetValue(p.ResidentId, out var resident)
                ? $"{resident.FirstName} {resident.LastName}".Trim()
                : "Residente",
            p.Type,
            GetTypeName(p.Type),
            p.Title,
            p.Description,
            p.Requirements,
            p.DueDate,
            p.IsMandatory,
            p.Status,
            GetStatusName(p.Status),
            p.CompletedAt,
            p.CompletionNotes,
            p.CreatedAt,
            p.CreatedById
        )).ToList();

        return Ok(ApiResponse<List<ProcedureDto>>.SuccessResponse(result));
    }

    [HttpGet("resident/{residentUserId:guid}")]
    public async Task<IActionResult> GetByResidentUser(Guid residentUserId)
    {
        var callerUserId = GetCallerUserId();
        var canManage = CanManageProcedures();

        if (!canManage && callerUserId != residentUserId)
            return Forbid();

        if (!await _tenantAccessService.CanAccessUserAsync(User, residentUserId))
            return TenantForbidden();

        var residentIds = await _context.Residents
            .Where(r => r.UserId == residentUserId && r.IsActive)
            .Select(r => r.Id)
            .ToListAsync();

        if (!residentIds.Any())
            return Ok(ApiResponse<List<ProcedureDto>>.SuccessResponse(new List<ProcedureDto>()));

        var procedures = await _context.ResidentProcedures
            .Where(p => residentIds.Contains(p.ResidentId))
            .OrderByDescending(p => p.DueDate)
            .ToListAsync();

        foreach (var procedure in procedures)
            procedure.EvaluateOverdue();

        await _context.SaveChangesAsync();

        var residents = await _context.Residents
            .Where(r => residentIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r);

        var result = procedures.Select(p => new ProcedureDto(
            p.Id,
            p.CondominiumId,
            p.ResidentId,
            residents.TryGetValue(p.ResidentId, out var resident)
                ? $"{resident.FirstName} {resident.LastName}".Trim()
                : "Residente",
            p.Type,
            GetTypeName(p.Type),
            p.Title,
            p.Description,
            p.Requirements,
            p.DueDate,
            p.IsMandatory,
            p.Status,
            GetStatusName(p.Status),
            p.CompletedAt,
            p.CompletionNotes,
            p.CreatedAt,
            p.CreatedById
        )).ToList();

        return Ok(ApiResponse<List<ProcedureDto>>.SuccessResponse(result));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProcedureRequest request)
    {
        if (!CanManageProcedures())
            return Forbid();

        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId))
            return TenantForbidden();

        var callerUserId = GetCallerUserId();
        if (!callerUserId.HasValue)
            return Unauthorized(ApiResponse<object>.FailureResponse("No se pudo identificar al usuario autenticado"));

        var resident = await _context.Residents
            .Include(r => r.Unit)
            .ThenInclude(u => u!.Building)
            .FirstOrDefaultAsync(r => r.Id == request.ResidentId);

        if (resident == null)
            return NotFound(ApiResponse<object>.FailureResponse("Residente no encontrado"));

        if (resident.Unit?.Building?.CondominiumId != request.CondominiumId)
            return BadRequest(ApiResponse<object>.FailureResponse("El residente no pertenece al condominio seleccionado"));

        var condominium = await _context.Condominiums
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == request.CondominiumId);

        if (condominium == null)
            return NotFound(ApiResponse<object>.FailureResponse("Condominio no encontrado"));

        ProcedureType type = request.Type;
        var title = request.Title;
        var description = request.Description;
        var requirements = request.Requirements ?? string.Empty;
        var isMandatory = request.IsMandatory;

        if (request.ProcedureTemplateId.HasValue)
        {
            var template = await _context.ProcedureTemplates
                .FirstOrDefaultAsync(t => t.Id == request.ProcedureTemplateId.Value && t.IsActive);

            if (template == null)
                return NotFound(ApiResponse<object>.FailureResponse("Plantilla de trámite no encontrada"));

            if (template.CountryId.HasValue && condominium.CountryId.HasValue && template.CountryId.Value != condominium.CountryId.Value)
                return BadRequest(ApiResponse<object>.FailureResponse("La plantilla seleccionada no corresponde al país del condominio"));

            if (template.StateId.HasValue && condominium.StateId.HasValue && template.StateId.Value != condominium.StateId.Value)
                return BadRequest(ApiResponse<object>.FailureResponse("La plantilla seleccionada no corresponde al estado del condominio"));

            type = template.Type;
            title = string.IsNullOrWhiteSpace(request.Title) ? template.Name : request.Title;
            description = string.IsNullOrWhiteSpace(request.Description) ? template.Description : request.Description;
            requirements = string.IsNullOrWhiteSpace(request.Requirements) ? template.Requirements : request.Requirements;
            isMandatory = request.IsMandatory || template.IsMandatoryDefault;
        }

        var procedure = ResidentProcedure.Create(
            request.CondominiumId,
            request.ResidentId,
            callerUserId.Value,
            type,
            title,
            description,
            requirements,
            request.DueDate,
            isMandatory,
            request.ProcedureTemplateId
        );

        _context.ResidentProcedures.Add(procedure);
        await _context.SaveChangesAsync();

        return Ok(ApiResponse<Guid>.SuccessResponse(procedure.Id, "Trámite creado exitosamente"));
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProcedureRequest request)
    {
        if (!CanManageProcedures())
            return Forbid();

        if (!await _tenantAccessService.CanAccessProcedureAsync(User, id))
            return TenantForbidden();

        var procedure = await _context.ResidentProcedures.FindAsync(id);
        if (procedure == null)
            return NotFound(ApiResponse<object>.FailureResponse("Trámite no encontrado"));

        try
        {
            procedure.UpdateDetails(
                request.Type,
                request.Title,
                request.Description,
                request.Requirements ?? string.Empty,
                request.DueDate,
                request.IsMandatory
            );

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null!, "Trámite actualizado exitosamente"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:guid}/complete")]
    public async Task<IActionResult> Complete(Guid id, [FromBody] CompleteProcedureRequest request)
    {
        if (!await _tenantAccessService.CanAccessProcedureAsync(User, id))
            return TenantForbidden();

        var procedure = await _context.ResidentProcedures.FindAsync(id);
        if (procedure == null)
            return NotFound(ApiResponse<object>.FailureResponse("Trámite no encontrado"));

        var callerUserId = GetCallerUserId();
        if (!callerUserId.HasValue)
            return Unauthorized(ApiResponse<object>.FailureResponse("No se pudo identificar al usuario autenticado"));

        var canManage = CanManageProcedures();
        if (!canManage)
        {
            var resident = await _context.Residents.FirstOrDefaultAsync(r => r.Id == procedure.ResidentId);
            if (resident?.UserId != callerUserId.Value)
                return Forbid();
        }

        try
        {
            procedure.MarkCompleted(request.Notes);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null!, "Trámite marcado como completado"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        if (!CanManageProcedures())
            return Forbid();

        if (!await _tenantAccessService.CanAccessProcedureAsync(User, id))
            return TenantForbidden();

        var procedure = await _context.ResidentProcedures.FindAsync(id);
        if (procedure == null)
            return NotFound(ApiResponse<object>.FailureResponse("Trámite no encontrado"));

        try
        {
            procedure.Cancel();
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.SuccessResponse(null!, "Trámite cancelado"));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ApiResponse<object>.FailureResponse(ex.Message));
        }
    }

    private bool CanManageProcedures()
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value ?? string.Empty;
        return role.Equals("superadmin", StringComparison.OrdinalIgnoreCase)
               || role.Equals("admin", StringComparison.OrdinalIgnoreCase)
               || role.Equals("subadmin", StringComparison.OrdinalIgnoreCase);
    }

    private Guid? GetCallerUserId()
    {
        var claim = User.FindFirst("userId")?.Value
                    ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                    ?? User.FindFirst("sub")?.Value;

        return Guid.TryParse(claim, out var id) ? id : null;
    }

    private IActionResult TenantForbidden()
    {
        return StatusCode(StatusCodes.Status403Forbidden,
            ApiResponse<object>.FailureResponse("No tienes acceso a este condominio"));
    }

    private static string GetTypeName(ProcedureType type) => type switch
    {
        ProcedureType.Electricity => "Luz",
        ProcedureType.Water => "Agua",
        ProcedureType.Gas => "Gas",
        ProcedureType.Internet => "Servicios",
        _ => "Otro"
    };

    private static string GetStatusName(ProcedureStatus status) => status switch
    {
        ProcedureStatus.Pending => "Pendiente",
        ProcedureStatus.Completed => "Completado",
        ProcedureStatus.Overdue => "Vencido",
        ProcedureStatus.Cancelled => "Cancelado",
        _ => "Pendiente"
    };
}

public record CreateProcedureRequest(
    Guid CondominiumId,
    Guid ResidentId,
    Guid? ProcedureTemplateId,
    ProcedureType Type,
    string Title,
    string Description,
    string? Requirements,
    DateTime DueDate,
    bool IsMandatory = true
);

public record UpdateProcedureRequest(
    ProcedureType Type,
    string Title,
    string Description,
    string? Requirements,
    DateTime DueDate,
    bool IsMandatory
);

public record CompleteProcedureRequest(string? Notes = null);

public record ProcedureDto(
    Guid Id,
    Guid CondominiumId,
    Guid ResidentId,
    string ResidentName,
    ProcedureType Type,
    string TypeName,
    string Title,
    string Description,
    string Requirements,
    DateTime DueDate,
    bool IsMandatory,
    ProcedureStatus Status,
    string StatusName,
    DateTime? CompletedAt,
    string? CompletionNotes,
    DateTime CreatedAt,
    Guid CreatedById
);

public record ProcedureTemplateDto(
    Guid Id,
    string Code,
    string Name,
    string AuthorityName,
    string Description,
    string Requirements,
    ProcedureType Type,
    string TypeName,
    bool IsMandatoryDefault,
    Guid? CountryId,
    string? CountryName,
    Guid? StateId,
    string? StateName
);
