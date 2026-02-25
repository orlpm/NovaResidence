using System.Security.Claims;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Domain.Entities.Subscriptions;
using NovaResidence.Infrastructure.Persistence;

namespace NovaResidence.Api.Middleware;

/// <summary>
/// Middleware that checks subscription status for condominium-scoped requests.
/// Blocks access when subscription is expired/suspended.
/// Returns 402 Payment Required with subscription details.
/// </summary>
public class SubscriptionValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SubscriptionValidationMiddleware> _logger;

    // Paths that are always allowed (no subscription check)
    private static readonly string[] ExemptPaths = new[]
    {
        "/api/auth",
        "/api/subscriptions",
        "/api/subscription-plans",
        "/api/condominiums",
        "/api/dashboard",
        "/health",
        "/swagger"
    };

    // Roles that bypass subscription checks (SuperAdmin manages the platform)
    private static readonly string[] ExemptRoles = new[] { "SuperAdmin", "superadmin" };

    public SubscriptionValidationMiddleware(RequestDelegate next, ILogger<SubscriptionValidationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, ApplicationDbContext dbContext)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Skip exempt paths
        if (ExemptPaths.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        // Skip if not authenticated
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            await _next(context);
            return;
        }

        // Skip for exempt roles (SuperAdmin)
        var roleClaim = context.User.FindFirst(ClaimTypes.Role)?.Value 
                     ?? context.User.FindFirst("role")?.Value;
        
        if (roleClaim != null && ExemptRoles.Contains(roleClaim, StringComparer.OrdinalIgnoreCase))
        {
            await _next(context);
            return;
        }

        // Try to get user ID from JWT claims
        var userIdStr = context.User.FindFirst("userId")?.Value 
                     ?? context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdStr) || !Guid.TryParse(userIdStr, out var userId))
        {
            // No user ID context - allow (might be a general endpoint)
            await _next(context);
            return;
        }

        // Check subscription status for this user (admin)
        var subscription = await dbContext.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.AdminUserId == userId && !s.IsDeleted)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (subscription == null)
        {
            // Check if user is an admin with condominiums — if not, they might be a resident (skip check)
            var isAdmin = await dbContext.Set<Domain.Entities.Authentication.User>()
                .Where(u => u.Id == userId)
                .AnyAsync(u => u.DefaultRole == "Admin" || u.DefaultRole == "CondominiumAdmin"
                    || u.CondominiumRoles.Any(cr => cr.Role == Domain.Enums.UserRole.CondominiumAdmin));

            if (!isAdmin)
            {
                // Not an admin — skip subscription check (residents don't need subscriptions)
                await _next(context);
                return;
            }

            // Admin without subscription — block with specific message
            await WritePaymentRequiredResponse(context, null, "No se encontró una suscripción activa. Selecciona un plan para continuar.");
            return;
        }

        // Evaluate and update status
        subscription.EvaluateStatus();
        await dbContext.SaveChangesAsync();

        if (!subscription.IsAccessGranted())
        {
            await WritePaymentRequiredResponse(context, subscription, GetBlockMessage(subscription.Status));
            return;
        }

        // Store subscription info in HttpContext for downstream use
        context.Items["SubscriptionStatus"] = subscription.Status.ToString();
        context.Items["SubscriptionEnd"] = subscription.CurrentPeriodEnd;

        await _next(context);
    }

    private static string GetBlockMessage(SubscriptionStatus status)
    {
        return status switch
        {
            SubscriptionStatus.Expired => "Tu período de prueba gratuito ha terminado. Realiza el pago para continuar usando la plataforma.",
            SubscriptionStatus.Suspended => "Tu suscripción ha sido suspendida por falta de pago. Realiza el pago pendiente para reactivar el acceso.",
            SubscriptionStatus.Cancelled => "Tu suscripción ha sido cancelada. Contacta al administrador para reactivarla.",
            SubscriptionStatus.PastDue => "Tu pago está vencido. Tienes 5 días de tolerancia antes de la suspensión del servicio.",
            _ => "Tu suscripción no está activa. Realiza el pago correspondiente."
        };
    }

    private static async Task WritePaymentRequiredResponse(HttpContext context, Subscription? subscription, string message)
    {
        context.Response.StatusCode = 402; // Payment Required
        context.Response.ContentType = "application/json";

        var response = new
        {
            Success = false,
            Message = message,
            SubscriptionStatus = subscription?.Status.ToString() ?? "None",
            PlanName = subscription?.Plan?.Name,
            MonthlyAmount = subscription?.MonthlyAmount ?? 0,
            BilledUnits = subscription?.BilledUnits ?? 0,
            CurrentPeriodEnd = subscription?.CurrentPeriodEnd,
            TrialEndDate = subscription?.TrialEndDate,
            RequiresPayment = true,
            Timestamp = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(json);
    }
}
