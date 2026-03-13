using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Infrastructure.Persistence;

namespace NovaResidence.Api.Security;

public interface ITenantAccessService
{
    Guid? GetCallerUserId(ClaimsPrincipal user);
    string GetCallerRole(ClaimsPrincipal user);
    Task<bool> CanAccessCondominiumAsync(ClaimsPrincipal user, Guid condominiumId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessUnitAsync(ClaimsPrincipal user, Guid unitId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessUserAsync(ClaimsPrincipal user, Guid targetUserId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessVisitAsync(ClaimsPrincipal user, Guid visitId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessIncidentAsync(ClaimsPrincipal user, Guid incidentId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessProcedureAsync(ClaimsPrincipal user, Guid procedureId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessChargeAsync(ClaimsPrincipal user, Guid chargeId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessPaymentAsync(ClaimsPrincipal user, Guid paymentId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessAnnouncementAsync(ClaimsPrincipal user, Guid announcementId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessPollAsync(ClaimsPrincipal user, Guid pollId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessMeetingAsync(ClaimsPrincipal user, Guid meetingId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessMeetingAttendeeAsync(ClaimsPrincipal user, Guid attendeeId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessForumPostAsync(ClaimsPrincipal user, Guid forumPostId, CancellationToken cancellationToken = default);
    Task<bool> CanAccessForumCommentAsync(ClaimsPrincipal user, Guid forumCommentId, CancellationToken cancellationToken = default);
}

public class TenantAccessService : ITenantAccessService
{
    private readonly ApplicationDbContext _context;

    public TenantAccessService(ApplicationDbContext context)
    {
        _context = context;
    }

    public Guid? GetCallerUserId(ClaimsPrincipal user)
    {
        var claim = user.FindFirst("userId")?.Value
            ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? user.FindFirst("sub")?.Value;

        return Guid.TryParse(claim, out var userId) ? userId : null;
    }

    public string GetCallerRole(ClaimsPrincipal user)
    {
        return user.FindFirst(ClaimTypes.Role)?.Value
            ?? user.FindFirst("role")?.Value
            ?? string.Empty;
    }

    public async Task<bool> CanAccessCondominiumAsync(ClaimsPrincipal user, Guid condominiumId, CancellationToken cancellationToken = default)
    {
        var callerUserId = GetCallerUserId(user);
        if (!callerUserId.HasValue)
            return false;

        if (IsSuperAdmin(user))
            return true;

        var hasRoleInCondominium = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == callerUserId.Value)
            .AnyAsync(u => u.CondominiumRoles.Any(cr => cr.CondominiumId == condominiumId), cancellationToken);

        if (hasRoleInCondominium)
            return true;

        return await _context.Residents
            .AsNoTracking()
            .Include(r => r.Unit)
            .ThenInclude(u => u!.Building)
            .AnyAsync(r => r.UserId == callerUserId.Value
                && r.IsActive
                && r.Unit != null
                && r.Unit.Building != null
                && r.Unit.Building.CondominiumId == condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessUnitAsync(ClaimsPrincipal user, Guid unitId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Units
            .AsNoTracking()
            .Where(unit => unit.Id == unitId)
            .Join(_context.Buildings.AsNoTracking(), unit => unit.BuildingId, building => building.Id, (_, building) => building.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessUserAsync(ClaimsPrincipal user, Guid targetUserId, CancellationToken cancellationToken = default)
    {
        var callerUserId = GetCallerUserId(user);
        if (!callerUserId.HasValue)
            return false;

        if (callerUserId.Value == targetUserId || IsSuperAdmin(user))
            return true;

        var targetCondominiums = await GetUserCondominiumIdsAsync(targetUserId, cancellationToken);
        if (targetCondominiums.Count == 0)
            return false;

        foreach (var condominiumId in targetCondominiums)
        {
            if (await CanAccessCondominiumAsync(user, condominiumId, cancellationToken))
                return true;
        }

        return false;
    }

    public async Task<bool> CanAccessVisitAsync(ClaimsPrincipal user, Guid visitId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Visits
            .AsNoTracking()
            .Where(visit => visit.Id == visitId)
            .Select(visit => visit.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessIncidentAsync(ClaimsPrincipal user, Guid incidentId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Incidents
            .AsNoTracking()
            .Where(incident => incident.Id == incidentId)
            .Select(incident => incident.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessProcedureAsync(ClaimsPrincipal user, Guid procedureId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.ResidentProcedures
            .AsNoTracking()
            .Where(procedure => procedure.Id == procedureId)
            .Select(procedure => procedure.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessChargeAsync(ClaimsPrincipal user, Guid chargeId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Charges
            .AsNoTracking()
            .Where(charge => charge.Id == chargeId)
            .Select(charge => charge.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessPaymentAsync(ClaimsPrincipal user, Guid paymentId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Payments
            .AsNoTracking()
            .Where(payment => payment.Id == paymentId)
            .Join(_context.Charges.AsNoTracking(), payment => payment.ChargeId, charge => charge.Id, (_, charge) => charge.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessAnnouncementAsync(ClaimsPrincipal user, Guid announcementId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Announcements
            .AsNoTracking()
            .Where(announcement => announcement.Id == announcementId)
            .Select(announcement => announcement.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessPollAsync(ClaimsPrincipal user, Guid pollId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Polls
            .AsNoTracking()
            .Where(poll => poll.Id == pollId)
            .Select(poll => poll.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessMeetingAsync(ClaimsPrincipal user, Guid meetingId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.Meetings
            .AsNoTracking()
            .Where(meeting => meeting.Id == meetingId)
            .Select(meeting => meeting.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessMeetingAttendeeAsync(ClaimsPrincipal user, Guid attendeeId, CancellationToken cancellationToken = default)
    {
        var meetingId = await _context.MeetingAttendees
            .AsNoTracking()
            .Where(attendee => attendee.Id == attendeeId)
            .Select(attendee => attendee.MeetingId)
            .FirstOrDefaultAsync(cancellationToken);

        return meetingId != Guid.Empty && await CanAccessMeetingAsync(user, meetingId, cancellationToken);
    }

    public async Task<bool> CanAccessForumPostAsync(ClaimsPrincipal user, Guid forumPostId, CancellationToken cancellationToken = default)
    {
        var condominiumId = await _context.ForumPosts
            .AsNoTracking()
            .Where(post => post.Id == forumPostId)
            .Select(post => post.CondominiumId)
            .FirstOrDefaultAsync(cancellationToken);

        return condominiumId != Guid.Empty && await CanAccessCondominiumAsync(user, condominiumId, cancellationToken);
    }

    public async Task<bool> CanAccessForumCommentAsync(ClaimsPrincipal user, Guid forumCommentId, CancellationToken cancellationToken = default)
    {
        var forumPostId = await _context.ForumComments
            .AsNoTracking()
            .Where(comment => comment.Id == forumCommentId)
            .Select(comment => comment.ForumPostId)
            .FirstOrDefaultAsync(cancellationToken);

        return forumPostId != Guid.Empty && await CanAccessForumPostAsync(user, forumPostId, cancellationToken);
    }

    private bool IsSuperAdmin(ClaimsPrincipal user)
    {
        return GetCallerRole(user).Equals("superadmin", StringComparison.OrdinalIgnoreCase);
    }

    private async Task<List<Guid>> GetUserCondominiumIdsAsync(Guid targetUserId, CancellationToken cancellationToken)
    {
        var condominiumRoleIds = await _context.Users
            .AsNoTracking()
            .Where(user => user.Id == targetUserId)
            .SelectMany(user => user.CondominiumRoles.Select(role => role.CondominiumId))
            .ToListAsync(cancellationToken);

        var residentCondominiumIds = await _context.Residents
            .AsNoTracking()
            .Include(resident => resident.Unit)
            .ThenInclude(unit => unit!.Building)
            .Where(resident => resident.UserId == targetUserId && resident.IsActive)
            .Select(resident => resident.Unit!.Building!.CondominiumId)
            .ToListAsync(cancellationToken);

        return condominiumRoleIds.Concat(residentCondominiumIds).Distinct().ToList();
    }
}