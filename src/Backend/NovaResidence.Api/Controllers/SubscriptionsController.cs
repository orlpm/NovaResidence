using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Subscriptions;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Infrastructure.Services;

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
    private readonly IOpenPaySubscriptionService _openPaySubscriptionService;
    private readonly OpenPaySettings _openPaySettings;

    public SubscriptionsController(
        ApplicationDbContext context,
        ILogger<SubscriptionsController> logger,
        IOpenPaySubscriptionService openPaySubscriptionService,
        IOptions<OpenPaySettings> openPaySettings)
    {
        _context = context;
        _logger = logger;
        _openPaySubscriptionService = openPaySubscriptionService;
        _openPaySettings = openPaySettings.Value;
    }

    [HttpGet("openpay/config")]
    public IActionResult GetOpenPayConfig()
    {
        var enabled = _openPaySubscriptionService.IsConfigured;

        return Ok(new
        {
            Enabled = enabled,
            MerchantId = enabled ? _openPaySettings.MerchantId : string.Empty,
            PublicKey = enabled ? _openPaySettings.PublicKey : string.Empty,
            _openPaySettings.UseSandbox,
            Mode = _openPaySettings.UseSandbox ? "sandbox" : "production"
        });
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
        {
            var adminUser = await _context.Set<Domain.Entities.Authentication.User>()
                .Include(u => u.CondominiumRoles)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (adminUser == null)
                return NotFound(new { Message = "Usuario no encontrado" });

            if (adminUser.DefaultRole?.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) == true)
                return NotFound(new { Message = "Los SuperAdministradores no requieren suscripción" });

            var adminCondoIdsForCreation = adminUser.CondominiumRoles.Select(cr => cr.CondominiumId).ToList();
            if (!adminCondoIdsForCreation.Any())
                return NotFound(new { Message = "No se encontró suscripción para este usuario" });

            var plans = await _context.SubscriptionPlans
                .Where(p => p.IsActive && !p.IsCustom)
                .OrderBy(p => p.MinUnits)
                .ToListAsync();

            if (!plans.Any())
                return NotFound(new { Message = "No hay planes de suscripción activos" });

            var unitCount = await _context.Units
                .Where(u => _context.Buildings
                    .Where(b => adminCondoIdsForCreation.Contains(b.CondominiumId))
                    .Select(b => b.Id)
                    .Contains(u.BuildingId))
                .CountAsync();

            unitCount = Math.Max(unitCount, 1);

            var plan = plans
                .Where(p => unitCount >= p.MinUnits && (p.MaxUnits == null || unitCount <= p.MaxUnits))
                .FirstOrDefault() ?? plans.First();

            var monthlyAmount = plan.CalculateMonthlyPrice(unitCount);
            var newSubscription = Subscription.Create(
                adminUserId: userId,
                subscriptionPlanId: plan.Id,
                billedUnits: unitCount,
                monthlyAmount: monthlyAmount,
                trialDays: plan.TrialDays > 0 ? plan.TrialDays : 30
            );

            _context.Subscriptions.Add(newSubscription);
            await _context.SaveChangesAsync();

            _logger.LogInformation(
                "Auto-created missing trial subscription for user {UserId}: Plan={Plan}, Units={Units}, Monthly=${Amount}",
                userId, plan.Name, unitCount, monthlyAmount);

            subscription = await _context.Subscriptions
                .Include(s => s.Plan)
                .Include(s => s.AdminUser)
                .Include(s => s.Payments.OrderByDescending(p => p.PaymentDate).Take(5))
                .Where(s => s.AdminUserId == userId && s.Status != SubscriptionStatus.Cancelled)
                .OrderByDescending(s => s.CreatedAt)
                .FirstOrDefaultAsync();

            if (subscription == null)
                return NotFound(new { Message = "No se pudo crear la suscripción para este usuario" });
        }

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
                p.VerifiedAt,
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

        var accessResult = ValidateSubscriptionPaymentAccess(subscription);
        if (accessResult != null)
            return accessResult;

        if (!string.Equals(request.PaymentMethod, "BankTransfer", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { Message = "Para pagos manuales de suscripción sólo se permite transferencia bancaria" });

        if (request.Amount <= 0)
            return BadRequest(new { Message = "El monto debe ser mayor a 0" });

        if (request.MonthsPaid <= 0)
            return BadRequest(new { Message = "Debes indicar al menos 1 mes a pagar" });

        if (string.IsNullOrWhiteSpace(request.ProofUrl))
            return BadRequest(new { Message = "Debes adjuntar el comprobante para registrar una transferencia" });

        var payment = SubscriptionPayment.Create(
            subscriptionId,
            request.Amount,
            request.MonthsPaid,
            request.PaymentMethod,
            request.PaymentDate ?? DateTime.UtcNow,
            request.ReferenceNumber,
            request.Notes,
            request.ProofUrl);

        _context.SubscriptionPayments.Add(payment);
        await _context.SaveChangesAsync();

        _logger.LogInformation("Bank transfer payment of {Amount} registered for subscription {SubscriptionId} pending verification",
            request.Amount, subscriptionId);

        return Ok(new
        {
            Message = "Transferencia registrada. El comprobante quedó pendiente de validación por superadministración",
            PaymentId = payment.Id,
            NewStatus = subscription.Status.ToString(),
            subscription.CurrentPeriodEnd,
            subscription.MonthlyAmount,
            RequiresVerification = true
        });
    }

    [HttpPost("payments/upload-proof")]
    public async Task<ActionResult<string>> UploadPaymentProof([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No se proporcionó archivo");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".pdf", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(ext))
            return BadRequest("Formato de archivo no válido. Use JPG, PNG, PDF o WEBP.");

        if (file.Length > 8 * 1024 * 1024)
            return BadRequest("El archivo no debe superar 8MB.");

        var env = HttpContext.RequestServices.GetRequiredService<IWebHostEnvironment>();
        var uploadsFolder = Path.Combine(env.ContentRootPath, "uploads", "payment-proofs");
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"subscription-{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return Ok($"/uploads/payment-proofs/{uniqueFileName}");
    }

    /// <summary>
    /// Charge a subscription using OpenPay card tokenization flow.
    /// Frontend should generate tokenId + deviceSessionId with OpenPay.js and call this endpoint.
    /// </summary>
    [HttpPost("{subscriptionId:guid}/payments/openpay/card")]
    public async Task<IActionResult> PayWithOpenPayCard(Guid subscriptionId, [FromBody] OpenPayCardPaymentRequest request)
    {
        if (!_openPaySubscriptionService.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { Message = "OpenPay no está configurado en el servidor" });

        var subscription = await _context.Subscriptions
            .Include(s => s.AdminUser)
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);

        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        var accessResult = ValidateSubscriptionPaymentAccess(subscription);
        if (accessResult != null)
            return accessResult;

        if (string.IsNullOrWhiteSpace(request.TokenId) || string.IsNullOrWhiteSpace(request.DeviceSessionId))
            return BadRequest(new { Message = "Token y deviceSessionId son obligatorios" });

        if (string.IsNullOrWhiteSpace(request.CustomerEmail))
            return BadRequest(new { Message = "El correo es obligatorio para procesar el pago con OpenPay" });

        if (string.IsNullOrWhiteSpace(request.CustomerAddressLine1) || string.IsNullOrWhiteSpace(request.CustomerPostalCode))
            return BadRequest(new { Message = "La dirección y el código postal son obligatorios para OpenPay" });

        if (!string.IsNullOrWhiteSpace(request.PaymentMethod)
            && !string.Equals(request.PaymentMethod, "Card", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { Message = "OpenPay sólo está habilitado para pagos con tarjeta en este momento" });

        var monthsPaid = Math.Max(1, request.MonthsPaid);
        var planToCharge = subscription.Plan;
        var billedUnits = subscription.BilledUnits;

        if (request.PlanId.HasValue && request.PlanId.Value != subscription.SubscriptionPlanId)
        {
            var requestedPlan = await _context.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Id == request.PlanId.Value && p.IsActive);

            if (requestedPlan == null)
                return NotFound(new { Message = "Plan no encontrado o inactivo" });

            billedUnits = await GetBilledUnitsForAdminAsync(subscription.AdminUserId);
            planToCharge = requestedPlan;
        }

        var monthlyAmount = planToCharge.IsCustom && planToCharge.FixedMonthlyPrice.HasValue
            ? planToCharge.FixedMonthlyPrice.Value
            : planToCharge.CalculateMonthlyPrice(billedUnits);
        var expectedAmount = monthlyAmount * monthsPaid;

        if (request.Amount.HasValue && Math.Abs(request.Amount.Value - expectedAmount) > 0.01m)
            return BadRequest(new { Message = "El monto no coincide con el plan y meses seleccionados", ExpectedAmount = expectedAmount });

        if (expectedAmount <= 0)
            return BadRequest(new { Message = "El monto debe ser mayor a 0" });

        var fullName = (request.CustomerFullName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(fullName))
            fullName = $"{subscription.AdminUser.FirstName} {subscription.AdminUser.LastName}".Trim();

        var firstName = fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault() ?? "Cliente";
        var lastName = string.Join(' ', fullName.Split(' ', StringSplitOptions.RemoveEmptyEntries).Skip(1));
        if (string.IsNullOrWhiteSpace(lastName))
            lastName = "DomusCond";

        var charge = await _openPaySubscriptionService.CreateSubscriptionChargeAsync(new OpenPayCreateChargeRequest(
            SubscriptionId: subscriptionId,
            Amount: expectedAmount,
            MonthsPaid: monthsPaid,
            TokenId: request.TokenId,
            DeviceSessionId: request.DeviceSessionId,
            CustomerName: firstName,
            CustomerLastName: lastName,
            CustomerEmail: request.CustomerEmail ?? subscription.AdminUser.Email,
            CustomerPhone: request.CustomerPhone,
            CustomerAddressLine1: request.CustomerAddressLine1,
            CustomerPostalCode: request.CustomerPostalCode,
            CustomerCity: request.CustomerCity,
            CustomerState: request.CustomerState,
            PaymentMethod: "Card",
            Description: request.Description,
            Metadata: new Dictionary<string, string>
            {
                ["subscriptionId"] = subscriptionId.ToString(),
                ["monthsPaid"] = monthsPaid.ToString(),
                ["paymentMethod"] = "Card",
                ["postalCode"] = request.CustomerPostalCode ?? string.Empty
            }), HttpContext.RequestAborted);

        if (!charge.Success)
            return BadRequest(new { Message = "No se pudo procesar el cargo en OpenPay", Details = charge.ErrorMessage });

        var chargeStatus = (charge.Status ?? string.Empty).ToLowerInvariant();
        if (chargeStatus is not ("completed" or "paid"))
        {
            return Accepted(new
            {
                Message = "Cargo creado en OpenPay, pendiente de confirmación",
                charge.TransactionId,
                charge.Status,
                charge.Amount
            });
        }

        var alreadyExists = await _context.SubscriptionPayments
            .AnyAsync(p => p.SubscriptionId == subscriptionId && p.ReferenceNumber == charge.TransactionId);

        if (!alreadyExists)
        {
            if (planToCharge.Id != subscription.SubscriptionPlanId)
                subscription.ChangePlan(planToCharge.Id, billedUnits, monthlyAmount);

            var payment = SubscriptionPayment.Create(
                subscriptionId,
                charge.Amount,
                monthsPaid,
                "OpenPay Card",
                charge.OperationDate ?? DateTime.UtcNow,
                charge.TransactionId,
                request.Notes,
                null);
            payment.Verify();

            _context.SubscriptionPayments.Add(payment);
            subscription.RecordPayment(payment);
            await _context.SaveChangesAsync();
        }

        return Ok(new
        {
            Message = "Pago procesado exitosamente con OpenPay",
            charge.TransactionId,
            charge.Status,
            charge.Amount,
            MonthlyAmount = monthlyAmount,
            subscription.CurrentPeriodEnd
        });
    }

    /// <summary>
    /// Confirm a previously created OpenPay charge and register the subscription payment if completed.
    /// Useful for asynchronous flows and retries.
    /// </summary>
    [HttpPost("{subscriptionId:guid}/payments/openpay/confirm")]
    public async Task<IActionResult> ConfirmOpenPayPayment(Guid subscriptionId, [FromBody] ConfirmOpenPayPaymentRequest request)
    {
        if (!_openPaySubscriptionService.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { Message = "OpenPay no está configurado en el servidor" });

        if (string.IsNullOrWhiteSpace(request.TransactionId))
            return BadRequest(new { Message = "transactionId es obligatorio" });

        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);

        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        var accessResult = ValidateSubscriptionPaymentAccess(subscription);
        if (accessResult != null)
            return accessResult;

        if (!string.IsNullOrWhiteSpace(request.PaymentMethod)
            && !string.Equals(request.PaymentMethod, "Card", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { Message = "OpenPay sólo está habilitado para pagos con tarjeta en este momento" });

        var monthsPaid = Math.Max(1, request.MonthsPaid ?? 1);
        var planToApply = subscription.Plan;
        var billedUnits = subscription.BilledUnits;

        if (request.PlanId.HasValue && request.PlanId.Value != subscription.SubscriptionPlanId)
        {
            var requestedPlan = await _context.SubscriptionPlans
                .FirstOrDefaultAsync(p => p.Id == request.PlanId.Value && p.IsActive);

            if (requestedPlan == null)
                return NotFound(new { Message = "Plan no encontrado o inactivo" });

            billedUnits = await GetBilledUnitsForAdminAsync(subscription.AdminUserId);
            planToApply = requestedPlan;
        }

        var monthlyAmount = planToApply.IsCustom && planToApply.FixedMonthlyPrice.HasValue
            ? planToApply.FixedMonthlyPrice.Value
            : planToApply.CalculateMonthlyPrice(billedUnits);
        var expectedAmount = monthlyAmount * monthsPaid;

        var charge = await _openPaySubscriptionService.GetChargeAsync(request.TransactionId, HttpContext.RequestAborted);
        if (!charge.Success)
            return BadRequest(new { Message = "No se pudo consultar el cargo de OpenPay", Details = charge.ErrorMessage });

        var chargeStatus = (charge.Status ?? string.Empty).ToLowerInvariant();
        if (chargeStatus is not ("completed" or "paid"))
            return Accepted(new { Message = "El cargo aún no está confirmado", charge.TransactionId, charge.Status });

        var alreadyExists = await _context.SubscriptionPayments
            .AnyAsync(p => p.SubscriptionId == subscriptionId && p.ReferenceNumber == charge.TransactionId);

        if (alreadyExists)
            return Ok(new { Message = "El pago ya había sido registrado", charge.TransactionId, charge.Status, subscription.CurrentPeriodEnd });

        if (Math.Abs(charge.Amount - expectedAmount) > 0.01m)
            return BadRequest(new { Message = "El monto del cargo no coincide con la suscripción", ExpectedAmount = expectedAmount, ChargeAmount = charge.Amount });

        if (planToApply.Id != subscription.SubscriptionPlanId)
            subscription.ChangePlan(planToApply.Id, billedUnits, monthlyAmount);

        var payment = SubscriptionPayment.Create(
            subscriptionId,
            charge.Amount,
            monthsPaid,
            "OpenPay Card",
            charge.OperationDate ?? DateTime.UtcNow,
            charge.TransactionId,
            request.Notes,
            null);
        payment.Verify();

        _context.SubscriptionPayments.Add(payment);
        subscription.RecordPayment(payment);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Pago confirmado y aplicado a la suscripción",
            charge.TransactionId,
            charge.Status,
            charge.Amount,
            MonthlyAmount = monthlyAmount,
            subscription.CurrentPeriodEnd
        });
    }

    [HttpPost("payments/{paymentId:guid}/verify")]
    public async Task<IActionResult> VerifySubscriptionPayment(Guid paymentId)
    {
        if (!IsSuperAdmin())
            return Forbid();

        var payment = await _context.SubscriptionPayments
            .Include(p => p.Subscription)
            .FirstOrDefaultAsync(p => p.Id == paymentId);

        if (payment == null)
            return NotFound(new { Message = "Pago no encontrado" });

        if (payment.IsVerified)
        {
            return Ok(new
            {
                Message = "El pago ya había sido validado",
                payment.Id,
                payment.VerifiedAt,
                payment.Subscription.CurrentPeriodEnd
            });
        }

        payment.Verify();
        payment.Subscription.RecordPayment(payment);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Pago validado y aplicado a la suscripción",
            payment.Id,
            payment.VerifiedAt,
            payment.Subscription.CurrentPeriodEnd,
            Status = payment.Subscription.Status.ToString()
        });
    }

    /// <summary>
    /// Change plan for an existing subscription (owner admin or SuperAdmin)
    /// </summary>
    [HttpPost("{subscriptionId:guid}/change-plan")]
    public async Task<IActionResult> ChangePlan(Guid subscriptionId, [FromBody] ChangePlanRequest request)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);

        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        var plan = await _context.SubscriptionPlans
            .FirstOrDefaultAsync(p => p.Id == request.PlanId && p.IsActive);
        if (plan == null)
            return NotFound(new { Message = "Plan no encontrado o inactivo" });

        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value;
        var userIdClaim = User.FindFirst("userId")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        var isSuperAdmin = string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase);

        if (!isSuperAdmin)
        {
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var callerUserId))
                return Unauthorized(new { Message = "No se pudo identificar al usuario" });

            if (callerUserId != subscription.AdminUserId)
                return Forbid();
        }

        var adminCondoIds = await _context.Set<Domain.Entities.Authentication.User>()
            .Where(u => u.Id == subscription.AdminUserId)
            .SelectMany(u => u.CondominiumRoles)
            .Select(cr => cr.CondominiumId)
            .ToListAsync();

        var billedUnits = Math.Max(1, await _context.Units
            .Where(u => _context.Buildings
                .Where(b => adminCondoIds.Contains(b.CondominiumId))
                .Select(b => b.Id)
                .Contains(u.BuildingId))
            .CountAsync());

        var monthlyAmount = plan.CalculateMonthlyPrice(billedUnits);
        subscription.ChangePlan(plan.Id, billedUnits, monthlyAmount);

        await _context.SaveChangesAsync();

        return Ok(new
        {
            Message = "Plan actualizado exitosamente",
            Plan = new { plan.Id, plan.Name },
            subscription.BilledUnits,
            subscription.MonthlyAmount
        });
    }

    /// <summary>
    /// Get subscription status check (lightweight endpoint for frontend polling)
    /// Auto-creates a 30-day free trial for Admin users who don't have a subscription yet.
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
            // Auto-create a 30-day free trial for Admin users
            var user = await _context.Set<Domain.Entities.Authentication.User>()
                .Include(u => u.CondominiumRoles)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                return NotFound(new { Message = "Usuario no encontrado" });

            // SuperAdmins don't need subscriptions
            if (user.DefaultRole?.Equals("SuperAdmin", StringComparison.OrdinalIgnoreCase) == true)
            {
                return Ok(new
                {
                    HasSubscription = false,
                    IsAccessGranted = true,
                    Status = "None",
                    Message = "SuperAdmin no requiere suscripción"
                });
            }

            // Find the basic plan (lowest tier) to assign as trial
            var basicPlan = await _context.SubscriptionPlans
                .Where(p => p.IsActive && !p.IsCustom)
                .OrderBy(p => p.MinUnits)
                .FirstOrDefaultAsync();

            if (basicPlan != null)
            {
                // Count units if user already has condominiums, otherwise default to 1
                var adminCondoIds = user.CondominiumRoles?.Select(cr => cr.CondominiumId).ToList() ?? new List<Guid>();
                var unitCount = 1;
                if (adminCondoIds.Any())
                {
                    unitCount = await _context.Units
                        .Where(u => _context.Buildings
                            .Where(b => adminCondoIds.Contains(b.CondominiumId))
                            .Select(b => b.Id)
                            .Contains(u.BuildingId))
                        .CountAsync();
                    unitCount = Math.Max(unitCount, 1);
                }

                var monthlyAmount = basicPlan.CalculateMonthlyPrice(unitCount);
                var trialDays = basicPlan.TrialDays > 0 ? basicPlan.TrialDays : 30;

                subscription = Subscription.Create(
                    adminUserId: userId,
                    subscriptionPlanId: basicPlan.Id,
                    billedUnits: unitCount,
                    monthlyAmount: monthlyAmount,
                    trialDays: trialDays
                );

                _context.Subscriptions.Add(subscription);
                await _context.SaveChangesAsync();

                _logger.LogInformation(
                    "Auto-created trial subscription for new user {UserId}: Plan={Plan}, TrialDays={TrialDays}",
                    userId, basicPlan.Name, trialDays);

                // Reload with navigation properties
                subscription = await _context.Subscriptions
                    .Include(s => s.Plan)
                    .Where(s => s.Id == subscription.Id)
                    .FirstOrDefaultAsync();
            }
            else
            {
                // No plans available — allow access anyway for new users
                return Ok(new
                {
                    HasSubscription = false,
                    IsAccessGranted = true,
                    Status = "None",
                    Message = "No hay planes disponibles. Contacte al administrador."
                });
            }
        }

        subscription!.EvaluateStatus();
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
        [FromQuery] string? search = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        await EnsureMissingSubscriptionsAsync();

        var query = _context.Subscriptions
            .Include(s => s.Plan)
            .Include(s => s.AdminUser)
            .Where(s => s.AdminUser.DefaultRole != "SuperAdmin") // SuperAdmins don't have subscriptions
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(s => s.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(s =>
                (s.AdminUser.FirstName + " " + s.AdminUser.LastName).ToLower().Contains(term)
                || s.AdminUser.Email.ToLower().Contains(term)
                || s.Plan.Name.ToLower().Contains(term));
        }

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
        var createdSubscriptions = await EnsureMissingSubscriptionsAsync();

        if (!createdSubscriptions.Any())
            return Ok(new { Message = "Todos los administradores ya tienen suscripción", Created = 0 });

        return Ok(new
        {
            Message = $"Se crearon {createdSubscriptions.Count} suscripciones de prueba para administradores",
            Created = createdSubscriptions.Count,
            Details = createdSubscriptions
        });
    }

    private async Task<List<object>> EnsureMissingSubscriptionsAsync()
    {
        var userIdsWithSub = await _context.Subscriptions
            .Select(s => s.AdminUserId)
            .Distinct()
            .ToListAsync();

        var adminUsers = await _context.Set<Domain.Entities.Authentication.User>()
            .Where(u => u.IsActive && !u.IsDeleted)
            .Where(u => u.DefaultRole != "SuperAdmin")
            .Where(u => u.CondominiumRoles.Any())
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
            return new List<object>();

        var plans = await _context.SubscriptionPlans
            .Where(p => p.IsActive && !p.IsCustom)
            .OrderBy(p => p.MinUnits)
            .ToListAsync();

        if (!plans.Any())
            return new List<object>();

        var createdSubscriptions = new List<object>();

        foreach (var admin in adminUsers)
        {
            var totalUnits = await _context.Units
                .Where(u => _context.Buildings
                    .Where(b => admin.CondominiumIds.Contains(b.CondominiumId))
                    .Select(b => b.Id)
                    .Contains(u.BuildingId))
                .CountAsync();

            var unitCount = Math.Max(totalUnits, 1);
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

            createdSubscriptions.Add(new
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

        if (createdSubscriptions.Count > 0)
        {
            _logger.LogInformation("Created {Count} missing subscriptions for admin users", createdSubscriptions.Count);
        }

        return createdSubscriptions;
    }

    /// <summary>
    /// SuperAdmin: Extend a subscription by months and/or days
    /// </summary>
    [HttpPost("{subscriptionId:guid}/extend")]
    public async Task<IActionResult> ExtendSubscription(Guid subscriptionId, [FromBody] ExtendSubscriptionRequest request)
    {
        var subscription = await _context.Subscriptions
            .Include(s => s.Plan)
            .FirstOrDefaultAsync(s => s.Id == subscriptionId);

        if (subscription == null)
            return NotFound(new { Message = "Suscripción no encontrada" });

        if (request.Months <= 0 && request.Days <= 0)
            return BadRequest(new { Message = "Debes indicar al menos meses o días para extender" });

        // Extend the current period
        var baseDate = subscription.CurrentPeriodEnd > DateTime.UtcNow
            ? subscription.CurrentPeriodEnd
            : DateTime.UtcNow;

        var newEnd = baseDate
            .AddMonths(request.Months)
            .AddDays(request.Days);

        // Use reflection to set CurrentPeriodEnd since it may be private set
        var periodEndProp = typeof(Subscription).GetProperty("CurrentPeriodEnd");
        periodEndProp?.SetValue(subscription, newEnd);

        // If subscription was expired/suspended/past-due, reactivate it
        if (subscription.Status != SubscriptionStatus.Active && subscription.Status != SubscriptionStatus.Trial)
        {
            subscription.Reactivate();
        }

        await _context.SaveChangesAsync();

        _logger.LogInformation("Subscription {SubscriptionId} extended by {Months} months and {Days} days to {NewEnd}. Reason: {Reason}",
            subscriptionId, request.Months, request.Days, newEnd, request.Reason);

        var extensionText = request.Months > 0 && request.Days > 0
            ? $"{request.Months} mes(es) y {request.Days} día(s)"
            : request.Months > 0
                ? $"{request.Months} mes(es)"
                : $"{request.Days} día(s)";

        return Ok(new
        {
            Message = $"Suscripción extendida {extensionText} hasta {newEnd:dd/MM/yyyy}",
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

    private async Task<int> GetBilledUnitsForAdminAsync(Guid adminUserId)
    {
        var adminCondoIds = await _context.Set<Domain.Entities.Authentication.User>()
            .Where(u => u.Id == adminUserId)
            .SelectMany(u => u.CondominiumRoles)
            .Select(cr => cr.CondominiumId)
            .ToListAsync();

        if (!adminCondoIds.Any())
            return 1;

        return Math.Max(1, await _context.Units
            .Where(u => _context.Buildings
                .Where(b => adminCondoIds.Contains(b.CondominiumId))
                .Select(b => b.Id)
                .Contains(u.BuildingId))
            .CountAsync());
    }

    private bool IsSuperAdmin()
    {
        var role = User.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value
            ?? User.FindFirst("role")?.Value
            ?? string.Empty;

        return string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase);
    }

    private IActionResult? ValidateSubscriptionPaymentAccess(Subscription subscription)
    {
        if (IsSuperAdmin())
            return null;

        var userIdClaim = User.FindFirst("userId")?.Value
            ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrWhiteSpace(userIdClaim) || !Guid.TryParse(userIdClaim, out var callerUserId))
            return Unauthorized(new { Message = "No se pudo identificar al usuario" });

        return callerUserId == subscription.AdminUserId
            ? null
            : Forbid();
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

public record OpenPayCardPaymentRequest(
    string TokenId,
    string DeviceSessionId,
    int MonthsPaid = 1,
    decimal? Amount = null,
    Guid? PlanId = null,
    string? PaymentMethod = null,
    string? CustomerFullName = null,
    string? CustomerEmail = null,
    string? CustomerPhone = null,
    string? CustomerAddressLine1 = null,
    string? CustomerPostalCode = null,
    string? CustomerCity = null,
    string? CustomerState = null,
    string? Description = null,
    string? Notes = null);

public record ConfirmOpenPayPaymentRequest(
    string TransactionId,
    int? MonthsPaid = null,
    Guid? PlanId = null,
    string? PaymentMethod = null,
    string? Notes = null);

public record ChangePlanRequest(
    Guid PlanId);

public record ChangeStatusRequest(
    string NewStatus,
    string? Reason = null);

public record ExtendSubscriptionRequest(
    int Months = 1,
    int Days = 0,
    string? Reason = null);

public record CondoneRequest(
    int Months = 1,
    string? Reason = null);
