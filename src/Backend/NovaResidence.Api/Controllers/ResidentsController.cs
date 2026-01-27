using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ResidentsController : ControllerBase
{
    private readonly IResidentRepository _residentRepository;
    private readonly IUnitRepository _unitRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ResidentsController> _logger;

    public ResidentsController(
        IResidentRepository residentRepository,
        IUnitRepository unitRepository,
        IUnitOfWork unitOfWork,
        ILogger<ResidentsController> logger)
    {
        _residentRepository = residentRepository;
        _unitRepository = unitRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    /// <summary>
    /// Get all residents for a unit
    /// </summary>
    [HttpGet("unit/{unitId:guid}")]
    public async Task<IActionResult> GetByUnit(Guid unitId)
    {
        var residents = await _residentRepository.GetActiveResidentsByUnitAsync(unitId);
        
        var result = residents.Select(r => new ResidentDto(
            r.Id,
            r.FirstName,
            r.LastName,
            r.Email,
            r.PhoneNumber,
            r.Type.ToString(),
            r.IsRegistered,
            r.IsActive,
            r.MoveInDate,
            r.MoveOutDate
        )).ToList();

        return Ok(ApiResponse<List<ResidentDto>>.SuccessResponse(result));
    }

    /// <summary>
    /// Get all residents for a condominium
    /// </summary>
    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        var residents = await _residentRepository.GetResidentsByCondominiumAsync(condominiumId);
        
        var result = residents.Select(r => new ResidentWithUnitDto(
            r.Id,
            r.FirstName,
            r.LastName,
            r.Email,
            r.PhoneNumber,
            r.Type.ToString(),
            r.IsRegistered,
            r.IsActive,
            r.MoveInDate,
            r.MoveOutDate,
            r.UnitId,
            r.Unit?.UnitNumber ?? "",
            r.Unit?.Building?.Name ?? ""
        )).ToList();

        return Ok(ApiResponse<List<ResidentWithUnitDto>>.SuccessResponse(result));
    }

    /// <summary>
    /// Get resident by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var resident = await _residentRepository.GetByIdAsync(id);
        
        if (resident == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Residente no encontrado"));
        }

        var result = new ResidentDto(
            resident.Id,
            resident.FirstName,
            resident.LastName,
            resident.Email,
            resident.PhoneNumber,
            resident.Type.ToString(),
            resident.IsRegistered,
            resident.IsActive,
            resident.MoveInDate,
            resident.MoveOutDate
        );

        return Ok(ApiResponse<ResidentDto>.SuccessResponse(result));
    }

    /// <summary>
    /// Get resident information by User ID (for resident portal)
    /// </summary>
    [HttpGet("by-user/{userId:guid}")]
    public async Task<IActionResult> GetByUserId(Guid userId)
    {
        var resident = await _residentRepository.GetByUserIdAsync(userId);
        
        if (resident == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("No se encontró información de residente para este usuario"));
        }

        // Get unit information with building
        var unit = await _unitRepository.GetByIdAsync(resident.UnitId);
        
        // Get condominiumId from building
        Guid? condominiumId = unit?.Building?.CondominiumId;
        
        var result = new ResidentWithUnitDto(
            resident.Id,
            resident.FirstName,
            resident.LastName,
            resident.Email,
            resident.PhoneNumber,
            resident.Type.ToString(),
            resident.IsRegistered,
            resident.IsActive,
            resident.MoveInDate,
            resident.MoveOutDate,
            resident.UnitId,
            unit?.UnitNumber ?? "N/A",
            unit?.Building?.Name ?? "N/A",
            condominiumId
        );

        return Ok(ApiResponse<ResidentWithUnitDto>.SuccessResponse(result));
    }

    /// <summary>
    /// Create a new resident
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateResidentRequest request)
    {
        // Verify unit exists
        var unit = await _unitRepository.GetByIdAsync(request.UnitId);
        if (unit == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Unidad no encontrada"));
        }

        // Parse resident type
        if (!Enum.TryParse<ResidentType>(request.Type, true, out var residentType))
        {
            residentType = ResidentType.Owner;
        }

        var resident = Resident.Create(
            request.UnitId,
            request.FirstName,
            request.LastName,
            request.Email,
            request.PhoneNumber ?? string.Empty,
            residentType
        );

        await _residentRepository.AddAsync(resident);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Resident {Name} created for unit {UnitId}", 
            resident.FullName, request.UnitId);

        return CreatedAtAction(nameof(GetById), new { id = resident.Id }, 
            ApiResponse<object>.SuccessResponse(new 
            { 
                resident.Id, 
                resident.FirstName, 
                resident.LastName 
            }, "Residente creado exitosamente"));
    }

    /// <summary>
    /// Update a resident
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateResidentRequest request)
    {
        var resident = await _residentRepository.GetByIdAsync(id);
        
        if (resident == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Residente no encontrado"));
        }

        resident.Update(
            request.FirstName ?? resident.FirstName,
            request.LastName ?? resident.LastName,
            request.Email ?? resident.Email,
            request.PhoneNumber ?? resident.PhoneNumber
        );

        if (!string.IsNullOrEmpty(request.Type) && 
            Enum.TryParse<ResidentType>(request.Type, true, out var residentType))
        {
            resident.ChangeType(residentType);
        }

        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Resident {Id} updated", id);

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            resident.Id,
            resident.FirstName,
            resident.LastName,
            resident.Email,
            resident.PhoneNumber,
            Type = resident.Type.ToString()
        }, "Residente actualizado exitosamente"));
    }

    /// <summary>
    /// Delete (deactivate) a resident
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var resident = await _residentRepository.GetByIdAsync(id);
        
        if (resident == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Residente no encontrado"));
        }

        resident.Deactivate();
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Resident {Id} deactivated", id);

        return Ok(ApiResponse<object>.SuccessResponse(null, "Residente eliminado"));
    }

    /// <summary>
    /// Generate invitation link for a resident
    /// </summary>
    [HttpPost("{id:guid}/invite")]
    public async Task<IActionResult> SendInvitation(Guid id)
    {
        var resident = await _residentRepository.GetByIdAsync(id);
        
        if (resident == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Residente no encontrado"));
        }

        if (resident.IsRegistered)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("El residente ya está registrado"));
        }

        resident.GenerateInvitationToken();
        await _unitOfWork.SaveChangesAsync();

        // Generate invitation URL - frontend runs on HTTP port 3000
        // Format: /invitation/register/{unitId}/{token}
        var invitationUrl = $"http://localhost:3000/invitation/register/{resident.UnitId}/{resident.InvitationToken}";

        _logger.LogInformation("Invitation generated for resident {Id}, unitId: {UnitId}, token: {Token}", 
            id, resident.UnitId, resident.InvitationToken);

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            invitationUrl,
            token = resident.InvitationToken,
            expiresIn = "7 días"
        }, "Invitación generada exitosamente"));
    }

    /// <summary>
    /// Verify invitation token for a specific unit
    /// </summary>
    [AllowAnonymous]
    [HttpGet("verify-invitation/{unitId:guid}/{token}")]
    public async Task<IActionResult> VerifyInvitation(Guid unitId, string token)
    {
        var resident = await _residentRepository.GetByInvitationTokenAsync(token);
        
        if (resident == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Token de invitación inválido o expirado"));
        }

        // Verify that the token belongs to the correct unit
        if (resident.UnitId != unitId)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("La invitación no corresponde a esta unidad"));
        }

        if (resident.IsRegistered)
        {
            return BadRequest(ApiResponse<object>.FailureResponse("Esta invitación ya fue utilizada"));
        }

        // Get unit information
        var unit = await _unitRepository.GetByIdAsync(unitId);
        var unitNumber = unit?.UnitNumber ?? "N/A";

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            resident.FirstName,
            resident.LastName,
            resident.Email,
            resident.PhoneNumber,
            UnitId = resident.UnitId,
            UnitNumber = unitNumber,
            Type = resident.Type.ToString(),
            ResidentId = resident.Id
        }, "Token válido"));
    }

    /// <summary>
    /// Link all unlinked residents to their user accounts based on email match
    /// </summary>
    [HttpPost("link-users")]
    public async Task<IActionResult> LinkUsersToResidents()
    {
        var linkedCount = 0;
        var errors = new List<string>();
        
        try
        {
            // Get all residents without a linked user
            var residents = await _residentRepository.GetResidentsWithoutUserAsync();

            foreach (var resident in residents)
            {
                // Find user with matching email
                var user = await _unitOfWork.Users.GetByEmailAsync(resident.Email);
                if (user != null)
                {
                    resident.MarkAsRegistered(user.Id);
                    linkedCount++;
                    _logger.LogInformation("Linked resident {ResidentId} ({Email}) to user {UserId}", 
                        resident.Id, resident.Email, user.Id);
                }
            }

            await _unitOfWork.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(new 
            { 
                LinkedCount = linkedCount,
                Message = $"Se vincularon {linkedCount} residentes con sus cuentas de usuario"
            }));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error linking users to residents");
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al vincular usuarios"));
        }
    }
}

public record ResidentDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    string Type,
    bool IsRegistered,
    bool IsActive,
    DateTime? MoveInDate,
    DateTime? MoveOutDate
);

public record ResidentWithUnitDto(
    Guid Id,
    string FirstName,
    string LastName,
    string Email,
    string PhoneNumber,
    string Type,
    bool IsRegistered,
    bool IsActive,
    DateTime? MoveInDate,
    DateTime? MoveOutDate,
    Guid UnitId,
    string UnitNumber,
    string BuildingName,
    Guid? CondominiumId = null
);

public record CreateResidentRequest(
    Guid UnitId,
    string FirstName,
    string LastName,
    string Email,
    string? PhoneNumber = null,
    string Type = "Owner"
);

public record UpdateResidentRequest(
    string? FirstName = null,
    string? LastName = null,
    string? Email = null,
    string? PhoneNumber = null,
    string? Type = null
);
