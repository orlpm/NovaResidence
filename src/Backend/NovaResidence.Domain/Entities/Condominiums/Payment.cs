using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Condominiums;

/// <summary>
/// Represents a payment obligation for a unit (maintenance fee, special assessment, etc.)
/// </summary>
public class Payment : BaseEntity
{
    public Guid CondominiumId { get; private set; }
    public Condominium? Condominium { get; private set; }
    
    public Guid UnitId { get; private set; }
    public Unit? Unit { get; private set; }
    
    public string Concept { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    public PaymentType Type { get; private set; }
    
    public decimal Amount { get; private set; }
    public decimal AmountPaid { get; private set; }
    public decimal AmountPending => Amount - AmountPaid;
    
    public DateTime DueDate { get; private set; }
    public DateTime? PaidDate { get; private set; }
    
    public PaymentStatus Status { get; private set; }
    
    public string? ReferenceNumber { get; private set; }
    public string? PaymentMethod { get; private set; }
    public string? PaymentNotes { get; private set; }
    
    // For recurring payments
    public bool IsRecurring { get; private set; }
    public PaymentFrequency? RecurringFrequency { get; private set; }
    
    public ICollection<PaymentTransaction> Transactions { get; private set; } = new List<PaymentTransaction>();
    
    private Payment() { }
    
    public static Payment Create(
        Guid condominiumId,
        Guid unitId,
        string concept,
        PaymentType type,
        decimal amount,
        DateTime dueDate,
        string? description = null,
        bool isRecurring = false,
        PaymentFrequency? recurringFrequency = null)
    {
        Guard.Against.Default(condominiumId, nameof(condominiumId));
        Guard.Against.Default(unitId, nameof(unitId));
        Guard.Against.NullOrWhiteSpace(concept, nameof(concept));
        Guard.Against.NegativeOrZero(amount, nameof(amount));
        
        var payment = new Payment
        {
            Id = Guid.NewGuid(),
            CondominiumId = condominiumId,
            UnitId = unitId,
            Concept = concept,
            Description = description,
            Type = type,
            Amount = amount,
            AmountPaid = 0,
            DueDate = dueDate,
            Status = PaymentStatus.Pending,
            IsRecurring = isRecurring,
            RecurringFrequency = recurringFrequency,
            CreatedAt = DateTime.UtcNow
        };
        
        return payment;
    }
    
    public void RecordPayment(decimal amount, string paymentMethod, string? referenceNumber = null, string? notes = null)
    {
        Guard.Against.NegativeOrZero(amount, nameof(amount));
        
        if (AmountPaid + amount > Amount)
        {
            throw new InvalidOperationException("Payment amount exceeds pending balance");
        }
        
        AmountPaid += amount;
        PaymentMethod = paymentMethod;
        ReferenceNumber = referenceNumber;
        PaymentNotes = notes;
        
        if (AmountPaid >= Amount)
        {
            Status = PaymentStatus.Paid;
            PaidDate = DateTime.UtcNow;
        }
        else
        {
            Status = PaymentStatus.PartiallyPaid;
        }
        
        UpdatedAt = DateTime.UtcNow;
        
        // Create transaction record
        var transaction = PaymentTransaction.Create(
            Id,
            amount,
            paymentMethod,
            referenceNumber,
            notes);
        
        Transactions.Add(transaction);
    }
    
    public void MarkAsOverdue()
    {
        if (Status == PaymentStatus.Pending && DateTime.UtcNow > DueDate)
        {
            Status = PaymentStatus.Overdue;
            UpdatedAt = DateTime.UtcNow;
        }
    }
    
    public void Cancel(string reason)
    {
        Status = PaymentStatus.Cancelled;
        PaymentNotes = reason;
        UpdatedAt = DateTime.UtcNow;
    }
    
    public void UpdateAmount(decimal newAmount)
    {
        Guard.Against.NegativeOrZero(newAmount, nameof(newAmount));
        
        Amount = newAmount;
        
        // Recalculate status
        if (AmountPaid >= Amount)
        {
            Status = PaymentStatus.Paid;
            PaidDate = DateTime.UtcNow;
        }
        else if (AmountPaid > 0)
        {
            Status = PaymentStatus.PartiallyPaid;
        }
        
        UpdatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Represents an individual transaction for a payment
/// </summary>
public class PaymentTransaction : BaseEntity
{
    public Guid PaymentId { get; private set; }
    public Payment? Payment { get; private set; }
    
    public decimal Amount { get; private set; }
    public DateTime TransactionDate { get; private set; }
    
    public string PaymentMethod { get; private set; } = string.Empty;
    public string? ReferenceNumber { get; private set; }
    public string? Notes { get; private set; }
    
    public TransactionStatus Status { get; private set; }
    
    private PaymentTransaction() { }
    
    public static PaymentTransaction Create(
        Guid paymentId,
        decimal amount,
        string paymentMethod,
        string? referenceNumber = null,
        string? notes = null)
    {
        Guard.Against.Default(paymentId, nameof(paymentId));
        Guard.Against.NegativeOrZero(amount, nameof(amount));
        Guard.Against.NullOrWhiteSpace(paymentMethod, nameof(paymentMethod));
        
        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            PaymentId = paymentId,
            Amount = amount,
            TransactionDate = DateTime.UtcNow,
            PaymentMethod = paymentMethod,
            ReferenceNumber = referenceNumber,
            Notes = notes,
            Status = TransactionStatus.Completed,
            CreatedAt = DateTime.UtcNow
        };
        
        return transaction;
    }
    
    public void Void()
    {
        Status = TransactionStatus.Voided;
        UpdatedAt = DateTime.UtcNow;
    }
}

public enum PaymentType
{
    MaintenanceFee = 1,
    SpecialAssessment = 2,
    AmenityFee = 3,
    ParkingFee = 4,
    Penalty = 5,
    UtilityBill = 6,
    Other = 99
}

public enum PaymentStatus
{
    Pending = 1,
    PartiallyPaid = 2,
    Paid = 3,
    Overdue = 4,
    Cancelled = 5
}

public enum PaymentFrequency
{
    Monthly = 1,
    Quarterly = 2,
    SemiAnnual = 3,
    Annual = 4
}

public enum TransactionStatus
{
    Completed = 1,
    Pending = 2,
    Failed = 3,
    Voided = 4
}
