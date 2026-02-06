using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Entities.Authentication;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Billing;

/// <summary>
/// Status of a payment proof submitted by a resident
/// </summary>
public enum PaymentProofStatus
{
    /// <summary>Submitted, awaiting review</summary>
    Pending = 0,
    
    /// <summary>Approved by admin</summary>
    Approved = 1,
    
    /// <summary>Rejected by admin</summary>
    Rejected = 2
}

/// <summary>
/// Represents a bank payment proof/receipt uploaded by a resident
/// </summary>
public class PaymentProof : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid UnitId { get; private set; }
    public Guid ChargeId { get; private set; }
    public Guid SubmittedById { get; private set; }
    
    /// <summary>Amount claimed in the payment proof</summary>
    public decimal Amount { get; private set; }
    
    /// <summary>Payment method used (usually BankTransfer)</summary>
    public PaymentMethod PaymentMethod { get; private set; }
    
    /// <summary>Bank reference or transaction number</summary>
    public string? ReferenceNumber { get; private set; }
    
    /// <summary>Date when the payment was made</summary>
    public DateTime PaymentDate { get; private set; }
    
    /// <summary>Bank or institution where payment was made</summary>
    public string? BankName { get; private set; }
    
    /// <summary>File name of the uploaded proof</summary>
    public string FileName { get; private set; } = string.Empty;
    
    /// <summary>Original file name uploaded by user</summary>
    public string OriginalFileName { get; private set; } = string.Empty;
    
    /// <summary>File path or URL where the proof is stored</summary>
    public string FilePath { get; private set; } = string.Empty;
    
    /// <summary>Content type (image/jpeg, image/png, application/pdf)</summary>
    public string ContentType { get; private set; } = string.Empty;
    
    /// <summary>File size in bytes</summary>
    public long FileSize { get; private set; }
    
    /// <summary>Additional notes from the resident</summary>
    public string? Notes { get; private set; }
    
    /// <summary>Current status of the proof</summary>
    public PaymentProofStatus Status { get; private set; }
    
    /// <summary>When the proof was submitted</summary>
    public DateTime SubmittedAt { get; private set; }
    
    /// <summary>When the proof was reviewed (approved/rejected)</summary>
    public DateTime? ReviewedAt { get; private set; }
    
    /// <summary>Admin who reviewed the proof</summary>
    public Guid? ReviewedById { get; private set; }
    
    /// <summary>Comments from the admin when approving/rejecting</summary>
    public string? ReviewComments { get; private set; }
    
    /// <summary>Payment created when proof is approved</summary>
    public Guid? PaymentId { get; private set; }
    
    // Navigation properties
    public virtual Condominium Condominium { get; private set; } = null!;
    public virtual Unit Unit { get; private set; } = null!;
    public virtual Charge Charge { get; private set; } = null!;
    public virtual User SubmittedBy { get; private set; } = null!;
    public virtual User? ReviewedBy { get; private set; }
    public virtual Payment? Payment { get; private set; }

    private PaymentProof() { } // EF Core

    public static PaymentProof Create(
        Guid condominiumId,
        Guid unitId,
        Guid chargeId,
        Guid submittedById,
        decimal amount,
        PaymentMethod paymentMethod,
        DateTime paymentDate,
        string fileName,
        string originalFileName,
        string filePath,
        string contentType,
        long fileSize,
        string? referenceNumber = null,
        string? bankName = null,
        string? notes = null)
    {
        Guard.Against.NegativeOrZero(amount, nameof(amount));
        Guard.Against.NullOrWhiteSpace(fileName, nameof(fileName));
        Guard.Against.NullOrWhiteSpace(filePath, nameof(filePath));

        return new PaymentProof
        {
            CondominiumId = condominiumId,
            UnitId = unitId,
            ChargeId = chargeId,
            SubmittedById = submittedById,
            Amount = amount,
            PaymentMethod = paymentMethod,
            PaymentDate = paymentDate,
            ReferenceNumber = referenceNumber,
            BankName = bankName,
            FileName = fileName,
            OriginalFileName = originalFileName,
            FilePath = filePath,
            ContentType = contentType,
            FileSize = fileSize,
            Notes = notes,
            Status = PaymentProofStatus.Pending,
            SubmittedAt = DateTime.UtcNow
        };
    }

    public void Approve(Guid reviewedById, Guid paymentId, string? comments = null)
    {
        if (Status != PaymentProofStatus.Pending)
            throw new InvalidOperationException("Only pending proofs can be approved");

        Status = PaymentProofStatus.Approved;
        ReviewedAt = DateTime.UtcNow;
        ReviewedById = reviewedById;
        ReviewComments = comments;
        PaymentId = paymentId;
    }

    public void Reject(Guid reviewedById, string reason)
    {
        if (Status != PaymentProofStatus.Pending)
            throw new InvalidOperationException("Only pending proofs can be rejected");

        Guard.Against.NullOrWhiteSpace(reason, nameof(reason));

        Status = PaymentProofStatus.Rejected;
        ReviewedAt = DateTime.UtcNow;
        ReviewedById = reviewedById;
        ReviewComments = reason;
    }
}
