using Microsoft.AspNetCore.Mvc;
using MediatR;
using NovaResidence.Application.Features.Amenities.Commands.CreateAmenity;
using NovaResidence.Application.Features.Amenities.Commands.UpdateAmenity;
using NovaResidence.Application.Features.Amenities.Commands.DeleteAmenity;
using NovaResidence.Application.Features.Amenities.Commands.ToggleAmenityStatus;
using NovaResidence.Application.Features.Amenities.Queries.GetAmenity;
using NovaResidence.Application.Features.Amenities.Queries.GetCondominiumAmenities;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AmenitiesController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AmenitiesController> _logger;

    public AmenitiesController(IMediator mediator, ILogger<AmenitiesController> logger)
    {
        _mediator = mediator;
        _logger = logger;
    }

    /// <summary>
    /// Get amenity by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AmenityDetailDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetAmenityQuery(id));

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<AmenityDetailDto>.SuccessResponse(result.Value));
        }

        return NotFound(ApiResponse<AmenityDetailDto>.FailureResponse("Amenity not found"));
    }

    /// <summary>
    /// Get all amenities for a condominium
    /// </summary>
    [HttpGet("condominium/{condominiumId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<List<AmenityListDto>>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        var result = await _mediator.Send(new GetCondominiumAmenitiesQuery(condominiumId));

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<List<AmenityListDto>>.SuccessResponse(result.Value));
        }

        return BadRequest(ApiResponse<List<AmenityListDto>>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error getting amenities"));
    }

    /// <summary>
    /// Create a new amenity
    /// </summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<CreateAmenityResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] CreateAmenityRequest request)
    {
        _logger.LogInformation("Creating amenity: {Name} for condominium {CondominiumId}", 
            request.Name, request.CondominiumId);

        var command = new CreateAmenityCommand(
            CondominiumId: request.CondominiumId,
            Name: request.Name,
            Description: request.Description ?? string.Empty,
            Type: request.Type,
            Capacity: request.Capacity,
            RequiresReservation: request.RequiresReservation,
            RequiresApproval: request.RequiresApproval,
            OpeningTime: TimeSpan.Parse(request.OpeningTime),
            ClosingTime: TimeSpan.Parse(request.ClosingTime),
            ReservationFee: request.ReservationFee,
            MinReservationHours: request.MinReservationHours,
            MaxReservationHours: request.MaxReservationHours,
            Rules: request.Rules
        );

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return CreatedAtAction(
                nameof(GetById),
                new { id = result.Value.AmenityId },
                ApiResponse<CreateAmenityResponse>.SuccessResponse(result.Value, "Amenity created successfully"));
        }

        return BadRequest(ApiResponse<CreateAmenityResponse>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error creating amenity"));
    }

    /// <summary>
    /// Update an existing amenity
    /// </summary>
    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<UpdateAmenityResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateAmenityRequest request)
    {
        _logger.LogInformation("Updating amenity: {Id}", id);

        var command = new UpdateAmenityCommand(
            AmenityId: id,
            Name: request.Name,
            Description: request.Description ?? string.Empty,
            Capacity: request.Capacity,
            OpeningTime: TimeSpan.Parse(request.OpeningTime),
            ClosingTime: TimeSpan.Parse(request.ClosingTime),
            RequiresReservation: request.RequiresReservation,
            RequiresApproval: request.RequiresApproval,
            ReservationFee: request.ReservationFee,
            MinReservationHours: request.MinReservationHours,
            MaxReservationHours: request.MaxReservationHours,
            Rules: request.Rules
        );

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<UpdateAmenityResponse>.SuccessResponse(result.Value, "Amenity updated successfully"));
        }

        if (result.Errors.FirstOrDefault()?.Contains("not found") == true)
        {
            return NotFound(ApiResponse<UpdateAmenityResponse>.FailureResponse("Amenity not found"));
        }

        return BadRequest(ApiResponse<UpdateAmenityResponse>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error updating amenity"));
    }

    /// <summary>
    /// Delete an amenity
    /// </summary>
    [HttpDelete("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        _logger.LogInformation("Deleting amenity: {Id}", id);

        var result = await _mediator.Send(new DeleteAmenityCommand(id));

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Amenity deleted successfully"));
        }

        if (result.Errors.FirstOrDefault()?.Contains("not found") == true)
        {
            return NotFound(ApiResponse<bool>.FailureResponse("Amenity not found"));
        }

        return BadRequest(ApiResponse<bool>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error deleting amenity"));
    }

    /// <summary>
    /// Toggle amenity active status
    /// </summary>
    [HttpPatch("{id:guid}/status")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ToggleStatus(Guid id, [FromBody] ToggleStatusRequest request)
    {
        _logger.LogInformation("Toggling amenity status: {Id} to {IsActive}", id, request.IsActive);

        var result = await _mediator.Send(new ToggleAmenityStatusCommand(id, request.IsActive));

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<bool>.SuccessResponse(true, 
                request.IsActive ? "Amenity activated" : "Amenity deactivated"));
        }

        if (result.Errors.FirstOrDefault()?.Contains("not found") == true)
        {
            return NotFound(ApiResponse<bool>.FailureResponse("Amenity not found"));
        }

        return BadRequest(ApiResponse<bool>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Error updating amenity status"));
    }

    /// <summary>
    /// Get amenity types
    /// </summary>
    [HttpGet("types")]
    [ProducesResponseType(typeof(ApiResponse<List<AmenityTypeDto>>), StatusCodes.Status200OK)]
    public IActionResult GetAmenityTypes()
    {
        var types = new List<AmenityTypeDto>
        {
            new(1, "Pool", "Alberca"),
            new(2, "Gym", "Gimnasio"),
            new(3, "PartyRoom", "Salón de fiestas"),
            new(4, "Playground", "Área de juegos"),
            new(5, "SportsCourt", "Cancha deportiva"),
            new(6, "BBQArea", "Área de asadores"),
            new(7, "ConferenceRoom", "Sala de juntas"),
            new(8, "Theater", "Sala de cine"),
            new(99, "Other", "Otro")
        };

        return Ok(ApiResponse<List<AmenityTypeDto>>.SuccessResponse(types));
    }
}

// Request DTOs
public record CreateAmenityRequest(
    Guid CondominiumId,
    string Name,
    string? Description,
    int Type,
    int Capacity,
    bool RequiresReservation,
    bool RequiresApproval,
    string OpeningTime,
    string ClosingTime,
    decimal? ReservationFee = null,
    int MinReservationHours = 1,
    int MaxReservationHours = 4,
    string? Rules = null
);

public record UpdateAmenityRequest(
    string Name,
    string? Description,
    int Capacity,
    bool RequiresReservation,
    bool RequiresApproval,
    string OpeningTime,
    string ClosingTime,
    decimal? ReservationFee = null,
    int MinReservationHours = 1,
    int MaxReservationHours = 4,
    string? Rules = null
);

public record ToggleStatusRequest(bool IsActive);

public record AmenityTypeDto(int Id, string Name, string DisplayName);
