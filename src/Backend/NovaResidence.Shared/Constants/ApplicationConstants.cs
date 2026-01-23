namespace NovaResidence.Shared.Constants;

public static class CacheKeys
{
    public const string UserPrefix = "user:";
    public const string CondominiumPrefix = "condominium:";
    public const string UnitPrefix = "unit:";
    
    public static string GetUserKey(Guid userId) => $"{UserPrefix}{userId}";
    public static string GetCondominiumKey(Guid condominiumId) => $"{CondominiumPrefix}{condominiumId}";
}

public static class RolePermissions
{
    public const string ManageUsers = "manage:users";
    public const string ManageUnits = "manage:units";
    public const string ManageBilling = "manage:billing";
    public const string ManageIncidents = "manage:incidents";
    public const string ManageReservations = "manage:reservations";
    public const string ViewReports = "view:reports";
    public const string ManageProviders = "manage:providers";
}

public static class EventTypes
{
    public const string UserRegistered = "user.registered";
    public const string CondominiumCreated = "condominium.created";
    public const string PaymentReceived = "payment.received";
    public const string IncidentCreated = "incident.created";
    public const string IncidentResolved = "incident.resolved";
    public const string ReservationCreated = "reservation.created";
    public const string InvoiceGenerated = "invoice.generated";
}

public static class NotificationTemplates
{
    public const string WelcomeEmail = "welcome-email";
    public const string PaymentConfirmation = "payment-confirmation";
    public const string PaymentReminder = "payment-reminder";
    public const string IncidentUpdate = "incident-update";
    public const string ReservationConfirmation = "reservation-confirmation";
}
