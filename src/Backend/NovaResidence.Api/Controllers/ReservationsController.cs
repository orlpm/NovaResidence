using Mediator;
using Microsoft.AspNetCore.Mvc;
using NovaResidence.Shared.Models;
using NovaResidence.Application.Features.Reservations.Commands;
using NovaResidence.Application.Features.Reservations.Queries;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReservationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReservationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost]
    public async Task<IActionResult> CreateReservation([FromBody] CreateReservationRequest request)
    {
        // Parse date and time strings from frontend
        if (!DateOnly.TryParse(request.ReservationDate, out var reservationDate))
            return BadRequest("Invalid reservation date format. Use yyyy-MM-dd");
        
        if (!TimeOnly.TryParse(request.StartTime, out var startTime))
            return BadRequest("Invalid start time format. Use HH:mm");
        
        if (!TimeOnly.TryParse(request.EndTime, out var endTime))
            return BadRequest("Invalid end time format. Use HH:mm");

        var command = new CreateReservationCommand(
            request.AmenityId,
            request.ResidentId,
            request.UnitId,
            reservationDate,
            startTime,
            endTime,
            request.NumberOfGuests,
            request.Notes
        );

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(result.Value);
        }

        // Return more informative error messages
        var errorMessages = result.Errors?.ToList() ?? new List<string>();
        if (result.ValidationErrors?.Any() == true)
        {
            errorMessages.AddRange(result.ValidationErrors.Select(v => v.ErrorMessage));
        }
        
        return BadRequest(new { message = errorMessages.FirstOrDefault() ?? "Error creating reservation", errors = errorMessages });
    }

    [HttpGet("unit/{unitId}")]
    public async Task<IActionResult> GetUnitReservations(Guid unitId)
    {
        var query = new GetUnitReservationsQuery(unitId);
        var result = await _mediator.Send(query);

        if (result.IsSuccess)
        {
            return Ok(result.Value);
        }

        return NotFound(result.Errors);
    }

    [HttpGet("condominium/{condominiumId}")]
    public async Task<IActionResult> GetCondominiumReservations(Guid condominiumId)
    {
        var query = new GetCondominiumReservationsQuery(condominiumId);
        var result = await _mediator.Send(query);

        if (result.IsSuccess)
        {
            return Ok(result.Value);
        }

        return NotFound(result.Errors);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetReservation(Guid id)
    {
        var query = new GetReservationQuery(id);
        var result = await _mediator.Send(query);

        if (result.IsSuccess)
        {
            return Ok(result.Value);
        }

        return NotFound(result.Errors);
    }

    [HttpPost("{id}/cancel")]
    public async Task<IActionResult> CancelReservation(Guid id, [FromBody] CancelReservationRequest request)
    {
        var command = new CancelReservationCommand(id, request.Reason);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(true);
        }

        return BadRequest(result.Errors);
    }

    [HttpPost("{id}/approve")]
    public async Task<IActionResult> ApproveReservation(Guid id, [FromBody] ApproveReservationRequest request)
    {
        var command = new ApproveReservationCommand(id, request.ApprovedByUserId);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Reservación aprobada exitosamente"));
        }

        var errorMessages = result.Errors?.ToList() ?? new List<string>();
        if (result.ValidationErrors?.Any() == true)
        {
            errorMessages.AddRange(result.ValidationErrors.Select(v => v.ErrorMessage));
        }
        
        return BadRequest(ApiResponse<bool>.FailureResponse(errorMessages.FirstOrDefault() ?? "Error al aprobar reservación"));
    }

    [HttpPost("{id}/reject")]
    public async Task<IActionResult> RejectReservation(Guid id, [FromBody] RejectReservationRequest request)
    {
        var command = new RejectReservationCommand(id, request.RejectedByUserId, request.Reason);
        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            return Ok(ApiResponse<bool>.SuccessResponse(true, "Reservación rechazada"));
        }

        var errorMessages = result.Errors?.ToList() ?? new List<string>();
        if (result.ValidationErrors?.Any() == true)
        {
            errorMessages.AddRange(result.ValidationErrors.Select(v => v.ErrorMessage));
        }
        
        return BadRequest(ApiResponse<bool>.FailureResponse(errorMessages.FirstOrDefault() ?? "Error al rechazar reservación"));
    }
}

// Request DTOs
public record CreateReservationRequest(
    Guid AmenityId,
    Guid ResidentId,
    Guid UnitId,
    string ReservationDate,
    string StartTime,
    string EndTime,
    int NumberOfGuests,
    string? Notes
);

public record CancelReservationRequest(
    string Reason
);

public record ApproveReservationRequest(
    Guid ApprovedByUserId
);

public record RejectReservationRequest(
    Guid RejectedByUserId,
    string Reason
);
