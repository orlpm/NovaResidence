using Microsoft.AspNetCore.Mvc;
using Mediator;
using NovaResidence.Application.Features.Reports.Queries;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReportsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("financial/{condominiumId:guid}")]
    public async Task<IActionResult> GetFinancialReport(Guid condominiumId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var result = await _mediator.Send(new GetFinancialReportQuery(condominiumId, startDate, endDate));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }

    [HttpGet("operational/{condominiumId:guid}")]
    public async Task<IActionResult> GetOperationalReport(Guid condominiumId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var result = await _mediator.Send(new GetOperationalReportQuery(condominiumId, startDate, endDate));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }

    [HttpGet("residents/{condominiumId:guid}")]
    public async Task<IActionResult> GetResidentReport(Guid condominiumId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var result = await _mediator.Send(new GetResidentReportQuery(condominiumId, startDate, endDate));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }

    [HttpGet("incidents/{condominiumId:guid}")]
    public async Task<IActionResult> GetIncidentReport(Guid condominiumId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var result = await _mediator.Send(new GetIncidentReportQuery(condominiumId, startDate, endDate));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }

    [HttpGet("communications/{condominiumId:guid}")]
    public async Task<IActionResult> GetCommunicationsReport(Guid condominiumId, [FromQuery] DateTime startDate, [FromQuery] DateTime endDate)
    {
        var result = await _mediator.Send(new GetCommunicationsReportQuery(condominiumId, startDate, endDate));
        return result.IsSuccess ? Ok(result.Value) : BadRequest(result.Errors);
    }
}
