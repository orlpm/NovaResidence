using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Ardalis.Result;
using NovaResidence.Api.Security;
using NovaResidence.Application.Features.Incidents.Commands;
using NovaResidence.Application.Features.Incidents.Queries;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class IncidentsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IWebHostEnvironment _env;
    private readonly ITenantAccessService _tenantAccessService;

    public IncidentsController(IMediator mediator, IWebHostEnvironment env, ITenantAccessService tenantAccessService)
    {
        _mediator = mediator;
        _env = env;
        _tenantAccessService = tenantAccessService;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IncidentDetailDto>> GetIncident(Guid id)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new GetIncidentQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<ActionResult<List<IncidentListDto>>> GetCondominiumIncidents(
        Guid condominiumId,
        [FromQuery] IncidentStatus? status = null,
        [FromQuery] IncidentType? type = null,
        [FromQuery] IncidentPriority? priority = null)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetCondominiumIncidentsQuery(condominiumId, status, type, priority));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("unit/{unitId:guid}")]
    public async Task<ActionResult<List<IncidentListDto>>> GetUnitIncidents(Guid unitId)
    {
        if (!await _tenantAccessService.CanAccessUnitAsync(User, unitId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetUnitIncidentsQuery(unitId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("my-incidents/{reporterId:guid}")]
    public async Task<ActionResult<List<IncidentListDto>>> GetMyIncidents(Guid reporterId)
    {
        if (!await _tenantAccessService.CanAccessUserAsync(User, reporterId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetMyIncidentsQuery(reporterId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("assigned/{assigneeId:guid}")]
    public async Task<ActionResult<List<IncidentListDto>>> GetAssignedIncidents(Guid assigneeId)
    {
        if (!await _tenantAccessService.CanAccessUserAsync(User, assigneeId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetAssignedIncidentsQuery(assigneeId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> CreateIncident([FromBody] CreateIncidentRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.ReportedById)
            || (request.UnitId.HasValue && !await _tenantAccessService.CanAccessUnitAsync(User, request.UnitId.Value)))
        {
            return TenantForbidden();
        }

        var command = new CreateIncidentCommand(
            request.CondominiumId,
            request.ReportedById,
            request.Title,
            request.Description,
            request.Type,
            request.Priority,
            request.UnitId,
            request.Location,
            request.PhotoUrl
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return CreatedAtAction(nameof(GetIncident), new { id = result.Value }, result.Value);
    }

    [HttpPost("upload-photo")]
    public async Task<ActionResult<string>> UploadIncidentPhoto([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No se proporcionó archivo");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
            return BadRequest("Formato de archivo no válido. Use JPG, PNG o WEBP.");

        if (file.Length > 8 * 1024 * 1024)
            return BadRequest("La imagen no debe superar 8MB.");

        var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads", "incident-photos");
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/incident-photos/{uniqueFileName}";
        return Ok(fileUrl);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> UpdateIncident(Guid id, [FromBody] UpdateIncidentRequest request)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id))
            return TenantForbidden();

        var command = new UpdateIncidentCommand(
            id,
            request.Title,
            request.Description,
            request.Type,
            request.Priority,
            request.Location
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("{id:guid}/acknowledge")]
    public async Task<ActionResult> AcknowledgeIncident(Guid id)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new AcknowledgeIncidentCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("{id:guid}/assign")]
    public async Task<ActionResult> AssignIncident(Guid id, [FromBody] AssignIncidentRequest request)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.AssigneeId))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new AssignIncidentCommand(id, request.AssigneeId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("{id:guid}/start-progress")]
    public async Task<ActionResult> StartProgress(Guid id)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new StartIncidentProgressCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("{id:guid}/resolve")]
    public async Task<ActionResult> ResolveIncident(Guid id, [FromBody] ResolveIncidentRequest request)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.ResolvedById))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new ResolveIncidentCommand(
            id, 
            request.ResolvedById, 
            request.ResolutionNotes, 
            request.ActualCost
        ));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("{id:guid}/close")]
    public async Task<ActionResult> CloseIncident(Guid id)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new CloseIncidentCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("{id:guid}/reopen")]
    public async Task<ActionResult> ReopenIncident(Guid id, [FromBody] ReopenIncidentRequest request)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new ReopenIncidentCommand(id, request.Reason));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("{id:guid}/comments")]
    public async Task<ActionResult<Guid>> AddComment(Guid id, [FromBody] AddCommentRequest request)
    {
        if (!await _tenantAccessService.CanAccessIncidentAsync(User, id)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.UserId))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new AddIncidentCommentCommand(
            id, 
            request.UserId, 
            request.Content, 
            request.IsInternal
        ));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    private ActionResult TenantForbidden()
    {
        return StatusCode(StatusCodes.Status403Forbidden, new[] { "No tienes acceso a este condominio" });
    }
}

// Request DTOs
public class CreateIncidentRequest
{
    public Guid CondominiumId { get; set; }
    public Guid ReportedById { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IncidentType Type { get; set; }
    public IncidentPriority Priority { get; set; }
    public Guid? UnitId { get; set; }
    public string? Location { get; set; }
    public string? PhotoUrl { get; set; }
}

public record UpdateIncidentRequest(
    string Title,
    string Description,
    IncidentType Type,
    IncidentPriority Priority,
    string? Location
);

public record AssignIncidentRequest(Guid AssigneeId);

public record ResolveIncidentRequest(Guid ResolvedById, string ResolutionNotes, decimal? ActualCost = null);

public record ReopenIncidentRequest(string Reason);

public record AddCommentRequest(Guid UserId, string Content, bool IsInternal = false);
