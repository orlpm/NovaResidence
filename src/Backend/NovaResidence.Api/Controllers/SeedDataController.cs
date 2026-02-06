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

    /// <summary>
    /// Create test data for any user by email
    /// WARNING: This is a development-only endpoint
    /// </summary>
    [HttpPost("create-test-data-for-user")]
    public async Task<IActionResult> CreateTestDataForUser([FromBody] CreateTestDataRequest request)
    {
        try
        {
            // Get user by email
            var user = await _context.Users
                .Where(u => u.Email == request.Email)
                .FirstOrDefaultAsync();

            if (user == null)
            {
                return NotFound(new { error = $"Usuario con email {request.Email} no encontrado" });
            }

            _logger.LogInformation("Found user with ID: {UserId}", user.Id);

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

            // Get next unit number
            var unitCount = await _context.Units.CountAsync(u => u.BuildingId == building.Id);
            var unitNumber = $"{unitCount + 101}";

            // Create unit
            var unit = Unit.Create(
                building.Id,
                unitNumber,
                (unitCount / 4) + 1, // floor
                85.5m,
                2,
                2,
                2500.00m
            );

            // Set status to Occupied
            typeof(Unit).GetProperty("Status")!.SetValue(unit, UnitStatus.Occupied);

            _context.Units.Add(unit);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created unit with ID: {UnitId}", unit.Id);

            // Check if user is already a resident
            var existingResident = await _context.Residents
                .FirstOrDefaultAsync(r => r.UserId == user.Id);

            if (existingResident != null)
            {
                _logger.LogInformation("User is already registered as a resident");
                
                // Update their unit
                typeof(Resident).GetProperty("UnitId")!.SetValue(existingResident, unit.Id);
                await _context.SaveChangesAsync();
                _logger.LogInformation("Updated resident unit to {UnitId}", unit.Id);
                
                return Ok(new
                {
                    message = "Datos de prueba actualizados",
                    resident = new
                    {
                        existingResident.Id,
                        Name = $"{existingResident.FirstName} {existingResident.LastName}",
                        existingResident.Email,
                        UnitNumber = unit.UnitNumber,
                        Building = building.Name,
                        Condominium = condominium.Name,
                        CondominiumId = condominium.Id,
                        UnitId = unit.Id
                    }
                });
            }

            // Create resident for user
            var resident = Resident.Create(
                unit.Id,
                user.FirstName,
                user.LastName,
                user.Email,
                user.PhoneNumber ?? "555-0000",
                ResidentType.Owner
            );

            // Mark as registered with user ID
            resident.MarkAsRegistered(user.Id);

            _context.Residents.Add(resident);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created resident with ID: {ResidentId}", resident.Id);

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
                    CondominiumId = condominium.Id,
                    UnitId = unit.Id,
                    resident.IsRegistered,
                    resident.IsActive
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating test data for user");
            return StatusCode(500, new { error = "Error al crear datos de prueba", details = ex.Message });
        }
    }

    /// <summary>
    /// Create a test charge for a unit
    /// WARNING: This is a development-only endpoint
    /// </summary>
    [HttpPost("create-test-charge")]
    public async Task<IActionResult> CreateTestCharge([FromBody] CreateTestChargeRequest request)
    {
        try
        {
            var unit = await _context.Units
                .Include(u => u.Building)
                .FirstOrDefaultAsync(u => u.Id == request.UnitId);

            if (unit == null)
            {
                return NotFound(new { error = "Unidad no encontrada" });
            }

            var condominium = await _context.Condominiums
                .FirstOrDefaultAsync(c => c.Id == unit.Building.CondominiumId);

            if (condominium == null)
            {
                return NotFound(new { error = "Condominio no encontrado" });
            }

            // Create a charge
            var charge = Domain.Entities.Billing.Charge.Create(
                condominium.Id,
                unit.Id,
                request.Description ?? "Cuota de mantenimiento - Prueba",
                Domain.Enums.FeeType.MonthlyMaintenance,
                request.Amount,
                request.DueDate ?? DateTime.UtcNow.AddDays(30),
                DateTime.UtcNow.Month,
                DateTime.UtcNow.Year
            );

            _context.Charges.Add(charge);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created charge with ID: {ChargeId}", charge.Id);

            return Ok(new
            {
                message = "Cargo de prueba creado exitosamente",
                charge = new
                {
                    charge.Id,
                    charge.Description,
                    charge.Amount,
                    charge.DueDate,
                    UnitNumber = unit.UnitNumber,
                    Building = unit.Building.Name
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating test charge");
            return StatusCode(500, new { error = "Error al crear cargo de prueba", details = ex.Message });
        }
    }
}

public record CreateTestDataRequest(string Email);

public record CreateTestChargeRequest(
    Guid UnitId,
    decimal Amount = 2500.00m,
    string? Description = null,
    DateTime? DueDate = null
);
