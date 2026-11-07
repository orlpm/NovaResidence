using Mediator;
using Microsoft.AspNetCore.Mvc;
using NovaResidence.Shared.Models;
using NovaResidence.Application.Features.Dashboard.Queries;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get dashboard statistics
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats([FromQuery] Guid? condominiumId = null, [FromQuery] List<Guid>? condominiumIds = null)
    {
        var query = new GetDashboardStatsQuery(condominiumId, condominiumIds);
        var result = await _mediator.Send(query);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<DashboardStatsDto>.SuccessResponse(result.Value));
        }

        return BadRequest(ApiResponse<DashboardStatsDto>.FailureResponse(
            result.Errors?.FirstOrDefault() ?? "Error al obtener estadísticas"));
    }

    /// <summary>
    /// Get dashboard statistics for all condominiums managed by a user
    /// </summary>
    [HttpGet("stats/user/{userId}")]
    public async Task<IActionResult> GetUserStats(Guid userId)
    {
        // For now, return stats for all condominiums (no filter)
        // In the future, we could filter by condominiums the user has access to
        var query = new GetDashboardStatsQuery();
        var result = await _mediator.Send(query);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<DashboardStatsDto>.SuccessResponse(result.Value));
        }

        return BadRequest(ApiResponse<DashboardStatsDto>.FailureResponse(
            result.Errors?.FirstOrDefault() ?? "Error al obtener estadísticas"));
    }
}
