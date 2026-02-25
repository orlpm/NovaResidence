using Microsoft.AspNetCore.Mvc;
using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Features.Billing.Commands;
using NovaResidence.Application.Features.Billing.Queries;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BillingController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IWebHostEnvironment _env;

    public BillingController(IMediator mediator, IWebHostEnvironment env)
    {
        _mediator = mediator;
        _env = env;
    }

    #region Charges

    [HttpGet("charges/{id:guid}")]
    public async Task<ActionResult<ChargeDetailDto>> GetCharge(Guid id)
    {
        var result = await _mediator.Send(new GetChargeQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("charges/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<List<ChargeListDto>>> GetCondominiumCharges(
        Guid condominiumId,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        [FromQuery] ChargeStatus? status = null,
        [FromQuery] FeeType? feeType = null)
    {
        var result = await _mediator.Send(new GetCondominiumChargesQuery(
            condominiumId, month, year, status, feeType));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("charges/unit/{unitId:guid}")]
    public async Task<ActionResult<List<ChargeListDto>>> GetUnitCharges(
        Guid unitId,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null,
        [FromQuery] ChargeStatus? status = null)
    {
        var result = await _mediator.Send(new GetUnitChargesQuery(unitId, month, year, status));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("charges/overdue/{condominiumId:guid}")]
    public async Task<ActionResult<List<ChargeListDto>>> GetOverdueCharges(Guid condominiumId)
    {
        var result = await _mediator.Send(new GetOverdueChargesQuery(condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("charges")]
    public async Task<ActionResult<Guid>> CreateCharge([FromBody] CreateChargeRequest request)
    {
        var command = new CreateChargeCommand(
            request.CondominiumId,
            request.UnitId,
            request.Concept,
            request.FeeType,
            request.Amount,
            request.DueDate,
            request.BillingPeriodMonth,
            request.BillingPeriodYear,
            request.ResidentId,
            request.Description,
            request.ApplyLateFee,
            request.LateFeePercentage
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return CreatedAtAction(nameof(GetCharge), new { id = result.Value }, result.Value);
    }

    [HttpPost("charges/bulk")]
    public async Task<ActionResult<int>> CreateBulkCharges([FromBody] CreateBulkChargesRequest request)
    {
        var command = new CreateBulkChargesCommand(
            request.CondominiumId,
            request.Concept,
            request.FeeType,
            request.Amount,
            request.DueDate,
            request.BillingPeriodMonth,
            request.BillingPeriodYear,
            request.ApplyLateFee,
            request.LateFeePercentage
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("charges/{id:guid}/cancel")]
    public async Task<ActionResult> CancelCharge(Guid id, [FromBody] CancelChargeRequest request)
    {
        var result = await _mediator.Send(new CancelChargeCommand(id, request.Reason));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("charges/{id:guid}/forgive")]
    public async Task<ActionResult> ForgiveCharge(Guid id, [FromBody] ForgiveChargeRequest request)
    {
        var result = await _mediator.Send(new ForgiveChargeCommand(id, request.Reason));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("charges/{id:guid}/apply-late-fee")]
    public async Task<ActionResult> ApplyLateFee(Guid id)
    {
        var result = await _mediator.Send(new ApplyLateFeeCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpDelete("charges/{id:guid}")]
    public async Task<ActionResult> DeleteCharge(Guid id)
    {
        var result = await _mediator.Send(new DeleteChargeCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpDelete("charges/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<int>> DeleteChargesByCondominium(
        Guid condominiumId,
        [FromQuery] int? month = null,
        [FromQuery] int? year = null)
    {
        var result = await _mediator.Send(new DeleteChargesByCondominiumCommand(condominiumId, month, year));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    #endregion

    #region Payments

    [HttpPost("payments")]
    public async Task<ActionResult<Guid>> RecordPayment([FromBody] RecordPaymentRequest request)
    {
        var command = new RecordPaymentCommand(
            request.ChargeId,
            request.Amount,
            request.PaymentMethod,
            request.PaymentDate ?? DateTime.UtcNow,
            request.ReceivedById,
            request.ReferenceNumber,
            request.Notes,
            request.ProofImageUrl
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("payments/upload-proof")]
    public async Task<ActionResult<string>> UploadPaymentProof(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No se proporcionó archivo");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
            return BadRequest("Formato de archivo no válido. Use JPG, PNG, PDF o WEBP.");

        if (file.Length > 5 * 1024 * 1024) // 5MB limit
            return BadRequest("El archivo no debe superar los 5MB.");

        var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads", "payment-proofs");
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"/uploads/payment-proofs/{uniqueFileName}";
        return Ok(fileUrl);
    }

    [HttpGet("payments/pending/{condominiumId:guid}")]
    public async Task<ActionResult<List<PaymentDto>>> GetPendingPayments(Guid condominiumId)
    {
        var result = await _mediator.Send(new GetPendingPaymentsQuery(condominiumId));
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        return Ok(result.Value);
    }

    [HttpPost("payments/{id:guid}/verify")]
    public async Task<ActionResult> VerifyPayment(Guid id, [FromBody] VerifyPaymentRequest request)
    {
        var result = await _mediator.Send(new VerifyPaymentCommand(id, request.VerifiedById));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("payments/{id:guid}/refund")]
    public async Task<ActionResult> RefundPayment(Guid id, [FromBody] RefundPaymentRequest request)
    {
        var result = await _mediator.Send(new RefundPaymentCommand(id, request.Reason, request.RefundedById));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    #endregion

    #region Balances

    [HttpGet("balance/unit/{unitId:guid}")]
    public async Task<ActionResult<UnitBalanceDto>> GetUnitBalance(Guid unitId)
    {
        var result = await _mediator.Send(new GetUnitBalanceQuery(unitId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("balances/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<List<UnitBalanceDto>>> GetCondominiumBalances(Guid condominiumId)
    {
        var result = await _mediator.Send(new GetCondominiumBalancesQuery(condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("summary/{condominiumId:guid}")]
    public async Task<ActionResult<BillingSummaryDto>> GetBillingSummary(
        Guid condominiumId,
        [FromQuery] int month,
        [FromQuery] int year)
    {
        var result = await _mediator.Send(new GetBillingSummaryQuery(condominiumId, month, year));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    #endregion

    #region Fee Configurations

    [HttpGet("fee-configurations/{condominiumId:guid}")]
    public async Task<ActionResult<List<FeeConfigurationDto>>> GetFeeConfigurations(Guid condominiumId)
    {
        var result = await _mediator.Send(new GetFeeConfigurationsQuery(condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("fee-configurations")]
    public async Task<ActionResult<Guid>> CreateFeeConfiguration([FromBody] CreateFeeConfigurationRequest request)
    {
        var command = new CreateFeeConfigurationCommand(
            request.CondominiumId,
            request.Name,
            request.FeeType,
            request.DefaultAmount,
            request.IsRecurring,
            request.RecurringDay,
            request.DueDayOffset,
            request.ApplyLateFee,
            request.LateFeePercentage,
            request.GracePeriodDays,
            request.Description
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPut("fee-configurations/{id:guid}")]
    public async Task<ActionResult> UpdateFeeConfiguration(Guid id, [FromBody] UpdateFeeConfigurationRequest request)
    {
        var command = new UpdateFeeConfigurationCommand(
            id,
            request.Name,
            request.DefaultAmount,
            request.RecurringDay,
            request.DueDayOffset,
            request.ApplyLateFee,
            request.LateFeePercentage,
            request.GracePeriodDays,
            request.Description
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("fee-configurations/{id:guid}/toggle")]
    public async Task<ActionResult> ToggleFeeConfiguration(Guid id)
    {
        var result = await _mediator.Send(new ToggleFeeConfigurationCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpDelete("fee-configurations/{id:guid}")]
    public async Task<ActionResult> DeleteFeeConfiguration(Guid id)
    {
        var result = await _mediator.Send(new DeleteFeeConfigurationCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpDelete("fee-configurations/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<int>> DeleteAllFeeConfigurations(Guid condominiumId)
    {
        var result = await _mediator.Send(new DeleteAllFeeConfigurationsCommand(condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("generate-monthly")]
    public async Task<ActionResult<List<Guid>>> GenerateMonthlyCharges([FromBody] GenerateMonthlyChargesRequest request)
    {
        var result = await _mediator.Send(new GenerateMonthlyChargesCommand(
            request.CondominiumId, 
            request.Month, 
            request.Year
        ));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    #endregion
}

// Request DTOs
public record CreateChargeRequest(
    Guid CondominiumId,
    Guid UnitId,
    string Concept,
    FeeType FeeType,
    decimal Amount,
    DateTime DueDate,
    int BillingPeriodMonth,
    int BillingPeriodYear,
    Guid? ResidentId = null,
    string? Description = null,
    bool ApplyLateFee = true,
    decimal? LateFeePercentage = null
);

public record CreateBulkChargesRequest(
    Guid CondominiumId,
    string Concept,
    FeeType FeeType,
    decimal Amount,
    DateTime DueDate,
    int BillingPeriodMonth,
    int BillingPeriodYear,
    bool ApplyLateFee = true,
    decimal? LateFeePercentage = null
);

public record CancelChargeRequest(string Reason);

public record ForgiveChargeRequest(string Reason);

public record RecordPaymentRequest(
    Guid ChargeId,
    decimal Amount,
    PaymentMethod PaymentMethod,
    DateTime? PaymentDate = null,
    Guid? ReceivedById = null,
    string? ReferenceNumber = null,
    string? Notes = null,
    string? ProofImageUrl = null
);

public record VerifyPaymentRequest(Guid VerifiedById);

public record RefundPaymentRequest(string Reason, Guid RefundedById);

public record CreateFeeConfigurationRequest(
    Guid CondominiumId,
    string Name,
    FeeType FeeType,
    decimal DefaultAmount,
    bool IsRecurring = true,
    int? RecurringDay = 1,
    int? DueDayOffset = 10,
    bool ApplyLateFee = true,
    decimal? LateFeePercentage = 5m,
    int? GracePeriodDays = 5,
    string? Description = null
);

public record UpdateFeeConfigurationRequest(
    string Name,
    string? Description,
    decimal DefaultAmount,
    int? RecurringDay,
    int? DueDayOffset,
    bool ApplyLateFee,
    decimal? LateFeePercentage,
    int? GracePeriodDays
);

public record GenerateMonthlyChargesRequest(Guid CondominiumId, int Month, int Year);
