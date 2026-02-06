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

#region Communications Enums

/// <summary>
/// Types of announcements
/// </summary>
public enum AnnouncementType
{
    /// <summary>General announcement/notice</summary>
    General = 0,
    
    /// <summary>Official circular</summary>
    Circular = 1,
    
    /// <summary>Meeting minutes/record</summary>
    MeetingMinutes = 2,
    
    /// <summary>Emergency notification</summary>
    Emergency = 3,
    
    /// <summary>Maintenance notice</summary>
    Maintenance = 4,
    
    /// <summary>Event announcement</summary>
    Event = 5,
    
    /// <summary>Rule/policy change</summary>
    PolicyChange = 6
}

/// <summary>
/// Priority levels for announcements
/// </summary>
public enum AnnouncementPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3
}

/// <summary>
/// Types of polls/surveys
/// </summary>
public enum PollType
{
    /// <summary>Standard voting (single choice)</summary>
    SingleChoice = 0,
    
    /// <summary>Multiple choice allowed</summary>
    MultipleChoice = 1,
    
    /// <summary>Survey/questionnaire</summary>
    Survey = 2,
    
    /// <summary>Assembly voting with quorum</summary>
    AssemblyVote = 3
}

/// <summary>
/// Status of a poll
/// </summary>
public enum PollStatus
{
    Draft = 0,
    Active = 1,
    Closed = 2,
    Cancelled = 3
}

/// <summary>
/// Types of meetings
/// </summary>
public enum MeetingType
{
    /// <summary>Regular/ordinary assembly</summary>
    OrdinaryAssembly = 0,
    
    /// <summary>Extraordinary assembly</summary>
    ExtraordinaryAssembly = 1,
    
    /// <summary>Board meeting</summary>
    BoardMeeting = 2,
    
    /// <summary>Committee meeting</summary>
    CommitteeMeeting = 3,
    
    /// <summary>Virtual meeting</summary>
    VirtualMeeting = 4,
    
    /// <summary>Informational session</summary>
    InformationalSession = 5
}

/// <summary>
/// Status of a meeting
/// </summary>
public enum MeetingStatus
{
    Scheduled = 0,
    InProgress = 1,
    Completed = 2,
    Cancelled = 3,
    Postponed = 4
}

/// <summary>
/// Status of a meeting attendee
/// </summary>
public enum AttendeeStatus
{
    Invited = 0,
    Confirmed = 1,
    Declined = 2,
    Attended = 3,
    Absent = 4
}

/// <summary>
/// Categories for forum posts
/// </summary>
public enum ForumCategory
{
    General = 0,
    BuySell = 1,
    Services = 2,
    Events = 3,
    LostAndFound = 4,
    Suggestions = 5,
    Questions = 6,
    Recommendations = 7
}

/// <summary>
/// Status of a forum post
/// </summary>
public enum ForumPostStatus
{
    Active = 0,
    Archived = 1,
    Hidden = 2
}

#endregion

#region Notification Enums

/// <summary>
/// Types of notifications
/// </summary>
public enum NotificationType
{
    /// <summary>New announcement published</summary>
    Announcement = 0,
    
    /// <summary>New poll/vote available</summary>
    Poll = 1,
    
    /// <summary>Meeting scheduled or updated</summary>
    Meeting = 2,
    
    /// <summary>New forum post</summary>
    ForumPost = 3,
    
    /// <summary>New comment on forum</summary>
    ForumComment = 4,
    
    /// <summary>Payment reminder</summary>
    PaymentReminder = 5,
    
    /// <summary>Payment received confirmation</summary>
    PaymentReceived = 6,
    
    /// <summary>Incident status update</summary>
    IncidentUpdate = 7,
    
    /// <summary>Reservation confirmed/updated</summary>
    Reservation = 8,
    
    /// <summary>System alert</summary>
    SystemAlert = 9,
    
    /// <summary>General information</summary>
    General = 10
}

/// <summary>
/// Priority of notification
/// </summary>
public enum NotificationPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3
}

#endregion
