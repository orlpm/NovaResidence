using Mediator;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Billing.Commands;

// Charges
public record CreateChargeCommand(
    Guid CondominiumId,
    Guid UnitId,
    string Concept,
    FeeType FeeType,
    decimal Amount,
    DateTime DueDate,
    int BillingMonth,
    int BillingYear,
    Guid? ResidentId = null,
    string? Description = null,
    bool ApplyLateFee = true,
    decimal? LateFeePercentage = null
) : IRequest<Result<Guid>>;

public record CreateBulkChargesCommand(
    Guid CondominiumId,
    string Concept,
    FeeType FeeType,
    decimal Amount,
    DateTime DueDate,
    int BillingMonth,
    int BillingYear,
    bool ApplyLateFee = true,
    decimal? LateFeePercentage = null
) : IRequest<Result<int>>; // Returns count of charges created

public record CancelChargeCommand(Guid ChargeId, string Reason) : IRequest<Result>;

public record ForgiveChargeCommand(Guid ChargeId, string Reason) : IRequest<Result>;

public record ApplyLateFeeCommand(Guid ChargeId) : IRequest<Result>;

public record DeleteChargeCommand(Guid ChargeId) : IRequest<Result>;

public record DeleteChargesByCondominiumCommand(
    Guid CondominiumId,
    int? Month = null,
    int? Year = null
) : IRequest<Result<int>>; // Returns count of deleted charges

// Payments
public record RecordPaymentCommand(
    Guid ChargeId,
    decimal Amount,
    PaymentMethod PaymentMethod,
    DateTime PaymentDate,
    Guid? ReceivedById = null,
    string? ReferenceNumber = null,
    string? Notes = null,
    string? ProofImageUrl = null
) : IRequest<Result<Guid>>;

public record VerifyPaymentCommand(Guid PaymentId, Guid VerifiedById) : IRequest<Result>;

public record RefundPaymentCommand(Guid PaymentId, string Reason, Guid RefundedById) : IRequest<Result>;

// Fee Configuration
public record CreateFeeConfigurationCommand(
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
) : IRequest<Result<Guid>>;

public record UpdateFeeConfigurationCommand(
    Guid FeeConfigurationId,
    string Name,
    decimal DefaultAmount,
    int? RecurringDay,
    int? DueDayOffset,
    bool ApplyLateFee,
    decimal? LateFeePercentage,
    int? GracePeriodDays,
    string? Description
) : IRequest<Result>;

public record ToggleFeeConfigurationCommand(Guid FeeConfigurationId) : IRequest<Result>;

public record DeleteFeeConfigurationCommand(Guid FeeConfigurationId) : IRequest<Result>;

public record DeleteAllFeeConfigurationsCommand(Guid CondominiumId) : IRequest<Result<int>>;

// Generate monthly charges
public record GenerateMonthlyChargesCommand(
    Guid CondominiumId,
    int Month,
    int Year
) : IRequest<Result<int>>; // Returns count of charges generated
