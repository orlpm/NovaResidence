using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Procedures;

namespace NovaResidence.Infrastructure.Persistence.Seeders;

public class ProcedureTemplateSeeder
{
    private readonly IApplicationDbContext _context;

    public ProcedureTemplateSeeder(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task SeedAsync(CancellationToken cancellationToken = default)
    {
        var mexico = await _context.GeoCountries
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Code == "MX", cancellationToken);

        if (mexico == null)
            return;

        var cdmx = await _context.GeoStates
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(s => s.CountryId == mexico.Id && s.Code == "CMX", cancellationToken);

        var existingCodes = await _context.ProcedureTemplates
            .IgnoreQueryFilters()
            .Select(t => t.Code)
            .ToListAsync(cancellationToken);

        var existingSet = new HashSet<string>(existingCodes, StringComparer.OrdinalIgnoreCase);

        var templates = new List<ProcedureTemplate>
        {
            ProcedureTemplate.Create(
                code: "MX-GENERAL-REGISTRO-AUTORIDAD",
                name: "Registro ante autoridad condominal estatal",
                authorityName: "Autoridad estatal de vivienda/condominios",
                description: "Registrar o actualizar expediente del condominio ante la autoridad competente del estado.",
                requirements: "Acta constitutiva, reglamento interno, identificación del representante legal y comprobante de domicilio.",
                type: ProcedureType.Other,
                isMandatoryDefault: true,
                countryId: mexico.Id,
                stateId: null),
            ProcedureTemplate.Create(
                code: "MX-GENERAL-ACTUALIZACION-REGLAMENTO",
                name: "Actualización de reglamento de condominio",
                authorityName: "Autoridad estatal de vivienda/condominios",
                description: "Registrar reformas al reglamento interno y su difusión a condóminos.",
                requirements: "Acta de asamblea, reglamento actualizado, lista de asistencia y firma del administrador.",
                type: ProcedureType.Other,
                isMandatoryDefault: true,
                countryId: mexico.Id,
                stateId: null)
        };

        if (cdmx != null)
        {
            templates.AddRange(new[]
            {
                ProcedureTemplate.Create(
                    code: "MX-CMX-PROSOC-REGISTRO-ADMIN",
                    name: "Registro de administrador ante PROSOC",
                    authorityName: "PROSOC CDMX",
                    description: "Alta o actualización del administrador de condominio ante PROSOC en Ciudad de México.",
                    requirements: "Identificación oficial, acta de asamblea, comprobante de domicilio del condominio y RFC.",
                    type: ProcedureType.Other,
                    isMandatoryDefault: true,
                    countryId: mexico.Id,
                    stateId: cdmx.Id),
                ProcedureTemplate.Create(
                    code: "MX-CMX-PROSOC-QUEJAS",
                    name: "Seguimiento de quejas y controversias PROSOC",
                    authorityName: "PROSOC CDMX",
                    description: "Presentación y seguimiento de controversias condominales ante PROSOC.",
                    requirements: "Escrito de hechos, evidencia documental, identificación y datos del condominio.",
                    type: ProcedureType.Other,
                    isMandatoryDefault: false,
                    countryId: mexico.Id,
                    stateId: cdmx.Id),
                ProcedureTemplate.Create(
                    code: "MX-CMX-PROSOC-CAPACITACION",
                    name: "Capacitación obligatoria de administración condominal",
                    authorityName: "PROSOC CDMX",
                    description: "Cumplimiento de capacitación para administración y operación condominal en CDMX.",
                    requirements: "Constancia de curso, identificación oficial y datos del condominio.",
                    type: ProcedureType.Other,
                    isMandatoryDefault: true,
                    countryId: mexico.Id,
                    stateId: cdmx.Id)
            });
        }

        var mxStates = await _context.GeoStates
            .IgnoreQueryFilters()
            .Where(s => s.CountryId == mexico.Id)
            .ToListAsync(cancellationToken);

        foreach (var state in mxStates)
        {
            var code = $"MX-{state.Code}-EQUIV-REGISTRO";
            templates.Add(ProcedureTemplate.Create(
                code: code,
                name: $"Trámite equivalente estatal de registro condominial ({state.Name})",
                authorityName: "Autoridad estatal competente",
                description: $"Trámite equivalente al registro/actualización del condominio en {state.Name}.",
                requirements: "Acta constitutiva, reglamento interno, identificación del representante legal y pago de derechos aplicable.",
                type: ProcedureType.Other,
                isMandatoryDefault: true,
                countryId: mexico.Id,
                stateId: state.Id));
        }

        var newTemplates = templates
            .Where(t => !existingSet.Contains(t.Code))
            .ToList();

        if (newTemplates.Count == 0)
            return;

        _context.ProcedureTemplates.AddRange(newTemplates);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
