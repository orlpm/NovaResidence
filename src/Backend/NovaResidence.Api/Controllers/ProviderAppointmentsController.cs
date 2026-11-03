using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Api.Security;
using NovaResidence.Domain.Entities.Operations;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/provider-appointments")]
[Authorize]
public class ProviderAppointmentsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccessService;

    public ProviderAppointmentsController(ApplicationDbContext context, ITenantAccessService tenantAccessService)
    {
        _context = context;
        _tenantAccessService = tenantAccessService;
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var items = await _context.ProviderAppointments
            .AsNoTracking()
            .Where(item => item.CondominiumId == condominiumId)
            .OrderBy(item => item.ScheduledAt)
            .ToListAsync();

        return Ok(ApiResponse<List<ProviderAppointmentDto>>.SuccessResponse(items.Select(Map).ToList()));
    }

    [HttpGet("provider/{providerUserId:guid}")]
    public async Task<IActionResult> GetByProvider(Guid providerUserId)
    {
        if (!await _tenantAccessService.CanAccessUserAsync(User, providerUserId))
            return Forbid();

        var items = await _context.ProviderAppointments
            .AsNoTracking()
            .Where(item => item.ProviderUserId == providerUserId && item.Status == 0)
            .OrderBy(item => item.ScheduledAt)
            .ToListAsync();

        return Ok(ApiResponse<List<ProviderAppointmentDto>>.SuccessResponse(items.Select(Map).ToList()));
    }

    [HttpGet("providers/{condominiumId:guid}")]
    public async Task<IActionResult> GetProviders(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var providers = await _context.Users
            .AsNoTracking()
            .Where(user => user.CondominiumRoles.Any(role =>
                role.CondominiumId == condominiumId && role.Role == UserRole.ServiceProvider))
            .OrderBy(user => user.FirstName)
            .Select(user => new ProviderOptionDto(user.Id, user.FirstName + " " + user.LastName, user.Email))
            .ToListAsync();

        return Ok(ApiResponse<List<ProviderOptionDto>>.SuccessResponse(providers));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateProviderAppointmentRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.ProviderUserId))
            return Forbid();

        var appointment = ProviderAppointment.Create(
            request.CondominiumId,
            request.ProviderUserId,
            request.Title,
            request.ScheduledAt,
            request.Notes);

        _context.ProviderAppointments.Add(appointment);
        await _context.SaveChangesAsync();
        return Ok(ApiResponse<Guid>.SuccessResponse(appointment.Id, "Visita agendada"));
    }

    private static ProviderAppointmentDto Map(ProviderAppointment item) => new(
        item.Id,
        item.CondominiumId,
        item.ProviderUserId,
        item.Title,
        item.ScheduledAt,
        item.Notes,
        item.Status,
        item.Status == 0 ? "Programada" : "Concluida");
}

public record ProviderAppointmentDto(
    Guid Id,
    Guid CondominiumId,
    Guid ProviderUserId,
    string Title,
    DateTime ScheduledAt,
    string? Notes,
    int Status,
    string StatusName);

public record ProviderOptionDto(Guid Id, string Name, string Email);

public record CreateProviderAppointmentRequest(
    Guid CondominiumId,
    Guid ProviderUserId,
    string Title,
    DateTime ScheduledAt,
    string? Notes);
