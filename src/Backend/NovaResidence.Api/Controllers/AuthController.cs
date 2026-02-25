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

    public AuthController(
        IMediator mediator, 
        ILogger<AuthController> logger,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtService jwtService,
        IApplicationDbContext context)
    {
        _mediator = mediator;
        _logger = logger;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
        _context = context;
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
            return Ok(ApiResponse<RegisterUserResponse>.SuccessResponse(
                result.Value,
                "User registered successfully"));
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

        // Verificar contraseña
        if (!_passwordHasher.VerifyPassword(request.Password, user.PasswordHash))
        {
            _logger.LogWarning("Login failed: Invalid password for email {Email}", request.Email);
            return Unauthorized(new { message = "Credenciales inválidas" });
        }

        // Actualizar último login
        user.UpdateLastLogin();

        // Generar JWT tokens
        var role = MapTokenRole(user.DefaultRole);
        
        var accessToken = _jwtService.GenerateAccessToken(
            user.Id, 
            user.Email, 
            role, 
            user.FirstName, 
            user.LastName);
        
        var refreshToken = _jwtService.GenerateRefreshToken();
        var expiresIn = _jwtService.GetAccessTokenExpirationSeconds();

        _logger.LogInformation("Login successful for user {UserId}", user.Id);

        return Ok(new
        {
            AccessToken = accessToken,
            RefreshToken = refreshToken,
            ExpiresIn = expiresIn,
            User = new
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Role = role
            }
        });
    }

    /// <summary>
    /// Refresh access token
    /// </summary>
    [HttpPost("refresh")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        // TODO: Validate refresh token against stored tokens
        // For now, generate new tokens (should validate stored refresh token in production)
        var newAccessToken = _jwtService.GenerateRefreshToken(); // Temporary - should regenerate from user data
        var newRefreshToken = _jwtService.GenerateRefreshToken();
        var expiresIn = _jwtService.GetAccessTokenExpirationSeconds();

        return Ok(new
        {
            AccessToken = newAccessToken,
            RefreshToken = newRefreshToken,
            ExpiresIn = expiresIn
        });
    }

    /// <summary>
    /// Request password reset
    /// </summary>
    [HttpPost("forgot-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
    {
        // TODO: Implement forgot password command
        return Ok(new { Message = "Password reset email sent" });
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
}

public record LoginRequest(string Email, string Password);
public record RefreshTokenRequest(string RefreshToken);
public record ForgotPasswordRequest(string Email);
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
