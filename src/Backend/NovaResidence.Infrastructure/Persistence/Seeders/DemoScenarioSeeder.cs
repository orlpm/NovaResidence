using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Authentication;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Entities.Communications;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Entities.Incidents;
using NovaResidence.Domain.Entities.Notifications;
using NovaResidence.Domain.Entities.Procedures;
using NovaResidence.Domain.Entities.Subscriptions;
using NovaResidence.Domain.Entities.Maps;
using NovaResidence.Domain.Entities.Visits;
using NovaResidence.Domain.Enums;
using NovaResidence.Domain.ValueObjects;
using AmenityEntity = NovaResidence.Domain.Entities.Condominiums.Amenity;
using BillingPayment = NovaResidence.Domain.Entities.Billing.Payment;
using IncidentEntity = NovaResidence.Domain.Entities.Incidents.Incident;

namespace NovaResidence.Infrastructure.Persistence.Seeders;

/// <summary>
/// Seeds a complete demo condominium with every operational role.
/// Development only. Idempotent: skips if admin@novaresidence.com already exists.
/// Shared password for all demo accounts: Pass123.
/// </summary>
public class DemoScenarioSeeder
{
    public const string SharedPassword = "Pass123.";
    public const string AdminEmail = "admin@novaresidence.com";
    public const string CondominiumName = "Residencial Pedregal Demo";

    private readonly ApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly ILogger<DemoScenarioSeeder> _logger;

    public DemoScenarioSeeder(
        ApplicationDbContext context,
        IPasswordHasher passwordHasher,
        ILogger<DemoScenarioSeeder> logger)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _logger = logger;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        if (await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == AdminEmail, cancellationToken))
        {
            _logger.LogInformation("Demo scenario already exists ({Email}). Skipping.", AdminEmail);
            return;
        }

        var mexico = await _context.GeoCountries.FirstOrDefaultAsync(c => c.Code == "MX", cancellationToken);
        var cdmx = mexico == null
            ? null
            : await _context.GeoStates.FirstOrDefaultAsync(s => s.CountryId == mexico.Id && s.Code == "CMX", cancellationToken);
        var plan = await _context.SubscriptionPlans
            .OrderBy(p => p.DisplayOrder)
            .FirstOrDefaultAsync(cancellationToken)
            ?? throw new InvalidOperationException("No hay planes de suscripción para sembrar el escenario demo.");

        var passwordHash = _passwordHasher.HashPassword(SharedPassword);

        var superAdmin = await EnsureUserAsync(
            "superadmin@novaresidence.com", passwordHash, "Super", "Admin", "5510000001", "superadmin", cancellationToken);
        var admin = CreateConfirmedUser("admin@novaresidence.com", passwordHash, "Elena", "Vargas", "5510000002", "admin");
        var subAdmin = CreateConfirmedUser("subadmin@novaresidence.com", passwordHash, "Diego", "Soto", "5510000003", "SubAdmin");
        var accountant = CreateConfirmedUser("accountant@novaresidence.com", passwordHash, "Patricia", "León", "5510000004", "accountant");
        var residentOwner = CreateConfirmedUser("resident@novaresidence.com", passwordHash, "Javier", "Morales", "5510000005", "Resident");
        var residentMoroso = CreateConfirmedUser("resident2@novaresidence.com", passwordHash, "Carla", "Méndez", "5510000006", "Resident");
        var tenant = CreateConfirmedUser("tenant@novaresidence.com", passwordHash, "Luis", "Ortega", "5510000007", "Resident");
        var security = CreateConfirmedUser("security@novaresidence.com", passwordHash, "Roberto", "Cruz", "5510000008", "SecurityGuard");
        var maintenance = CreateConfirmedUser("maintenance@novaresidence.com", passwordHash, "Miguel", "Ruiz", "5510000009", "Maintenance");
        var cleaning = CreateConfirmedUser("cleaning@novaresidence.com", passwordHash, "Rosa", "Hernández", "5510000010", "Cleaning");
        var provider = CreateConfirmedUser("provider@novaresidence.com", passwordHash, "Jardines", "del Sur", "5510000011", "Provider");

        _context.Users.AddRange(admin, subAdmin, accountant, residentOwner, residentMoroso, tenant, security, maintenance, cleaning, provider);
        await _context.SaveChangesAsync(cancellationToken);

        var address = Address.Create(
            "Av. del Pedregal", "Ciudad de México", "Ciudad de México", "01900", "México",
            exteriorNumber: "240", neighborhood: "Jardines del Pedregal");

        var condominium = Condominium.Create(
            CondominiumName,
            address,
            plan.Id,
            "Condominio demo con operación completa para recorridos de producto.",
            taxId: "RPD240101ABC",
            legalName: "Residencial Pedregal Demo A.C.",
            countryId: mexico?.Id,
            stateId: cdmx?.Id);
        _context.Condominiums.Add(condominium);
        await _context.SaveChangesAsync(cancellationToken);

        admin.AddCondominiumRole(condominium.Id, UserRole.CondominiumAdmin);
        subAdmin.AddCondominiumRole(condominium.Id, UserRole.SubAdmin);
        accountant.AddCondominiumRole(condominium.Id, UserRole.Accountant);
        residentOwner.AddCondominiumRole(condominium.Id, UserRole.Owner);
        residentMoroso.AddCondominiumRole(condominium.Id, UserRole.Owner);
        tenant.AddCondominiumRole(condominium.Id, UserRole.Tenant);
        security.AddCondominiumRole(condominium.Id, UserRole.SecurityGuard);
        maintenance.AddCondominiumRole(condominium.Id, UserRole.Maintenance);
        cleaning.AddCondominiumRole(condominium.Id, UserRole.Cleaning);
        provider.AddCondominiumRole(condominium.Id, UserRole.ServiceProvider);

        var torreA = Building.Create(condominium.Id, "Torre A", 3, "Torre residencial principal", startsAtGroundFloor: false);
        var torreB = Building.Create(condominium.Id, "Torre B", 2, "Torre secundaria", startsAtGroundFloor: false);
        _context.Buildings.AddRange(torreA, torreB);
        await _context.SaveChangesAsync(cancellationToken);

        var unitA101 = Unit.Create(torreA.Id, "A-101", 1, 92, 2, 2, 1850);
        var unitA102 = Unit.Create(torreA.Id, "A-102", 1, 88, 2, 2, 1750);
        var unitA201 = Unit.Create(torreA.Id, "A-201", 2, 110, 3, 2, 2200);
        var unitA301 = Unit.Create(torreA.Id, "A-301", 3, 95, 2, 2, 1900);
        var unitB101 = Unit.Create(torreB.Id, "B-101", 1, 80, 2, 1, 1500);
        var unitB102 = Unit.Create(torreB.Id, "B-102", 1, 80, 2, 1, 1500);
        var unitB201 = Unit.Create(torreB.Id, "B-201", 2, 120, 3, 2, 2400);
        _context.Units.AddRange(unitA101, unitA102, unitA201, unitA301, unitB101, unitB102, unitB201);
        await _context.SaveChangesAsync(cancellationToken);

        unitA101.AssignOwner(residentOwner.Id);
        unitA102.AssignOwner(residentMoroso.Id);
        unitA201.AssignOwner(residentOwner.Id);
        unitA201.AssignTenant(tenant.Id);

        var resJavier = Resident.Create(unitA101.Id, "Javier", "Morales", residentOwner.Email, "5510000005", ResidentType.Owner);
        resJavier.MarkAsRegistered(residentOwner.Id);
        var resCarla = Resident.Create(unitA102.Id, "Carla", "Méndez", residentMoroso.Email, "5510000006", ResidentType.Owner);
        resCarla.MarkAsRegistered(residentMoroso.Id);
        var resLuis = Resident.Create(unitA201.Id, "Luis", "Ortega", tenant.Email, "5510000007", ResidentType.Tenant);
        resLuis.MarkAsRegistered(tenant.Id);
        var resSofia = Resident.Create(unitA101.Id, "Sofía", "Morales", "sofia.morales.demo@novaresidence.com", "5510000012", ResidentType.FamilyMember);
        var resAna = Resident.Create(unitB101.Id, "Ana", "Delgado", "ana.delgado.demo@novaresidence.com", "5510000013", ResidentType.Owner);
        _context.Residents.AddRange(resJavier, resCarla, resLuis, resSofia, resAna);
        await _context.SaveChangesAsync(cancellationToken);

        var billedUnits = 7;
        var monthlyAmount = plan.PricePerUnit * billedUnits;
        var subscription = Subscription.Create(admin.Id, plan.Id, billedUnits, monthlyAmount, trialDays: 0);
        _context.Subscriptions.Add(subscription);

        _context.FeeConfigurations.Add(FeeConfiguration.Create(
            condominium.Id,
            "Cuota de mantenimiento",
            FeeType.MonthlyMaintenance,
            1850,
            description: "Cuota mensual ordinaria del condominio demo."));

        var now = DateTime.UtcNow;
        var periodMonth = now.Month;
        var periodYear = now.Year;

        var chargePaid = Charge.Create(condominium.Id, unitA101.Id, "Mantenimiento " + now.ToString("MMMM yyyy"), FeeType.MonthlyMaintenance, 1850, now.AddDays(10), periodMonth, periodYear, resJavier.Id, "Cuota al corriente");
        var chargeOverdue = Charge.Create(condominium.Id, unitA102.Id, "Mantenimiento vencido", FeeType.MonthlyMaintenance, 1750, now.AddDays(-20), previousMonth(now).month, previousMonth(now).year, resCarla.Id, "Adeudo del mes anterior");
        chargeOverdue.MarkAsOverdue();
        var chargePartial = Charge.Create(condominium.Id, unitA201.Id, "Mantenimiento " + now.ToString("MMMM yyyy"), FeeType.MonthlyMaintenance, 2200, now.AddDays(8), periodMonth, periodYear, resLuis.Id, "Pago parcial registrado");
        var chargeFine = Charge.Create(condominium.Id, unitA102.Id, "Multa por ruido", FeeType.Fine, 500, now.AddDays(5), periodMonth, periodYear, resCarla.Id, "Reporte de ruido fuera de horario");
        var chargeOpen = Charge.Create(condominium.Id, unitB101.Id, "Mantenimiento " + now.ToString("MMMM yyyy"), FeeType.MonthlyMaintenance, 1500, now.AddDays(12), periodMonth, periodYear, resAna.Id);
        _context.Charges.AddRange(chargePaid, chargeOverdue, chargePartial, chargeFine, chargeOpen);
        await _context.SaveChangesAsync(cancellationToken);

        var paymentFull = BillingPayment.Create(chargePaid.Id, 1850, PaymentMethod.SPEI, now.AddDays(-2), accountant.Id, "SPEI-PEDREGAL-101", "Pago puntual de Javier");
        paymentFull.Verify(accountant.Id);
        chargePaid.ApplyPayment(paymentFull);
        _context.Payments.Add(paymentFull);

        var paymentPartial = BillingPayment.Create(chargePartial.Id, 800, PaymentMethod.BankTransfer, now.AddDays(-1), accountant.Id, "TRF-201", "Abono de Luis");
        paymentPartial.Verify(accountant.Id);
        chargePartial.ApplyPayment(paymentPartial);
        _context.Payments.Add(paymentPartial);

        var pool = AmenityEntity.Create(condominium.Id, "Alberca", "Alberca semi-olímpica con horario diurno.", AmenityType.Pool, 20, true, false, TimeSpan.FromHours(7), TimeSpan.FromHours(21), 0);
        var salon = AmenityEntity.Create(condominium.Id, "Salón de eventos", "Salón para fiestas y asambleas.", AmenityType.PartyRoom, 40, true, true, TimeSpan.FromHours(9), TimeSpan.FromHours(23), 1500);
        var gym = AmenityEntity.Create(condominium.Id, "Gimnasio", "Gimnasio con máquinas cardiovasculares.", AmenityType.Gym, 12, false, false, TimeSpan.FromHours(6), TimeSpan.FromHours(22));
        _context.Amenities.AddRange(pool, salon, gym);
        await _context.SaveChangesAsync(cancellationToken);

        var reservationConfirmed = Reservation.Create(pool.Id, unitA101.Id, residentOwner.Id, tomorrowAt(10), tomorrowAt(12), 4, requiresApproval: false, notes: "Uso familiar de Javier");
        var reservationPending = Reservation.Create(salon.Id, unitA102.Id, residentMoroso.Id, tomorrowAt(18), tomorrowAt(22), 25, requiresApproval: true, fee: 1500, notes: "Cumpleaños, pendiente de autorización");
        _context.Reservations.AddRange(reservationConfirmed, reservationPending);

        var leak = IncidentEntity.Create(condominium.Id, residentOwner.Id, "Fuga en estacionamiento Torre A", "Hay una fuga visible cerca de los cajones 4 y 5.", IncidentType.Plumbing, NovaResidence.Domain.Enums.IncidentPriority.High, unitA101.Id, "Estacionamiento Torre A");
        leak.AssignTo(maintenance.Id, now.AddDays(2));
        var noise = IncidentEntity.Create(condominium.Id, residentMoroso.Id, "Ruido en pasillo", "Música alta después de las 23:00.", IncidentType.Noise, NovaResidence.Domain.Enums.IncidentPriority.Medium, unitA102.Id, "Pasillo 1er piso Torre A");
        var lighting = IncidentEntity.Create(condominium.Id, tenant.Id, "Luminaria fundida en lobby", "El lobby de Torre A quedó a media luz.", IncidentType.Electrical, NovaResidence.Domain.Enums.IncidentPriority.Low, location: "Lobby Torre A");
        lighting.AssignTo(maintenance.Id, now.AddDays(-1));
        lighting.Resolve(maintenance.Id, "Se reemplazó la luminaria del lobby.", 350);
        lighting.Close();
        _context.Incidents.AddRange(leak, noise, lighting);

        var visitToday = Visit.Create(
            condominium.Id, unitA101.Id, residentOwner.Id, "Mariana Gómez", VisitType.Personal,
            now.AddHours(3), now.AddHours(6), "INE-DEMO-001", "5511112233", visitorCount: 1, purpose: "Visita familiar programada");
        var delivery = Visit.Create(
            condominium.Id, unitA201.Id, tenant.Id, "Paquetería Estafeta", VisitType.Delivery,
            now.AddHours(5), null, visitorPhone: "5588887777", visitorCount: 1, purpose: "Entrega de paquete");
        _context.Visits.AddRange(visitToday, delivery);

        var announcement = Announcement.Create(
            condominium.Id,
            "Corte de agua el sábado",
            "Habrá corte de agua de 8:00 a 13:00 por mantenimiento de cisterna. Llenen tinacos.",
            AnnouncementType.Maintenance,
            AnnouncementPriority.High,
            now.AddDays(7));
        announcement.Publish();
        _context.Announcements.Add(announcement);

        var poll = Poll.Create(
            condominium.Id,
            "Horario de alberca en verano",
            "¿Quieren extender el horario de alberca hasta las 22:00?",
            PollType.SingleChoice,
            now.AddDays(-1),
            now.AddDays(10));
        poll.AddOption(PollOption.Create(poll.Id, "Sí, extender horario", 1));
        poll.AddOption(PollOption.Create(poll.Id, "No, dejarlo igual", 2));
        poll.Publish();
        _context.Polls.Add(poll);
        _context.PollOptions.AddRange(poll.Options);

        _context.Meetings.Add(Meeting.Create(
            condominium.Id,
            "Asamblea ordinaria de agosto",
            "Revisión de estados de cuenta, incidencias abiertas y reglamento de amenidades.",
            MeetingType.OrdinaryAssembly,
            now.AddDays(12).Date.AddHours(19),
            "Salón de eventos",
            agenda: "1. Lista de asistencia\n2. Estados de cuenta\n3. Amenidades\n4. Asuntos generales"));

        _context.ForumPosts.Add(ForumPost.Create(
            condominium.Id,
            residentOwner.Id,
            unitA101.Id,
            "Javier Morales",
            "¿Recomiendan plomero de confianza?",
            "Tengo una llave que gotea en A-101. ¿Alguien tiene referencia dentro del condómino?",
            ForumCategory.Recommendations));

        var waterProcedure = await _context.ProcedureTemplates
            .Where(t => t.IsActive)
            .OrderBy(t => t.Name)
            .FirstOrDefaultAsync(cancellationToken);
        _context.ResidentProcedures.Add(ResidentProcedure.Create(
            condominium.Id,
            resJavier.Id,
            admin.Id,
            ProcedureType.Water,
            "Cambio de titular de agua",
            "Entregar identificacion y contrato de compraventa en administración.",
            "INE vigente y comprobante de domicilio",
            now.AddDays(15),
            true,
            waterProcedure?.Id));

        _context.Notifications.AddRange(
            Notification.Create(condominium.Id, residentOwner.Id, NotificationType.Announcement, "Nuevo aviso", "Corte de agua el sábado", NotificationPriority.High, unitA101.Id, "Announcement", announcement.Id, "/resident/announcements"),
            Notification.Create(condominium.Id, residentMoroso.Id, NotificationType.PaymentReminder, "Adeudo pendiente", "Tienes un mantenimiento vencido en A-102.", NotificationPriority.Urgent, unitA102.Id, "Charge", chargeOverdue.Id, "/resident/payments"),
            Notification.Create(condominium.Id, admin.Id, NotificationType.IncidentUpdate, "Incidencia asignada", "Fuga en estacionamiento Torre A", NotificationPriority.High, relatedEntityType: "Incident", relatedEntityId: leak.Id, actionUrl: "/admin/incidents"));

        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Demo scenario seeded: {Condo}. Logins: superadmin/admin/subadmin/accountant/resident/resident2/tenant/security/maintenance/cleaning/provider @novaresidence.com password {Password}",
            CondominiumName,
            SharedPassword);
        _ = superAdmin;
        await EnsureShowcaseAsync(cancellationToken);
    }

    public async Task EnsureShowcaseAsync(CancellationToken cancellationToken = default)
    {
        var condominium = await _context.Condominiums
            .FirstOrDefaultAsync(item => item.Name == CondominiumName, cancellationToken);
        if (condominium == null)
            return;

        if (!await _context.CondominiumCommonAreas.AnyAsync(area => area.CondominiumId == condominium.Id && area.Name == "Jardín central", cancellationToken))
        {
            _context.CondominiumCommonAreas.AddRange(
                CondominiumCommonArea.Create(condominium.Id, "Jardín central", CommonAreaType.Garden, "Jardín principal del Residencial Pedregal.", level: "PB"),
                CondominiumCommonArea.Create(condominium.Id, "Lobby principal", CommonAreaType.Lobby, "Acceso y recepción de Torre A.", level: "PB"),
                CondominiumCommonArea.Create(condominium.Id, "Estacionamiento visitantes", CommonAreaType.SharedParking, "Cajones de cortesía frente a la caseta.", level: "Sótano"));
        }

        if (!await _context.CondominiumMaps.AnyAsync(map => map.CondominiumId == condominium.Id && map.Name == "Plano general Pedregal", cancellationToken))
        {
            var map = CondominiumMap.Create(
                condominium.Id,
                "Plano general Pedregal",
                MapScopeType.CustomGroup,
                "Condominio",
                "Plano de recorrido con la cámara del lobby.",
                "https://example.com/plano-pedregal.png");
            _context.CondominiumMaps.Add(map);
            _context.CondominiumMapMarkers.Add(CondominiumMapMarker.Create(
                map.Id,
                "Cámara lobby Pedregal",
                CondominiumMarkerType.Generic,
                48,
                32,
                "#0284c7",
                "cctv",
                true,
                tooltip: "Cámara del lobby principal",
                externalReference: "https://example.com/pedregal-lobby"));
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<User> EnsureUserAsync(
        string email,
        string passwordHash,
        string firstName,
        string lastName,
        string phone,
        string role,
        CancellationToken cancellationToken)
    {
        var existing = await _context.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (existing != null)
        {
            if (!existing.IsEmailConfirmed)
            {
                existing.ConfirmEmail();
            }

            return existing;
        }

        var user = CreateConfirmedUser(email, passwordHash, firstName, lastName, phone, role);
        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);
        return user;
    }

    private static User CreateConfirmedUser(string email, string passwordHash, string firstName, string lastName, string phone, string role)
    {
        var user = User.Create(email, passwordHash, firstName, lastName, phone, role);
        user.ConfirmEmail();
        return user;
    }

    private static (int month, int year) previousMonth(DateTime now)
    {
        var previous = now.AddMonths(-1);
        return (previous.Month, previous.Year);
    }

    private static DateTime tomorrowAt(int hour)
    {
        return DateTime.UtcNow.Date.AddDays(1).AddHours(hour);
    }
}
