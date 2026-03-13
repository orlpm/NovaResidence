using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Domain.Entities.Billing;

/// <summary>
/// Represents a charge or fee applied to a unit
/// </summary>
public class Charge : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid UnitId { get; private set; }
    public Guid? ResidentId { get; private set; }
    
    public string Concept { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public string? CancellationReason { get; private set; }
    public string? ForgiveReason { get; private set; }
    public FeeType FeeType { get; private set; }
    public decimal Amount { get; private set; }
    public decimal PaidAmount { get; private set; }
    public decimal Balance => Amount - PaidAmount;
    
    public ChargeStatus Status { get; private set; }
    public DateTime DueDate { get; private set; }
    public int BillingPeriodMonth { get; private set; }
    public int BillingPeriodYear { get; private set; }
    
    // Late fee configuration
    public bool ApplyLateFee { get; private set; }
    public decimal? LateFeePercentage { get; private set; }
    public decimal? LateFeeAmount { get; private set; }
    public DateTime? LateFeeAppliedAt { get; private set; }
    
    // Reference to invoice if applicable
    public Guid? InvoiceId { get; private set; }
    
    // Navigation properties
    public virtual Condominium Condominium { get; private set; } = null!;
    public virtual Unit Unit { get; private set; } = null!;
    
    private readonly List<Payment> _payments = new();
    public IReadOnlyCollection<Payment> Payments => _payments.AsReadOnly();

    private Charge() { } // EF Core

    public static Charge Create(
        Guid condominiumId,
        Guid unitId,
        string concept,
        FeeType feeType,
        decimal amount,
        DateTime dueDate,
        int billingMonth,
        int billingYear,
        Guid? residentId = null,
        string? description = null,
        bool applyLateFee = true,
        decimal? lateFeePercentage = null)
    {
        Guard.Against.NullOrWhiteSpace(concept, nameof(concept));
        Guard.Against.NegativeOrZero(amount, nameof(amount));

        var charge = new Charge
        {
            CondominiumId = condominiumId,
            UnitId = unitId,
            ResidentId = residentId,
            Concept = concept,
            Description = description,
            FeeType = feeType,
            Amount = amount,
            PaidAmount = 0,
            Status = ChargeStatus.Pending,
            DueDate = dueDate,
            BillingPeriodMonth = billingMonth,
            BillingPeriodYear = billingYear,
            ApplyLateFee = applyLateFee,
            LateFeePercentage = lateFeePercentage
        };

        return charge;
    }

    public void ApplyPayment(Payment payment)
    {
        if (Status == ChargeStatus.Paid || Status == ChargeStatus.Cancelled || Status == ChargeStatus.Forgiven)
            throw new InvalidOperationException("Cannot apply payment to a paid, cancelled or forgiven charge");

        _payments.Add(payment);
        PaidAmount += payment.Amount;

        UpdateStatus();
    }

    public void ReversePayment(Payment payment)
    {
        if (payment.IsRefunded && PaidAmount < payment.Amount)
            throw new InvalidOperationException("Cannot reverse a payment beyond the applied amount");

        PaidAmount -= payment.Amount;

        if (PaidAmount < 0)
            PaidAmount = 0;

        UpdateStatus();
    }

    public void ApplyLateFeeCharge(decimal lateFeeAmount)
    {
        if (Status == ChargeStatus.Paid)
            throw new InvalidOperationException("Cannot apply late fee to a paid charge");

        LateFeeAmount = lateFeeAmount;
        Amount += lateFeeAmount;
        LateFeeAppliedAt = DateTime.UtcNow;
        
        UpdateStatus();
    }

    private void UpdateStatus()
    {
        if (PaidAmount >= Amount)
        {
            Status = ChargeStatus.Paid;
        }
        else if (PaidAmount > 0)
        {
            Status = ChargeStatus.PartiallyPaid;
        }
        else if (DateTime.UtcNow > DueDate)
        {
            Status = ChargeStatus.Overdue;
        }
        else
        {
            Status = ChargeStatus.Pending;
        }
    }

    public void MarkAsOverdue()
    {
        if (Status == ChargeStatus.Paid || Status == ChargeStatus.Cancelled)
            return;
            
        Status = ChargeStatus.Overdue;
    }

    public void Cancel(string reason)
    {
        if (PaidAmount > 0)
            throw new InvalidOperationException("Cannot cancel a charge with payments applied");
            
        Status = ChargeStatus.Cancelled;
        CancellationReason = reason;
    }

    public void Forgive(string reason)
    {
        Status = ChargeStatus.Forgiven;
        ForgiveReason = reason;
    }

    public void SetInvoice(Guid invoiceId)
    {
        InvoiceId = invoiceId;
    }
}

/// <summary>
/// Represents a payment made towards a charge
/// </summary>
public class Payment : BaseEntity
{
    public Guid ChargeId { get; private set; }
    public Guid? ReceivedById { get; private set; }
    
    public decimal Amount { get; private set; }
    public PaymentMethod PaymentMethod { get; private set; }
    public string? ReferenceNumber { get; private set; }
    public string? Notes { get; private set; }
    
    public DateTime PaymentDate { get; private set; }
    public bool IsVerified { get; private set; }
    public DateTime? VerifiedAt { get; private set; }
    public Guid? VerifiedById { get; private set; }
    
    /// <summary>URL to uploaded payment proof image/document (for bank transfers)</summary>
    public string? ProofImageUrl { get; private set; }
    
    // For refunds
    public bool IsRefunded { get; private set; }
    public DateTime? RefundedAt { get; private set; }
    public Guid? RefundedById { get; private set; }
    public string? RefundReason { get; private set; }
    
    // Navigation properties
    public virtual Charge Charge { get; private set; } = null!;
    public virtual Authentication.User? VerifiedBy { get; private set; }
    public virtual Authentication.User? RefundedBy { get; private set; }

    private Payment() { } // EF Core

    public static Payment Create(
        Guid chargeId,
        decimal amount,
        PaymentMethod paymentMethod,
        DateTime paymentDate,
        Guid? receivedById = null,
        string? referenceNumber = null,
        string? notes = null)
    {
        Guard.Against.NegativeOrZero(amount, nameof(amount));

        return new Payment
        {
            ChargeId = chargeId,
            Amount = amount,
            PaymentMethod = paymentMethod,
            PaymentDate = paymentDate,
            ReceivedById = receivedById,
            ReferenceNumber = referenceNumber,
            Notes = notes,
            IsVerified = false,
            IsRefunded = false
        };
    }

    public void SetProofImageUrl(string url)
    {
        ProofImageUrl = url;
    }

    public void Verify(Guid verifiedById)
    {
        IsVerified = true;
        VerifiedAt = DateTime.UtcNow;
        VerifiedById = verifiedById;
    }

    public void Refund(string reason, Guid refundedById)
    {
        if (IsRefunded)
            throw new InvalidOperationException("Payment is already refunded");
            
        IsRefunded = true;
        RefundedAt = DateTime.UtcNow;
        RefundedById = refundedById;
        RefundReason = reason;
    }
}

/// <summary>
/// Represents an invoice that groups multiple charges
/// </summary>
public class Invoice : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Guid UnitId { get; private set; }
    public Guid? ResidentId { get; private set; }
    
    public string InvoiceNumber { get; private set; } = string.Empty;
    public InvoiceStatus Status { get; private set; }
    
    public decimal Subtotal { get; private set; }
    public decimal Tax { get; private set; }
    public decimal Total { get; private set; }
    public decimal PaidAmount { get; private set; }
    public decimal Balance => Total - PaidAmount;
    
    public DateTime IssueDate { get; private set; }
    public DateTime DueDate { get; private set; }
    public DateTime? PaidDate { get; private set; }
    
    public int BillingPeriodMonth { get; private set; }
    public int BillingPeriodYear { get; private set; }
    
    public string? Notes { get; private set; }

    private Invoice() { } // EF Core

    public static Invoice Create(
        Guid condominiumId,
        Guid unitId,
        string invoiceNumber,
        decimal subtotal,
        decimal tax,
        DateTime issueDate,
        DateTime dueDate,
        int billingMonth,
        int billingYear,
        Guid? residentId = null,
        string? notes = null)
    {
        Guard.Against.NullOrWhiteSpace(invoiceNumber, nameof(invoiceNumber));

        return new Invoice
        {
            CondominiumId = condominiumId,
            UnitId = unitId,
            ResidentId = residentId,
            InvoiceNumber = invoiceNumber,
            Status = InvoiceStatus.Draft,
            Subtotal = subtotal,
            Tax = tax,
            Total = subtotal + tax,
            PaidAmount = 0,
            IssueDate = issueDate,
            DueDate = dueDate,
            BillingPeriodMonth = billingMonth,
            BillingPeriodYear = billingYear,
            Notes = notes
        };
    }

    public void Issue()
    {
        if (Status != InvoiceStatus.Draft)
            throw new InvalidOperationException("Only draft invoices can be issued");
            
        Status = InvoiceStatus.Issued;
    }

    public void RecordPayment(decimal amount)
    {
        PaidAmount += amount;
        
        if (PaidAmount >= Total)
        {
            Status = InvoiceStatus.Paid;
            PaidDate = DateTime.UtcNow;
        }
    }

    public void MarkAsOverdue()
    {
        if (Status == InvoiceStatus.Paid || Status == InvoiceStatus.Cancelled)
            return;
            
        Status = InvoiceStatus.Overdue;
    }

    public void Cancel()
    {
        if (PaidAmount > 0)
            throw new InvalidOperationException("Cannot cancel an invoice with payments");
            
        Status = InvoiceStatus.Cancelled;
    }
}

/// <summary>
/// Fee configuration template for automatic charge generation
/// </summary>
public class FeeConfiguration : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public FeeType FeeType { get; private set; }
    public decimal DefaultAmount { get; private set; }
    
    public bool IsRecurring { get; private set; }
    public int? RecurringDay { get; private set; } // Day of month for recurring charges
    public int? DueDayOffset { get; private set; } // Days after generation that it's due
    
    public bool ApplyLateFee { get; private set; }
    public decimal? LateFeePercentage { get; private set; }
    public int? GracePeriodDays { get; private set; }
    
    public bool IsActive { get; private set; }

    private FeeConfiguration() { } // EF Core

    public static FeeConfiguration Create(
        Guid condominiumId,
        string name,
        FeeType feeType,
        decimal defaultAmount,
        bool isRecurring = true,
        int? recurringDay = 1,
        int? dueDayOffset = 10,
        bool applyLateFee = true,
        decimal? lateFeePercentage = 5m,
        int? gracePeriodDays = 5,
        string? description = null)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NegativeOrZero(defaultAmount, nameof(defaultAmount));

        return new FeeConfiguration
        {
            CondominiumId = condominiumId,
            Name = name,
            Description = description,
            FeeType = feeType,
            DefaultAmount = defaultAmount,
            IsRecurring = isRecurring,
            RecurringDay = recurringDay,
            DueDayOffset = dueDayOffset,
            ApplyLateFee = applyLateFee,
            LateFeePercentage = lateFeePercentage,
            GracePeriodDays = gracePeriodDays,
            IsActive = true
        };
    }

    public void Update(
        string name,
        decimal defaultAmount,
        int? recurringDay,
        int? dueDayOffset,
        bool applyLateFee,
        decimal? lateFeePercentage,
        int? gracePeriodDays,
        string? description)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NegativeOrZero(defaultAmount, nameof(defaultAmount));

        Name = name;
        Description = description;
        DefaultAmount = defaultAmount;
        RecurringDay = recurringDay;
        DueDayOffset = dueDayOffset;
        ApplyLateFee = applyLateFee;
        LateFeePercentage = lateFeePercentage;
        GracePeriodDays = gracePeriodDays;
    }

    public void Activate() => IsActive = true;
    public void Deactivate() => IsActive = false;
}
