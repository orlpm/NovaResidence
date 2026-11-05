using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Api.Security;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Operations;
using NovaResidence.Domain.Enums;
using NovaResidence.Infrastructure.Persistence;
using NovaResidence.Shared.Models;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/area-reservations")]
[Authorize]
public class AreaReservationsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ITenantAccessService _tenantAccessService;
    private readonly IOperationalNotifier _notifier;

    public AreaReservationsController(
        ApplicationDbContext context,
        ITenantAccessService tenantAccessService,
        IOperationalNotifier notifier)
    {
        _context = context;
        _tenantAccessService = tenantAccessService;
        _notifier = notifier;
    }

    [HttpGet("condominium/{condominiumId:guid}")]
    public async Task<IActionResult> GetByCondominium(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return Forbid();

        var items = await _context.CondominiumAreaReservations
            .AsNoTracking()
            .Where(item => item.CondominiumId == condominiumId)
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync();

        return Ok(ApiResponse<List<AreaReservationDto>>.SuccessResponse(items.Select(Map).ToList()));
    }

    [HttpGet("mine/{userId:guid}")]
    public async Task<IActionResult> GetMine(Guid userId)
    {
        if (!await _tenantAccessService.CanAccessUserAsync(User, userId))
            return Forbid();

        var items = await _context.CondominiumAreaReservations
            .AsNoTracking()
            .Where(item => item.UserId == userId)
            .OrderByDescending(item => item.ReservationDate)
            .ToListAsync();

        return Ok(ApiResponse<List<AreaReservationDto>>.SuccessResponse(items.Select(Map).ToList()));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAreaReservationRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccessService.CanAccessUnitAsync(User, request.UnitId))
            return Forbid();

        var userId = GetUserId();
        if (!userId.HasValue)
            return Unauthorized();

        var area = await _context.CondominiumCommonAreas
            .AsNoTracking()
            .FirstOrDefaultAsync(item => item.Id == request.CommonAreaId && item.CondominiumId == request.CondominiumId && item.IsActive);
        if (area == null)
            return NotFound(ApiResponse<object>.FailureResponse("Área común no encontrada"));

        var reservation = CondominiumAreaReservation.Create(
            request.CondominiumId,
            area.Id,
            area.Name,
            userId.Value,
            request.UnitId,
            request.ReservationDate,
            request.StartTime,
            request.EndTime,
            request.Purpose);

        _context.CondominiumAreaReservations.Add(reservation);
        await _context.SaveChangesAsync();
        await _notifier.NotifyRoleAsync(reservation.CondominiumId, UserRole.CondominiumAdmin, NotificationType.Reservation, "Nueva reservación", reservation.AreaName, "AreaReservation", reservation.Id, null);
        await _notifier.NotifyRoleAsync(reservation.CondominiumId, UserRole.SubAdmin, NotificationType.Reservation, "Nueva reservación", reservation.AreaName, "AreaReservation", reservation.Id, null);
        return Ok(ApiResponse<Guid>.SuccessResponse(reservation.Id, "Reservación enviada"));
    }

    [HttpPost("{id:guid}/approve")]
    [Authorize(Roles = "admin,superadmin")]
    public async Task<IActionResult> Approve(Guid id)
    {
        var reservation = await _context.CondominiumAreaReservations.FirstOrDefaultAsync(item => item.Id == id);
        if (reservation == null)
            return NotFound(ApiResponse<object>.FailureResponse("Reservación no encontrada"));

        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, reservation.CondominiumId))
            return Forbid();

        reservation.Approve();
        await _context.SaveChangesAsync();
        await _notifier.NotifyUsersAsync(
            new[] { reservation.UserId },
            reservation.CondominiumId,
            NotificationType.Reservation,
            "Reservación aprobada",
            $"Tu reservación de {reservation.AreaName} fue aprobada.",
            "AreaReservation",
            reservation.Id,
            "/resident/common-areas");

        return Ok(ApiResponse<Guid>.SuccessResponse(reservation.Id, "Reservación aprobada"));
    }

    private Guid? GetUserId()
    {
        var value = User.FindFirst("userId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(value, out var userId) ? userId : null;
    }

    private static AreaReservationDto Map(CondominiumAreaReservation item) => new(
        item.Id,
        item.CondominiumId,
        item.CommonAreaId,
        item.AreaName,
        item.UserId,
        item.UnitId,
        item.ReservationDate,
        item.StartTime,
        item.EndTime,
        item.Purpose,
        item.Status,
        StatusName(item.Status));

    private static string StatusName(ReservationStatus status) => status switch
    {
        ReservationStatus.Pending => "Pendiente",
        ReservationStatus.Approved => "Aprobada",
        ReservationStatus.Rejected => "Rechazada",
        ReservationStatus.Cancelled => "Cancelada",
        ReservationStatus.Completed => "Completada",
        _ => status.ToString()
    };
}

public record AreaReservationDto(
    Guid Id,
    Guid CondominiumId,
    Guid CommonAreaId,
    string AreaName,
    Guid UserId,
    Guid UnitId,
    DateTime ReservationDate,
    string StartTime,
    string EndTime,
    string? Purpose,
    ReservationStatus Status,
    string StatusName);

public record CreateAreaReservationRequest(
    Guid CondominiumId,
    Guid CommonAreaId,
    Guid UnitId,
    DateTime ReservationDate,
    string StartTime,
    string EndTime,
    string? Purpose);
