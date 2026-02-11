using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using NovaResidence.Application.Features.Authentication.Commands.Register;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Shared.Models;

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

    public AuthController(
        IMediator mediator, 
        ILogger<AuthController> logger,
        IUserRepository userRepository,
        IPasswordHasher passwordHasher,
        IJwtService jwtService)
    {
        _mediator = mediator;
        _logger = logger;
        _userRepository = userRepository;
        _passwordHasher = passwordHasher;
        _jwtService = jwtService;
    }

    /// <summary>
    /// Register a new user
    /// </summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(ApiResponse<RegisterUserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ApiResponse<RegisterUserResponse>), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterUserCommand command)
    {
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
        var role = user.DefaultRole.ToLower() == "admin" ? "admin" : 
                   user.DefaultRole.ToLower() == "superadmin" ? "superadmin" :
                   user.DefaultRole.ToLower() == "resident" ? "resident" : "admin";
        
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
