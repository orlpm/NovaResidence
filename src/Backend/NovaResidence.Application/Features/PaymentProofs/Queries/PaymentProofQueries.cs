using MediatR;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.PaymentProofs.Queries;

// DTOs
public record PaymentProofListDto(
    Guid Id,
    Guid CondominiumId,
    Guid UnitId,
    string UnitNumber,
    string? BuildingName,
    Guid ChargeId,
    string ChargeConcept,
    decimal ChargeAmount,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string PaymentMethodName,
    string? ReferenceNumber,
    DateTime PaymentDate,
    string? BankName,
    string OriginalFileName,
    string? Notes,
    PaymentProofStatus Status,
    string StatusName,
    DateTime SubmittedAt,
    string SubmittedByName,
    DateTime? ReviewedAt,
    string? ReviewedByName,
    string? ReviewComments
);

public record PaymentProofDetailDto(
    Guid Id,
    Guid CondominiumId,
    Guid UnitId,
    string UnitNumber,
    string? BuildingName,
    Guid ChargeId,
    string ChargeConcept,
    decimal ChargeAmount,
    decimal ChargeBalance,
    decimal Amount,
    PaymentMethod PaymentMethod,
    string PaymentMethodName,
    string? ReferenceNumber,
    DateTime PaymentDate,
    string? BankName,
    string FileName,
    string OriginalFileName,
    string FilePath,
    string ContentType,
    long FileSize,
    string? Notes,
    PaymentProofStatus Status,
    string StatusName,
    DateTime SubmittedAt,
    Guid SubmittedById,
    string SubmittedByName,
    DateTime? ReviewedAt,
    Guid? ReviewedById,
    string? ReviewedByName,
    string? ReviewComments,
    Guid? PaymentId
);

// Queries

// Get Payment Proofs for a Condominium (Admin view)
public record GetCondominiumPaymentProofsQuery(
    Guid CondominiumId,
    PaymentProofStatus? Status = null,
    int PageNumber = 1,
    int PageSize = 20
) : IRequest<PagedList<PaymentProofListDto>>;

// Get Payment Proofs for a Unit (Resident view)
public record GetUnitPaymentProofsQuery(
    Guid UnitId,
    PaymentProofStatus? Status = null,
    int PageNumber = 1,
    int PageSize = 20
) : IRequest<PagedList<PaymentProofListDto>>;

// Get Single Payment Proof Detail
public record GetPaymentProofQuery(Guid PaymentProofId) : IRequest<PaymentProofDetailDto?>;

// Get Payment Proof File
public record GetPaymentProofFileQuery(Guid PaymentProofId) : IRequest<PaymentProofFileDto?>;

public record PaymentProofFileDto(
    string FileName,
    string ContentType,
    byte[] Content
);

// Paged list helper
public record PagedList<T>(
    List<T> Items,
    int TotalCount,
    int PageNumber,
    int PageSize
)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => PageNumber > 1;
    public bool HasNextPage => PageNumber < TotalPages;
}
