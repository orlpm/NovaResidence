using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommonAreasController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CommonAreasController> _logger;

    public CommonAreasController(ApplicationDbContext context, ILogger<CommonAreasController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId, [FromQuery] bool includeInactive = false)
    {
        try
        {
            var query = _context.CondominiumCommonAreas
                .AsNoTracking()
                .Where(x => x.CondominiumId == condominiumId);

            if (!includeInactive)
            {
                query = query.Where(x => x.IsActive);
            }

            var areas = await query
                .OrderBy(x => x.Name)
                .Select(x => new CommonAreaListDto(
                    x.Id,
                    x.CondominiumId,
                    x.Name,
                    x.Description,
                    x.Type,
                    GetCommonAreaTypeName(x.Type),
                    x.BuildingId,
                    x.Level,
                    x.IsActive,
                    x.CoordinateX,
                    x.CoordinateY,
                    x.ImageUrlsJson,
                    x.CreatedAt
                ))
                .ToListAsync();

            return Ok(ApiResponse<List<CommonAreaListDto>>.SuccessResponse(areas));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading common areas for condominium {CondominiumId}", condominiumId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar áreas comunes"));
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var area = await _context.CondominiumCommonAreas
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == id);

            if (area == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Área común no encontrada"));
            }

            var result = new CommonAreaDetailDto(
                area.Id,
                area.CondominiumId,
                area.Name,
                area.Description,
                area.Type,
                GetCommonAreaTypeName(area.Type),
                area.BuildingId,
                area.Level,
                area.IsActive,
                area.CoordinateX,
                area.CoordinateY,
                area.ImageUrlsJson,
                area.CreatedAt,
                area.UpdatedAt
            );

            return Ok(ApiResponse<CommonAreaDetailDto>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading common area {CommonAreaId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar área común"));
        }
    }

    [HttpPost]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Create([FromBody] CreateCommonAreaRequest request)
    {
        try
        {
            var area = CondominiumCommonArea.Create(
                request.CondominiumId,
                request.Name,
                request.Type,
                request.Description,
                request.BuildingId,
                request.Level,
                request.CoordinateX,
                request.CoordinateY,
                request.ImageUrlsJson);

            _context.CondominiumCommonAreas.Add(area);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<Guid>.SuccessResponse(area.Id, "Área común creada exitosamente"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating common area");
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al crear área común"));
        }
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCommonAreaRequest request)
    {
        try
        {
            var area = await _context.CondominiumCommonAreas.FindAsync(id);
            if (area == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Área común no encontrada"));
            }

            area.Update(
                request.Name,
                request.Type,
                request.Description,
                request.BuildingId,
                request.Level,
                request.CoordinateX,
                request.CoordinateY,
                request.ImageUrlsJson,
                request.IsActive);

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Área común actualizada exitosamente"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating common area {CommonAreaId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al actualizar área común"));
        }
    }

    [HttpPatch("{id:guid}/status")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetCommonAreaStatusRequest request)
    {
        try
        {
            var area = await _context.CondominiumCommonAreas.FindAsync(id);
            if (area == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Área común no encontrada"));
            }

            area.SetStatus(request.IsActive);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, request.IsActive ? "Área común activada" : "Área común desactivada"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing status for common area {CommonAreaId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cambiar estado de área común"));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var area = await _context.CondominiumCommonAreas.FindAsync(id);
            if (area == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Área común no encontrada"));
            }

            _context.CondominiumCommonAreas.Remove(area);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Área común eliminada"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting common area {CommonAreaId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al eliminar área común"));
        }
    }

    private static string GetCommonAreaTypeName(CommonAreaType type)
    {
        return type switch
        {
            CommonAreaType.Garden => "Jardín",
            CommonAreaType.Lobby => "Lobby",
            CommonAreaType.SharedParking => "Estacionamiento común",
            CommonAreaType.InternalRoad => "Vialidad interna",
            CommonAreaType.Hallway => "Pasillo",
            CommonAreaType.Terrace => "Terraza",
            CommonAreaType.Playground => "Área infantil",
            CommonAreaType.Rooftop => "Azotea",
            CommonAreaType.Stairs => "Escaleras",
            CommonAreaType.ElevatorZone => "Zona de elevadores",
            _ => "Otro"
        };
    }
}

public record CommonAreaListDto(
    Guid Id,
    Guid CondominiumId,
    string Name,
    string? Description,
    CommonAreaType Type,
    string TypeName,
    Guid? BuildingId,
    string? Level,
    bool IsActive,
    decimal? CoordinateX,
    decimal? CoordinateY,
    string? ImageUrlsJson,
    DateTime CreatedAt
);

public record CommonAreaDetailDto(
    Guid Id,
    Guid CondominiumId,
    string Name,
    string? Description,
    CommonAreaType Type,
    string TypeName,
    Guid? BuildingId,
    string? Level,
    bool IsActive,
    decimal? CoordinateX,
    decimal? CoordinateY,
    string? ImageUrlsJson,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record CreateCommonAreaRequest(
    Guid CondominiumId,
    string Name,
    CommonAreaType Type,
    string? Description,
    Guid? BuildingId,
    string? Level,
    decimal? CoordinateX,
    decimal? CoordinateY,
    string? ImageUrlsJson
);

public record UpdateCommonAreaRequest(
    string Name,
    CommonAreaType Type,
    string? Description,
    Guid? BuildingId,
    string? Level,
    decimal? CoordinateX,
    decimal? CoordinateY,
    string? ImageUrlsJson,
    bool IsActive
);

public record SetCommonAreaStatusRequest(bool IsActive);
