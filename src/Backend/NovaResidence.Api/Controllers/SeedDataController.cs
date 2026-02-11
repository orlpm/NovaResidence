using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Domain.Entities.Condominiums;
using NovaResidence.Domain.Enums;
using NovaResidence.Domain.ValueObjects;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SeedDataController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SeedDataController> _logger;

    public SeedDataController(ApplicationDbContext context, ILogger<SeedDataController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Seed test data for Clara Tur as a resident
    /// WARNING: This is a development-only endpoint
    /// </summary>
    [HttpPost("create-test-data")]
    public async Task<IActionResult> CreateTestData()
    {
        try
        {
            // Get Clara Tur's user ID
            var clara = await _context.Users
                .Where(u => u.Email == "clara@gmail.com")
                .FirstOrDefaultAsync();

            if (clara == null)
            {
                return NotFound(new { error = "Usuario Clara Tur no encontrado" });
            }

            _logger.LogInformation("Found Clara Tur with ID: {UserId}", clara.Id);

            // Check if condominium exists
            var condominium = await _context.Condominiums
                .FirstOrDefaultAsync(c => c.Name == "Condominio Demo");

            if (condominium == null)
            {
                // Create address
                var address = Address.Create(
                    "Av. Principal",
                    "Monterrey",
                    "Nuevo León",
                    "64000",
                    "México",
                    "123",
                    "",
                    "Centro"
                );

                // Create a default subscription plan ID
                var subscriptionPlanId = Guid.NewGuid();

                // Create condominium
                condominium = Condominium.Create(
                    "Condominio Demo",
                    address,
                    subscriptionPlanId,
                    "Condominio de prueba para desarrollo",
                    "XAXX010101000",
                    "Condominio Demo SA de CV"
                );

                _context.Condominiums.Add(condominium);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Created condominium with ID: {CondominiumId}", condominium.Id);
            }

            // Check if building exists
            var building = await _context.Buildings
                .FirstOrDefaultAsync(b => b.Name == "Torre A" && b.CondominiumId == condominium.Id);

            if (building == null)
            {
                // Create building
                building = Building.Create(
                    condominium.Id,
                    "Torre A",
                    10,
                    "Edificio principal del condominio"
                );

                _context.Buildings.Add(building);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created building with ID: {BuildingId}", building.Id);
            }

            // Check if unit exists
            var unit = await _context.Units
                .FirstOrDefaultAsync(u => u.UnitNumber == "101" && u.BuildingId == building.Id);

            if (unit == null)
            {
                // Create unit
                unit = Unit.Create(
                    building.Id,
                    "101",
                    1,
                    85.5m,
                    2,
                    2,
                    2500.00m
                );

                // Set status to Occupied using reflection
                typeof(Unit).GetProperty("Status")!.SetValue(unit, UnitStatus.Occupied);

                _context.Units.Add(unit);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Created unit with ID: {UnitId}", unit.Id);
            }

            // Check if Clara is already a resident
            var existingResident = await _context.Residents
                .FirstOrDefaultAsync(r => r.UserId == clara.Id);

            if (existingResident != null)
            {
                _logger.LogInformation("Clara Tur is already registered as a resident");
                
                // Update her unit if needed
                if (existingResident.UnitId != unit.Id)
                {
                    typeof(Resident).GetProperty("UnitId")!.SetValue(existingResident, unit.Id);
                    await _context.SaveChangesAsync();
                    _logger.LogInformation("Updated resident unit to {UnitId}", unit.Id);
                }
                
                return Ok(new
                {
                    message = "Datos de prueba ya existen y fueron actualizados",
                    resident = new
                    {
                        existingResident.Id,
                        Name = $"{existingResident.FirstName} {existingResident.LastName}",
                        existingResident.Email,
                        UnitNumber = unit.UnitNumber,
                        Building = building.Name,
                        Condominium = condominium.Name
                    }
                });
            }

            // Create resident for Clara
            var resident = Resident.Create(
                unit.Id,
                "Clara",
                "Tur",
                "clara@gmail.com",
                "555-0101",
                ResidentType.Owner
            );

            // Mark as registered with Clara's user ID
            resident.MarkAsRegistered(clara.Id);

            _context.Residents.Add(resident);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created resident for Clara Tur with ID: {ResidentId}", resident.Id);

            return Ok(new
            {
                message = "Datos de prueba creados exitosamente",
                resident = new
                {
                    resident.Id,
                    Name = $"{resident.FirstName} {resident.LastName}",
                    resident.Email,
                    UnitNumber = unit.UnitNumber,
                    Building = building.Name,
                    Condominium = condominium.Name,
                    resident.IsRegistered,
                    resident.IsActive
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating test data");
            return StatusCode(500, new { error = "Error al crear datos de prueba", details = ex.Message });
        }
    }
}
