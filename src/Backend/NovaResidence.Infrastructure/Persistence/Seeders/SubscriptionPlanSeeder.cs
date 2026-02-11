using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Subscriptions;

namespace NovaResidence.Infrastructure.Persistence.Seeders;

/// <summary>
/// Seeds the default subscription plans for the platform
/// </summary>
public class SubscriptionPlanSeeder
{
    private readonly IApplicationDbContext _context;

    public SubscriptionPlanSeeder(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SeedAsync()
    {
        if (_context.SubscriptionPlans.Any())
            return;

        var plans = new List<SubscriptionPlan>
        {
            // Básico: 1-20 units
            SubscriptionPlan.Create(
                name: "Básico",
                pricePerUnit: 49.00m,
                minUnits: 1,
                maxUnits: 20,
                trialDays: 30,
                description: "Ideal para condominios pequeños. Incluye gestión básica de unidades, residentes y cobros.",
                features: "[\"Hasta 20 unidades\",\"Gestión de residentes\",\"Cobros y pagos\",\"Incidencias básicas\",\"1 administrador\",\"Soporte por email\"]",
                displayOrder: 1,
                isRecommended: false),

            // Profesional: 21-100 units
            SubscriptionPlan.Create(
                name: "Profesional",
                pricePerUnit: 39.00m,
                minUnits: 21,
                maxUnits: 100,
                trialDays: 30,
                description: "Para condominios medianos. Incluye todas las funcionalidades con reportes avanzados.",
                features: "[\"Hasta 100 unidades\",\"Todo del plan Básico\",\"Reportes avanzados\",\"Comunicaciones y encuestas\",\"Reserva de amenidades\",\"3 administradores\",\"Soporte prioritario\"]",
                displayOrder: 2,
                isRecommended: true),

            // Empresarial: 101-500 units
            SubscriptionPlan.Create(
                name: "Empresarial",
                pricePerUnit: 29.00m,
                minUnits: 101,
                maxUnits: 500,
                trialDays: 30,
                description: "Para grandes desarrollos. Funcionalidades completas con integraciones.",
                features: "[\"Hasta 500 unidades\",\"Todo del plan Profesional\",\"Integraciones avanzadas\",\"API personalizada\",\"Multi-condominio\",\"Administradores ilimitados\",\"Soporte 24/7\",\"Capacitación incluida\"]",
                displayOrder: 3,
                isRecommended: false),
        };

        foreach (var plan in plans)
        {
            _context.SubscriptionPlans.Add(plan);
        }

        await _context.SaveChangesAsync();
    }
}
