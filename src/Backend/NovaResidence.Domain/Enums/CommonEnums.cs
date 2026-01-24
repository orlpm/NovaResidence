namespace NovaResidence.Domain.Enums;

/// <summary>
/// User roles in the system (Multi-tenant aware)
/// </summary>
public enum UserRole
{
    /// <summary>Platform Super Admin</summary>
    SuperAdmin = 0,
    
    /// <summary>Condominium Administrator</summary>
    CondominiumAdmin = 1,
    
    /// <summary>Sub-administrator with limited permissions</summary>
    SubAdmin = 2,
    
    /// <summary>Unit owner</summary>
    Owner = 3,
    
    /// <summary>Tenant of a unit</summary>
    Tenant = 4,
    
    /// <summary>Security guard</summary>
    SecurityGuard = 5,
    
    /// <summary>Maintenance personnel</summary>
    Maintenance = 6,
    
    /// <summary>External service provider</summary>
    ServiceProvider = 7,
    
    /// <summary>Accountant</summary>
    Accountant = 8
}

public enum UnitStatus
{
    Available = 0,
    Occupied = 1,
    UnderMaintenance = 2,
    Vacant = 3
}

public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Overdue = 2,
    Cancelled = 3,
    Refunded = 4
}

public enum IncidentStatus
{
    Open = 0,
    Acknowledged = 1,
    InProgress = 2,
    Resolved = 3,
    Closed = 4,
    Cancelled = 5
}

public enum IncidentPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public enum IncidentType
{
    Maintenance = 0,
    Plumbing = 1,
    Electrical = 2,
    Security = 3,
    Noise = 4,
    Parking = 5,
    CommonArea = 6,
    Cleaning = 7,
    Elevator = 8,
    HVAC = 9,
    Structural = 10,
    Pest = 11,
    Other = 99
}

public enum FeeType
{
    MonthlyMaintenance = 0,
    ExtraordinaryFee = 1,
    ParkingFee = 2,
    ReservationFee = 3,
    LateFee = 4,
    Fine = 5,
    Utility = 6,
    Insurance = 7,
    Other = 99
}

public enum ChargeStatus
{
    Pending = 0,
    PartiallyPaid = 1,
    Paid = 2,
    Overdue = 3,
    Cancelled = 4,
    Forgiven = 5
}

public enum PaymentMethod
{
    Cash = 0,
    BankTransfer = 1,
    CreditCard = 2,
    DebitCard = 3,
    Check = 4,
    SPEI = 5,
    PayPal = 6,
    Other = 99
}

public enum ReservationStatus
{
    Pending = 0,
    Confirmed = 1,
    Approved = 1,  // Alias for Confirmed
    InProgress = 2,
    Rejected = 3,
    Cancelled = 4,
    Completed = 5,
    NoShow = 6
}

public enum InvoiceStatus
{
    Draft = 0,
    Issued = 1,
    Paid = 2,
    Overdue = 3,
    Cancelled = 4
}

public enum DocumentType
{
    Contract = 0,
    Invoice = 1,
    Receipt = 2,
    IdentificationCard = 3,
    PowerOfAttorney = 4,
    Regulation = 5,
    MeetingMinutes = 6,
    Other = 7
}
