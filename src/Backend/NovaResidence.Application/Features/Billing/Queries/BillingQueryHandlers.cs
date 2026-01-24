using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Billing.Queries;

public class GetChargeQueryHandler : IRequestHandler<GetChargeQuery, Result<ChargeDetailDto>>
{
    private readonly IApplicationDbContext _context;

    public GetChargeQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<ChargeDetailDto>> Handle(GetChargeQuery request, CancellationToken cancellationToken)
    {
        var charge = await _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Include(c => c.Payments.Where(p => !p.IsDeleted))
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
            charge.Payments.Select(p => new PaymentDto(
                p.Id,
                p.Amount,
                p.PaymentMethod,
                p.ReferenceNumber,
                p.Notes,
                p.PaymentDate,
                p.IsVerified,
                p.VerifiedAt,
                p.IsRefunded,
                p.RefundReason
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

    public async Task<Result<List<ChargeListDto>>> Handle(GetCondominiumChargesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Where(c => c.CondominiumId == request.CondominiumId && !c.IsDeleted);

        if (request.Month.HasValue)
            query = query.Where(c => c.BillingPeriodMonth == request.Month.Value);

        if (request.Year.HasValue)
            query = query.Where(c => c.BillingPeriodYear == request.Year.Value);

        if (request.Status.HasValue)
            query = query.Where(c => c.Status == request.Status.Value);

        if (request.FeeType.HasValue)
            query = query.Where(c => c.FeeType == request.FeeType.Value);

        var charges = await query
            .OrderByDescending(c => c.CreatedAt)
            .Select(c => new ChargeListDto(
                c.Id,
                c.UnitId,
                c.Unit.UnitNumber,
                c.Unit.Building.Name,
                c.Concept,
                c.FeeType,
                c.Amount,
                c.PaidAmount,
                c.Balance,
                c.Status,
                c.DueDate,
                c.BillingPeriodMonth,
                c.BillingPeriodYear,
                c.CreatedAt
            ))
            .ToListAsync(cancellationToken);

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

    public async Task<Result<List<ChargeListDto>>> Handle(GetUnitChargesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Where(c => c.UnitId == request.UnitId && !c.IsDeleted);

        if (request.Month.HasValue)
            query = query.Where(c => c.BillingPeriodMonth == request.Month.Value);

        if (request.Year.HasValue)
            query = query.Where(c => c.BillingPeriodYear == request.Year.Value);

        if (request.Status.HasValue)
            query = query.Where(c => c.Status == request.Status.Value);

        var charges = await query
            .OrderByDescending(c => c.DueDate)
            .Select(c => new ChargeListDto(
                c.Id,
                c.UnitId,
                c.Unit.UnitNumber,
                c.Unit.Building.Name,
                c.Concept,
                c.FeeType,
                c.Amount,
                c.PaidAmount,
                c.Balance,
                c.Status,
                c.DueDate,
                c.BillingPeriodMonth,
                c.BillingPeriodYear,
                c.CreatedAt
            ))
            .ToListAsync(cancellationToken);

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

    public async Task<Result<UnitBalanceDto>> Handle(GetUnitBalanceQuery request, CancellationToken cancellationToken)
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
        var balance = charges.Sum(c => c.Balance);
        var pendingCharges = charges.Count(c => c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.PartiallyPaid);
        var overdueCharges = charges.Count(c => c.Status == ChargeStatus.Overdue);

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

    public async Task<Result<List<UnitBalanceDto>>> Handle(GetCondominiumBalancesQuery request, CancellationToken cancellationToken)
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
            return new UnitBalanceDto(
                unit.Id,
                unit.UnitNumber,
                unit.Building.Name,
                unitCharges.Sum(c => c.Amount),
                unitCharges.Sum(c => c.PaidAmount),
                unitCharges.Sum(c => c.Balance),
                unitCharges.Count(c => c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.PartiallyPaid),
                unitCharges.Count(c => c.Status == ChargeStatus.Overdue)
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

    public async Task<Result<List<FeeConfigurationDto>>> Handle(GetFeeConfigurationsQuery request, CancellationToken cancellationToken)
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

    public async Task<Result<BillingSummaryDto>> Handle(GetBillingSummaryQuery request, CancellationToken cancellationToken)
    {
        var charges = await _context.Charges
            .Where(c => c.CondominiumId == request.CondominiumId 
                && c.BillingPeriodMonth == request.Month 
                && c.BillingPeriodYear == request.Year 
                && !c.IsDeleted)
            .ToListAsync(cancellationToken);

        var totalCharged = charges.Sum(c => c.Amount);
        var totalCollected = charges.Sum(c => c.PaidAmount);
        var totalPending = charges.Where(c => c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.PartiallyPaid).Sum(c => c.Balance);
        var totalOverdue = charges.Where(c => c.Status == ChargeStatus.Overdue).Sum(c => c.Balance);
        var totalCharges = charges.Count;
        var paidCharges = charges.Count(c => c.Status == ChargeStatus.Paid);
        var pendingCharges = charges.Count(c => c.Status == ChargeStatus.Pending || c.Status == ChargeStatus.PartiallyPaid);
        var overdueCharges = charges.Count(c => c.Status == ChargeStatus.Overdue);
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

    public async Task<Result<List<ChargeListDto>>> Handle(GetOverdueChargesQuery request, CancellationToken cancellationToken)
    {
        var charges = await _context.Charges
            .Include(c => c.Unit)
                .ThenInclude(u => u.Building)
            .Where(c => c.CondominiumId == request.CondominiumId 
                && c.Status == ChargeStatus.Overdue 
                && !c.IsDeleted)
            .OrderBy(c => c.DueDate)
            .Select(c => new ChargeListDto(
                c.Id,
                c.UnitId,
                c.Unit.UnitNumber,
                c.Unit.Building.Name,
                c.Concept,
                c.FeeType,
                c.Amount,
                c.PaidAmount,
                c.Balance,
                c.Status,
                c.DueDate,
                c.BillingPeriodMonth,
                c.BillingPeriodYear,
                c.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(charges);
    }
}
