using Mediator;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Billing.Queries;

// Helper class for enum display names
public static class BillingEnumNames
{
    public static readonly Dictionary<FeeType, string> FeeTypeNames = new()
    {
        { FeeType.MonthlyMaintenance, "Mantenimiento" },
        { FeeType.ExtraordinaryFee, "Extraordinaria" },
        { FeeType.ParkingFee, "Estacionamiento" },
        { FeeType.ReservationFee, "Reservación" },
        { FeeType.LateFee, "Recargo" },
        { FeeType.Fine, "Multa" },
        { FeeType.Utility, "Servicios" },
        { FeeType.Insurance, "Seguro" },
        { FeeType.Other, "Otro" }
    };

    public static readonly Dictionary<ChargeStatus, string> ChargeStatusNames = new()
    {
        { ChargeStatus.Pending, "Pendiente" },
        { ChargeStatus.PartiallyPaid, "Pago Parcial" },
        { ChargeStatus.Paid, "Pagado" },
        { ChargeStatus.Overdue, "Vencido" },
        { ChargeStatus.Cancelled, "Cancelado" },
        { ChargeStatus.Forgiven, "Condonado" }
    };

    public static string GetFeeTypeName(FeeType feeType) =>
        FeeTypeNames.TryGetValue(feeType, out var name) ? name : feeType.ToString();

    public static string GetStatusName(ChargeStatus status) =>
        ChargeStatusNames.TryGetValue(status, out var name) ? name : status.ToString();

    public static readonly Dictionary<PaymentMethod, string> PaymentMethodNames = new()
    {
        { PaymentMethod.Cash, "Efectivo" },
        { PaymentMethod.BankTransfer, "Transferencia Bancaria" },
        { PaymentMethod.CreditCard, "Tarjeta de Crédito" },
        { PaymentMethod.DebitCard, "Tarjeta de Débito" },
        { PaymentMethod.Check, "Cheque" },
        { PaymentMethod.SPEI, "SPEI" },
        { PaymentMethod.PayPal, "PayPal" },
        { PaymentMethod.Other, "Otro" }
    };

    public static string GetPaymentMethodName(PaymentMethod method) =>
        PaymentMethodNames.TryGetValue(method, out var name) ? name : method.ToString();

    public static ChargeStatus GetEffectiveStatus(ChargeStatus currentStatus, DateTime dueDate, decimal balance)
    {
        var (status, _, _) = ComputeStatus(currentStatus, dueDate, balance);
        return status;
    }

    public static decimal GetOutstandingBalance(ChargeStatus currentStatus, DateTime dueDate, decimal balance)
    {
        var effectiveStatus = GetEffectiveStatus(currentStatus, dueDate, balance);
        return effectiveStatus is ChargeStatus.Pending or ChargeStatus.PartiallyPaid or ChargeStatus.Overdue
            ? balance
            : 0m;
    }

    public static (ChargeStatus status, string statusName, bool isOverdue) ComputeStatus(ChargeStatus currentStatus, DateTime dueDate, decimal balance)
    {
        // If already paid, cancelled, or forgiven, use that status
        if (currentStatus == ChargeStatus.Paid || currentStatus == ChargeStatus.Cancelled || currentStatus == ChargeStatus.Forgiven)
            return (currentStatus, GetStatusName(currentStatus), false);

        if (balance <= 0)
            return (ChargeStatus.Paid, GetStatusName(ChargeStatus.Paid), false);

        // Check if overdue based on due date
        var isOverdue = DateTime.UtcNow.Date > dueDate.Date && balance > 0;
        
        if (isOverdue)
            return (ChargeStatus.Overdue, "Vencido", true);

        return (currentStatus, GetStatusName(currentStatus), false);
    }
}

public class GetChargeQueryHandler : IRequestHandler<GetChargeQuery, Result<ChargeDetailDto>>
{
    private readonly IApplicationDbContext _context;

    public GetChargeQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<ChargeDetailDto>> Handle(GetChargeQuery request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Include(c => c.Payments)
            .FirstOrDefaultAsync(c => c.Id == request.ChargeId && !c.IsDeleted, cancellationToken);

        if (charge == null)
            return Result.NotFound("Cargo no encontrado");

        var dto = new ChargeDetailDto(
            charge.Id,
            charge.CondominiumId,
            charge.UnitId,
            charge.Unit.UnitNumber,
            charge.Unit.Building!.Name,
            charge.Unit.OwnerId,
            null, // ResidentName - would need to be fetched from Residents table
            charge.Concept,
            charge.Description,
            charge.FeeType,
            charge.Amount,
            charge.PaidAmount,
            charge.Balance,
            charge.Status,
            charge.DueDate,
            charge.BillingPeriodMonth,
            charge.BillingPeriodYear,
            charge.ApplyLateFee,
            charge.LateFeePercentage,
            charge.LateFeeAmount,
            charge.LateFeeAppliedAt,
            charge.CreatedAt,
            charge.Payments.Where(p => !p.IsDeleted).Select(p => new PaymentDto(
                p.Id,
                p.Amount,
                p.PaymentMethod,
                BillingEnumNames.GetPaymentMethodName(p.PaymentMethod),
                p.ReferenceNumber,
                p.Notes,
                p.PaymentDate,
                p.IsVerified,
                p.VerifiedAt,
                p.IsRefunded,
                p.RefundReason,
                p.ProofImageUrl,
                p.ChargeId,
                charge.Concept,
                charge.Unit.UnitNumber,
                charge.Unit.Building?.Name,
                charge.CondominiumId
            )).ToList()
        );

        return Result.Success(dto);
    }
}

public class GetCondominiumChargesQueryHandler : IRequestHandler<GetCondominiumChargesQuery, Result<List<ChargeListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetCondominiumChargesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<ChargeListDto>>> Handle(GetCondominiumChargesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Include(c => c.Payments)
            .Where(c => c.CondominiumId == request.CondominiumId && !c.IsDeleted);

        if (request.Month.HasValue)
            query = query.Where(c => c.BillingPeriodMonth == request.Month.Value);

        if (request.Year.HasValue)
            query = query.Where(c => c.BillingPeriodYear == request.Year.Value);

        if (request.Status.HasValue)
            query = query.Where(c => c.Status == request.Status.Value);

        if (request.FeeType.HasValue)
            query = query.Where(c => c.FeeType == request.FeeType.Value);

        var rawCharges = await query
            .OrderBy(c => c.Unit.UnitNumber)
            .ThenByDescending(c => c.CreatedAt)
            .ToListAsync(cancellationToken);

        var charges = rawCharges.Select(c =>
        {
            var (status, statusName, isOverdue) = BillingEnumNames.ComputeStatus(c.Status, c.DueDate, c.Balance);
            var payments = c.Payments.Where(p => !p.IsDeleted).Select(p => new ChargePaymentDto(
                p.Id, p.Amount, p.PaymentMethod,
                BillingEnumNames.GetPaymentMethodName(p.PaymentMethod),
                p.ReferenceNumber, p.PaymentDate,
                p.IsVerified, p.VerifiedAt, p.IsRefunded, p.ProofImageUrl, p.ReceiptNumber
            )).ToList();
            return new ChargeListDto(
                c.Id,
                c.UnitId,
                c.Unit.UnitNumber,
                c.Unit.Building!.Name,
                c.Concept,
                c.FeeType,
                BillingEnumNames.GetFeeTypeName(c.FeeType),
                c.Amount,
                c.PaidAmount,
                c.Balance,
                status,
                statusName,
                isOverdue,
                c.DueDate,
                c.BillingPeriodMonth,
                c.BillingPeriodYear,
                c.CreatedAt,
                payments.Any(p => !p.IsVerified && !p.IsRefunded),
                payments
            );
        }).ToList();

        return Result.Success(charges);
    }
}

public class GetUnitChargesQueryHandler : IRequestHandler<GetUnitChargesQuery, Result<List<ChargeListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetUnitChargesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<ChargeListDto>>> Handle(GetUnitChargesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Include(c => c.Payments)
            .Where(c => c.UnitId == request.UnitId && !c.IsDeleted);

        if (request.Month.HasValue)
            query = query.Where(c => c.BillingPeriodMonth == request.Month.Value);

        if (request.Year.HasValue)
            query = query.Where(c => c.BillingPeriodYear == request.Year.Value);

        if (request.Status.HasValue)
            query = query.Where(c => c.Status == request.Status.Value);

        var rawCharges = await query
            .OrderByDescending(c => c.DueDate)
            .ToListAsync(cancellationToken);

        var charges = rawCharges.Select(c =>
        {
            var (status, statusName, isOverdue) = BillingEnumNames.ComputeStatus(c.Status, c.DueDate, c.Balance);
            var payments = c.Payments.Where(p => !p.IsDeleted).Select(p => new ChargePaymentDto(
                p.Id, p.Amount, p.PaymentMethod,
                BillingEnumNames.GetPaymentMethodName(p.PaymentMethod),
                p.ReferenceNumber, p.PaymentDate,
                p.IsVerified, p.VerifiedAt, p.IsRefunded, p.ProofImageUrl, p.ReceiptNumber
            )).ToList();
            return new ChargeListDto(
                c.Id,
                c.UnitId,
                c.Unit.UnitNumber,
                c.Unit.Building!.Name,
                c.Concept,
                c.FeeType,
                BillingEnumNames.GetFeeTypeName(c.FeeType),
                c.Amount,
                c.PaidAmount,
                c.Balance,
                status,
                statusName,
                isOverdue,
                c.DueDate,
                c.BillingPeriodMonth,
                c.BillingPeriodYear,
                c.CreatedAt,
                payments.Any(p => !p.IsVerified && !p.IsRefunded),
                payments
            );
        }).ToList();

        return Result.Success(charges);
    }
}

public class GetUnitBalanceQueryHandler : IRequestHandler<GetUnitBalanceQuery, Result<UnitBalanceDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUnitBalanceQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<UnitBalanceDto>> Handle(GetUnitBalanceQuery request, CancellationToken cancellationToken)
    {
        var unit = await _context.Units
            .Include(u => u.Building)
            .FirstOrDefaultAsync(u => u.Id == request.UnitId && !u.IsDeleted, cancellationToken);

        if (unit == null)
            return Result.NotFound("Unidad no encontrada");

        var charges = await _context.Charges
            .Where(c => c.UnitId == request.UnitId && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var totalDue = charges.Sum(c => c.Amount);
        var totalPaid = charges.Sum(c => c.PaidAmount);
        var chargeSnapshots = charges.Select(c => new
        {
            Outstanding = BillingEnumNames.GetOutstandingBalance(c.Status, c.DueDate, c.Balance),
            EffectiveStatus = BillingEnumNames.GetEffectiveStatus(c.Status, c.DueDate, c.Balance)
        }).ToList();
        var balance = chargeSnapshots.Sum(c => c.Outstanding);
        var pendingCharges = chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Pending || c.EffectiveStatus == ChargeStatus.PartiallyPaid);
        var overdueCharges = chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Overdue);

        var dto = new UnitBalanceDto(
            unit.Id,
            unit.UnitNumber,
            unit.Building.Name,
            totalDue,
            totalPaid,
            balance,
            pendingCharges,
            overdueCharges
        );

        return Result.Success(dto);
    }
}

public class GetCondominiumBalancesQueryHandler : IRequestHandler<GetCondominiumBalancesQuery, Result<List<UnitBalanceDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetCondominiumBalancesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<UnitBalanceDto>>> Handle(GetCondominiumBalancesQuery request, CancellationToken cancellationToken)
    {
        var units = await _context.Units
            .Include(u => u.Building)
            .Where(u => u.Building.CondominiumId == request.CondominiumId && !u.IsDeleted)
            .ToListAsync(cancellationToken);

        var unitIds = units.Select(u => u.Id).ToList();

        var charges = await _context.Charges
            .Where(c => unitIds.Contains(c.UnitId) && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var balances = units.Select(unit =>
        {
            var unitCharges = charges.Where(c => c.UnitId == unit.Id).ToList();
            var chargeSnapshots = unitCharges.Select(c => new
            {
                Outstanding = BillingEnumNames.GetOutstandingBalance(c.Status, c.DueDate, c.Balance),
                EffectiveStatus = BillingEnumNames.GetEffectiveStatus(c.Status, c.DueDate, c.Balance)
            }).ToList();
            return new UnitBalanceDto(
                unit.Id,
                unit.UnitNumber,
                unit.Building.Name,
                unitCharges.Sum(c => c.Amount),
                unitCharges.Sum(c => c.PaidAmount),
                chargeSnapshots.Sum(c => c.Outstanding),
                chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Pending || c.EffectiveStatus == ChargeStatus.PartiallyPaid),
                chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Overdue)
            );
        })
        .OrderByDescending(b => b.Balance)
        .ToList();

        return Result.Success(balances);
    }
}

public class GetFeeConfigurationsQueryHandler : IRequestHandler<GetFeeConfigurationsQuery, Result<List<FeeConfigurationDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetFeeConfigurationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<FeeConfigurationDto>>> Handle(GetFeeConfigurationsQuery request, CancellationToken cancellationToken)
    {
        var configs = await _context.FeeConfigurations
            .Where(f => f.CondominiumId == request.CondominiumId && !f.IsDeleted)
            .OrderBy(f => f.Name)
            .Select(f => new FeeConfigurationDto(
                f.Id,
                f.Name,
                f.Description,
                f.FeeType,
                f.DefaultAmount,
                f.IsRecurring,
                f.RecurringDay,
                f.DueDayOffset,
                f.ApplyLateFee,
                f.LateFeePercentage,
                f.GracePeriodDays,
                f.IsActive
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(configs);
    }
}

public class GetBillingSummaryQueryHandler : IRequestHandler<GetBillingSummaryQuery, Result<BillingSummaryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetBillingSummaryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<BillingSummaryDto>> Handle(GetBillingSummaryQuery request, CancellationToken cancellationToken)
    {
        var charges = await _context.Charges
            .Where(c => c.CondominiumId == request.CondominiumId 
                && c.BillingPeriodMonth == request.Month 
                && c.BillingPeriodYear == request.Year 
                && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var chargeSnapshots = charges.Select(c => new
        {
            c.Amount,
            c.PaidAmount,
            Outstanding = BillingEnumNames.GetOutstandingBalance(c.Status, c.DueDate, c.Balance),
            EffectiveStatus = BillingEnumNames.GetEffectiveStatus(c.Status, c.DueDate, c.Balance)
        }).ToList();

        var totalCharged = chargeSnapshots.Sum(c => c.Amount);
        var totalCollected = chargeSnapshots.Sum(c => c.PaidAmount);
        var totalPending = chargeSnapshots
            .Where(c => c.EffectiveStatus == ChargeStatus.Pending || c.EffectiveStatus == ChargeStatus.PartiallyPaid)
            .Sum(c => c.Outstanding);
        var totalOverdue = chargeSnapshots
            .Where(c => c.EffectiveStatus == ChargeStatus.Overdue)
            .Sum(c => c.Outstanding);
        var totalCharges = chargeSnapshots.Count;
        var paidCharges = chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Paid);
        var pendingCharges = chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Pending || c.EffectiveStatus == ChargeStatus.PartiallyPaid);
        var overdueCharges = chargeSnapshots.Count(c => c.EffectiveStatus == ChargeStatus.Overdue);
        var collectionRate = totalCharged > 0 ? (totalCollected / totalCharged) * 100 : 0;

        var dto = new BillingSummaryDto(
            request.CondominiumId,
            request.Month,
            request.Year,
            totalCharged,
            totalCollected,
            totalPending,
            totalOverdue,
            totalCharges,
            paidCharges,
            pendingCharges,
            overdueCharges,
            Math.Round(collectionRate, 2)
        );

        return Result.Success(dto);
    }
}

public class GetOverdueChargesQueryHandler : IRequestHandler<GetOverdueChargesQuery, Result<List<ChargeListDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetOverdueChargesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<ChargeListDto>>> Handle(GetOverdueChargesQuery request, CancellationToken cancellationToken)
    {
        // Get charges that are either marked as overdue OR are past due date with balance > 0
        var now = DateTime.UtcNow.Date;
        var loadedCharges = await _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Include(c => c.Payments)
            .Where(c => c.CondominiumId == request.CondominiumId && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var rawCharges = loadedCharges
            .Where(c => c.Amount > c.PaidAmount
                && (c.Status == ChargeStatus.Overdue || c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.PartiallyPaid)
                && c.DueDate < now)
            .OrderBy(c => c.Unit.UnitNumber)
            .ThenBy(c => c.DueDate)
            .ToList();

        var charges = rawCharges.Select(c =>
        {
            var payments = c.Payments.Where(p => !p.IsDeleted).Select(p => new ChargePaymentDto(
                p.Id, p.Amount, p.PaymentMethod,
                BillingEnumNames.GetPaymentMethodName(p.PaymentMethod),
                p.ReferenceNumber, p.PaymentDate,
                p.IsVerified, p.VerifiedAt, p.IsRefunded, p.ProofImageUrl, p.ReceiptNumber
            )).ToList();
            return new ChargeListDto(
                c.Id,
                c.UnitId,
                c.Unit.UnitNumber,
                c.Unit.Building!.Name,
                c.Concept,
                c.FeeType,
                BillingEnumNames.GetFeeTypeName(c.FeeType),
                c.Amount,
                c.PaidAmount,
                c.Balance,
                ChargeStatus.Overdue,
                "Vencido",
                true,
                c.DueDate,
                c.BillingPeriodMonth,
                c.BillingPeriodYear,
                c.CreatedAt,
                payments.Any(p => !p.IsVerified && !p.IsRefunded),
                payments
            );
        }).ToList();

        return Result.Success(charges);
    }
}

public class GetPendingPaymentsQueryHandler : IRequestHandler<GetPendingPaymentsQuery, Result<List<PaymentDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetPendingPaymentsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<PaymentDto>>> Handle(GetPendingPaymentsQuery request, CancellationToken cancellationToken)
    {
        var payments = await _context.Payments
            .Include(p => p.Charge)
                .ThenInclude(c => c.Unit)
                    .ThenInclude(u => u.Building)
            .Where(p => !p.IsDeleted
                && !p.IsVerified
                && !p.IsRefunded
                && p.Charge.CondominiumId == request.CondominiumId
                && !p.Charge.IsDeleted)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync(cancellationToken);

        var dtos = payments.Select(p => new PaymentDto(
            p.Id,
            p.Amount,
            p.PaymentMethod,
            BillingEnumNames.GetPaymentMethodName(p.PaymentMethod),
            p.ReferenceNumber,
            p.Notes,
            p.PaymentDate,
            p.IsVerified,
            p.VerifiedAt,
            p.IsRefunded,
            p.RefundReason,
            p.ProofImageUrl,
            p.ChargeId,
            p.Charge.Concept,
            p.Charge.Unit.UnitNumber,
            p.Charge.Unit.Building?.Name,
            p.Charge.CondominiumId
        )).ToList();

        return Result.Success(dtos);
    }
}
