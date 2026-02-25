namespace NovaResidence.Domain.Constants;

public static class PermissionCodes
{
    // Platform Admin (SuperAdmin only)
    public const string PLATFORM_MANAGE_CLIENTS = "platform.manage_clients";
    public const string PLATFORM_VIEW_ALL_DATA = "platform.view_all_data";
    public const string PLATFORM_MANAGE_PERMISSIONS = "platform.manage_permissions";
    public const string PLATFORM_MANAGE_ROLES = "platform.manage_roles";
    public const string PLATFORM_SYSTEM_SETTINGS = "platform.system_settings";
    
    // Billing
    public const string BILLING_VIEW = "billing.view";
    public const string BILLING_CREATE_CHARGES = "billing.create_charges";
    public const string BILLING_EDIT_CHARGES = "billing.edit_charges";
    public const string BILLING_DELETE_CHARGES = "billing.delete_charges";
    public const string BILLING_RECORD_PAYMENTS = "billing.record_payments";
    public const string BILLING_CANCEL_CHARGES = "billing.cancel_charges";
    public const string BILLING_FORGIVE_CHARGES = "billing.forgive_charges";
    public const string BILLING_EXPORT = "billing.export";
    public const string BILLING_VIEW_ALL_UNITS = "billing.view_all_units";
    
    // Residents
    public const string RESIDENTS_VIEW = "residents.view";
    public const string RESIDENTS_CREATE = "residents.create";
    public const string RESIDENTS_EDIT = "residents.edit";
    public const string RESIDENTS_DELETE = "residents.delete";
    public const string RESIDENTS_REGISTER_ACCOUNTS = "residents.register_accounts";
    public const string RESIDENTS_VIEW_SENSITIVE_DATA = "residents.view_sensitive_data";
    
    // Communications - Announcements
    public const string COMMUNICATIONS_VIEW_ANNOUNCEMENTS = "communications.view_announcements";
    public const string COMMUNICATIONS_CREATE_ANNOUNCEMENTS = "communications.create_announcements";
    public const string COMMUNICATIONS_EDIT_ANNOUNCEMENTS = "communications.edit_announcements";
    public const string COMMUNICATIONS_DELETE_ANNOUNCEMENTS = "communications.delete_announcements";
    public const string COMMUNICATIONS_PUBLISH_ANNOUNCEMENTS = "communications.publish_announcements";
    
    // Communications - Polls
    public const string COMMUNICATIONS_VIEW_POLLS = "communications.view_polls";
    public const string COMMUNICATIONS_CREATE_POLLS = "communications.create_polls";
    public const string COMMUNICATIONS_MANAGE_POLLS = "communications.manage_polls";
    public const string COMMUNICATIONS_VIEW_POLL_RESULTS = "communications.view_poll_results";
    
    // Communications - Meetings
    public const string COMMUNICATIONS_VIEW_MEETINGS = "communications.view_meetings";
    public const string COMMUNICATIONS_CREATE_MEETINGS = "communications.create_meetings";
    public const string COMMUNICATIONS_MANAGE_MEETINGS = "communications.manage_meetings";
    public const string COMMUNICATIONS_VIEW_MEETING_MINUTES = "communications.view_meeting_minutes";
    
    // Communications - Forum
    public const string COMMUNICATIONS_VIEW_FORUM = "communications.view_forum";
    public const string COMMUNICATIONS_POST_FORUM = "communications.post_forum";
    public const string COMMUNICATIONS_MODERATE_FORUM = "communications.moderate_forum";
    
    // Incidents
    public const string INCIDENTS_VIEW = "incidents.view";
    public const string INCIDENTS_CREATE = "incidents.create";
    public const string INCIDENTS_EDIT = "incidents.edit";
    public const string INCIDENTS_ASSIGN = "incidents.assign";
    public const string INCIDENTS_CLOSE = "incidents.close";
    public const string INCIDENTS_DELETE = "incidents.delete";
    public const string INCIDENTS_VIEW_ALL = "incidents.view_all";
    
    // Security
    public const string SECURITY_VIEW_ACCESS_LOG = "security.view_access_log";
    public const string SECURITY_MANAGE_VISITORS = "security.manage_visitors";
    public const string SECURITY_MANAGE_ACCESS_CONTROL = "security.manage_access_control";
    public const string SECURITY_VIEW_CAMERAS = "security.view_cameras";
    
    // Reservations
    public const string RESERVATIONS_VIEW = "reservations.view";
    public const string RESERVATIONS_CREATE = "reservations.create";
    public const string RESERVATIONS_EDIT = "reservations.edit";
    public const string RESERVATIONS_DELETE = "reservations.delete";
    public const string RESERVATIONS_MANAGE = "reservations.manage";
    public const string RESERVATIONS_VIEW_ALL = "reservations.view_all";

    // Common Areas (non-reservable spaces)
    public const string COMMON_AREAS_VIEW = "common_areas.view";
    public const string COMMON_AREAS_MANAGE = "common_areas.manage";

    // Condominium Maps
    public const string MAPS_VIEW = "maps.view";
    public const string MAPS_MANAGE = "maps.manage";
    
    // Settings
    public const string SETTINGS_VIEW = "settings.view";
    public const string SETTINGS_EDIT_CONDOMINIUM = "settings.edit_condominium";
    public const string SETTINGS_MANAGE_USERS = "settings.manage_users";
    public const string SETTINGS_MANAGE_ROLES = "settings.manage_roles";
    public const string SETTINGS_MANAGE_BUILDINGS = "settings.manage_buildings";
    public const string SETTINGS_MANAGE_UNITS = "settings.manage_units";
    public const string SETTINGS_MANAGE_AMENITIES = "settings.manage_amenities";
    public const string SETTINGS_MANAGE_FEE_CONFIGS = "settings.manage_fee_configs";
    
    // Reports
    public const string REPORTS_VIEW = "reports.view";
    public const string REPORTS_EXPORT = "reports.export";
    public const string REPORTS_FINANCIAL = "reports.financial";
    public const string REPORTS_OPERATIONAL = "reports.operational";
    public const string REPORTS_CUSTOM = "reports.custom";
}
