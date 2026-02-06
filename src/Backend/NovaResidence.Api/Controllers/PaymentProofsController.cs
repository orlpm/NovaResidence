using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NovaResidence.Application.Features.PaymentProofs.Commands;
using NovaResidence.Application.Features.PaymentProofs.Queries;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Enums;
using System.Security.Claims;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentProofsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IWebHostEnvironment _environment;

    public PaymentProofsController(IMediator mediator, IWebHostEnvironment environment)
    {
        _mediator = mediator;
        _environment = environment;
    }

    /// <summary>
    /// Get payment proofs for a condominium (Admin)
    /// </summary>
    [HttpGet("condominium/{condominiumId}")]
    public async Task<ActionResult<PagedList<PaymentProofListDto>>> GetCondominiumPaymentProofs(
        Guid condominiumId,
        [FromQuery] PaymentProofStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = new GetCondominiumPaymentProofsQuery(condominiumId, status, page, pageSize);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Get payment proofs for a unit (Resident)
    /// </summary>
    [HttpGet("unit/{unitId}")]
    public async Task<ActionResult<PagedList<PaymentProofListDto>>> GetUnitPaymentProofs(
        Guid unitId,
        [FromQuery] PaymentProofStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = new GetUnitPaymentProofsQuery(unitId, status, page, pageSize);
        var result = await _mediator.Send(query);
        return Ok(result);
    }

    /// <summary>
    /// Get payment proof details
    /// </summary>
    [HttpGet("{id}")]
    public async Task<ActionResult<PaymentProofDetailDto>> GetPaymentProof(Guid id)
    {
        var query = new GetPaymentProofQuery(id);
        var result = await _mediator.Send(query);
        
        if (result == null)
            return NotFound();
            
        return Ok(result);
    }

    /// <summary>
    /// Download payment proof file
    /// </summary>
    [HttpGet("{id}/file")]
    public async Task<IActionResult> DownloadFile(Guid id)
    {
        var query = new GetPaymentProofFileQuery(id);
        var result = await _mediator.Send(query);
        
        if (result == null)
            return NotFound();
            
        return File(result.Content, result.ContentType, result.FileName);
    }

    /// <summary>
    /// Submit a payment proof (Resident uploads bank receipt)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> SubmitPaymentProof([FromForm] SubmitPaymentProofRequest request)
    {
        if (request.File == null || request.File.Length == 0)
            return BadRequest("File is required");

        // Validate file type
        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "application/pdf" };
        if (!allowedTypes.Contains(request.File.ContentType))
            return BadRequest("Invalid file type. Allowed types: JPEG, PNG, GIF, PDF");

        // Validate file size (max 10MB)
        if (request.File.Length > 10 * 1024 * 1024)
            return BadRequest("File size exceeds 10MB limit");

        // Create uploads directory if it doesn't exist
        var uploadsPath = Path.Combine(_environment.ContentRootPath, "uploads", "payment-proofs");
        Directory.CreateDirectory(uploadsPath);

        // Generate unique file name
        var fileExtension = Path.GetExtension(request.File.FileName);
        var fileName = $"{Guid.NewGuid()}{fileExtension}";
        var filePath = Path.Combine(uploadsPath, fileName);

        // Save file
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await request.File.CopyToAsync(stream);
        }

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var command = new SubmitPaymentProofCommand(
            request.CondominiumId,
            request.UnitId,
            request.ChargeId,
            Guid.Parse(userId),
            request.Amount,
            request.PaymentMethod,
            request.PaymentDate,
            fileName,
            request.File.FileName,
            filePath,
            request.File.ContentType,
            request.File.Length,
            request.ReferenceNumber,
            request.BankName,
            request.Notes
        );

        var proofId = await _mediator.Send(command);
        return Ok(proofId);
    }

    /// <summary>
    /// Approve a payment proof (Admin only)
    /// </summary>
    [HttpPost("{id}/approve")]
    public async Task<ActionResult> ApprovePaymentProof(Guid id, [FromBody] ApproveRejectRequest? request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var command = new ApprovePaymentProofCommand(id, Guid.Parse(userId), request?.Comments);
        var result = await _mediator.Send(command);
        
        if (!result)
            return BadRequest("Failed to approve payment proof");
            
        return Ok(new { success = true, message = "Payment proof approved successfully" });
    }

    /// <summary>
    /// Reject a payment proof (Admin only)
    /// </summary>
    [HttpPost("{id}/reject")]
    public async Task<ActionResult> RejectPaymentProof(Guid id, [FromBody] ApproveRejectRequest request)
    {
        if (string.IsNullOrWhiteSpace(request?.Reason))
            return BadRequest("Rejection reason is required");

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userId))
            return Unauthorized();

        var command = new RejectPaymentProofCommand(id, Guid.Parse(userId), request.Reason);
        var result = await _mediator.Send(command);
        
        if (!result)
            return BadRequest("Failed to reject payment proof");
            
        return Ok(new { success = true, message = "Payment proof rejected" });
    }
}

public class SubmitPaymentProofRequest
{
    public Guid CondominiumId { get; set; }
    public Guid UnitId { get; set; }
    public Guid ChargeId { get; set; }
    public decimal Amount { get; set; }
    public PaymentMethod PaymentMethod { get; set; }
    public DateTime PaymentDate { get; set; }
    public string? ReferenceNumber { get; set; }
    public string? BankName { get; set; }
    public string? Notes { get; set; }
    public IFormFile? File { get; set; }
}

public class ApproveRejectRequest
{
    public string? Comments { get; set; }
    public string? Reason { get; set; }
}
