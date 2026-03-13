using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Application.Features.Notifications.Commands;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Enums;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Billing.Commands;

public class CreateChargeCommandHandler : IRequestHandler<CreateChargeCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMediator _mediator;
    private readonly ILogger<CreateChargeCommandHandler> _logger;

    public CreateChargeCommandHandler(IApplicationDbContext context, IMediator mediator, ILogger<CreateChargeCommandHandler> logger)
    {
        _context = context;
        _mediator = mediator;
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

            // Get the unit with residents to send notification
            var unit = await _context.Units
                .Include(u => u.Building)
                .FirstOrDefaultAsync(u => u.Id == request.UnitId, cancellationToken);

            if (unit != null)
            {
                // Get registered residents for this unit to send notifications
                var residents = await _context.Residents
                    .Where(r => r.UnitId == request.UnitId && r.IsRegistered && r.UserId != null)
                    .ToListAsync(cancellationToken);

                foreach (var resident in residents)
                {
                    if (resident.UserId.HasValue)
                    {
                        var notificationType = request.FeeType == FeeType.LateFee 
                            ? NotificationType.PaymentReminder 
                            : NotificationType.PaymentReminder;
                        
                        var priority = request.FeeType == FeeType.LateFee 
                            ? NotificationPriority.High 
                            : NotificationPriority.Normal;

                        var title = request.FeeType == FeeType.LateFee 
                            ? "Nuevo recargo aplicado" 
                            : "Nuevo cargo generado";

                        var message = $"Se ha generado un cargo de ${request.Amount:N2} por concepto de {request.Concept}. " +
                                    $"Fecha de vencimiento: {request.DueDate:dd/MM/yyyy}. Unidad: {unit.UnitNumber}";

                        await _mediator.Send(new CreateNotificationCommand(
                            CondominiumId: request.CondominiumId,
                            UserId: resident.UserId.Value,
                            Type: notificationType,
                            Title: title,
                            Message: message,
                            Priority: priority,
                            UnitId: request.UnitId,
                            RelatedEntityType: "Charge",
                            RelatedEntityId: charge.Id,
                            ActionUrl: $"/resident/payments"
                        ), cancellationToken);

                        _logger.LogInformation("Notification sent to user {UserId} for charge {ChargeId}", resident.UserId, charge.Id);
                    }
                }
            }

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
    private readonly IMediator _mediator;
    private readonly ILogger<CreateBulkChargesCommandHandler> _logger;

    public CreateBulkChargesCommandHandler(IApplicationDbContext context, IMediator mediator, ILogger<CreateBulkChargesCommandHandler> logger)
    {
        _context = context;
        _mediator = mediator;
        _logger = logger;
    }

    public async Task<Result<int>> Handle(CreateBulkChargesCommand request, CancellationToken cancellationToken)
    {
        try
        {
            // Get all units in the condominium with building info
            var units = await _context.Units
                .Include(u => u.Building)
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

            // Send notifications to all residents
            var unitIds = units.Select(u => u.Id).ToList();
            var residents = await _context.Residents
                .Where(r => unitIds.Contains(r.UnitId) && r.IsRegistered && r.UserId != null)
                .ToListAsync(cancellationToken);

            var priority = request.FeeType == FeeType.LateFee 
                ? NotificationPriority.High 
                : NotificationPriority.Normal;

            var title = request.FeeType == FeeType.LateFee 
                ? "Nuevo recargo aplicado" 
                : "Nuevo cargo de mantenimiento";

            foreach (var resident in residents)
            {
                if (resident.UserId.HasValue)
                {
                    var unit = units.FirstOrDefault(u => u.Id == resident.UnitId);
                    var charge = charges.FirstOrDefault(c => c.UnitId == resident.UnitId);
                    
                    var message = $"Se ha generado un cargo de ${request.Amount:N2} por concepto de {request.Concept}. " +
                                $"Fecha de vencimiento: {request.DueDate:dd/MM/yyyy}. Unidad: {unit?.UnitNumber ?? "N/A"}";

                    await _mediator.Send(new CreateNotificationCommand(
                        CondominiumId: request.CondominiumId,
                        UserId: resident.UserId.Value,
                        Type: NotificationType.PaymentReminder,
                        Title: title,
                        Message: message,
                        Priority: priority,
                        UnitId: resident.UnitId,
                        RelatedEntityType: "Charge",
                        RelatedEntityId: charge?.Id,
                        ActionUrl: "/resident/payments"
                    ), cancellationToken);
                }
            }

            _logger.LogInformation("Sent {Count} notifications for bulk charges", residents.Count);

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
    private readonly IMediator _mediator;

    public CancelChargeCommandHandler(IApplicationDbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Result> Handle(CancelChargeCommand request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges
            .Include(c => c.Unit)
            .ThenInclude(u => u!.Building)
            .FirstOrDefaultAsync(c => c.Id == request.ChargeId, cancellationToken);
            
        if (charge == null)
            return Result.NotFound(new string[] { "Charge not found" });

        try
        {
            charge.Cancel(request.Reason);
            await _context.SaveChangesAsync(cancellationToken);

            // Send notification to residents of the unit
            var residents = await _context.Residents
                .Where(r => r.UnitId == charge.UnitId && r.IsRegistered && r.UserId != null)
                .ToListAsync(cancellationToken);

            foreach (var resident in residents)
            {
                if (resident.UserId.HasValue)
                {
                    var message = $"Se ha cancelado el cargo de ${charge.Amount:N2} por concepto de {charge.Concept}. " +
                                $"Razón: {request.Reason}. Unidad: {charge.Unit?.UnitNumber ?? "N/A"}";

                    await _mediator.Send(new CreateNotificationCommand(
                        CondominiumId: charge.CondominiumId,
                        UserId: resident.UserId.Value,
                        Type: NotificationType.PaymentReceived,
                        Title: "Cargo cancelado",
                        Message: message,
                        Priority: NotificationPriority.Normal,
                        UnitId: charge.UnitId,
                        RelatedEntityType: "Charge",
                        RelatedEntityId: charge.Id,
                        ActionUrl: "/resident/payments"
                    ), cancellationToken);
                }
            }

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
    private readonly IMediator _mediator;

    public ForgiveChargeCommandHandler(IApplicationDbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Result> Handle(ForgiveChargeCommand request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges
            .Include(c => c.Unit)
            .ThenInclude(u => u!.Building)
            .FirstOrDefaultAsync(c => c.Id == request.ChargeId, cancellationToken);
            
        if (charge == null)
            return Result.NotFound(new string[] { "Charge not found" });

        charge.Forgive(request.Reason);
        await _context.SaveChangesAsync(cancellationToken);

        // Send notification to residents of the unit
        var residents = await _context.Residents
            .Where(r => r.UnitId == charge.UnitId && r.IsRegistered && r.UserId != null)
            .ToListAsync(cancellationToken);

        foreach (var resident in residents)
        {
            if (resident.UserId.HasValue)
            {
                var message = $"Se ha condonado el cargo de ${charge.Amount:N2} por concepto de {charge.Concept}. " +
                            $"Razón: {request.Reason}. Unidad: {charge.Unit?.UnitNumber ?? "N/A"}";

                await _mediator.Send(new CreateNotificationCommand(
                    CondominiumId: charge.CondominiumId,
                    UserId: resident.UserId.Value,
                    Type: NotificationType.PaymentReceived,
                    Title: "Cargo condonado",
                    Message: message,
                    Priority: NotificationPriority.Normal,
                    UnitId: charge.UnitId,
                    RelatedEntityType: "Charge",
                    RelatedEntityId: charge.Id,
                    ActionUrl: "/resident/payments"
                ), cancellationToken);
            }
        }

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

public class DeleteChargeCommandHandler : IRequestHandler<DeleteChargeCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<DeleteChargeCommandHandler> _logger;

    public DeleteChargeCommandHandler(IApplicationDbContext context, ILogger<DeleteChargeCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteChargeCommand request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges.FindAsync(new object[] { request.ChargeId }, cancellationToken);
        if (charge == null)
            return Result.NotFound(new string[] { "Charge not found" });

        // Soft delete - the SaveChangesAsync interceptor will handle it
        _context.Charges.Remove(charge);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted charge {ChargeId}", request.ChargeId);
        return Result.Success();
    }
}

public class DeleteChargesByCondominiumCommandHandler : IRequestHandler<DeleteChargesByCondominiumCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<DeleteChargesByCondominiumCommandHandler> _logger;

    public DeleteChargesByCondominiumCommandHandler(IApplicationDbContext context, ILogger<DeleteChargesByCondominiumCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<int>> Handle(DeleteChargesByCondominiumCommand request, CancellationToken cancellationToken)
    {
        var query = _context.Charges.Where(c => c.CondominiumId == request.CondominiumId);
        
        if (request.Month.HasValue)
            query = query.Where(c => c.BillingPeriodMonth == request.Month.Value);
        
        if (request.Year.HasValue)
            query = query.Where(c => c.BillingPeriodYear == request.Year.Value);

        var charges = await query.ToListAsync(cancellationToken);
        var count = charges.Count;

        if (count == 0)
            return Result.Success(0);

        // Soft delete all matching charges
        _context.Charges.RemoveRange(charges);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted {Count} charges for condominium {CondominiumId}", count, request.CondominiumId);
        return Result.Success(count);
    }
}

public class RecordPaymentCommandHandler : IRequestHandler<RecordPaymentCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly IMediator _mediator;
    private readonly ILogger<RecordPaymentCommandHandler> _logger;

    public RecordPaymentCommandHandler(IApplicationDbContext context, IMediator mediator, ILogger<RecordPaymentCommandHandler> logger)
    {
        _context = context;
        _mediator = mediator;
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

            if (!string.IsNullOrEmpty(request.ProofImageUrl))
            {
                payment.SetProofImageUrl(request.ProofImageUrl);
            }

            _context.Payments.Add(payment);
            charge.ApplyPayment(payment);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Recorded payment {PaymentId} for charge {ChargeId}", payment.Id, request.ChargeId);

            // Get unit info and send notification to residents
            var unit = await _context.Units
                .Include(u => u.Building)
                .FirstOrDefaultAsync(u => u.Id == charge.UnitId, cancellationToken);

            if (unit != null)
            {
                var residents = await _context.Residents
                    .Where(r => r.UnitId == charge.UnitId && r.IsRegistered && r.UserId != null)
                    .ToListAsync(cancellationToken);

                foreach (var resident in residents)
                {
                    if (resident.UserId.HasValue)
                    {
                        var message = $"Se ha registrado un pago de ${request.Amount:N2} para el cargo de {charge.Concept}. " +
                                    $"Unidad: {unit.UnitNumber}. Estado: {(charge.Status == ChargeStatus.Paid ? "Pagado" : "Pago parcial")}";

                        await _mediator.Send(new CreateNotificationCommand(
                            CondominiumId: charge.CondominiumId,
                            UserId: resident.UserId.Value,
                            Type: NotificationType.PaymentReceived,
                            Title: "Pago registrado",
                            Message: message,
                            Priority: NotificationPriority.Normal,
                            UnitId: charge.UnitId,
                            RelatedEntityType: "Payment",
                            RelatedEntityId: payment.Id,
                            ActionUrl: "/resident/payments"
                        ), cancellationToken);
                    }
                }
            }

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
    private readonly IMediator _mediator;

    public VerifyPaymentCommandHandler(IApplicationDbContext context, IMediator mediator)
    {
        _context = context;
        _mediator = mediator;
    }

    public async Task<Result> Handle(VerifyPaymentCommand request, CancellationToken cancellationToken)
    {
        var payment = await _context.Payments
            .Include(p => p.Charge)
            .FirstOrDefaultAsync(p => p.Id == request.PaymentId, cancellationToken);

        if (payment == null)
            return Result.NotFound(new string[] { "Payment not found" });

        payment.Verify(request.VerifiedById);
        await _context.SaveChangesAsync(cancellationToken);

        if (payment.Charge != null)
        {
            var residents = await _context.Residents
                .Where(r => r.UnitId == payment.Charge.UnitId && r.IsRegistered && r.UserId != null)
                .ToListAsync(cancellationToken);

            foreach (var resident in residents)
            {
                if (!resident.UserId.HasValue) continue;

                var message = $"Tu pago de ${payment.Amount:N2} para el cargo '{payment.Charge.Concept}' ha sido validado por la administración.";

                await _mediator.Send(new CreateNotificationCommand(
                    CondominiumId: payment.Charge.CondominiumId,
                    UserId: resident.UserId.Value,
                    Type: NotificationType.PaymentReceived,
                    Title: "Pago verificado",
                    Message: message,
                    Priority: NotificationPriority.Normal,
                    UnitId: payment.Charge.UnitId,
                    RelatedEntityType: "Payment",
                    RelatedEntityId: payment.Id,
                    ActionUrl: "/resident/payments"
                ), cancellationToken);
            }
        }

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
        var payment = await _context.Payments
            .Include(p => p.Charge)
            .FirstOrDefaultAsync(p => p.Id == request.PaymentId, cancellationToken);

        if (payment == null)
            return Result.NotFound(new string[] { "Payment not found" });

        try
        {
            payment.Refund(request.Reason, request.RefundedById);

            if (payment.Charge == null)
                return Result.Error(new Ardalis.Result.ErrorList(new[] { "Charge not found for payment" }, null));

            payment.Charge.ReversePayment(payment);

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

public class DeleteFeeConfigurationCommandHandler : IRequestHandler<DeleteFeeConfigurationCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<DeleteFeeConfigurationCommandHandler> _logger;

    public DeleteFeeConfigurationCommandHandler(IApplicationDbContext context, ILogger<DeleteFeeConfigurationCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteFeeConfigurationCommand request, CancellationToken cancellationToken)
    {
        var feeConfig = await _context.FeeConfigurations.FindAsync(new object[] { request.FeeConfigurationId }, cancellationToken);
        if (feeConfig == null)
            return Result.NotFound(new string[] { "Fee configuration not found" });

        _context.FeeConfigurations.Remove(feeConfig);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted fee configuration {FeeConfigurationId}", request.FeeConfigurationId);
        return Result.Success();
    }
}

public class DeleteAllFeeConfigurationsCommandHandler : IRequestHandler<DeleteAllFeeConfigurationsCommand, Result<int>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<DeleteAllFeeConfigurationsCommandHandler> _logger;

    public DeleteAllFeeConfigurationsCommandHandler(IApplicationDbContext context, ILogger<DeleteAllFeeConfigurationsCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<int>> Handle(DeleteAllFeeConfigurationsCommand request, CancellationToken cancellationToken)
    {
        var feeConfigs = await _context.FeeConfigurations
            .Where(f => f.CondominiumId == request.CondominiumId)
            .ToListAsync(cancellationToken);

        var count = feeConfigs.Count;
        if (count == 0)
            return Result.Success(0);

        _context.FeeConfigurations.RemoveRange(feeConfigs);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Deleted {Count} fee configurations for condominium {CondominiumId}", count, request.CondominiumId);
        return Result.Success(count);
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

