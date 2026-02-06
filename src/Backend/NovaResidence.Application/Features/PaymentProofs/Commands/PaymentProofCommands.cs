using MediatR;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.PaymentProofs.Commands;

// Submit Payment Proof (Resident uploads proof)
public record SubmitPaymentProofCommand(
    Guid CondominiumId,
    Guid UnitId,
    Guid ChargeId,
    Guid SubmittedById,
    decimal Amount,
    PaymentMethod PaymentMethod,
    DateTime PaymentDate,
    string FileName,
    string OriginalFileName,
    string FilePath,
    string ContentType,
    long FileSize,
    string? ReferenceNumber,
    string? BankName,
    string? Notes
) : IRequest<Guid>;

// Approve Payment Proof (Admin approves)
public record ApprovePaymentProofCommand(
    Guid PaymentProofId,
    Guid ReviewedById,
    string? Comments
) : IRequest<bool>;

// Reject Payment Proof (Admin rejects)
public record RejectPaymentProofCommand(
    Guid PaymentProofId,
    Guid ReviewedById,
    string Reason
) : IRequest<bool>;
