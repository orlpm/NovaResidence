using Microsoft.AspNetCore.Mvc;
using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Features.Incidents.Commands;
using NovaResidence.Application.Features.Incidents.Queries;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IncidentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public IncidentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<IncidentDetailDto>> GetIncident(Guid id)
    {
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
        var result = await _mediator.Send(new GetCondominiumIncidentsQuery(condominiumId, status, type, priority));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("unit/{unitId:guid}")]
    public async Task<ActionResult<List<IncidentListDto>>> GetUnitIncidents(Guid unitId)
    {
        var result = await _mediator.Send(new GetUnitIncidentsQuery(unitId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("my-incidents/{reporterId:guid}")]
    public async Task<ActionResult<List<IncidentListDto>>> GetMyIncidents(Guid reporterId)
    {
        var result = await _mediator.Send(new GetMyIncidentsQuery(reporterId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("assigned/{assigneeId:guid}")]
    public async Task<ActionResult<List<IncidentListDto>>> GetAssignedIncidents(Guid assigneeId)
    {
        var result = await _mediator.Send(new GetAssignedIncidentsQuery(assigneeId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<ActionResult<Guid>> CreateIncident([FromBody] CreateIncidentRequest request)
    {
        var command = new CreateIncidentCommand(
            request.CondominiumId,
            request.ReportedById,
            request.Title,
            request.Description,
            request.Type,
            request.Priority,
            request.UnitId,
            request.Location
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return CreatedAtAction(nameof(GetIncident), new { id = result.Value }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> UpdateIncident(Guid id, [FromBody] UpdateIncidentRequest request)
    {
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
