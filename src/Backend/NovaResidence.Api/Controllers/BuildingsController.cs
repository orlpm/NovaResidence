using Microsoft.AspNetCore.Mvc;
using MediatR;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class BuildingsController : ControllerBase
{
    private readonly IBuildingRepository _buildingRepository;
    private readonly ICondominiumRepository _condominiumRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<BuildingsController> _logger;

    public BuildingsController(
        IBuildingRepository buildingRepository,
        ICondominiumRepository condominiumRepository,
        IUnitOfWork unitOfWork,
        ILogger<BuildingsController> logger)
    {
        _buildingRepository = buildingRepository;
        _condominiumRepository = condominiumRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    /// <summary>
    /// Get building by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var building = await _buildingRepository.GetBuildingWithUnitsAsync(id);
        
        if (building == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Building not found"));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            building.Id,
            building.Name,
            building.Description,
            building.TotalFloors,
            building.StartsAtGroundFloor,
            TotalUnits = building.Units.Count,
            Units = building.Units.Select(u => new
            {
                u.Id,
                u.UnitNumber,
                u.Floor,
                u.Area,
                u.Bedrooms,
                u.Bathrooms
            })
        }));
    }

    /// <summary>
    /// Create a new building in a condominium
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBuildingRequest request)
    {
        var condominium = await _condominiumRepository.GetByIdAsync(request.CondominiumId);
        
        if (condominium == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Condominium not found"));
        }

        var building = Building.Create(
            request.CondominiumId,
            request.Name,
            request.TotalFloors,
            request.Description,
            request.StartsAtGroundFloor
        );

        await _buildingRepository.AddAsync(building);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Building {BuildingName} created for condominium {CondominiumId}", 
            building.Name, request.CondominiumId);

        return CreatedAtAction(nameof(GetById), new { id = building.Id }, 
            ApiResponse<object>.SuccessResponse(new { building.Id, building.Name }));
    }

    /// <summary>
    /// Delete a building
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var building = await _buildingRepository.GetByIdAsync(id);
        
        if (building == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Building not found"));
        }

        await _buildingRepository.DeleteAsync(building);
        await _unitOfWork.SaveChangesAsync();

        return Ok(ApiResponse<object>.SuccessResponse(null, "Building deleted"));
    }
}

public record CreateBuildingRequest(
    Guid CondominiumId,
    string Name,
    int TotalFloors,
    string? Description = null,
    bool StartsAtGroundFloor = false
);
