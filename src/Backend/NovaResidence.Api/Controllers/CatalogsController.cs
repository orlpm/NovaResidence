using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CatalogsController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public CatalogsController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("countries")]
    public async Task<IActionResult> GetCountries()
    {
        var countries = await _context.GeoCountries
            .AsNoTracking()
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new CountryDto(c.Id, c.Code, c.Name))
            .ToListAsync();

        return Ok(ApiResponse<List<CountryDto>>.SuccessResponse(countries));
    }

    [HttpGet("states")]
    public async Task<IActionResult> GetStates([FromQuery] Guid? countryId = null)
    {
        var query = _context.GeoStates
            .AsNoTracking()
            .Include(s => s.Country)
            .Where(s => s.IsActive)
            .AsQueryable();

        if (countryId.HasValue)
        {
            query = query.Where(s => s.CountryId == countryId.Value);
        }

        var states = await query
            .OrderBy(s => s.Name)
            .Select(s => new StateDto(
                s.Id,
                s.CountryId,
                s.Country != null ? s.Country.Code : string.Empty,
                s.Code,
                s.Name
            ))
            .ToListAsync();

        return Ok(ApiResponse<List<StateDto>>.SuccessResponse(states));
    }
}

public record CountryDto(Guid Id, string Code, string Name);
public record StateDto(Guid Id, Guid CountryId, string CountryCode, string Code, string Name);
