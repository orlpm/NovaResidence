using MediatR;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Billing.Queries;

// DTOs
public record ChargeListDto(
    Guid Id,
    Guid UnitId,
    string UnitNumber,
    string BuildingName,
    string Concept,
    FeeType FeeType,
    string FeeTypeName,
    decimal Amount,
    decimal PaidAmount,
    decimal Balance,
    ChargeStatus Status,
    string StatusName,
    bool IsOverdue,
    DateTime DueDate,
    int BillingPeriodMonth,
    int BillingPeriodYear,
    DateTime CreatedAt,
    bool HasUnverifiedPayments,
    List<ChargePaymentDto> Payments
);

public record ChargePaymentDto(
    Guid Id,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string PaymentMethodName,
    string? ReferenceNumber,
    DateTime PaymentDate,
    bool IsVerified,
    DateTime? VerifiedAt,
    bool IsRefunded,
    string? ProofImageUrl
);

public record ChargeDetailDto(
    Guid Id,
    Guid CondominiumId,
    Guid UnitId,
    string UnitNumber,
    string BuildingName,
    Guid? ResidentId,
    string? ResidentName,
    string Concept,
    string? Description,
    FeeType FeeType,
    decimal Amount,
    decimal PaidAmount,
    decimal Balance,
    ChargeStatus Status,
    DateTime DueDate,
    int BillingPeriodMonth,
    int BillingPeriodYear,
    bool ApplyLateFee,
    decimal? LateFeePercentage,
    decimal? LateFeeAmount,
    DateTime? LateFeeAppliedAt,
    DateTime CreatedAt,
    List<PaymentDto> Payments
);

public record PaymentDto(
    Guid Id,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string PaymentMethodName,
    string? ReferenceNumber,
    string? Notes,
    DateTime PaymentDate,
    bool IsVerified,
    DateTime? VerifiedAt,
    bool IsRefunded,
    string? RefundReason,
    string? ProofImageUrl,
    Guid ChargeId,
    string? ChargeConcept,
    string? UnitNumber,
    string? BuildingName,
    Guid? CondominiumId
);

public record UnitBalanceDto(
    Guid UnitId,
    string UnitNumber,
    string BuildingName,
    decimal TotalDue,
    decimal TotalPaid,
    decimal Balance,
    int PendingCharges,
    int OverdueCharges
);

public record FeeConfigurationDto(
    Guid Id,
    string Name,
    string? Description,
    FeeType FeeType,
    decimal DefaultAmount,
    bool IsRecurring,
    int? RecurringDay,
    int? DueDayOffset,
    bool ApplyLateFee,
    decimal? LateFeePercentage,
    int? GracePeriodDays,
    bool IsActive
);

public record BillingSummaryDto(
    Guid CondominiumId,
    int Month,
    int Year,
    decimal TotalCharged,
    decimal TotalCollected,
    decimal TotalPending,
    decimal TotalOverdue,
    int TotalCharges,
    int PaidCharges,
    int PendingCharges,
    int OverdueCharges,
    decimal CollectionRate
);

// Queries
public record GetChargeQuery(Guid ChargeId) : IRequest<Result<ChargeDetailDto>>;

public record GetCondominiumChargesQuery(
    Guid CondominiumId,
    int? Month = null,
    int? Year = null,
    ChargeStatus? Status = null,
    FeeType? FeeType = null
) : IRequest<Result<List<ChargeListDto>>>;

public record GetUnitChargesQuery(
    Guid UnitId,
    int? Month = null,
    int? Year = null,
    ChargeStatus? Status = null
) : IRequest<Result<List<ChargeListDto>>>;

public record GetUnitBalanceQuery(Guid UnitId) : IRequest<Result<UnitBalanceDto>>;

public record GetCondominiumBalancesQuery(Guid CondominiumId) : IRequest<Result<List<UnitBalanceDto>>>;

public record GetFeeConfigurationsQuery(Guid CondominiumId) : IRequest<Result<List<FeeConfigurationDto>>>;

public record GetBillingSummaryQuery(
    Guid CondominiumId,
    int Month,
    int Year
) : IRequest<Result<BillingSummaryDto>>;

public record GetOverdueChargesQuery(Guid CondominiumId) : IRequest<Result<List<ChargeListDto>>>;

public record GetPendingPaymentsQuery(Guid CondominiumId) : IRequest<Result<List<PaymentDto>>>;
