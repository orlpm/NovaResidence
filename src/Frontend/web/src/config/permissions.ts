// Permission codes - must match backend PermissionCodes.cs
export const PERMISSIONS = {
  // Platform Admin
  PLATFORM_MANAGE_CLIENTS: 'platform.manage_clients',
  PLATFORM_VIEW_ALL_DATA: 'platform.view_all_data',
  PLATFORM_MANAGE_PERMISSIONS: 'platform.manage_permissions',
  PLATFORM_MANAGE_ROLES: 'platform.manage_roles',
  PLATFORM_SYSTEM_SETTINGS: 'platform.system_settings',
  
  // Billing
  BILLING_VIEW: 'billing.view',
  BILLING_CREATE_CHARGES: 'billing.create_charges',
  BILLING_EDIT_CHARGES: 'billing.edit_charges',
  BILLING_DELETE_CHARGES: 'billing.delete_charges',
  BILLING_RECORD_PAYMENTS: 'billing.record_payments',
  BILLING_CANCEL_CHARGES: 'billing.cancel_charges',
  BILLING_FORGIVE_CHARGES: 'billing.forgive_charges',
  BILLING_EXPORT: 'billing.export',
  BILLING_VIEW_ALL_UNITS: 'billing.view_all_units',
  
  // Residents
  RESIDENTS_VIEW: 'residents.view',
  RESIDENTS_CREATE: 'residents.create',
  RESIDENTS_EDIT: 'residents.edit',
  RESIDENTS_DELETE: 'residents.delete',
  RESIDENTS_REGISTER_ACCOUNTS: 'residents.register_accounts',
  RESIDENTS_VIEW_SENSITIVE_DATA: 'residents.view_sensitive_data',
  
  // Communications - Announcements
  COMMUNICATIONS_VIEW_ANNOUNCEMENTS: 'communications.view_announcements',
  COMMUNICATIONS_CREATE_ANNOUNCEMENTS: 'communications.create_announcements',
  COMMUNICATIONS_EDIT_ANNOUNCEMENTS: 'communications.edit_announcements',
  COMMUNICATIONS_DELETE_ANNOUNCEMENTS: 'communications.delete_announcements',
  COMMUNICATIONS_PUBLISH_ANNOUNCEMENTS: 'communications.publish_announcements',
  
  // Communications - Polls
  COMMUNICATIONS_VIEW_POLLS: 'communications.view_polls',
  COMMUNICATIONS_CREATE_POLLS: 'communications.create_polls',
  COMMUNICATIONS_MANAGE_POLLS: 'communications.manage_polls',
  COMMUNICATIONS_VIEW_POLL_RESULTS: 'communications.view_poll_results',
  
  // Communications - Meetings
  COMMUNICATIONS_VIEW_MEETINGS: 'communications.view_meetings',
  COMMUNICATIONS_CREATE_MEETINGS: 'communications.create_meetings',
  COMMUNICATIONS_MANAGE_MEETINGS: 'communications.manage_meetings',
  COMMUNICATIONS_VIEW_MEETING_MINUTES: 'communications.view_meeting_minutes',
  
  // Communications - Forum
  COMMUNICATIONS_VIEW_FORUM: 'communications.view_forum',
  COMMUNICATIONS_POST_FORUM: 'communications.post_forum',
  COMMUNICATIONS_MODERATE_FORUM: 'communications.moderate_forum',
  
  // Incidents
  INCIDENTS_VIEW: 'incidents.view',
  INCIDENTS_CREATE: 'incidents.create',
  INCIDENTS_EDIT: 'incidents.edit',
  INCIDENTS_ASSIGN: 'incidents.assign',
  INCIDENTS_CLOSE: 'incidents.close',
  INCIDENTS_DELETE: 'incidents.delete',
  INCIDENTS_VIEW_ALL: 'incidents.view_all',
  
  // Security
  SECURITY_VIEW_ACCESS_LOG: 'security.view_access_log',
  SECURITY_MANAGE_VISITORS: 'security.manage_visitors',
  SECURITY_MANAGE_ACCESS_CONTROL: 'security.manage_access_control',
  SECURITY_VIEW_CAMERAS: 'security.view_cameras',
  
  // Reservations
  RESERVATIONS_VIEW: 'reservations.view',
  RESERVATIONS_CREATE: 'reservations.create',
  RESERVATIONS_EDIT: 'reservations.edit',
  RESERVATIONS_DELETE: 'reservations.delete',
  RESERVATIONS_MANAGE: 'reservations.manage',
  RESERVATIONS_VIEW_ALL: 'reservations.view_all',
  
  // Settings
  SETTINGS_VIEW: 'settings.view',
  SETTINGS_EDIT_CONDOMINIUM: 'settings.edit_condominium',
  SETTINGS_MANAGE_USERS: 'settings.manage_users',
  SETTINGS_MANAGE_ROLES: 'settings.manage_roles',
  SETTINGS_MANAGE_BUILDINGS: 'settings.manage_buildings',
  SETTINGS_MANAGE_UNITS: 'settings.manage_units',
  SETTINGS_MANAGE_AMENITIES: 'settings.manage_amenities',
  SETTINGS_MANAGE_FEE_CONFIGS: 'settings.manage_fee_configs',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_FINANCIAL: 'reports.financial',
  REPORTS_OPERATIONAL: 'reports.operational',
  REPORTS_CUSTOM: 'reports.custom'
} as const;

export type PermissionCode = typeof PERMISSIONS[keyof typeof PERMISSIONS];
