using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using NovaResidence.Application.Features.Authentication.Commands.Register;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;
using NovaResidence.Shared.Models;
using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using System.IdentityModel.Tokens.Jwt;
using System.Net.Mail;
using System.Text.RegularExpressions;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ILogger<AuthController> _logger;
    private readonly IUserRepository _userRepository;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtService _jwtService;
    private readonly IApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public AuthController(
        IMediator mediator, 
        ILogger<AuthController> logger,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtService jwtService,
        IApplicationDbContext context,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _mediator = mediator;
        _logger = logger;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
        _context = context;
        _emailService = emailService;
        _configuration = configuration;
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<RegisterUserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<RegisterUserResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
    {
        if (IsStaffRole(command.Role))
        {
            if (!(User?.Identity?.IsAuthenticated ?? false))
            {
                return Unauthorized(ApiResponse<RegisterUserResponse>.FailureResponse(
                    "Solo administradores pueden dar de alta personal operativo."));
            }

            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            var canCreateStaff = string.Equals(callerRole, "superadmin", StringComparison.OrdinalIgnoreCase)
                                || string.Equals(callerRole, "admin", StringComparison.OrdinalIgnoreCase);

            if (!canCreateStaff)
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<RegisterUserResponse>.FailureResponse(
                    "No tienes permisos para dar de alta personal operativo."));
            }
        }

        if (IsProviderRole(command.Role))
        {
            if (!(User?.Identity?.IsAuthenticated ?? false))
            {
                return Unauthorized(ApiResponse<RegisterUserResponse>.FailureResponse(
                    "Solo el super administrador puede agregar proveedores."));
            }

            var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value;
            if (!string.Equals(callerRole, "superadmin", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, ApiResponse<RegisterUserResponse>.FailureResponse(
                    "Solo el super administrador puede agregar proveedores."));
            }
        }

        var result = await _mediator.Send(command);

        if (result.IsSuccess)
        {
            var registeredUser = await _userRepository.GetByIdIncludingDeletedAsync(result.Value.UserId);
            if (registeredUser != null)
            {
                var autoConfirm = IsStaffRole(command.Role)
                    || IsProviderRole(command.Role)
                    || (User?.Identity?.IsAuthenticated ?? false);

                if (autoConfirm)
                {
                    registeredUser.ConfirmEmail();
                    await _context.SaveChangesAsync();
                }
                else
                {
                    await IssueEmailConfirmationAsync(registeredUser, HttpContext.RequestAborted);
                }
            }

            return Ok(ApiResponse<RegisterUserResponse>.SuccessResponse(
                result.Value,
                "Usuario registrado correctamente. Revisa tu correo para confirmar tu cuenta."));
        }

        return BadRequest(ApiResponse<RegisterUserResponse>.FailureResponse(
            result.Errors.FirstOrDefault() ?? "Registration failed",
            result.Errors.ToList()));
    }

    private static bool IsProviderRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        return role.Equals("ServiceProvider", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Provider", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Proveedor", StringComparison.OrdinalIgnoreCase);
    }

    private static bool IsStaffRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role))
        {
            return false;
        }

        return role.Equals("Maintenance", StringComparison.OrdinalIgnoreCase)
            || role.Equals("SecurityGuard", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Vigilancia", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Cleaning", StringComparison.OrdinalIgnoreCase)
            || role.Equals("Limpieza", StringComparison.OrdinalIgnoreCase);
    }

    private static UserRole? ParseStaffRole(string role)
    {
        if (role.Equals("Maintenance", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("Mantenimiento", StringComparison.OrdinalIgnoreCase))
            return UserRole.Maintenance;

        if (role.Equals("SecurityGuard", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("Vigilancia", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("Security", StringComparison.OrdinalIgnoreCase))
            return UserRole.SecurityGuard;

        if (role.Equals("Cleaning", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("Limpieza", StringComparison.OrdinalIgnoreCase))
            return UserRole.Cleaning;

        return null;
    }

    private static string GetRoleString(UserRole role)
    {
        return role switch
        {
            UserRole.Maintenance => "Maintenance",
            UserRole.SecurityGuard => "SecurityGuard",
            UserRole.Cleaning => "Cleaning",
            _ => role.ToString()
        };
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            _ = new MailAddress(email);
            return true;
        }
        catch
        {
            return false;
        }
    }

    private static bool IsValidPhone(string? phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            return true;

        var digits = Regex.Replace(phoneNumber, "[^0-9]", string.Empty);
        return digits.Length >= 10 && digits.Length <= 15;
    }

    private static bool IsStaffUserDefaultRole(string defaultRole)
    {
        return defaultRole.Equals("Maintenance", StringComparison.OrdinalIgnoreCase)
            || defaultRole.Equals("SecurityGuard", StringComparison.OrdinalIgnoreCase)
            || defaultRole.Equals("Cleaning", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<(bool isValid, Guid userId, string role, IActionResult? errorResult)> GetCallerContextAsync()
    {
        var callerRole = User.FindFirst(ClaimTypes.Role)?.Value ?? User.FindFirst("role")?.Value ?? string.Empty;
        var callerUserIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        if (!Guid.TryParse(callerUserIdClaim, out var callerUserId))
        {
            return (false, Guid.Empty, string.Empty, Unauthorized(new { message = "No se pudo identificar al usuario autenticado" }));
        }

        return (true, callerUserId, callerRole, null);
    }

    private async Task<HashSet<Guid>> GetAllowedCondominiumIdsAsync(string callerRole, Guid callerUserId)
    {
        if (string.Equals(callerRole, "superadmin", StringComparison.OrdinalIgnoreCase))
        {
            var condoIds = await _context.Condominiums
                .Where(c => !c.IsDeleted)
                .Select(c => c.Id)
                .ToListAsync();

            return condoIds.ToHashSet();
        }

        var caller = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == callerUserId && !u.IsDeleted);

        if (caller == null)
            return new HashSet<Guid>();

        return caller.CondominiumRoles
            .Where(cr => cr.Role == UserRole.CondominiumAdmin)
            .Select(cr => cr.CondominiumId)
            .ToHashSet();
    }

    private static string MapTokenRole(string defaultRole)
    {
        return defaultRole.ToLowerInvariant() switch
        {
            "superadmin" => "superadmin",
            "admin" or "condominiumadmin" or "subadmin" => "admin",
            "securityguard" => "security",
            "maintenance" or "cleaning" => "maintenance",
            "accountant" => "accountant",
            "serviceprovider" or "provider" => "provider",
            _ => "resident"
        };
    }

    /// <summary>
    /// Create staff users (Maintenance, Security, Cleaning) for a condominium.
    /// Admin and SuperAdmin only.
    /// </summary>
    [HttpPost("staff-users")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> CreateStaffUser([FromBody] CreateStaffUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) ||
            string.IsNullOrWhiteSpace(request.FirstName) || string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.Role))
        {
            return BadRequest(new { message = "Faltan campos obligatorios" });
        }

        var staffRole = ParseStaffRole(request.Role);
        if (!staffRole.HasValue)
        {
            return BadRequest(new { message = "Rol no válido para personal operativo" });
        }

        var callerContext = await GetCallerContextAsync();
        if (!callerContext.isValid)
        {
            return callerContext.errorResult!;
        }

        if (request.CondominiumId == Guid.Empty)
        {
            return BadRequest(new { message = "Condominio requerido" });
        }

        if (!IsValidEmail(request.Email.Trim()))
        {
            return BadRequest(new { message = "El correo no es válido" });
        }

        if (!IsValidPhone(request.PhoneNumber))
        {
            return BadRequest(new { message = "El teléfono no es válido. Debe contener entre 10 y 15 dígitos" });
        }

        var allowedCondoIds = await GetAllowedCondominiumIdsAsync(callerContext.role, callerContext.userId);
        if (!allowedCondoIds.Contains(request.CondominiumId))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No puedes crear personal para este condominio" });
        }

        var existing = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
        if (existing != null)
        {
            return BadRequest(new { message = "Ya existe un usuario con ese correo" });
        }

        var passwordHash = _passwordHasher.HashPassword(request.Password);
        var user = Domain.Entities.Authentication.User.Create(
            request.Email.Trim(),
            passwordHash,
            request.FirstName.Trim(),
            request.LastName.Trim(),
            request.PhoneNumber,
            GetRoleString(staffRole.Value));

        user.ConfirmEmail();

        user.AddCondominiumRole(request.CondominiumId, staffRole.Value);

        await _userRepository.AddAsync(user);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Personal operativo creado correctamente",
            userId = user.Id,
            role = GetRoleString(staffRole.Value)
        });
    }

    /// <summary>
    /// Get staff users (Maintenance, Security, Cleaning).
    /// Admin and SuperAdmin only.
    /// </summary>
    [HttpGet("staff-users")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> GetStaffUsers([FromQuery] Guid? condominiumId = null)
    {
        var callerContext = await GetCallerContextAsync();
        if (!callerContext.isValid)
        {
            return callerContext.errorResult!;
        }

        var staffRoles = new[] { UserRole.Maintenance, UserRole.SecurityGuard, UserRole.Cleaning };

        var users = await _context.Users
            .Include(u => u.CondominiumRoles)
            .Where(u => !u.IsDeleted && u.IsActive)
            .Where(u => u.CondominiumRoles.Any(cr => staffRoles.Contains(cr.Role)))
            .ToListAsync();

        var allowedCondoIds = await GetAllowedCondominiumIdsAsync(callerContext.role, callerContext.userId);
        users = users
            .Where(u => u.CondominiumRoles.Any(cr => allowedCondoIds.Contains(cr.CondominiumId)))
            .ToList();

        if (condominiumId.HasValue && condominiumId.Value != Guid.Empty)
        {
            users = users
                .Where(u => u.CondominiumRoles.Any(cr => cr.CondominiumId == condominiumId.Value && staffRoles.Contains(cr.Role)))
                .ToList();
        }

        var userIds = users.Select(u => u.Id).ToList();
        var assignedCounts = await _context.Incidents
            .Where(i => i.AssignedToId.HasValue && userIds.Contains(i.AssignedToId.Value))
            .Where(i => i.Status != IncidentStatus.Resolved && i.Status != IncidentStatus.Closed)
            .GroupBy(i => i.AssignedToId!.Value)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.UserId, g => g.Count);

        var result = users.Select(u => new
        {
            id = u.Id,
            email = u.Email,
            firstName = u.FirstName,
            lastName = u.LastName,
            phoneNumber = u.PhoneNumber,
            defaultRole = u.DefaultRole,
            isActive = u.IsActive,
            assignedTasksCount = assignedCounts.TryGetValue(u.Id, out var count) ? count : 0,
            createdAt = u.CreatedAt,
            condominiumRoles = u.CondominiumRoles
                .Where(cr => staffRoles.Contains(cr.Role))
                .Select(cr => new { condominiumId = cr.CondominiumId, role = cr.Role.ToString() })
                .ToList()
        });

        return Ok(result);
    }

    /// <summary>
    /// Update staff user profile and role.
    /// Admin and SuperAdmin only.
    /// </summary>
    [HttpPut("staff-users/{userId:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> UpdateStaffUser(Guid userId, [FromBody] UpdateStaffUserRequest request)
    {
        var callerContext = await GetCallerContextAsync();
        if (!callerContext.isValid)
            return callerContext.errorResult!;

        var user = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null || !IsStaffUserDefaultRole(user.DefaultRole))
            return NotFound(new { message = "Personal operativo no encontrado" });

        if (!IsValidPhone(request.PhoneNumber))
            return BadRequest(new { message = "El teléfono no es válido. Debe contener entre 10 y 15 dígitos" });

        var newRole = ParseStaffRole(request.Role);
        if (!newRole.HasValue)
            return BadRequest(new { message = "Rol no válido para personal operativo" });

        if (request.CondominiumId == Guid.Empty)
            return BadRequest(new { message = "Condominio requerido" });

        var allowedCondoIds = await GetAllowedCondominiumIdsAsync(callerContext.role, callerContext.userId);
        if (!allowedCondoIds.Contains(request.CondominiumId))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No puedes modificar personal de este condominio" });

        user.UpdateProfile(request.FirstName.Trim(), request.LastName.Trim(), request.PhoneNumber?.Trim());

        var existingStaffRoles = user.CondominiumRoles
            .Where(cr => cr.Role == UserRole.Maintenance || cr.Role == UserRole.SecurityGuard || cr.Role == UserRole.Cleaning)
            .ToList();

        foreach (var role in existingStaffRoles)
        {
            user.RemoveCondominiumRole(role.CondominiumId, role.Role);
        }

        user.AddCondominiumRole(request.CondominiumId, newRole.Value);

        user.SetDefaultRole(GetRoleString(newRole.Value));

        await _context.SaveChangesAsync();

        return Ok(new { message = "Personal operativo actualizado correctamente" });
    }

    [HttpPost("staff-users/{userId:guid}/deactivate")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> DeactivateStaffUser(Guid userId)
    {
        var callerContext = await GetCallerContextAsync();
        if (!callerContext.isValid)
            return callerContext.errorResult!;

        var user = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null || !IsStaffUserDefaultRole(user.DefaultRole))
            return NotFound(new { message = "Personal operativo no encontrado" });

        var allowedCondoIds = await GetAllowedCondominiumIdsAsync(callerContext.role, callerContext.userId);
        if (!user.CondominiumRoles.Any(cr => allowedCondoIds.Contains(cr.CondominiumId)))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No puedes desactivar este personal" });

        user.Deactivate();
        await _context.SaveChangesAsync();

        return Ok(new { message = "Personal operativo dado de baja correctamente" });
    }

    [HttpPost("staff-users/{userId:guid}/activate")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> ActivateStaffUser(Guid userId)
    {
        var callerContext = await GetCallerContextAsync();
        if (!callerContext.isValid)
            return callerContext.errorResult!;

        var user = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null || !IsStaffUserDefaultRole(user.DefaultRole))
            return NotFound(new { message = "Personal operativo no encontrado" });

        var allowedCondoIds = await GetAllowedCondominiumIdsAsync(callerContext.role, callerContext.userId);
        if (!user.CondominiumRoles.Any(cr => allowedCondoIds.Contains(cr.CondominiumId)))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No puedes activar este personal" });

        user.Activate();
        await _context.SaveChangesAsync();

        return Ok(new { message = "Personal operativo activado correctamente" });
    }

    [HttpDelete("staff-users/{userId:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> DeleteStaffUser(Guid userId)
    {
        var callerContext = await GetCallerContextAsync();
        if (!callerContext.isValid)
            return callerContext.errorResult!;

        var user = await _context.Users
            .Include(u => u.CondominiumRoles)
            .FirstOrDefaultAsync(u => u.Id == userId && !u.IsDeleted);

        if (user == null || !IsStaffUserDefaultRole(user.DefaultRole))
            return NotFound(new { message = "Personal operativo no encontrado" });

        var allowedCondoIds = await GetAllowedCondominiumIdsAsync(callerContext.role, callerContext.userId);
        if (!user.CondominiumRoles.Any(cr => allowedCondoIds.Contains(cr.CondominiumId)))
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "No puedes eliminar este personal" });

        await _userRepository.DeleteAsync(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Personal operativo eliminado correctamente" });
    }

    /// <summary>
    /// Login with email and password
    /// </summary>
    [HttpPost("login")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        _logger.LogInformation("Login attempt for email: {Email}", request.Email);
        
        // Buscar usuario por email
        var user = await _userRepository.GetByEmailAsync(request.Email);
        
        if (user == null)
        {
            _logger.LogWarning("Login failed: User not found for email {Email}", request.Email);
            return Unauthorized(new { message = "Credenciales inválidas" });
        }

        if (!user.IsActive)
        {
            _logger.LogWarning("Login failed: Inactive user {Email}", request.Email);
            return Unauthorized(new { message = "Tu cuenta está desactivada" });
        }

        if (_configuration.GetValue<bool>("Auth:RequireConfirmedEmailForLogin") && !user.IsEmailConfirmed)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new
            {
                message = "Debes validar tu correo antes de iniciar sesión",
                code = "EMAIL_NOT_CONFIRMED"
            });
        }

        // Verificar contraseña
        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed: Invalid password for email {Email}", request.Email);
            return Unauthorized(new { message = "Credenciales inválidas" });
        }

        if (_passwordHasher.NeedsRehash(user.PasswordHash))
        {
            user.UpdatePassword(_passwordHasher.HashPassword(request.Password));
        }

        // Actualizar último login
        user.UpdateLastLogin();

        var authResponse = await IssueAuthTokensAsync(user, HttpContext.RequestAborted);

        _logger.LogInformation("Login successful for user {UserId}", user.Id);

        return Ok(authResponse);
    }

    /// <summary>
    /// Refresh access token
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Unauthorized(new { message = "Refresh token inválido" });
        }

        var user = await _context.Users
            .FirstOrDefaultAsync(u => !u.IsDeleted && u.RefreshToken == request.RefreshToken);

        if (user == null || !user.HasValidRefreshToken(request.RefreshToken, DateTime.UtcNow))
        {
            return Unauthorized(new { message = "Refresh token inválido o expirado" });
        }

        if (_configuration.GetValue<bool>("Auth:RequireConfirmedEmailForLogin") && !user.IsEmailConfirmed)
        {
            user.ClearRefreshToken();
            await _context.SaveChangesAsync(HttpContext.RequestAborted);
            return Unauthorized(new { message = "Debes validar tu correo antes de renovar la sesión" });
        }

        var authResponse = await IssueAuthTokensAsync(user, HttpContext.RequestAborted);
        return Ok(authResponse);
    }

    /// <summary>
    /// Logout and revoke refresh token
    /// </summary>
    [HttpPost("logout")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> Logout([FromBody] LogoutRequest? request)
    {
        var refreshToken = request?.RefreshToken?.Trim();
        var currentUserId = GetCurrentUserId();

        Domain.Entities.Authentication.User? user = null;

        if (currentUserId.HasValue)
        {
            user = await _userRepository.GetByIdIncludingDeletedAsync(currentUserId.Value);
        }

        if (user == null && !string.IsNullOrWhiteSpace(refreshToken))
        {
            user = await _context.Users
                .FirstOrDefaultAsync(u => !u.IsDeleted && u.RefreshToken == refreshToken, HttpContext.RequestAborted);
        }

        if (user != null && !string.IsNullOrWhiteSpace(user.RefreshToken))
        {
            user.ClearRefreshToken();
            await _context.SaveChangesAsync(HttpContext.RequestAborted);
            _logger.LogInformation("Logout successful for user {UserId}; refresh token revoked", user.Id);
        }
        else
        {
            _logger.LogInformation("Logout requested with no active refresh token to revoke");
        }

        return Ok(new { message = "Sesión cerrada correctamente" });
    }

    /// <summary>
    /// Request password reset
    /// </summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !IsValidEmail(request.Email.Trim()))
        {
            return Ok(new
            {
                Message = "Si el correo existe, enviaremos instrucciones para restablecer la contraseña"
            });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByEmailAsync(normalizedEmail);

        if (user != null && user.IsActive)
        {
            await IssuePasswordResetAsync(user, HttpContext.RequestAborted);
        }

        return Ok(new
        {
            Message = "Si el correo existe, enviaremos instrucciones para restablecer la contraseña"
        });
    }

    /// <summary>
    /// Confirm email address
    /// </summary>
    [HttpGet("confirm-email")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ConfirmEmail([FromQuery] Guid userId, [FromQuery] string token)
    {
        if (userId == Guid.Empty || string.IsNullOrWhiteSpace(token))
        {
            return BadRequest(new { message = "El enlace de verificación es inválido" });
        }

        var user = await _userRepository.GetByIdIncludingDeletedAsync(userId);
        if (user == null)
        {
            return BadRequest(new { message = "El enlace de verificación es inválido" });
        }

        if (user.IsEmailConfirmed)
        {
            return Ok(new { message = "Tu correo ya había sido confirmado" });
        }

        var tokenHash = ComputeTokenHash(token);
        if (!user.CanConfirmEmail(tokenHash, DateTime.UtcNow))
        {
            return BadRequest(new { message = "El enlace de verificación es inválido o expiró" });
        }

        user.ConfirmEmail();
        await _context.SaveChangesAsync();

        return Ok(new { message = "Correo confirmado correctamente" });
    }

    /// <summary>
    /// Resend email confirmation
    /// </summary>
    [HttpPost("resend-email-confirmation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ResendEmailConfirmation([FromBody] ResendEmailConfirmationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !IsValidEmail(request.Email.Trim()))
        {
            return Ok(new { message = "Si el correo existe y aún no está confirmado, enviaremos un nuevo enlace" });
        }

        var user = await _userRepository.GetByEmailAsync(request.Email.Trim().ToLowerInvariant());
        if (user != null && !user.IsEmailConfirmed && user.IsActive)
        {
            await IssueEmailConfirmationAsync(user, HttpContext.RequestAborted);
        }

        return Ok(new { message = "Si el correo existe y aún no está confirmado, enviaremos un nuevo enlace" });
    }

    /// <summary>
    /// Reset password using email token
    /// </summary>
    [HttpPost("reset-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
    {
        if (request.UserId == Guid.Empty || string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new { message = "La solicitud de restablecimiento es inválida" });
        }

        if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "La nueva contraseña debe tener al menos 6 caracteres" });
        }

        var user = await _userRepository.GetByIdIncludingDeletedAsync(request.UserId);
        if (user == null)
        {
            return BadRequest(new { message = "La solicitud de restablecimiento es inválida" });
        }

        var tokenHash = ComputeTokenHash(request.Token);
        if (!user.CanResetPassword(tokenHash, DateTime.UtcNow))
        {
            return BadRequest(new { message = "El enlace para restablecer contraseña es inválido o expiró" });
        }

        var newPasswordHash = _passwordHasher.HashPassword(request.NewPassword);
        user.UpdatePassword(newPasswordHash);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tu contraseña fue actualizada correctamente" });
    }

    /// <summary>
    /// Get all users (SuperAdmin only)
    /// </summary>
    [HttpGet("users")]
    [Authorize(Roles = "superadmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> GetAllUsers()
    {
        try
        {
            var users = await _userRepository.GetAllAsync();
            
            var userDtos = users.Select(u => new
            {
                Id = u.Id.ToString(),
                Email = u.Email,
                FirstName = u.FirstName,
                LastName = u.LastName,
                DefaultRole = u.DefaultRole,
                IsActive = u.IsActive,
                IsEmailConfirmed = u.IsEmailConfirmed,
                LastLoginAt = u.LastLoginAt,
                CreatedAt = u.CreatedAt
            }).ToList();

            return Ok(userDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting all users");
            return StatusCode(500, new { message = "Error al obtener usuarios" });
        }
    }

    /// <summary>
    /// Reset user password (SuperAdmin only)
    /// </summary>
    [HttpPost("admin-reset-password")]
    [Authorize(Roles = "superadmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AdminResetPassword([FromBody] AdminResetPasswordRequest request)
    {
        try
        {
            if (!Guid.TryParse(request.UserId, out var userId))
            {
                return BadRequest(new { message = "ID de usuario inválido" });
            }

            var user = await _userRepository.GetByIdAsync(userId);
            
            if (user == null)
            {
                return NotFound(new { message = "Usuario no encontrado" });
            }

            // Hash new password
            var newPasswordHash = _passwordHasher.HashPassword(request.NewPassword);
            user.UpdatePassword(newPasswordHash);
            
            await _userRepository.UpdateAsync(user);

            _logger.LogInformation("Password reset by admin for user {UserId}", userId);

            return Ok(new
            {
                Message = "Contraseña actualizada correctamente",
                Email = user.Email,
                UserId = user.Id.ToString()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for user {UserId}", request.UserId);
            return StatusCode(500, new { message = "Error al resetear contraseña" });
        }
    }

    /// <summary>
    /// Activate user (SuperAdmin only)
    /// </summary>
    [HttpPost("users/{userId}/activate")]
    [Authorize(Roles = "superadmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> ActivateUser(string userId)
    {
        try
        {
            if (!Guid.TryParse(userId, out var id))
            {
                return BadRequest(new { message = "ID de usuario inválido" });
            }

            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Usuario no encontrado" });
            }

            user.Activate();
            await _userRepository.UpdateAsync(user);

            return Ok(new { message = "Usuario activado correctamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating user {UserId}", userId);
            return StatusCode(500, new { message = "Error al activar usuario" });
        }
    }

    /// <summary>
    /// Deactivate user (SuperAdmin only)
    /// </summary>
    [HttpPost("users/{userId}/deactivate")]
    [Authorize(Roles = "superadmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeactivateUser(string userId)
    {
        try
        {
            if (!Guid.TryParse(userId, out var id))
            {
                return BadRequest(new { message = "ID de usuario inválido" });
            }

            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Usuario no encontrado" });
            }

            user.Deactivate();
            await _userRepository.UpdateAsync(user);

            return Ok(new { message = "Usuario desactivado correctamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating user {UserId}", userId);
            return StatusCode(500, new { message = "Error al desactivar usuario" });
        }
    }

    /// <summary>
    /// Delete user (SuperAdmin only)
    /// </summary>
    [HttpDelete("users/{userId}")]
    [Authorize(Roles = "superadmin")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteUser(string userId)
    {
        try
        {
            if (!Guid.TryParse(userId, out var id))
            {
                return BadRequest(new { message = "ID de usuario inválido" });
            }

            var user = await _userRepository.GetByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "Usuario no encontrado" });
            }

            await _userRepository.DeleteAsync(user);

            return Ok(new { message = "Usuario eliminado correctamente" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user {UserId}", userId);
            return StatusCode(500, new { message = "Error al eliminar usuario" });
        }
    }

    private async Task IssueEmailConfirmationAsync(Domain.Entities.Authentication.User user, CancellationToken cancellationToken)
    {
        if (user.IsEmailConfirmed)
        {
            return;
        }

        var token = GenerateSecureToken();
        var tokenHash = ComputeTokenHash(token);
        var expiresAt = DateTime.UtcNow.AddHours(_configuration.GetValue<int>("Auth:EmailConfirmationTokenExpirationHours", 48));
        user.SetEmailConfirmationToken(tokenHash, expiresAt);
        await _context.SaveChangesAsync(cancellationToken);

        var confirmationUrl = $"{GetFrontendBaseUrl()}/auth/confirm-email?userId={Uri.EscapeDataString(user.Id.ToString())}&token={Uri.EscapeDataString(token)}";

        await _emailService.SendEmailAsync(
            user.Email,
            "Confirma tu correo en NovaResidence",
            BuildEmailConfirmationBody(user.FirstName, confirmationUrl, expiresAt),
            cancellationToken);
    }

    private async Task IssuePasswordResetAsync(Domain.Entities.Authentication.User user, CancellationToken cancellationToken)
    {
        var token = GenerateSecureToken();
        var tokenHash = ComputeTokenHash(token);
        var expiresAt = DateTime.UtcNow.AddMinutes(_configuration.GetValue<int>("Auth:PasswordResetTokenExpirationMinutes", 60));
        user.SetPasswordResetToken(tokenHash, expiresAt);
        await _context.SaveChangesAsync(cancellationToken);

        var resetUrl = $"{GetFrontendBaseUrl()}/auth/reset-password?userId={Uri.EscapeDataString(user.Id.ToString())}&token={Uri.EscapeDataString(token)}";

        await _emailService.SendEmailAsync(
            user.Email,
            "Restablece tu contraseña en NovaResidence",
            BuildPasswordResetBody(user.FirstName, resetUrl, expiresAt),
            cancellationToken);
    }

    private async Task<object> IssueAuthTokensAsync(Domain.Entities.Authentication.User user, CancellationToken cancellationToken)
    {
        var role = MapTokenRole(user.DefaultRole);
        var accessToken = _jwtService.GenerateAccessToken(
            user.Id,
            user.Email,
            role,
            user.FirstName,
            user.LastName);

        var refreshToken = _jwtService.GenerateRefreshToken();
        var refreshExpiresAt = DateTime.UtcNow.AddDays(_configuration.GetSection("Jwt").GetValue<int>("RefreshTokenExpirationDays", 7));
        user.SetRefreshToken(refreshToken, refreshExpiresAt);
        await _context.SaveChangesAsync(cancellationToken);

        return new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = _jwtService.GetAccessTokenExpirationSeconds(),
            User = new
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = role,
                DefaultRole = user.DefaultRole
            }
        };
    }

    private Guid? GetCurrentUserId()
    {
        var claim = User.FindFirst("userId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;

        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    private string GetFrontendBaseUrl()
    {
        return (_configuration["Auth:FrontendBaseUrl"] ?? "http://localhost:5173").TrimEnd('/');
    }

    private static string GenerateSecureToken()
    {
        return WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));
    }

    private static string ComputeTokenHash(string token)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash);
    }

    private static string BuildEmailConfirmationBody(string firstName, string confirmationUrl, DateTime expiresAt)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(firstName);
        var safeUrl = System.Net.WebUtility.HtmlEncode(confirmationUrl);
        return $"""
            <div style=\"font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;\">
              <h1 style=\"margin:0 0 16px;font-size:28px;color:#0284c7;\">Confirma tu correo</h1>
              <p style=\"font-size:16px;line-height:1.6;\">Hola {safeName},</p>
              <p style=\"font-size:16px;line-height:1.6;\">Gracias por registrarte en NovaResidence. Para activar tu cuenta, confirma tu correo desde el siguiente enlace:</p>
              <p style=\"margin:24px 0;\">
                <a href=\"{safeUrl}\" style=\"display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;\">Confirmar correo</a>
              </p>
              <p style=\"font-size:14px;line-height:1.6;color:#475569;\">Este enlace vence el {expiresAt.ToLocalTime():dd/MM/yyyy HH:mm}.</p>
              <p style=\"font-size:14px;line-height:1.6;color:#475569;\">Si no solicitaste esta cuenta, puedes ignorar este mensaje.</p>
            </div>
            """;
    }

    private static string BuildPasswordResetBody(string firstName, string resetUrl, DateTime expiresAt)
    {
        var safeName = System.Net.WebUtility.HtmlEncode(firstName);
        var safeUrl = System.Net.WebUtility.HtmlEncode(resetUrl);
        return $"""
            <div style=\"font-family:Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a;\">
              <h1 style=\"margin:0 0 16px;font-size:28px;color:#0284c7;\">Restablece tu contraseña</h1>
              <p style=\"font-size:16px;line-height:1.6;\">Hola {safeName},</p>
              <p style=\"font-size:16px;line-height:1.6;\">Recibimos una solicitud para cambiar tu contraseña en NovaResidence. Usa el siguiente enlace para establecer una nueva:</p>
              <p style=\"margin:24px 0;\">
                <a href=\"{safeUrl}\" style=\"display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:700;\">Restablecer contraseña</a>
              </p>
              <p style=\"font-size:14px;line-height:1.6;color:#475569;\">Este enlace vence el {expiresAt.ToLocalTime():dd/MM/yyyy HH:mm}.</p>
              <p style=\"font-size:14px;line-height:1.6;color:#475569;\">Si no solicitaste el cambio, puedes ignorar este correo.</p>
            </div>
            """;
    }
}

public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string RefreshToken);
public record LogoutRequest(string? RefreshToken);
public record ForgotPasswordRequest(string Email);
public record ResetPasswordRequest(Guid UserId, string Token, string NewPassword);
public record ResendEmailConfirmationRequest(string Email);
public record AdminResetPasswordRequest(string UserId, string NewPassword);
public record CreateStaffUserRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string Role,
    Guid CondominiumId);

public record UpdateStaffUserRequest(
    string FirstName,
    string LastName,
    string? PhoneNumber,
    string Role,
    Guid CondominiumId);
