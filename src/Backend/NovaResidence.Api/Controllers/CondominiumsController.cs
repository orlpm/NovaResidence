using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using NovaResidence.Application.Features.Condominiums.Queries.GetCondominium;
using NovaResidence.Application.Features.Condominiums.Queries.GetUserCondominiums;
using NovaResidence.Application.Features.Condominiums.Queries.GetAllCondominiums;
using NovaResidence.Application.Features.Condominiums.Commands.CreateCondominium;
using NovaResidence.Application.Features.Condominiums.Commands.UpdateCondominium;
using NovaResidence.Application.Features.Condominiums.Commands.DeleteCondominium;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CondominiumsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<CondominiumsController> _logger;

    public CondominiumsController(IMediator mediator, ILogger<CondominiumsController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get condominium by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<CondominiumDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetCondominiumQuery(id));

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<CondominiumDetailDto>.SuccessResponse(result.Value));
        }

        return NotFound(ApiResponse<CondominiumDetailDto>.FailureResponse("Condominium not found"));
    }

    /// <summary>
    /// Get condominiums for the current user
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<List<UserCondominiumDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetUserCondominiums(Guid userId)
    {
        var result = await _mediator.Send(new GetUserCondominiumsQuery(userId));

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<List<UserCondominiumDto>>.SuccessResponse(result.Value));
        }

        return BadRequest(ApiResponse<List<UserCondominiumDto>>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error getting condominiums"));
    }

    /// <summary>
    /// Get all condominiums (SuperAdmin only)
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<List<CondominiumListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll([FromQuery] Guid? userId)
    {
        // If userId is provided, get condominiums for that user
        if (userId.HasValue && userId.Value != Guid.Empty)
        {
            var userResult = await _mediator.Send(new GetUserCondominiumsQuery(userId.Value));
            if (userResult.IsSuccess)
                return Ok(ApiResponse<List<UserCondominiumDto>>.SuccessResponse(userResult.Value));
            return BadRequest(ApiResponse<List<UserCondominiumDto>>.FailureResponse(
                userResult.Errors.FirstOrDefault() ?? "Error getting condominiums"));
        }

        // Otherwise get all condominiums (for SuperAdmin)
        var result = await _mediator.Send(new GetAllCondominiumsQuery());

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<List<CondominiumListDto>>.SuccessResponse(result.Value));
        }

        return BadRequest(ApiResponse<List<CondominiumListDto>>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error getting condominiums"));
    }

    /// <summary>
    /// Create new condominium with buildings and units
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CreateCondominiumResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateCondominiumRequest request)
    {
        _logger.LogInformation("Creating condominium: {Name}", request.Name);

        var command = new CreateCondominiumCommand(
            UserId: request.UserId,
            Name: request.Name,
            Description: request.Description,
            Street: request.Street,
            City: request.City,
            State: request.State,
            PostalCode: request.PostalCode,
            Country: request.Country ?? "México",
            Neighborhood: request.Neighborhood,
            Buildings: request.Buildings.Select(b => new CreateBuildingDto(
                Name: b.Name,
                Type: b.Type,
                Section: b.Section,
                TotalFloors: b.TotalFloors,
                StartsAtGroundFloor: b.StartsAtGroundFloor,
                Units: b.Units.Select(u => new CreateUnitDto(
                    UnitNumber: u.UnitNumber,
                    Floor: u.Floor,
                    IsCommercial: u.IsCommercial,
                    Area: u.Area,
                    Bedrooms: u.Bedrooms,
                    Bathrooms: u.Bathrooms,
                    MonthlyMaintenanceFee: u.MonthlyMaintenanceFee
                )).ToList()
            )).ToList()
        );

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return CreatedAtAction(
                nameof(GetById),
                new { id = result.Value.CondominiumId },
                ApiResponse<CreateCondominiumResponse>.SuccessResponse(result.Value, "Condominium created successfully"));
        }

        return BadRequest(ApiResponse<CreateCondominiumResponse>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error creating condominium"));
    }

    /// <summary>
    /// Update condominium
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCondominiumRequest request)
    {
        var command = new UpdateCondominiumCommand(
            id,
            request.Name,
            request.Description,
            request.Street,
            request.City,
            request.State,
            request.PostalCode,
            request.Country ?? "México"
        );

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Condominium updated successfully"));
        }

        return NotFound(ApiResponse<object>.FailureResponse("Condominium not found"));
    }

    /// <summary>
    /// Delete condominium (soft delete)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteCondominiumCommand(id));

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Condominium deleted successfully"));
        }

        return NotFound(ApiResponse<object>.FailureResponse("Condominium not found"));
    }

    /// <summary>
    /// Activate a condominium
    /// </summary>
    [HttpPost("{id:guid}/activate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Activate(Guid id)
    {
        var command = new ToggleCondominiumStatusCommand(id, true);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Condominium activated successfully"));
        }

        return NotFound(ApiResponse<object>.FailureResponse("Condominium not found"));
    }

    /// <summary>
    /// Deactivate (suspend) a condominium
    /// </summary>
    [HttpPost("{id:guid}/deactivate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Deactivate(Guid id)
    {
        var command = new ToggleCondominiumStatusCommand(id, false);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<object>.SuccessResponse(null, "Condominium deactivated successfully"));
        }

        return NotFound(ApiResponse<object>.FailureResponse("Condominium not found"));
    }
}

public record CreateCondominiumRequest(
    Guid UserId,
    string Name,
    string? Description,
    string Street,
    string City,
    string State,
    string PostalCode,
    string? Country,
    string? Neighborhood,
    List<BuildingRequest> Buildings
);

public record BuildingRequest(
    string Name,
    string Type,
    string? Section,
    int TotalFloors,
    bool StartsAtGroundFloor,
    List<UnitRequest> Units
);

public record UnitRequest(
    string UnitNumber,
    int Floor,
    bool IsCommercial,
    decimal Area,
    int Bedrooms,
    int Bathrooms,
    decimal MonthlyMaintenanceFee
);

public record UpdateCondominiumRequest(
    string Name, 
    string? Description,
    string Street,
    string City,
    string State,
    string PostalCode,
    string? Country);
