using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Constants;
using NovaResidence.Domain.Entities.Authentication;

namespace NovaResidence.Infrastructure.Persistence.Seeders;

public class PermissionSeeder
{
    private readonly IApplicationDbContext _context;

    public PermissionSeeder(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SeedAsync()
    {
        // Check if permissions already exist
        var existingCount = await _context.Permissions.CountAsync();
        if (existingCount > 0) return;

        var permissions = new List<Permission>
        {
            // Platform Admin
            Permission.Create(PermissionCodes.PLATFORM_MANAGE_CLIENTS, "Gestionar Clientes", "Platform", "Administrar condominios como clientes del sistema", true),
            Permission.Create(PermissionCodes.PLATFORM_VIEW_ALL_DATA, "Ver Todos los Datos", "Platform", "Acceso completo a todos los datos del sistema", true),
            Permission.Create(PermissionCodes.PLATFORM_MANAGE_PERMISSIONS, "Gestionar Permisos", "Platform", "Configurar permisos del sistema", true),
            Permission.Create(PermissionCodes.PLATFORM_MANAGE_ROLES, "Gestionar Roles", "Platform", "Configurar roles del sistema", true),
            Permission.Create(PermissionCodes.PLATFORM_SYSTEM_SETTINGS, "Configuración del Sistema", "Platform", "Modificar configuraciones globales", true),

            // Billing
            Permission.Create(PermissionCodes.BILLING_VIEW, "Ver Facturación", "Billing", "Ver información de cargos y pagos"),
            Permission.Create(PermissionCodes.BILLING_CREATE_CHARGES, "Crear Cargos", "Billing", "Generar nuevos cargos"),
            Permission.Create(PermissionCodes.BILLING_EDIT_CHARGES, "Editar Cargos", "Billing", "Modificar cargos existentes"),
            Permission.Create(PermissionCodes.BILLING_DELETE_CHARGES, "Eliminar Cargos", "Billing", "Eliminar cargos del sistema"),
            Permission.Create(PermissionCodes.BILLING_RECORD_PAYMENTS, "Registrar Pagos", "Billing", "Registrar pagos de residentes"),
            Permission.Create(PermissionCodes.BILLING_CANCEL_CHARGES, "Cancelar Cargos", "Billing", "Cancelar cargos generados"),
            Permission.Create(PermissionCodes.BILLING_FORGIVE_CHARGES, "Condonar Cargos", "Billing", "Condonar deudas de residentes"),
            Permission.Create(PermissionCodes.BILLING_EXPORT, "Exportar Facturación", "Billing", "Exportar reportes de facturación"),
            Permission.Create(PermissionCodes.BILLING_VIEW_ALL_UNITS, "Ver Todas las Unidades", "Billing", "Ver facturación de todas las unidades"),

            // Residents
            Permission.Create(PermissionCodes.RESIDENTS_VIEW, "Ver Residentes", "Residents", "Ver información de residentes"),
            Permission.Create(PermissionCodes.RESIDENTS_CREATE, "Crear Residentes", "Residents", "Registrar nuevos residentes"),
            Permission.Create(PermissionCodes.RESIDENTS_EDIT, "Editar Residentes", "Residents", "Modificar información de residentes"),
            Permission.Create(PermissionCodes.RESIDENTS_DELETE, "Eliminar Residentes", "Residents", "Eliminar residentes del sistema"),
            Permission.Create(PermissionCodes.RESIDENTS_REGISTER_ACCOUNTS, "Registrar Cuentas", "Residents", "Crear cuentas de usuario para residentes"),
            Permission.Create(PermissionCodes.RESIDENTS_VIEW_SENSITIVE_DATA, "Ver Datos Sensibles", "Residents", "Acceder a información personal sensible"),

            // Communications - Announcements
            Permission.Create(PermissionCodes.COMMUNICATIONS_VIEW_ANNOUNCEMENTS, "Ver Anuncios", "Communications", "Ver anuncios del condominio"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_CREATE_ANNOUNCEMENTS, "Crear Anuncios", "Communications", "Publicar nuevos anuncios"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_EDIT_ANNOUNCEMENTS, "Editar Anuncios", "Communications", "Modificar anuncios existentes"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_DELETE_ANNOUNCEMENTS, "Eliminar Anuncios", "Communications", "Eliminar anuncios"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_PUBLISH_ANNOUNCEMENTS, "Publicar Anuncios", "Communications", "Aprobar y publicar anuncios"),

            // Communications - Polls
            Permission.Create(PermissionCodes.COMMUNICATIONS_VIEW_POLLS, "Ver Encuestas", "Communications", "Ver encuestas y votaciones"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_CREATE_POLLS, "Crear Encuestas", "Communications", "Crear nuevas encuestas"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_MANAGE_POLLS, "Gestionar Encuestas", "Communications", "Administrar encuestas activas"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_VIEW_POLL_RESULTS, "Ver Resultados de Encuestas", "Communications", "Ver resultados de votaciones"),

            // Communications - Meetings
            Permission.Create(PermissionCodes.COMMUNICATIONS_VIEW_MEETINGS, "Ver Reuniones", "Communications", "Ver calendario de reuniones"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_CREATE_MEETINGS, "Crear Reuniones", "Communications", "Programar reuniones"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_MANAGE_MEETINGS, "Gestionar Reuniones", "Communications", "Administrar reuniones programadas"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_VIEW_MEETING_MINUTES, "Ver Actas", "Communications", "Ver actas de reuniones"),

            // Communications - Forum
            Permission.Create(PermissionCodes.COMMUNICATIONS_VIEW_FORUM, "Ver Foro", "Communications", "Acceder al foro comunitario"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_POST_FORUM, "Publicar en Foro", "Communications", "Crear publicaciones en el foro"),
            Permission.Create(PermissionCodes.COMMUNICATIONS_MODERATE_FORUM, "Moderar Foro", "Communications", "Moderar contenido del foro"),

            // Incidents
            Permission.Create(PermissionCodes.INCIDENTS_VIEW, "Ver Incidencias", "Incidents", "Ver reportes de incidencias"),
            Permission.Create(PermissionCodes.INCIDENTS_CREATE, "Crear Incidencias", "Incidents", "Reportar nuevas incidencias"),
            Permission.Create(PermissionCodes.INCIDENTS_EDIT, "Editar Incidencias", "Incidents", "Modificar incidencias reportadas"),
            Permission.Create(PermissionCodes.INCIDENTS_ASSIGN, "Asignar Incidencias", "Incidents", "Asignar incidencias a personal"),
            Permission.Create(PermissionCodes.INCIDENTS_CLOSE, "Cerrar Incidencias", "Incidents", "Cerrar incidencias resueltas"),
            Permission.Create(PermissionCodes.INCIDENTS_DELETE, "Eliminar Incidencias", "Incidents", "Eliminar reportes de incidencias"),
            Permission.Create(PermissionCodes.INCIDENTS_VIEW_ALL, "Ver Todas las Incidencias", "Incidents", "Ver incidencias de todo el condominio"),

            // Security
            Permission.Create(PermissionCodes.SECURITY_VIEW_ACCESS_LOG, "Ver Registro de Accesos", "Security", "Ver historial de accesos"),
            Permission.Create(PermissionCodes.SECURITY_MANAGE_VISITORS, "Gestionar Visitantes", "Security", "Administrar registro de visitantes"),
            Permission.Create(PermissionCodes.SECURITY_MANAGE_ACCESS_CONTROL, "Control de Accesos", "Security", "Configurar control de accesos"),
            Permission.Create(PermissionCodes.SECURITY_VIEW_CAMERAS, "Ver Cámaras", "Security", "Acceder a cámaras de seguridad"),

            // Reservations
            Permission.Create(PermissionCodes.RESERVATIONS_VIEW, "Ver Reservaciones", "Reservations", "Ver calendario de reservaciones"),
            Permission.Create(PermissionCodes.RESERVATIONS_CREATE, "Crear Reservaciones", "Reservations", "Realizar nuevas reservaciones"),
            Permission.Create(PermissionCodes.RESERVATIONS_EDIT, "Editar Reservaciones", "Reservations", "Modificar reservaciones existentes"),
            Permission.Create(PermissionCodes.RESERVATIONS_DELETE, "Eliminar Reservaciones", "Reservations", "Cancelar reservaciones"),
            Permission.Create(PermissionCodes.RESERVATIONS_MANAGE, "Gestionar Reservaciones", "Reservations", "Administrar sistema de reservaciones"),
            Permission.Create(PermissionCodes.RESERVATIONS_VIEW_ALL, "Ver Todas las Reservaciones", "Reservations", "Ver reservaciones de todos los residentes"),

            // Settings
            Permission.Create(PermissionCodes.SETTINGS_VIEW, "Ver Configuración", "Settings", "Ver configuraciones del condominio"),
            Permission.Create(PermissionCodes.SETTINGS_EDIT_CONDOMINIUM, "Editar Condominio", "Settings", "Modificar información del condominio"),
            Permission.Create(PermissionCodes.SETTINGS_MANAGE_USERS, "Gestionar Usuarios", "Settings", "Administrar usuarios del sistema"),
            Permission.Create(PermissionCodes.SETTINGS_MANAGE_ROLES, "Gestionar Roles", "Settings", "Configurar roles y permisos"),
            Permission.Create(PermissionCodes.SETTINGS_MANAGE_BUILDINGS, "Gestionar Edificios", "Settings", "Administrar edificios del condominio"),
            Permission.Create(PermissionCodes.SETTINGS_MANAGE_UNITS, "Gestionar Unidades", "Settings", "Administrar unidades habitacionales"),
            Permission.Create(PermissionCodes.SETTINGS_MANAGE_AMENITIES, "Gestionar Amenidades", "Settings", "Configurar amenidades y áreas comunes"),
            Permission.Create(PermissionCodes.SETTINGS_MANAGE_FEE_CONFIGS, "Gestionar Configuración de Cuotas", "Settings", "Configurar tarifas y cuotas"),

            // Reports
            Permission.Create(PermissionCodes.REPORTS_VIEW, "Ver Reportes", "Reports", "Acceder a reportes básicos"),
            Permission.Create(PermissionCodes.REPORTS_EXPORT, "Exportar Reportes", "Reports", "Exportar reportes a PDF/Excel"),
            Permission.Create(PermissionCodes.REPORTS_FINANCIAL, "Reportes Financieros", "Reports", "Acceder a reportes financieros detallados"),
            Permission.Create(PermissionCodes.REPORTS_OPERATIONAL, "Reportes Operacionales", "Reports", "Acceder a reportes operacionales"),
            Permission.Create(PermissionCodes.REPORTS_CUSTOM, "Reportes Personalizados", "Reports", "Crear reportes personalizados")
        };

        _context.Permissions.AddRange(permissions);
        await _context.SaveChangesAsync(CancellationToken.None);
    }
}
