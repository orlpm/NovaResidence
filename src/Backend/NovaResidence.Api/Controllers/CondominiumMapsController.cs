using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Domain.Entities.Maps;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CondominiumMapsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CondominiumMapsController> _logger;
    private readonly IWebHostEnvironment _env;

    public CondominiumMapsController(ApplicationDbContext context, ILogger<CondominiumMapsController> logger, IWebHostEnvironment env)
    {
        _context = context;
        _logger = logger;
        _env = env;
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        try
        {
            var maps = await _context.CondominiumMaps
                .AsNoTracking()
                .Where(m => m.CondominiumId == condominiumId)
                .OrderBy(m => m.Name)
                .Select(m => new CondominiumMapListDto(
                    m.Id,
                    m.CondominiumId,
                    m.Name,
                    m.Description,
                    m.ScopeType,
                    GetScopeTypeName(m.ScopeType),
                    m.ScopeReference,
                    m.BackgroundImageUrl,
                    m.IsActive,
                    m.CreatedAt
                ))
                .ToListAsync();

            return Ok(ApiResponse<List<CondominiumMapListDto>>.SuccessResponse(maps));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading maps for condominium {CondominiumId}", condominiumId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar mapas"));
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        try
        {
            var map = await _context.CondominiumMaps
                .AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == id);

            if (map == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Mapa no encontrado"));
            }

            var markers = await _context.CondominiumMapMarkers
                .AsNoTracking()
                .Where(mm => mm.CondominiumMapId == map.Id)
                .OrderBy(mm => mm.LayerName)
                .ThenBy(mm => mm.Label)
                .Select(mm => new CondominiumMapMarkerDto(
                    mm.Id,
                    mm.CondominiumMapId,
                    mm.Label,
                    mm.Tooltip,
                    mm.MarkerType,
                    GetMarkerTypeName(mm.MarkerType),
                    mm.MarkerColor,
                    mm.CoordinateX,
                    mm.CoordinateY,
                    mm.LayerName,
                    mm.LayerEnabledByDefault,
                    mm.IsActive,
                    mm.AmenityId,
                    mm.CommonAreaId,
                    mm.BuildingId,
                    mm.UnitId,
                    mm.ExternalReference
                ))
                .ToListAsync();

            var layers = markers
                .GroupBy(x => x.LayerName)
                .Select(g => new CondominiumMapLayerDto(
                    g.Key,
                    g.First().LayerEnabledByDefault,
                    g.Count()))
                .OrderBy(x => x.LayerName)
                .ToList();

            var result = new CondominiumMapDetailDto(
                map.Id,
                map.CondominiumId,
                map.Name,
                map.Description,
                map.ScopeType,
                GetScopeTypeName(map.ScopeType),
                map.ScopeReference,
                map.BackgroundImageUrl,
                map.IsActive,
                map.CreatedAt,
                map.UpdatedAt,
                markers,
                layers
            );

            return Ok(ApiResponse<CondominiumMapDetailDto>.SuccessResponse(result));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error loading map {MapId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al cargar mapa"));
        }
    }

    [HttpPost]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Create([FromBody] CreateCondominiumMapRequest request)
    {
        try
        {
            var map = CondominiumMap.Create(
                request.CondominiumId,
                request.Name,
                request.ScopeType,
                request.ScopeReference,
                request.Description,
                request.BackgroundImageUrl);

            _context.CondominiumMaps.Add(map);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<Guid>.SuccessResponse(map.Id, "Mapa creado exitosamente"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating map");
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al crear mapa"));
        }
    }

    [HttpPost("upload-background")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<ActionResult<string>> UploadBackgroundImage([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest("No se proporcionó archivo");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!allowedExtensions.Contains(ext))
            return BadRequest("Formato de archivo no válido. Use JPG, PNG o WEBP.");

        if (file.Length > 5 * 1024 * 1024)
            return BadRequest("El archivo no debe superar los 5MB.");

        var uploadsFolder = Path.Combine(_env.ContentRootPath, "uploads", "map-backgrounds");
        Directory.CreateDirectory(uploadsFolder);

        var uniqueFileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsFolder, uniqueFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var fileUrl = $"{Request.Scheme}://{Request.Host}/uploads/map-backgrounds/{uniqueFileName}";
        return Ok(fileUrl);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateCondominiumMapRequest request)
    {
        try
        {
            var map = await _context.CondominiumMaps.FindAsync(id);
            if (map == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Mapa no encontrado"));
            }

            map.Update(
                request.Name,
                request.ScopeType,
                request.ScopeReference,
                request.Description,
                request.BackgroundImageUrl,
                request.IsActive);

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Mapa actualizado"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating map {MapId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al actualizar mapa"));
        }
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Delete(Guid id)
    {
        try
        {
            var map = await _context.CondominiumMaps.FindAsync(id);
            if (map == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Mapa no encontrado"));
            }

            _context.CondominiumMaps.Remove(map);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Mapa eliminado"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting map {MapId}", id);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al eliminar mapa"));
        }
    }

    [HttpPost("{mapId:guid}/markers")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> CreateMarker(Guid mapId, [FromBody] CreateCondominiumMapMarkerRequest request)
    {
        try
        {
            var mapExists = await _context.CondominiumMaps.AnyAsync(m => m.Id == mapId);
            if (!mapExists)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Mapa no encontrado"));
            }

            var marker = CondominiumMapMarker.Create(
                mapId,
                request.Label,
                request.MarkerType,
                request.CoordinateX,
                request.CoordinateY,
                request.MarkerColor,
                request.LayerName,
                request.LayerEnabledByDefault,
                request.Tooltip,
                request.AmenityId,
                request.CommonAreaId,
                request.BuildingId,
                request.UnitId,
                request.ExternalReference);

            _context.CondominiumMapMarkers.Add(marker);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<Guid>.SuccessResponse(marker.Id, "Marcador creado"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating marker for map {MapId}", mapId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al crear marcador"));
        }
    }

    [HttpPut("markers/{markerId:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> UpdateMarker(Guid markerId, [FromBody] UpdateCondominiumMapMarkerRequest request)
    {
        try
        {
            var marker = await _context.CondominiumMapMarkers.FindAsync(markerId);
            if (marker == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Marcador no encontrado"));
            }

            marker.Update(
                request.Label,
                request.MarkerType,
                request.CoordinateX,
                request.CoordinateY,
                request.MarkerColor,
                request.LayerName,
                request.LayerEnabledByDefault,
                request.Tooltip,
                request.AmenityId,
                request.CommonAreaId,
                request.BuildingId,
                request.UnitId,
                request.ExternalReference,
                request.IsActive);

            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Marcador actualizado"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating marker {MarkerId}", markerId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al actualizar marcador"));
        }
    }

    [HttpDelete("markers/{markerId:guid}")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> DeleteMarker(Guid markerId)
    {
        try
        {
            var marker = await _context.CondominiumMapMarkers.FindAsync(markerId);
            if (marker == null)
            {
                return NotFound(ApiResponse<object>.FailureResponse("Marcador no encontrado"));
            }

            _context.CondominiumMapMarkers.Remove(marker);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.SuccessResponse(null!, "Marcador eliminado"));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting marker {MarkerId}", markerId);
            return StatusCode(500, ApiResponse<object>.FailureResponse("Error al eliminar marcador"));
        }
    }

    private static string GetScopeTypeName(MapScopeType type)
    {
        return type switch
        {
            MapScopeType.Level => "Nivel",
            MapScopeType.Building => "Edificio",
            MapScopeType.Section => "Sección",
            _ => "Agrupación personalizada"
        };
    }

    private static string GetMarkerTypeName(CondominiumMarkerType type)
    {
        return type switch
        {
            CondominiumMarkerType.Amenity => "Amenidad",
            CondominiumMarkerType.CommonArea => "Área común",
            CondominiumMarkerType.Building => "Edificio",
            CondominiumMarkerType.HousingUnit => "Vivienda",
            CondominiumMarkerType.CommercialUnit => "Local comercial",
            _ => "Genérico"
        };
    }
}

public record CondominiumMapListDto(
    Guid Id,
    Guid CondominiumId,
    string Name,
    string? Description,
    MapScopeType ScopeType,
    string ScopeTypeName,
    string ScopeReference,
    string? BackgroundImageUrl,
    bool IsActive,
    DateTime CreatedAt
);

public record CondominiumMapDetailDto(
    Guid Id,
    Guid CondominiumId,
    string Name,
    string? Description,
    MapScopeType ScopeType,
    string ScopeTypeName,
    string ScopeReference,
    string? BackgroundImageUrl,
    bool IsActive,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<CondominiumMapMarkerDto> Markers,
    List<CondominiumMapLayerDto> Layers
);

public record CondominiumMapMarkerDto(
    Guid Id,
    Guid CondominiumMapId,
    string Label,
    string? Tooltip,
    CondominiumMarkerType MarkerType,
    string MarkerTypeName,
    string MarkerColor,
    decimal CoordinateX,
    decimal CoordinateY,
    string LayerName,
    bool LayerEnabledByDefault,
    bool IsActive,
    Guid? AmenityId,
    Guid? CommonAreaId,
    Guid? BuildingId,
    Guid? UnitId,
    string? ExternalReference
);

public record CondominiumMapLayerDto(
    string LayerName,
    bool EnabledByDefault,
    int MarkerCount
);

public record CreateCondominiumMapRequest(
    Guid CondominiumId,
    string Name,
    string? Description,
    MapScopeType ScopeType,
    string ScopeReference,
    string? BackgroundImageUrl
);

public record UpdateCondominiumMapRequest(
    string Name,
    string? Description,
    MapScopeType ScopeType,
    string ScopeReference,
    string? BackgroundImageUrl,
    bool IsActive
);

public record CreateCondominiumMapMarkerRequest(
    string Label,
    string? Tooltip,
    CondominiumMarkerType MarkerType,
    string MarkerColor,
    decimal CoordinateX,
    decimal CoordinateY,
    string LayerName,
    bool LayerEnabledByDefault,
    Guid? AmenityId,
    Guid? CommonAreaId,
    Guid? BuildingId,
    Guid? UnitId,
    string? ExternalReference
);

public record UpdateCondominiumMapMarkerRequest(
    string Label,
    string? Tooltip,
    CondominiumMarkerType MarkerType,
    string MarkerColor,
    decimal CoordinateX,
    decimal CoordinateY,
    string LayerName,
    bool LayerEnabledByDefault,
    bool IsActive,
    Guid? AmenityId,
    Guid? CommonAreaId,
    Guid? BuildingId,
    Guid? UnitId,
    string? ExternalReference
);
