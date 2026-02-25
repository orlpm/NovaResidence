using Ardalis.GuardClauses;
using NovaResidence.Domain.Common;

namespace NovaResidence.Domain.Entities.Subscriptions;

/// <summary>
/// Represents a subscription plan available in the platform.
/// Plans define pricing based on number of units.
/// </summary>
public class SubscriptionPlan : BaseEntity
{
    public string Name { get; private set; } = string.Empty;
    public string? Description { get; private set; }
    
    /// <summary>Price per unit per month in MXN</summary>
    public decimal PricePerUnit { get; private set; }
    
    /// <summary>Minimum number of units for this plan</summary>
    public int MinUnits { get; private set; }
    
    /// <summary>Maximum number of units (null = unlimited)</summary>
    public int? MaxUnits { get; private set; }
    
    /// <summary>Free trial days when subscribing (e.g. 30 for 1 month free)</summary>
    public int TrialDays { get; private set; }
    
    /// <summary>Whether this is a custom/enterprise plan</summary>
    public bool IsCustom { get; private set; }
    
    /// <summary>Fixed monthly price for custom plans (overrides per-unit pricing)</summary>
    public decimal? FixedMonthlyPrice { get; private set; }
    
    /// <summary>Features included as JSON array</summary>
    public string? Features { get; private set; }
    
    public bool IsActive { get; private set; } = true;
    
    /// <summary>Display order in the plans page</summary>
    public int DisplayOrder { get; private set; }
    
    /// <summary>If this plan is highlighted / recommended</summary>
    public bool IsRecommended { get; private set; }

    private SubscriptionPlan() { } // EF Core

    public static SubscriptionPlan Create(
        string name,
        decimal pricePerUnit,
        int minUnits,
        int? maxUnits,
        int trialDays = 30,
        string? description = null,
        string? features = null,
        int displayOrder = 0,
        bool isRecommended = false)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.Negative(pricePerUnit, nameof(pricePerUnit));
        Guard.Against.NegativeOrZero(minUnits, nameof(minUnits));

        return new SubscriptionPlan
        {
            Name = name,
            Description = description,
            PricePerUnit = pricePerUnit,
            MinUnits = minUnits,
            MaxUnits = maxUnits,
            TrialDays = trialDays,
            IsCustom = false,
            Features = features,
            DisplayOrder = displayOrder,
            IsRecommended = isRecommended,
            IsActive = true
        };
    }

    public static SubscriptionPlan CreateCustom(
        string name,
        decimal fixedMonthlyPrice,
        string? description = null,
        string? features = null)
    {
        Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Guard.Against.NegativeOrZero(fixedMonthlyPrice, nameof(fixedMonthlyPrice));

        return new SubscriptionPlan
        {
            Name = name,
            Description = description,
            PricePerUnit = 0,
            MinUnits = 1,
            MaxUnits = null,
            TrialDays = 30,
            IsCustom = true,
            FixedMonthlyPrice = fixedMonthlyPrice,
            Features = features,
            DisplayOrder = 99,
            IsRecommended = false,
            IsActive = true
        };
    }

    public void Update(string name, string? description, decimal pricePerUnit, 
        int minUnits, int? maxUnits, int trialDays, string? features,
        int displayOrder, bool isRecommended)
    {
        Name = Guard.Against.NullOrWhiteSpace(name, nameof(name));
        Description = description;
        PricePerUnit = Guard.Against.Negative(pricePerUnit, nameof(pricePerUnit));
        MinUnits = Guard.Against.NegativeOrZero(minUnits, nameof(minUnits));
        MaxUnits = maxUnits;
        TrialDays = trialDays;
        Features = features;
        DisplayOrder = displayOrder;
        IsRecommended = isRecommended;
    }

    public void Deactivate() => IsActive = false;
    public void Activate() => IsActive = true;

    /// <summary>
    /// Calculates the monthly price for a given number of units
    /// </summary>
    public decimal CalculateMonthlyPrice(int unitCount)
    {
        if (IsCustom && FixedMonthlyPrice.HasValue)
            return FixedMonthlyPrice.Value;

        return PricePerUnit * unitCount;
    }
}

/// <summary>
/// Represents the subscription status of an Admin user
/// </summary>
public enum SubscriptionStatus
{
    /// <summary>In free trial period</summary>
    Trial = 0,
    
    /// <summary>Active paid subscription</summary>
    Active = 1,
    
    /// <summary>Past due - grace period</summary>
    PastDue = 2,
    
    /// <summary>Suspended - access blocked</summary>
    Suspended = 3,
    
    /// <summary>Cancelled</summary>
    Cancelled = 4,
    
    /// <summary>Expired (trial ended without payment)</summary>
    Expired = 5
}

/// <summary>
/// Represents an Admin user's subscription to a plan.
/// One subscription per Admin user, covering all their condominiums.
/// </summary>
public class Subscription : BaseEntity
{
    public const int DefaultGracePeriodDays = 5;

    /// <summary>The administrator user who owns this subscription</summary>
    public Guid AdminUserId { get; private set; }
    
    public Guid SubscriptionPlanId { get; private set; }
    
    public SubscriptionStatus Status { get; private set; }
    
    public DateTime StartDate { get; private set; }
    public DateTime? TrialEndDate { get; private set; }
    public DateTime CurrentPeriodStart { get; private set; }
    public DateTime CurrentPeriodEnd { get; private set; }
    
    /// <summary>Total number of units being billed across all condominiums</summary>
    public int BilledUnits { get; private set; }
    
    /// <summary>Monthly amount calculated at subscription time</summary>
    public decimal MonthlyAmount { get; private set; }
    
    /// <summary>Grace period days after payment is due (default 5)</summary>
    public int GracePeriodDays { get; private set; } = DefaultGracePeriodDays;
    
    /// <summary>When the last payment was received</summary>
    public DateTime? LastPaymentDate { get; private set; }
    
    /// <summary>Reason for cancellation if cancelled</summary>
    public string? CancellationReason { get; private set; }
    
    /// <summary>When the subscription was cancelled</summary>
    public DateTime? CancelledAt { get; private set; }
    
    // Navigation
    public virtual Authentication.User AdminUser { get; private set; } = null!;
    public virtual SubscriptionPlan Plan { get; private set; } = null!;
    
    private readonly List<SubscriptionPayment> _payments = new();
    public IReadOnlyCollection<SubscriptionPayment> Payments => _payments.AsReadOnly();

    private Subscription() { } // EF Core

    public static Subscription Create(
        Guid adminUserId,
        Guid subscriptionPlanId,
        int billedUnits,
        decimal monthlyAmount,
        int trialDays = 30)
    {
        var now = DateTime.UtcNow;
        var trialEnd = trialDays > 0 ? now.AddDays(trialDays) : (DateTime?)null;

        return new Subscription
        {
            AdminUserId = adminUserId,
            SubscriptionPlanId = subscriptionPlanId,
            Status = trialDays > 0 ? SubscriptionStatus.Trial : SubscriptionStatus.Active,
            StartDate = now,
            TrialEndDate = trialEnd,
            CurrentPeriodStart = now,
            CurrentPeriodEnd = trialEnd ?? now.AddMonths(1),
            BilledUnits = billedUnits,
            MonthlyAmount = monthlyAmount,
            GracePeriodDays = DefaultGracePeriodDays
        };
    }

    /// <summary>
    /// Checks if this subscription currently grants access
    /// </summary>
    public bool IsAccessGranted()
    {
        if (GracePeriodDays != DefaultGracePeriodDays)
            GracePeriodDays = DefaultGracePeriodDays;

        var now = DateTime.UtcNow;

        return Status switch
        {
            SubscriptionStatus.Trial => TrialEndDate.HasValue && now <= TrialEndDate.Value,
            SubscriptionStatus.Active => now <= CurrentPeriodEnd,
            SubscriptionStatus.PastDue => now <= CurrentPeriodEnd.AddDays(GracePeriodDays),
            _ => false
        };
    }

    /// <summary>
    /// Updates status based on current date and payment state
    /// </summary>
    public void EvaluateStatus()
    {
        if (GracePeriodDays != DefaultGracePeriodDays)
            GracePeriodDays = DefaultGracePeriodDays;

        var now = DateTime.UtcNow;

        switch (Status)
        {
            case SubscriptionStatus.Trial:
                if (TrialEndDate.HasValue && now > TrialEndDate.Value)
                {
                    Status = SubscriptionStatus.Expired;
                }
                break;

            case SubscriptionStatus.Active:
                if (now > CurrentPeriodEnd)
                {
                    Status = SubscriptionStatus.PastDue;
                }
                break;

            case SubscriptionStatus.PastDue:
                if (now > CurrentPeriodEnd.AddDays(GracePeriodDays))
                {
                    Status = SubscriptionStatus.Suspended;
                }
                break;
        }
    }

    /// <summary>
    /// Records a payment and extends the subscription
    /// </summary>
    public void RecordPayment(SubscriptionPayment payment)
    {
        _payments.Add(payment);
        LastPaymentDate = payment.PaymentDate;
        
        // Extend subscription period
        var periodStart = CurrentPeriodEnd > DateTime.UtcNow 
            ? CurrentPeriodEnd 
            : DateTime.UtcNow;
        
        CurrentPeriodStart = periodStart;
        CurrentPeriodEnd = periodStart.AddMonths(payment.MonthsPaid);
        Status = SubscriptionStatus.Active;
    }

    /// <summary>
    /// Updates the number of billed units and recalculates price
    /// </summary>
    public void UpdateBilledUnits(int newUnitCount, decimal newMonthlyAmount)
    {
        BilledUnits = newUnitCount;
        MonthlyAmount = newMonthlyAmount;
    }

    /// <summary>
    /// Changes subscription plan while preserving current period/status.
    /// </summary>
    public void ChangePlan(Guid newPlanId, int billedUnits, decimal newMonthlyAmount)
    {
        SubscriptionPlanId = newPlanId;
        BilledUnits = billedUnits;
        MonthlyAmount = newMonthlyAmount;
    }

    /// <summary>
    /// Cancels the subscription
    /// </summary>
    public void Cancel(string? reason = null)
    {
        Status = SubscriptionStatus.Cancelled;
        CancellationReason = reason;
        CancelledAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Reactivates a cancelled or suspended subscription with a payment
    /// </summary>
    public void Reactivate()
    {
        Status = SubscriptionStatus.Active;
        CancellationReason = null;
        CancelledAt = null;
    }
    
    /// <summary>
    /// Manually activates subscription (e.g. after receiving first payment post-trial)
    /// </summary>
    public void ActivateAfterTrial()
    {
        var now = DateTime.UtcNow;
        Status = SubscriptionStatus.Active;
        CurrentPeriodStart = now;
        CurrentPeriodEnd = now.AddMonths(1);
    }
}

/// <summary>
/// Represents a payment made for a subscription (SaaS billing, not resident billing)
/// </summary>
public class SubscriptionPayment : BaseEntity
{
    public Guid SubscriptionId { get; private set; }
    
    public decimal Amount { get; private set; }
    public int MonthsPaid { get; private set; } = 1;
    
    public string PaymentMethod { get; private set; } = string.Empty;
    public string? ReferenceNumber { get; private set; }
    public string? Notes { get; private set; }
    
    public DateTime PaymentDate { get; private set; }
    public bool IsVerified { get; private set; }
    public DateTime? VerifiedAt { get; private set; }
    
    /// <summary>URL to payment proof document/image</summary>
    public string? ProofUrl { get; private set; }
    
    // Navigation
    public virtual Subscription Subscription { get; private set; } = null!;

    private SubscriptionPayment() { } // EF Core

    public static SubscriptionPayment Create(
        Guid subscriptionId,
        decimal amount,
        int monthsPaid,
        string paymentMethod,
        DateTime paymentDate,
        string? referenceNumber = null,
        string? notes = null,
        string? proofUrl = null)
    {
        Guard.Against.NegativeOrZero(amount, nameof(amount));
        Guard.Against.NegativeOrZero(monthsPaid, nameof(monthsPaid));

        return new SubscriptionPayment
        {
            SubscriptionId = subscriptionId,
            Amount = amount,
            MonthsPaid = monthsPaid,
            PaymentMethod = paymentMethod,
            PaymentDate = paymentDate,
            ReferenceNumber = referenceNumber,
            Notes = notes,
            ProofUrl = proofUrl,
            IsVerified = false
        };
    }

    public void Verify()
    {
        IsVerified = true;
        VerifiedAt = DateTime.UtcNow;
    }
}
