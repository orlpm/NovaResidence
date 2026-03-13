using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Localization;

namespace NovaResidence.Infrastructure.Persistence.Seeders;

public class GeoCatalogSeeder
{
    private readonly IApplicationDbContext _context;

    public GeoCatalogSeeder(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var countries = await _context.GeoCountries.IgnoreQueryFilters().ToListAsync(cancellationToken);

        var countryMap = countries.ToDictionary(c => c.Code, StringComparer.OrdinalIgnoreCase);

        var latamCountries = new[]
        {
            ("MX", "México"),
            ("AR", "Argentina"),
            ("BO", "Bolivia"),
            ("BR", "Brasil"),
            ("CL", "Chile"),
            ("CO", "Colombia"),
            ("CR", "Costa Rica"),
            ("CU", "Cuba"),
            ("DO", "República Dominicana"),
            ("EC", "Ecuador"),
            ("SV", "El Salvador"),
            ("GT", "Guatemala"),
            ("HN", "Honduras"),
            ("NI", "Nicaragua"),
            ("PA", "Panamá"),
            ("PY", "Paraguay"),
            ("PE", "Perú"),
            ("UY", "Uruguay"),
            ("VE", "Venezuela")
        };

        foreach (var (code, name) in latamCountries)
        {
            if (!countryMap.ContainsKey(code))
            {
                var country = GeoCountry.Create(code, name);
                _context.GeoCountries.Add(country);
                countryMap[code] = country;
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        var mexico = await _context.GeoCountries.IgnoreQueryFilters().FirstAsync(c => c.Code == "MX", cancellationToken);

        var states = await _context.GeoStates
            .IgnoreQueryFilters()
            .Where(s => s.CountryId == mexico.Id)
            .ToListAsync(cancellationToken);

        var existingStateCodes = new HashSet<string>(states.Select(s => s.Code), StringComparer.OrdinalIgnoreCase);

        var mxStates = new[]
        {
            ("AGU", "Aguascalientes"),
            ("BCN", "Baja California"),
            ("BCS", "Baja California Sur"),
            ("CAM", "Campeche"),
            ("CHP", "Chiapas"),
            ("CHH", "Chihuahua"),
            ("CMX", "Ciudad de México"),
            ("COA", "Coahuila"),
            ("COL", "Colima"),
            ("DUR", "Durango"),
            ("GUA", "Guanajuato"),
            ("GRO", "Guerrero"),
            ("HID", "Hidalgo"),
            ("JAL", "Jalisco"),
            ("MEX", "Estado de México"),
            ("MIC", "Michoacán"),
            ("MOR", "Morelos"),
            ("NAY", "Nayarit"),
            ("NLE", "Nuevo León"),
            ("OAX", "Oaxaca"),
            ("PUE", "Puebla"),
            ("QUE", "Querétaro"),
            ("ROO", "Quintana Roo"),
            ("SLP", "San Luis Potosí"),
            ("SIN", "Sinaloa"),
            ("SON", "Sonora"),
            ("TAB", "Tabasco"),
            ("TAM", "Tamaulipas"),
            ("TLA", "Tlaxcala"),
            ("VER", "Veracruz"),
            ("YUC", "Yucatán"),
            ("ZAC", "Zacatecas")
        };

        foreach (var (code, name) in mxStates)
        {
            if (!existingStateCodes.Contains(code))
            {
                _context.GeoStates.Add(GeoState.Create(mexico.Id, code, name));
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
