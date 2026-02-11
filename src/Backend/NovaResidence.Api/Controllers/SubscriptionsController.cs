using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Domain.Entities.Subscriptions;
using NovaResidence.Infrastructure.Persistence;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubscriptionPlansController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public SubscriptionPlansController(ApplicationDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Get all active subscription plans (public endpoint for pricing page)
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlans()
    {
        var plans = await _context.SubscriptionPlans
            .Where(p => p.IsActive && !p.IsCustom)
            .OrderBy(p => p.DisplayOrder)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Description,
                p.PricePerUnit,
                p.MinUnits,
                p.MaxUnits,
                p.TrialDays,
                p.IsCustom,
                p.FixedMonthlyPrice,
                p.Features,
                p.DisplayOrder,
                p.IsRecommended
            })
            .ToListAsync();

        return Ok(plans);
    }

    /// <summary>
    /// Get a specific plan
    /// </summary>
    [HttpGet("{id:guid}")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPlan(Guid id)
    {
        var plan = await _context.SubscriptionPlans
            .Where(p => p.Id == id)
            .Select(p => new
            {
                p.Id,
                p.Name,
                p.Description,
                p.PricePerUnit,
                p.MinUnits,
                p.MaxUnits,
                p.TrialDays,
                p.IsCustom,
                p.FixedMonthlyPrice,
                p.Features,
                p.DisplayOrder,
                p.IsRecommended
            })
            .FirstOrDefaultAsync();

        if (plan == null)
            return NotFound(new { Message = "Plan no encontrado" });

        return Ok(plan);
    }

    /// <summary>
    /// Calculate price for a given number of units
    /// </summary>
    [HttpGet("calculate")]
    [AllowAnonymous]
    public async Task<IActionResult> CalculatePrice([FromQuery] int units)
    {
        if (units <= 0)
            return BadRequest(new { Message = "El número de unidades debe ser mayor a 0" });

        var plans = await _context.SubscriptionPlans
            .Where(p => p.IsActive && !p.IsCustom)
            .OrderBy(p => p.DisplayOrder)
            .ToListAsync();

        var result = plans.Select(p => new
        {
            PlanId = p.Id,
            PlanName = p.Name,
            PricePerUnit = p.PricePerUnit,
            MonthlyTotal = p.CalculateMonthlyPrice(units),
            AnnualTotal = p.CalculateMonthlyPrice(units) * 12,
            IsEligible = units >= p.MinUnits && (p.MaxUnits == null || units <= p.MaxUnits),
            p.IsRecommended
        });

        return Ok(result);
    }

    /// <summary>
    /// SuperAdmin: Create a new plan
    /// </summary>
    [HttpPost]
    [Authorize]
    public async Task<IActionResult> CreatePlan([FromBody] CreatePlanRequest request)
    {
        var plan = request.IsCustom
            ? SubscriptionPlan.CreateCustom(request.Name, request.FixedMonthlyPrice ?? 0, request.Description, request.Features)
            : SubscriptionPlan.Create(
                request.Name, request.PricePerUnit, request.MinUnits, request.MaxUnits,
                request.TrialDays, request.Description, request.Features,
                request.DisplayOrder, request.IsRecommended);

        _context.SubscriptionPlans.Add(plan);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetPlan), new { id = plan.Id }, new { plan.Id, plan.Name });
    }

    /// <summary>
    /// SuperAdmin: Update a plan
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize]
    public async Task<IActionResult> UpdatePlan(Guid id, [FromBody] UpdatePlanRequest request)
    {
        var plan = await _context.SubscriptionPlans.FindAsync(id);
        if (plan == null)
            return NotFound(new { Message = "Plan no encontrado" });

        plan.Update(request.Name, request.Description, request.PricePerUnit,
            request.MinUnits, request.MaxUnits, request.TrialDays, request.Features,
            request.DisplayOrder, request.IsRecommended);

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Plan actualizado exitosamente" });
    }

    /// <summary>
    /// SuperAdmin: Toggle plan active status
    /// </summary>
    [HttpPost("{id:guid}/toggle-status")]
    [Authorize]
    public async Task<IActionResult> ToggleStatus(Guid id)
    {
        var plan = await _context.SubscriptionPlans.FindAsync(id);
        if (plan == null)
            return NotFound(new { Message = "Plan no encontrado" });

        if (plan.IsActive)
            plan.Deactivate();
        else
            plan.Activate();

        await _context.SaveChangesAsync();

        return Ok(new { Message = plan.IsActive ? "Plan activado" : "Plan desactivado", IsActive = plan.IsActive });
    }
}

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubscriptionsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SubscriptionsController> _logger;

    public SubscriptionsController(ApplicationDbContext context, ILogger<SubscriptionsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get subscription status for an admin user (by their userId)
    /// </summary>
    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetSubscriptionByUser(Guid userId)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.AdminUser)
            .Include(s => s.Payments.OrderByDescending(p => p.PaymentDate).Take(5))
            .Where(s => s.AdminUserId == userId && s.Status != SubscriptionStatus.Cancelled)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (subscription == null)
            return NotFound(new { Message = "No se encontró suscripción para este usuario" });

        // Evaluate and update status
        subscription.EvaluateStatus();
        await _context.SaveChangesAsync();

        // Get admin's condominium IDs and count total units
        var adminCondoIds = await _context.Set<Domain.Entities.Authentication.User>()
            .Where(u => u.Id == userId)
            .SelectMany(u => u.CondominiumRoles)
            .Select(cr => cr.CondominiumId)
            .ToListAsync();

        var totalUnits = await _context.Units
            .Where(u => _context.Buildings
                .Where(b => adminCondoIds.Contains(b.CondominiumId))
                .Select(b => b.Id)
                .Contains(u.BuildingId))
            .CountAsync();

        // Get condominiums info
        var condominiums = await _context.Condominiums
            .Where(c => adminCondoIds.Contains(c.Id))
            .Select(c => new { c.Id, c.Name })
            .ToListAsync();

        return Ok(new
        {
            subscription.Id,
            subscription.AdminUserId,
            AdminName = $"{subscription.AdminUser.FirstName} {subscription.AdminUser.LastName}",
            AdminEmail = subscription.AdminUser.Email,
            subscription.Status,
            StatusText = GetStatusText(subscription.Status),
            IsAccessGranted = subscription.IsAccessGranted(),
            Plan = new
            {
                subscription.Plan.Id,
                subscription.Plan.Name,
                subscription.Plan.PricePerUnit,
                subscription.Plan.IsCustom,
                subscription.Plan.FixedMonthlyPrice
            },
            subscription.StartDate,
            subscription.TrialEndDate,
            subscription.CurrentPeriodStart,
            subscription.CurrentPeriodEnd,
            subscription.BilledUnits,
            CurrentUnits = totalUnits,
            subscription.MonthlyAmount,
            subscription.LastPaymentDate,
            subscription.GracePeriodDays,
            DaysRemaining = GetDaysRemaining(subscription),
            Condominiums = condominiums,
            CondominiumCount = condominiums.Count,
            RecentPayments = subscription.Payments.Select(p => new
            {
                p.Id,
                p.Amount,
                p.MonthsPaid,
                p.PaymentMethod,
                p.ReferenceNumber,
                p.PaymentDate,
                p.IsVerified,
                p.ProofUrl
            })
        });
    }

    /// <summary>
    /// Get subscription for the currently logged-in admin (uses JWT claims)
    /// </summary>
    [HttpGet("my")]
    public async Task<IActionResult> GetMySubscription()
    {
        var userIdClaim = User.FindFirst("userId")?.Value 
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            return Unauthorized(new { Message = "No se pudo identificar al usuario" });

        return await GetSubscriptionByUser(userId);
    }

    /// <summary>
    /// Create a subscription for an admin user (usually done during onboarding)
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateSubscription([FromBody] CreateSubscriptionRequest request)
    {
        // SuperAdmins manage the SaaS — they don't need subscriptions
        var targetUser = await _context.Set<Domain.Entities.Authentication.User>()
            .FirstOrDefaultAsync(u => u.Id == request.AdminUserId);
        if (targetUser == null)
            return NotFound(new { Message = "Usuario no encontrado" });
        if (targetUser.DefaultRole?.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) == true)
            return BadRequest(new { Message = "Los SuperAdministradores gestionan la plataforma y no requieren suscripción" });

        // Check if admin user already has an active subscription
        var existing = await _context.Subscriptions
            .Where(s => s.AdminUserId == request.AdminUserId 
                    && s.Status != SubscriptionStatus.Cancelled
                    && s.Status != SubscriptionStatus.Expired)
            .FirstOrDefaultAsync();

        if (existing != null)
            return Conflict(new { Message = "Este administrador ya tiene una suscripción activa" });

        var plan = await _context.SubscriptionPlans.FindAsync(request.PlanId);
        if (plan == null)
            return NotFound(new { Message = "Plan no encontrado" });

        // Count total units across all admin's condominiums
        var adminCondoIds = await _context.Set<Domain.Entities.Authentication.User>()
            .Where(u => u.Id == request.AdminUserId)
            .SelectMany(u => u.CondominiumRoles)
            .Select(cr => cr.CondominiumId)
            .ToListAsync();

        var totalUnits = request.UnitCount > 0 
            ? request.UnitCount 
            : Math.Max(1, await _context.Units
                .Where(u => _context.Buildings
                    .Where(b => adminCondoIds.Contains(b.CondominiumId))
                    .Select(b => b.Id)
                    .Contains(u.BuildingId))
                .CountAsync());

        var monthlyAmount = plan.CalculateMonthlyPrice(totalUnits);

        var subscription = Subscription.Create(
            request.AdminUserId,
            request.PlanId,
            totalUnits,
            monthlyAmount,
            plan.TrialDays);

        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Subscription created for admin {AdminUserId} with plan {PlanName} ({MonthlyAmount}/mo), {Units} units",
            request.AdminUserId, plan.Name, monthlyAmount, totalUnits);

        return CreatedAtAction(nameof(GetSubscriptionByUser), 
            new { userId = request.AdminUserId }, 
            new { subscription.Id, subscription.Status, subscription.MonthlyAmount, subscription.CurrentPeriodEnd });
    }

    /// <summary>
    /// Register a payment for a subscription
    /// </summary>
    [HttpPost("{subscriptionId:guid}/payments")]
    public async Task<IActionResult> RegisterPayment(Guid subscriptionId, [FromBody] RegisterPaymentRequest request)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);

        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        var payment = SubscriptionPayment.Create(
            subscriptionId,
            request.Amount,
            request.MonthsPaid,
            request.PaymentMethod,
            request.PaymentDate ?? DateTime.UtcNow,
            request.ReferenceNumber,
            request.Notes,
            request.ProofUrl);

        subscription.RecordPayment(payment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Payment of {Amount} registered for subscription {SubscriptionId}. New period end: {PeriodEnd}",
            request.Amount, subscriptionId, subscription.CurrentPeriodEnd);

        return Ok(new
        {
            Message = "Pago registrado exitosamente",
            PaymentId = payment.Id,
            NewStatus = subscription.Status.ToString(),
            subscription.CurrentPeriodEnd,
            subscription.MonthlyAmount
        });
    }

    /// <summary>
    /// Get subscription status check (lightweight endpoint for frontend polling)
    /// </summary>
    [HttpGet("status/{userId:guid}")]
    public async Task<IActionResult> GetStatus(Guid userId)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .Where(s => s.AdminUserId == userId)
            .OrderByDescending(s => s.CreatedAt)
            .FirstOrDefaultAsync();

        if (subscription == null)
        {
            return Ok(new
            {
                HasSubscription = false,
                IsAccessGranted = false,
                Status = "None",
                Message = "Sin suscripción"
            });
        }

        subscription.EvaluateStatus();
        await _context.SaveChangesAsync();

        return Ok(new
        {
            HasSubscription = true,
            IsAccessGranted = subscription.IsAccessGranted(),
            Status = subscription.Status.ToString(),
            StatusText = GetStatusText(subscription.Status),
            subscription.MonthlyAmount,
            subscription.BilledUnits,
            DaysRemaining = GetDaysRemaining(subscription),
            PlanName = subscription.Plan?.Name,
            subscription.CurrentPeriodEnd,
            subscription.TrialEndDate
        });
    }

    /// <summary>
    /// SuperAdmin: Get all subscriptions with filters (user-based)
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllSubscriptions(
        [FromQuery] SubscriptionStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var query = _context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.AdminUser)
            .Where(s => s.AdminUser.DefaultRole != "SuperAdmin") // SuperAdmins don't have subscriptions
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(s => s.Status == status.Value);

        var total = await query.CountAsync();

        var subscriptions = await query
            .OrderByDescending(s => s.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(s => new
            {
                s.Id,
                s.AdminUserId,
                AdminName = s.AdminUser.FirstName + " " + s.AdminUser.LastName,
                AdminEmail = s.AdminUser.Email,
                CondominiumCount = s.AdminUser.CondominiumRoles.Count(),
                s.Status,
                StatusText = s.Status.ToString(),
                PlanName = s.Plan.Name,
                PlanPricePerUnit = s.Plan.PricePerUnit,
                s.MonthlyAmount,
                s.BilledUnits,
                s.StartDate,
                s.TrialEndDate,
                s.CurrentPeriodStart,
                s.CurrentPeriodEnd,
                s.LastPaymentDate,
                s.GracePeriodDays,
                IsAccessGranted = s.IsAccessGranted(),
                PaymentMethod = s.Payments.OrderByDescending(p => p.PaymentDate).Select(p => p.PaymentMethod).FirstOrDefault(),
                TotalPayments = s.Payments.Count()
            })
            .ToListAsync();

        // Calculate days remaining in C#
        var result = subscriptions.Select(s => new
        {
            s.Id,
            s.AdminUserId,
            s.AdminName,
            s.AdminEmail,
            s.CondominiumCount,
            s.Status,
            s.StatusText,
            s.PlanName,
            s.PlanPricePerUnit,
            s.MonthlyAmount,
            s.BilledUnits,
            s.StartDate,
            s.TrialEndDate,
            s.CurrentPeriodStart,
            s.CurrentPeriodEnd,
            s.LastPaymentDate,
            s.GracePeriodDays,
            s.IsAccessGranted,
            s.PaymentMethod,
            s.TotalPayments,
            DaysRemaining = Math.Max(0, (int)(((s.Status.ToString() == "Trial" && s.TrialEndDate.HasValue)
                ? s.TrialEndDate.Value : s.CurrentPeriodEnd) - DateTime.UtcNow).TotalDays)
        }).ToList();

        return Ok(new { Total = total, Page = page, PageSize = pageSize, Data = result });
    }

    /// <summary>
    /// SuperAdmin: Create subscriptions for all Admin users that don't have one.
    /// Calculates total units across all their condominiums and assigns the best-fit plan.
    /// </summary>
    [HttpPost("seed-missing")]
    public async Task<IActionResult> SeedMissingSubscriptions()
    {
        // Get all admin user IDs that already have a subscription
        var userIdsWithSub = await _context.Subscriptions
            .Select(s => s.AdminUserId)
            .Distinct()
            .ToListAsync();

        // Find all users with Admin/CondominiumAdmin roles who DON'T have a subscription
        // Exclude SuperAdmins — they manage the SaaS and don't need subscriptions
        var adminUsers = await _context.Set<Domain.Entities.Authentication.User>()
            .Where(u => u.IsActive && !u.IsDeleted)
            .Where(u => u.DefaultRole != "SuperAdmin") // SuperAdmins don't need subscriptions
            .Where(u => u.CondominiumRoles.Any()) // has at least one condominium
            .Where(u => !userIdsWithSub.Contains(u.Id))
            .Where(u => u.DefaultRole == "Admin" || u.DefaultRole == "CondominiumAdmin"
                || u.CondominiumRoles.Any(cr => cr.Role == Domain.Enums.UserRole.CondominiumAdmin))
            .Select(u => new
            {
                u.Id,
                u.FirstName,
                u.LastName,
                u.Email,
                CondominiumIds = u.CondominiumRoles.Select(cr => cr.CondominiumId).ToList()
            })
            .ToListAsync();

        if (!adminUsers.Any())
            return Ok(new { Message = "Todos los administradores ya tienen suscripción", Created = 0 });

        // Get active plans ordered by MinUnits
        var plans = await _context.SubscriptionPlans
            .Where(p => p.IsActive && !p.IsCustom)
            .OrderBy(p => p.MinUnits)
            .ToListAsync();

        if (!plans.Any())
            return BadRequest(new { Message = "No hay planes de suscripción activos" });

        int created = 0;
        var results = new List<object>();

        foreach (var admin in adminUsers)
        {
            // Count total units across all admin's condominiums
            var totalUnits = await _context.Units
                .Where(u => _context.Buildings
                    .Where(b => admin.CondominiumIds.Contains(b.CondominiumId))
                    .Select(b => b.Id)
                    .Contains(u.BuildingId))
                .CountAsync();

            var unitCount = Math.Max(totalUnits, 1);

            // Find best plan for this unit count
            var plan = plans
                .Where(p => unitCount >= p.MinUnits && (p.MaxUnits == null || unitCount <= p.MaxUnits))
                .FirstOrDefault() ?? plans.First();

            var monthlyAmount = plan.CalculateMonthlyPrice(unitCount);

            var subscription = Subscription.Create(
                adminUserId: admin.Id,
                subscriptionPlanId: plan.Id,
                billedUnits: unitCount,
                monthlyAmount: monthlyAmount,
                trialDays: plan.TrialDays > 0 ? plan.TrialDays : 30
            );

            _context.Subscriptions.Add(subscription);
            created++;

            results.Add(new
            {
                AdminUserId = admin.Id,
                AdminName = $"{admin.FirstName} {admin.LastName}",
                AdminEmail = admin.Email,
                CondominiumCount = admin.CondominiumIds.Count,
                PlanName = plan.Name,
                Units = unitCount,
                MonthlyAmount = monthlyAmount,
                TrialEndDate = subscription.TrialEndDate
            });
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Created {Count} missing subscriptions for admin users", created);

        return Ok(new { Message = $"Se crearon {created} suscripciones de prueba para administradores", Created = created, Details = results });
    }

    /// <summary>
    /// SuperAdmin: Extend a subscription by N months (condone / free extension)
    /// </summary>
    [HttpPost("{subscriptionId:guid}/extend")]
    public async Task<IActionResult> ExtendSubscription(Guid subscriptionId, [FromBody] ExtendSubscriptionRequest request)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);

        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        // Extend the current period
        var baseDate = subscription.CurrentPeriodEnd > DateTime.UtcNow
            ? subscription.CurrentPeriodEnd
            : DateTime.UtcNow;

        var newEnd = baseDate.AddMonths(request.Months);

        // Use reflection to set CurrentPeriodEnd since it may be private set
        var periodEndProp = typeof(Subscription).GetProperty("CurrentPeriodEnd");
        periodEndProp?.SetValue(subscription, newEnd);

        // If subscription was expired/suspended/past-due, reactivate it
        if (subscription.Status != SubscriptionStatus.Active && subscription.Status != SubscriptionStatus.Trial)
        {
            subscription.Reactivate();
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Subscription {SubscriptionId} extended by {Months} months to {NewEnd}. Reason: {Reason}",
            subscriptionId, request.Months, newEnd, request.Reason);

        return Ok(new
        {
            Message = $"Suscripción extendida {request.Months} mes(es) hasta {newEnd:dd/MM/yyyy}",
            NewPeriodEnd = newEnd,
            Status = subscription.Status.ToString()
        });
    }

    /// <summary>
    /// SuperAdmin: Condone (forgive) pending payment — mark subscription as active without payment
    /// </summary>
    [HttpPost("{subscriptionId:guid}/condone")]
    public async Task<IActionResult> CondoneSubscription(Guid subscriptionId, [FromBody] CondoneRequest request)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);

        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        // Set status to Active
        subscription.Reactivate();

        // Extend current period by the condoned months
        var baseDate = subscription.CurrentPeriodEnd > DateTime.UtcNow
            ? subscription.CurrentPeriodEnd
            : DateTime.UtcNow;

        var newEnd = baseDate.AddMonths(request.Months);

        var periodEndProp = typeof(Subscription).GetProperty("CurrentPeriodEnd");
        periodEndProp?.SetValue(subscription, newEnd);

        var periodStartProp = typeof(Subscription).GetProperty("CurrentPeriodStart");
        if (subscription.CurrentPeriodStart > DateTime.UtcNow)
            periodStartProp?.SetValue(subscription, DateTime.UtcNow);

        await _context.SaveChangesAsync();

        _logger.LogInformation("Subscription {SubscriptionId} condoned for {Months} months. Reason: {Reason}",
            subscriptionId, request.Months, request.Reason);

        return Ok(new
        {
            Message = $"Pago condonado. Suscripción activa hasta {newEnd:dd/MM/yyyy}",
            NewPeriodEnd = newEnd,
            Status = subscription.Status.ToString(),
            CondonedAmount = subscription.MonthlyAmount * request.Months
        });
    }

    /// <summary>
    /// SuperAdmin: Manually change subscription status
    /// </summary>
    [HttpPost("{subscriptionId:guid}/change-status")]
    public async Task<IActionResult> ChangeStatus(Guid subscriptionId, [FromBody] ChangeStatusRequest request)
    {
        var subscription = await _context.Subscriptions.FindAsync(subscriptionId);
        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        switch (request.NewStatus)
        {
            case "cancel":
                subscription.Cancel(request.Reason);
                break;
            case "reactivate":
                subscription.Reactivate();
                break;
            case "activate":
                subscription.ActivateAfterTrial();
                break;
            default:
                return BadRequest(new { Message = "Estado no válido. Use: cancel, reactivate, activate" });
        }

        await _context.SaveChangesAsync();

        return Ok(new { Message = "Estado actualizado", Status = subscription.Status.ToString() });
    }

    private static string GetStatusText(SubscriptionStatus status)
    {
        return status switch
        {
            SubscriptionStatus.Trial => "Período de Prueba",
            SubscriptionStatus.Active => "Activa",
            SubscriptionStatus.PastDue => "Pago Vencido",
            SubscriptionStatus.Suspended => "Suspendida",
            SubscriptionStatus.Cancelled => "Cancelada",
            SubscriptionStatus.Expired => "Expirada",
            _ => "Desconocido"
        };
    }

    private static int GetDaysRemaining(Subscription subscription)
    {
        var endDate = subscription.Status == SubscriptionStatus.Trial
            ? subscription.TrialEndDate ?? subscription.CurrentPeriodEnd
            : subscription.CurrentPeriodEnd;

        var remaining = (endDate - DateTime.UtcNow).Days;
        return Math.Max(0, remaining);
    }
}

// ---- Request DTOs ----

public record CreatePlanRequest(
    string Name,
    string? Description,
    decimal PricePerUnit,
    int MinUnits,
    int? MaxUnits,
    int TrialDays = 30,
    string? Features = null,
    int DisplayOrder = 0,
    bool IsRecommended = false,
    bool IsCustom = false,
    decimal? FixedMonthlyPrice = null);

public record UpdatePlanRequest(
    string Name,
    string? Description,
    decimal PricePerUnit,
    int MinUnits,
    int? MaxUnits,
    int TrialDays = 30,
    string? Features = null,
    int DisplayOrder = 0,
    bool IsRecommended = false);

public record CreateSubscriptionRequest(
    Guid AdminUserId,
    Guid PlanId,
    int UnitCount);

public record RegisterPaymentRequest(
    decimal Amount,
    int MonthsPaid = 1,
    string PaymentMethod = "BankTransfer",
    string? ReferenceNumber = null,
    string? Notes = null,
    string? ProofUrl = null,
    DateTime? PaymentDate = null);

public record ChangeStatusRequest(
    string NewStatus,
    string? Reason = null);

public record ExtendSubscriptionRequest(
    int Months = 1,
    string? Reason = null);

public record CondoneRequest(
    int Months = 1,
    string? Reason = null);
