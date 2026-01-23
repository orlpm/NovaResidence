using Microsoft.AspNetCore.Mvc;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Shared.Models;
using DomainUnit = NovaResidence.Domain.Entities.Condominiums.Unit;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class UnitsController : ControllerBase
{
    private readonly IUnitRepository _unitRepository;
    private readonly IBuildingRepository _buildingRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UnitsController> _logger;

    public UnitsController(
        IUnitRepository unitRepository,
        IBuildingRepository buildingRepository,
        IUnitOfWork unitOfWork,
        ILogger<UnitsController> logger)
    {
        _unitRepository = unitRepository;
        _buildingRepository = buildingRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    /// <summary>
    /// Get unit by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var unit = await _unitRepository.GetByIdAsync(id);
        
        if (unit == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Unit not found"));
        }

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            unit.Id,
            unit.UnitNumber,
            unit.Floor,
            unit.Area,
            unit.Bedrooms,
            unit.Bathrooms,
            unit.Status,
            unit.MonthlyMaintenanceFee
        }));
    }

    /// <summary>
    /// Create a new unit in a building
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUnitRequest request)
    {
        var building = await _buildingRepository.GetByIdAsync(request.BuildingId);
        
        if (building == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Building not found"));
        }

        var unit = DomainUnit.Create(
            request.BuildingId,
            request.UnitNumber,
            request.Floor,
            request.Area ?? 50m,
            request.Bedrooms ?? 2,
            request.Bathrooms ?? 1,
            request.MonthlyMaintenanceFee ?? 100m
        );

        await _unitRepository.AddAsync(unit);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Unit {UnitNumber} created in building {BuildingId}", 
            unit.UnitNumber, request.BuildingId);

        return CreatedAtAction(nameof(GetById), new { id = unit.Id }, 
            ApiResponse<object>.SuccessResponse(new { unit.Id, unit.UnitNumber }));
    }

    /// <summary>
    /// Delete a unit
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var unit = await _unitRepository.GetByIdAsync(id);
        
        if (unit == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Unit not found"));
        }

        await _unitRepository.DeleteAsync(unit);
        await _unitOfWork.SaveChangesAsync();

        return Ok(ApiResponse<object>.SuccessResponse(null, "Unit deleted"));
    }

    /// <summary>
    /// Update a unit
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUnitRequest request)
    {
        var unit = await _unitRepository.GetByIdAsync(id);
        
        if (unit == null)
        {
            return NotFound(ApiResponse<object>.FailureResponse("Unit not found"));
        }

        // Update unit properties
        if (!string.IsNullOrWhiteSpace(request.UnitNumber))
        {
            // Using reflection to update private setter or add a method to domain entity
            var unitNumberProp = typeof(DomainUnit).GetProperty(nameof(DomainUnit.UnitNumber));
            unitNumberProp?.SetValue(unit, request.UnitNumber);
        }

        if (request.Floor.HasValue)
        {
            var floorProp = typeof(DomainUnit).GetProperty(nameof(DomainUnit.Floor));
            floorProp?.SetValue(unit, request.Floor.Value);
        }

        if (request.Area.HasValue)
        {
            var areaProp = typeof(DomainUnit).GetProperty(nameof(DomainUnit.Area));
            areaProp?.SetValue(unit, request.Area.Value);
        }

        if (request.Bedrooms.HasValue)
        {
            var bedroomsProp = typeof(DomainUnit).GetProperty(nameof(DomainUnit.Bedrooms));
            bedroomsProp?.SetValue(unit, request.Bedrooms.Value);
        }

        if (request.Bathrooms.HasValue)
        {
            var bathroomsProp = typeof(DomainUnit).GetProperty(nameof(DomainUnit.Bathrooms));
            bathroomsProp?.SetValue(unit, request.Bathrooms.Value);
        }

        if (request.MonthlyMaintenanceFee.HasValue)
        {
            var feeProp = typeof(DomainUnit).GetProperty(nameof(DomainUnit.MonthlyMaintenanceFee));
            feeProp?.SetValue(unit, request.MonthlyMaintenanceFee.Value);
        }

        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Unit {UnitId} updated successfully", id);

        return Ok(ApiResponse<object>.SuccessResponse(new
        {
            unit.Id,
            unit.UnitNumber,
            unit.Floor,
            unit.Area,
            unit.Bedrooms,
            unit.Bathrooms,
            unit.MonthlyMaintenanceFee
        }, "Unit updated successfully"));
    }
}

public record CreateUnitRequest(
    Guid BuildingId,
    string UnitNumber,
    int Floor,
    decimal? Area = null,
    int? Bedrooms = null,
    int? Bathrooms = null,
    decimal? MonthlyMaintenanceFee = null
);

public record UpdateUnitRequest(
    string? UnitNumber = null,
    int? Floor = null,
    decimal? Area = null,
    int? Bedrooms = null,
    int? Bathrooms = null,
    decimal? MonthlyMaintenanceFee = null
);
