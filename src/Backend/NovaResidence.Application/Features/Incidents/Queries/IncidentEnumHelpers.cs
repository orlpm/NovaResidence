using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Incidents.Queries;

public static class IncidentEnumHelpers
{
    private static readonly Dictionary<IncidentType, string> TypeNames = new()
    {
        { IncidentType.Maintenance, "Mantenimiento" },
        { IncidentType.Security, "Seguridad" },
        { IncidentType.Noise, "Ruido" },
        { IncidentType.Cleaning, "Limpieza" },
        { IncidentType.Parking, "Estacionamiento" },
        { IncidentType.CommonArea, "Área Común" },
        { IncidentType.Plumbing, "Plomería" },
        { IncidentType.Electrical, "Eléctrico" },
        { IncidentType.Elevator, "Elevador" },
        { IncidentType.Other, "Otro" }
    };

    private static readonly Dictionary<IncidentPriority, string> PriorityNames = new()
    {
        { IncidentPriority.Low, "Baja" },
        { IncidentPriority.Medium, "Media" },
        { IncidentPriority.High, "Alta" },
        { IncidentPriority.Critical, "Crítica" }
    };

    private static readonly Dictionary<IncidentStatus, string> StatusNames = new()
    {
        { IncidentStatus.Open, "Abierta" },
        { IncidentStatus.Acknowledged, "Reconocida" },
        { IncidentStatus.InProgress, "En Progreso" },
        { IncidentStatus.Resolved, "Resuelta" },
        { IncidentStatus.Closed, "Cerrada" },
        { IncidentStatus.Cancelled, "Cancelada" }
    };

    public static string GetTypeName(IncidentType type) => 
        TypeNames.GetValueOrDefault(type, type.ToString());

    public static string GetPriorityName(IncidentPriority priority) => 
        PriorityNames.GetValueOrDefault(priority, priority.ToString());

    public static string GetStatusName(IncidentStatus status) => 
        StatusNames.GetValueOrDefault(status, status.ToString());
}
