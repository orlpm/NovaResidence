using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Billing.Commands;

public class CreateChargeCommandHandler : IRequestHandler<CreateChargeCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CreateChargeCommandHandler> _logger;

    public CreateChargeCommandHandler(IApplicationDbContext context, ILogger<CreateChargeCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(CreateChargeCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var charge = Charge.Create(
                request.CondominiumId,
                request.UnitId,
                request.Concept,
                request.FeeType,
                request.Amount,
                request.DueDate,
                request.BillingMonth,
                request.BillingYear,
                request.ResidentId,
                request.Description,
                request.ApplyLateFee,
                request.LateFeePercentage
            );

            _context.Charges.Add(charge);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created charge {ChargeId} for unit {UnitId}", charge.Id, request.UnitId);
            return Result.Success(charge.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating charge");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating charge: {ex.Message}" }, null));
        }
    }
}

public class CreateBulkChargesCommandHandler : IRequestHandler<CreateBulkChargesCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CreateBulkChargesCommandHandler> _logger;

    public CreateBulkChargesCommandHandler(IApplicationDbContext context, ILogger<CreateBulkChargesCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<int>> Handle(CreateBulkChargesCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Get all units in the condominium
            var units = await _context.Units
                .Where(u => _context.Buildings
                    .Any(b => b.Id == u.BuildingId && b.CondominiumId == request.CondominiumId && !b.IsDeleted))
                .Where(u => !u.IsDeleted && u.Status == UnitStatus.Occupied)
                .ToListAsync(cancellationToken);

            var charges = units.Select(unit => Charge.Create(
                request.CondominiumId,
                unit.Id,
                request.Concept,
                request.FeeType,
                request.Amount,
                request.DueDate,
                request.BillingMonth,
                request.BillingYear,
                null,
                null,
                request.ApplyLateFee,
                request.LateFeePercentage
            )).ToList();

            _context.Charges.AddRange(charges);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created {Count} charges for condominium {CondominiumId}", charges.Count, request.CondominiumId);
            return Result.Success(charges.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating bulk charges");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating bulk charges: {ex.Message}" }, null));
        }
    }
}

public class CancelChargeCommandHandler : IRequestHandler<CancelChargeCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public CancelChargeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(CancelChargeCommand request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges.FindAsync(new object[] { request.ChargeId }, cancellationToken);
        if (charge == null)
            return Result.NotFound(new string[] { "Charge not found" });

        try
        {
            charge.Cancel(request.Reason);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class ForgiveChargeCommandHandler : IRequestHandler<ForgiveChargeCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ForgiveChargeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ForgiveChargeCommand request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges.FindAsync(new object[] { request.ChargeId }, cancellationToken);
        if (charge == null)
            return Result.NotFound(new string[] { "Charge not found" });

        charge.Forgive(request.Reason);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class ApplyLateFeeCommandHandler : IRequestHandler<ApplyLateFeeCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ApplyLateFeeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ApplyLateFeeCommand request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges.FindAsync(new object[] { request.ChargeId }, cancellationToken);
        if (charge == null)
            return Result.NotFound(new string[] { "Charge not found" });

        if (!charge.ApplyLateFee || !charge.LateFeePercentage.HasValue)
            return Result.Error(new Ardalis.Result.ErrorList(new[] { "Charge is not configured for late fees" }, null));

        var lateFeeAmount = charge.Amount * (charge.LateFeePercentage.Value / 100);
        
        try
        {
            charge.ApplyLateFeeCharge(lateFeeAmount);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class RecordPaymentCommandHandler : IRequestHandler<RecordPaymentCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<RecordPaymentCommandHandler> _logger;

    public RecordPaymentCommandHandler(IApplicationDbContext context, ILogger<RecordPaymentCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(RecordPaymentCommand request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges
            .Include(c => c.Payments)
            .FirstOrDefaultAsync(c => c.Id == request.ChargeId, cancellationToken);
            
        if (charge == null)
            return Result.NotFound(new string[] { "Charge not found" });

        try
        {
            var payment = Payment.Create(
                request.ChargeId,
                request.Amount,
                request.PaymentMethod,
                request.PaymentDate,
                request.ReceivedById,
                request.ReferenceNumber,
                request.Notes
            );

            _context.Payments.Add(payment);
            charge.ApplyPayment(payment);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Recorded payment {PaymentId} for charge {ChargeId}", payment.Id, request.ChargeId);
            return Result.Success(payment.Id);
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class VerifyPaymentCommandHandler : IRequestHandler<VerifyPaymentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public VerifyPaymentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(VerifyPaymentCommand request, CancellationToken cancellationToken)
    {
        var payment = await _context.Payments.FindAsync(new object[] { request.PaymentId }, cancellationToken);
        if (payment == null)
            return Result.NotFound(new string[] { "Payment not found" });

        payment.Verify(request.VerifiedById);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class RefundPaymentCommandHandler : IRequestHandler<RefundPaymentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public RefundPaymentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(RefundPaymentCommand request, CancellationToken cancellationToken)
    {
        var payment = await _context.Payments.FindAsync(new object[] { request.PaymentId }, cancellationToken);
        if (payment == null)
            return Result.NotFound(new string[] { "Payment not found" });

        try
        {
            payment.Refund(request.Reason, request.RefundedById);
            await _context.SaveChangesAsync(cancellationToken);
            return Result.Success();
        }
        catch (InvalidOperationException ex)
        {
            return Result.Error(new Ardalis.Result.ErrorList(new[] { ex.Message }, null));
        }
    }
}

public class CreateFeeConfigurationCommandHandler : IRequestHandler<CreateFeeConfigurationCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public CreateFeeConfigurationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(CreateFeeConfigurationCommand request, CancellationToken cancellationToken)
    {
        var feeConfig = FeeConfiguration.Create(
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

        _context.FeeConfigurations.Add(feeConfig);
        await _context.SaveChangesAsync(cancellationToken);

        return Result.Success(feeConfig.Id);
    }
}

public class UpdateFeeConfigurationCommandHandler : IRequestHandler<UpdateFeeConfigurationCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UpdateFeeConfigurationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdateFeeConfigurationCommand request, CancellationToken cancellationToken)
    {
        var feeConfig = await _context.FeeConfigurations.FindAsync(new object[] { request.FeeConfigurationId }, cancellationToken);
        if (feeConfig == null)
            return Result.NotFound(new string[] { "Fee configuration not found" });

        feeConfig.Update(
            request.Name,
            request.DefaultAmount,
            request.RecurringDay,
            request.DueDayOffset,
            request.ApplyLateFee,
            request.LateFeePercentage,
            request.GracePeriodDays,
            request.Description
        );

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class ToggleFeeConfigurationCommandHandler : IRequestHandler<ToggleFeeConfigurationCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ToggleFeeConfigurationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ToggleFeeConfigurationCommand request, CancellationToken cancellationToken)
    {
        var feeConfig = await _context.FeeConfigurations.FindAsync(new object[] { request.FeeConfigurationId }, cancellationToken);
        if (feeConfig == null)
            return Result.NotFound(new string[] { "Fee configuration not found" });

        if (feeConfig.IsActive)
            feeConfig.Deactivate();
        else
            feeConfig.Activate();

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class GenerateMonthlyChargesCommandHandler : IRequestHandler<GenerateMonthlyChargesCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<GenerateMonthlyChargesCommandHandler> _logger;

    public GenerateMonthlyChargesCommandHandler(IApplicationDbContext context, ILogger<GenerateMonthlyChargesCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<int>> Handle(GenerateMonthlyChargesCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Get active fee configurations
            var feeConfigs = await _context.FeeConfigurations
                .Where(f => f.CondominiumId == request.CondominiumId && f.IsActive && f.IsRecurring)
                .ToListAsync(cancellationToken);

            if (!feeConfigs.Any())
                return Result.Success(0);

            // Get all units
            var units = await _context.Units
                .Where(u => _context.Buildings
                    .Any(b => b.Id == u.BuildingId && b.CondominiumId == request.CondominiumId && !b.IsDeleted))
                .Where(u => !u.IsDeleted)
                .ToListAsync(cancellationToken);

            var chargesCreated = 0;

            foreach (var feeConfig in feeConfigs)
            {
                foreach (var unit in units)
                {
                    // Check if charge already exists for this period
                    var existingCharge = await _context.Charges
                        .AnyAsync(c => 
                            c.UnitId == unit.Id && 
                            c.FeeType == feeConfig.FeeType &&
                            c.BillingPeriodMonth == request.Month &&
                            c.BillingPeriodYear == request.Year &&
                            c.Status != ChargeStatus.Cancelled,
                            cancellationToken);

                    if (existingCharge)
                        continue;

                    // Calculate due date
                    var dueDate = new DateTime(request.Year, request.Month, feeConfig.RecurringDay ?? 1)
                        .AddDays(feeConfig.DueDayOffset ?? 10);

                    // Use unit's monthly maintenance fee if available, otherwise use config default
                    var amount = feeConfig.FeeType == FeeType.MonthlyMaintenance && unit.MonthlyMaintenanceFee > 0
                        ? unit.MonthlyMaintenanceFee
                        : feeConfig.DefaultAmount;

                    var charge = Charge.Create(
                        request.CondominiumId,
                        unit.Id,
                        feeConfig.Name,
                        feeConfig.FeeType,
                        amount,
                        dueDate,
                        request.Month,
                        request.Year,
                        null,
                        feeConfig.Description,
                        feeConfig.ApplyLateFee,
                        feeConfig.LateFeePercentage
                    );

                    _context.Charges.Add(charge);
                    chargesCreated++;
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Generated {Count} charges for condominium {CondominiumId} for {Month}/{Year}", 
                chargesCreated, request.CondominiumId, request.Month, request.Year);

            return Result.Success(chargesCreated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating monthly charges");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error generating charges: {ex.Message}" }, null));
        }
    }
}

