using Mediator;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Communications.Queries;

#region Announcement Query Handlers

public class GetAnnouncementsQueryHandler : IRequestHandler<GetAnnouncementsQuery, Result<PagedList<AnnouncementDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetAnnouncementsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PagedList<AnnouncementDto>>> Handle(GetAnnouncementsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Announcements
            .Where(a => a.CondominiumId == request.CondominiumId);

        if (request.Type.HasValue)
            query = query.Where(a => a.Type == request.Type.Value);

        if (request.IsPublished.HasValue)
            query = query.Where(a => a.IsPublished == request.IsPublished.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(a => a.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AnnouncementDto(
                a.Id,
                a.CondominiumId,
                a.Title,
                a.Content,
                a.Type,
                GetAnnouncementTypeName(a.Type),
                a.Priority,
                GetAnnouncementPriorityName(a.Priority),
                a.IsPublished,
                a.PublishedAt,
                a.ExpiresAt,
                a.MeetingDate,
                a.MeetingLocation,
                a.CreatedAt,
                a.UpdatedAt,
                a.Attachments.Select(att => new AnnouncementAttachmentDto(
                    att.Id, att.FileName, att.FileUrl, att.ContentType, att.FileSize
                )).ToList(),
                a.Recipients.Count(r => r.IsRead)
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedList<AnnouncementDto>(items, totalCount, request.Page, request.PageSize));
    }

    private static string GetAnnouncementTypeName(AnnouncementType type) => type switch
    {
        AnnouncementType.General => "General",
        AnnouncementType.Circular => "Circular",
        AnnouncementType.MeetingMinutes => "Acta de Junta",
        AnnouncementType.Emergency => "Emergencia",
        AnnouncementType.Maintenance => "Mantenimiento",
        AnnouncementType.Event => "Evento",
        AnnouncementType.PolicyChange => "Cambio de Reglamento",
        _ => type.ToString()
    };

    private static string GetAnnouncementPriorityName(AnnouncementPriority priority) => priority switch
    {
        AnnouncementPriority.Low => "Baja",
        AnnouncementPriority.Normal => "Normal",
        AnnouncementPriority.High => "Alta",
        AnnouncementPriority.Urgent => "Urgente",
        _ => priority.ToString()
    };
}

public class GetAnnouncementByIdQueryHandler : IRequestHandler<GetAnnouncementByIdQuery, Result<AnnouncementDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAnnouncementByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<AnnouncementDto>> Handle(GetAnnouncementByIdQuery request, CancellationToken cancellationToken)
    {
        var announcement = await _context.Announcements
            .Include(a => a.Attachments)
            .Include(a => a.Recipients)
            .FirstOrDefaultAsync(a => a.Id == request.AnnouncementId, cancellationToken);

        if (announcement == null)
            return Result.NotFound("Announcement not found");

        var dto = new AnnouncementDto(
            announcement.Id,
            announcement.CondominiumId,
            announcement.Title,
            announcement.Content,
            announcement.Type,
            GetTypeName(announcement.Type),
            announcement.Priority,
            GetPriorityName(announcement.Priority),
            announcement.IsPublished,
            announcement.PublishedAt,
            announcement.ExpiresAt,
            announcement.MeetingDate,
            announcement.MeetingLocation,
            announcement.CreatedAt,
            announcement.UpdatedAt,
            announcement.Attachments.Select(att => new AnnouncementAttachmentDto(
                att.Id, att.FileName, att.FileUrl, att.ContentType, att.FileSize
            )).ToList(),
            announcement.Recipients.Count(r => r.IsRead)
        );

        return Result.Success(dto);
    }

    private static string GetTypeName(AnnouncementType type) => type switch
    {
        AnnouncementType.General => "General",
        AnnouncementType.Circular => "Circular",
        AnnouncementType.MeetingMinutes => "Acta de Junta",
        AnnouncementType.Emergency => "Emergencia",
        AnnouncementType.Maintenance => "Mantenimiento",
        AnnouncementType.Event => "Evento",
        AnnouncementType.PolicyChange => "Cambio de Reglamento",
        _ => type.ToString()
    };

    private static string GetPriorityName(AnnouncementPriority priority) => priority switch
    {
        AnnouncementPriority.Low => "Baja",
        AnnouncementPriority.Normal => "Normal",
        AnnouncementPriority.High => "Alta",
        AnnouncementPriority.Urgent => "Urgente",
        _ => priority.ToString()
    };
}

public class GetPublishedAnnouncementsQueryHandler : IRequestHandler<GetPublishedAnnouncementsQuery, Result<PagedList<AnnouncementDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetPublishedAnnouncementsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PagedList<AnnouncementDto>>> Handle(GetPublishedAnnouncementsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var query = _context.Announcements
            .Where(a => a.CondominiumId == request.CondominiumId)
            .Where(a => a.IsPublished)
            .Where(a => !a.ExpiresAt.HasValue || a.ExpiresAt > now);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(a => a.Priority)
            .ThenByDescending(a => a.PublishedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(a => new AnnouncementDto(
                a.Id,
                a.CondominiumId,
                a.Title,
                a.Content,
                a.Type,
                GetTypeName(a.Type),
                a.Priority,
                GetPriorityName(a.Priority),
                a.IsPublished,
                a.PublishedAt,
                a.ExpiresAt,
                a.MeetingDate,
                a.MeetingLocation,
                a.CreatedAt,
                a.UpdatedAt,
                a.Attachments.Select(att => new AnnouncementAttachmentDto(
                    att.Id, att.FileName, att.FileUrl, att.ContentType, att.FileSize
                )).ToList(),
                a.Recipients.Count(r => r.IsRead)
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedList<AnnouncementDto>(items, totalCount, request.Page, request.PageSize));
    }

    private static string GetTypeName(AnnouncementType type) => type switch
    {
        AnnouncementType.General => "General",
        AnnouncementType.Circular => "Circular",
        AnnouncementType.MeetingMinutes => "Acta de Junta",
        AnnouncementType.Emergency => "Emergencia",
        AnnouncementType.Maintenance => "Mantenimiento",
        AnnouncementType.Event => "Evento",
        AnnouncementType.PolicyChange => "Cambio de Reglamento",
        _ => type.ToString()
    };

    private static string GetPriorityName(AnnouncementPriority priority) => priority switch
    {
        AnnouncementPriority.Low => "Baja",
        AnnouncementPriority.Normal => "Normal",
        AnnouncementPriority.High => "Alta",
        AnnouncementPriority.Urgent => "Urgente",
        _ => priority.ToString()
    };
}

#endregion

#region Poll Query Handlers

public class GetPollsQueryHandler : IRequestHandler<GetPollsQuery, Result<PagedList<PollDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetPollsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PagedList<PollDto>>> Handle(GetPollsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Polls
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .Where(p => p.CondominiumId == request.CondominiumId);

        if (request.Status.HasValue)
            query = query.Where(p => p.Status == request.Status.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var polls = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = polls.Select(p =>
        {
            var totalVotes = p.Votes.Count;
            return new PollDto(
                p.Id,
                p.CondominiumId,
                p.Title,
                p.Description,
                p.Type,
                GetPollTypeName(p.Type),
                p.Status,
                GetPollStatusName(p.Status),
                p.StartDate,
                p.EndDate,
                p.AllowMultipleVotes,
                p.IsAnonymous,
                p.RequiresQuorum,
                p.QuorumPercentage,
                p.CreatedAt,
                p.Options.Select(o => new PollOptionDto(
                    o.Id,
                    o.Text,
                    o.DisplayOrder,
                    p.Votes.Count(v => v.PollOptionId == o.Id),
                    totalVotes > 0 ? (decimal)p.Votes.Count(v => v.PollOptionId == o.Id) / totalVotes * 100 : 0
                )).OrderBy(o => o.DisplayOrder).ToList(),
                totalVotes
            );
        }).ToList();

        return Result.Success(new PagedList<PollDto>(items, totalCount, request.Page, request.PageSize));
    }

    private static string GetPollTypeName(PollType type) => type switch
    {
        PollType.SingleChoice => "Opción Única",
        PollType.MultipleChoice => "Opción Múltiple",
        PollType.Survey => "Encuesta",
        PollType.AssemblyVote => "Votación de Asamblea",
        _ => type.ToString()
    };

    private static string GetPollStatusName(PollStatus status) => status switch
    {
        PollStatus.Draft => "Borrador",
        PollStatus.Active => "Activa",
        PollStatus.Closed => "Cerrada",
        PollStatus.Cancelled => "Cancelada",
        _ => status.ToString()
    };
}

public class GetPollByIdQueryHandler : IRequestHandler<GetPollByIdQuery, Result<PollDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPollByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PollDto>> Handle(GetPollByIdQuery request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == request.PollId, cancellationToken);

        if (poll == null)
            return Result.NotFound("Poll not found");

        var totalVotes = poll.Votes.Count;
        var dto = new PollDto(
            poll.Id,
            poll.CondominiumId,
            poll.Title,
            poll.Description,
            poll.Type,
            GetPollTypeName(poll.Type),
            poll.Status,
            GetPollStatusName(poll.Status),
            poll.StartDate,
            poll.EndDate,
            poll.AllowMultipleVotes,
            poll.IsAnonymous,
            poll.RequiresQuorum,
            poll.QuorumPercentage,
            poll.CreatedAt,
            poll.Options.Select(o => new PollOptionDto(
                o.Id,
                o.Text,
                o.DisplayOrder,
                poll.Votes.Count(v => v.PollOptionId == o.Id),
                totalVotes > 0 ? (decimal)poll.Votes.Count(v => v.PollOptionId == o.Id) / totalVotes * 100 : 0
            )).OrderBy(o => o.DisplayOrder).ToList(),
            totalVotes
        );

        return Result.Success(dto);
    }

    private static string GetPollTypeName(PollType type) => type switch
    {
        PollType.SingleChoice => "Opción Única",
        PollType.MultipleChoice => "Opción Múltiple",
        PollType.Survey => "Encuesta",
        PollType.AssemblyVote => "Votación de Asamblea",
        _ => type.ToString()
    };

    private static string GetPollStatusName(PollStatus status) => status switch
    {
        PollStatus.Draft => "Borrador",
        PollStatus.Active => "Activa",
        PollStatus.Closed => "Cerrada",
        PollStatus.Cancelled => "Cancelada",
        _ => status.ToString()
    };
}

public class GetActivePollsQueryHandler : IRequestHandler<GetActivePollsQuery, Result<List<PollDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetActivePollsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<PollDto>>> Handle(GetActivePollsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var polls = await _context.Polls
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .Where(p => p.CondominiumId == request.CondominiumId)
            .Where(p => p.Status == PollStatus.Active)
            .Where(p => p.StartDate <= now && p.EndDate >= now)
            .OrderBy(p => p.EndDate)
            .ToListAsync(cancellationToken);

        var items = polls.Select(p =>
        {
            var totalVotes = p.Votes.Count;
            return new PollDto(
                p.Id,
                p.CondominiumId,
                p.Title,
                p.Description,
                p.Type,
                GetPollTypeName(p.Type),
                p.Status,
                GetPollStatusName(p.Status),
                p.StartDate,
                p.EndDate,
                p.AllowMultipleVotes,
                p.IsAnonymous,
                p.RequiresQuorum,
                p.QuorumPercentage,
                p.CreatedAt,
                p.Options.Select(o => new PollOptionDto(
                    o.Id,
                    o.Text,
                    o.DisplayOrder,
                    p.Votes.Count(v => v.PollOptionId == o.Id),
                    totalVotes > 0 ? (decimal)p.Votes.Count(v => v.PollOptionId == o.Id) / totalVotes * 100 : 0
                )).OrderBy(o => o.DisplayOrder).ToList(),
                totalVotes
            );
        }).ToList();

        return Result.Success(items);
    }

    private static string GetPollTypeName(PollType type) => type switch
    {
        PollType.SingleChoice => "Opción Única",
        PollType.MultipleChoice => "Opción Múltiple",
        PollType.Survey => "Encuesta",
        PollType.AssemblyVote => "Votación de Asamblea",
        _ => type.ToString()
    };

    private static string GetPollStatusName(PollStatus status) => status switch
    {
        PollStatus.Draft => "Borrador",
        PollStatus.Active => "Activa",
        PollStatus.Closed => "Cerrada",
        PollStatus.Cancelled => "Cancelada",
        _ => status.ToString()
    };
}

public class GetPollResultsQueryHandler : IRequestHandler<GetPollResultsQuery, Result<PollResultsDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPollResultsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PollResultsDto>> Handle(GetPollResultsQuery request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls
            .Include(p => p.Options)
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == request.PollId, cancellationToken);

        if (poll == null)
            return Result.NotFound("Poll not found");

        // Get total eligible units
        var totalUnits = await _context.Units
            .Where(u => _context.Buildings
                .Any(b => b.Id == u.BuildingId && b.CondominiumId == poll.CondominiumId && !b.IsDeleted))
            .CountAsync(cancellationToken);

        var totalVotes = poll.Votes.Count;
        var uniqueVotingUnits = poll.Votes.Select(v => v.UnitId).Distinct().Count();
        var participationPercentage = totalUnits > 0 ? (decimal)uniqueVotingUnits / totalUnits * 100 : 0;

        var options = poll.Options.Select(o => new PollOptionResultDto(
            o.Id,
            o.Text,
            poll.Votes.Count(v => v.PollOptionId == o.Id),
            totalVotes > 0 ? (decimal)poll.Votes.Count(v => v.PollOptionId == o.Id) / totalVotes * 100 : 0
        )).OrderByDescending(o => o.VoteCount).ToList();

        var hasQuorum = !poll.RequiresQuorum || participationPercentage >= (poll.QuorumPercentage ?? 0);

        return Result.Success(new PollResultsDto(
            poll.Id,
            poll.Title,
            totalVotes,
            totalUnits,
            participationPercentage,
            hasQuorum,
            options
        ));
    }
}

public class HasUnitVotedQueryHandler : IRequestHandler<HasUnitVotedQuery, Result<bool>>
{
    private readonly IApplicationDbContext _context;

    public HasUnitVotedQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<bool>> Handle(HasUnitVotedQuery request, CancellationToken cancellationToken)
    {
        var hasVoted = await _context.PollVotes
            .AnyAsync(v => v.PollId == request.PollId && v.UnitId == request.UnitId, cancellationToken);
        
        return Result.Success(hasVoted);
    }
}

#endregion

#region Meeting Query Handlers

public class GetMeetingsQueryHandler : IRequestHandler<GetMeetingsQuery, Result<PagedList<MeetingDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetMeetingsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PagedList<MeetingDto>>> Handle(GetMeetingsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.Meetings
            .Include(m => m.Attendees)
            .Where(m => m.CondominiumId == request.CondominiumId);

        if (request.Status.HasValue)
            query = query.Where(m => m.Status == request.Status.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        // Get total units for quorum calculation
        var totalUnits = await _context.Units
            .Where(u => _context.Buildings
                .Any(b => b.Id == u.BuildingId && b.CondominiumId == request.CondominiumId && !b.IsDeleted))
            .CountAsync(cancellationToken);

        var meetings = await query
            .OrderByDescending(m => m.ScheduledDate)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var items = meetings.Select(m =>
        {
            var attendedUnits = m.Attendees.Where(a => a.AttendedAt != null).Select(a => a.UnitId).Distinct().Count();
            var quorumPercentage = totalUnits > 0 ? (decimal)attendedUnits / totalUnits * 100 : 0;
            
            return new MeetingDto(
                m.Id,
                m.CondominiumId,
                m.Title,
                m.Description,
                m.Type,
                GetMeetingTypeName(m.Type),
                m.Status,
                GetMeetingStatusName(m.Status),
                m.ScheduledDate,
                m.StartedAt,
                m.EndedAt,
                m.Location,
                m.VirtualMeetingUrl,
                m.Agenda,
                m.Minutes,
                m.RequiredQuorumPercentage,
                quorumPercentage,
                quorumPercentage >= m.RequiredQuorumPercentage,
                m.CreatedAt,
                m.Attendees.Select(a => new MeetingAttendeeDto(
                    a.Id, a.UnitId, null, a.ResidentId, a.ResidentName,
                    a.Status, GetAttendeeStatusName(a.Status),
                    a.ConfirmedAt, a.AttendedAt, a.IsProxy, a.ProxyName
                )).ToList()
            );
        }).ToList();

        return Result.Success(new PagedList<MeetingDto>(items, totalCount, request.Page, request.PageSize));
    }

    private static string GetMeetingTypeName(MeetingType type) => type switch
    {
        MeetingType.OrdinaryAssembly => "Asamblea Ordinaria",
        MeetingType.ExtraordinaryAssembly => "Asamblea Extraordinaria",
        MeetingType.BoardMeeting => "Junta de Consejo",
        MeetingType.CommitteeMeeting => "Reunión de Comité",
        MeetingType.VirtualMeeting => "Reunión Virtual",
        MeetingType.InformationalSession => "Sesión Informativa",
        _ => type.ToString()
    };

    private static string GetMeetingStatusName(MeetingStatus status) => status switch
    {
        MeetingStatus.Scheduled => "Programada",
        MeetingStatus.InProgress => "En Curso",
        MeetingStatus.Completed => "Completada",
        MeetingStatus.Cancelled => "Cancelada",
        MeetingStatus.Postponed => "Pospuesta",
        _ => status.ToString()
    };

    private static string GetAttendeeStatusName(AttendeeStatus status) => status switch
    {
        AttendeeStatus.Invited => "Invitado",
        AttendeeStatus.Confirmed => "Confirmado",
        AttendeeStatus.Declined => "Declinado",
        AttendeeStatus.Attended => "Asistió",
        AttendeeStatus.Absent => "Ausente",
        _ => status.ToString()
    };
}

public class GetMeetingByIdQueryHandler : IRequestHandler<GetMeetingByIdQuery, Result<MeetingDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMeetingByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<MeetingDto>> Handle(GetMeetingByIdQuery request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings
            .Include(m => m.Attendees)
            .FirstOrDefaultAsync(m => m.Id == request.MeetingId, cancellationToken);

        if (meeting == null)
            return Result.NotFound("Meeting not found");

        var totalUnits = await _context.Units
            .Where(u => _context.Buildings
                .Any(b => b.Id == u.BuildingId && b.CondominiumId == meeting.CondominiumId && !b.IsDeleted))
            .CountAsync(cancellationToken);

        var attendedUnits = meeting.Attendees.Where(a => a.AttendedAt != null).Select(a => a.UnitId).Distinct().Count();
        var quorumPercentage = totalUnits > 0 ? (decimal)attendedUnits / totalUnits * 100 : 0;

        // Get unit numbers for attendees
        var unitIds = meeting.Attendees.Select(a => a.UnitId).Distinct().ToList();
        var units = await _context.Units
            .Where(u => unitIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.UnitNumber, cancellationToken);

        var dto = new MeetingDto(
            meeting.Id,
            meeting.CondominiumId,
            meeting.Title,
            meeting.Description,
            meeting.Type,
            GetMeetingTypeName(meeting.Type),
            meeting.Status,
            GetMeetingStatusName(meeting.Status),
            meeting.ScheduledDate,
            meeting.StartedAt,
            meeting.EndedAt,
            meeting.Location,
            meeting.VirtualMeetingUrl,
            meeting.Agenda,
            meeting.Minutes,
            meeting.RequiredQuorumPercentage,
            quorumPercentage,
            quorumPercentage >= meeting.RequiredQuorumPercentage,
            meeting.CreatedAt,
            meeting.Attendees.Select(a => new MeetingAttendeeDto(
                a.Id, a.UnitId, units.GetValueOrDefault(a.UnitId), a.ResidentId, a.ResidentName,
                a.Status, GetAttendeeStatusName(a.Status),
                a.ConfirmedAt, a.AttendedAt, a.IsProxy, a.ProxyName
            )).ToList()
        );

        return Result.Success(dto);
    }

    private static string GetMeetingTypeName(MeetingType type) => type switch
    {
        MeetingType.OrdinaryAssembly => "Asamblea Ordinaria",
        MeetingType.ExtraordinaryAssembly => "Asamblea Extraordinaria",
        MeetingType.BoardMeeting => "Junta de Consejo",
        MeetingType.CommitteeMeeting => "Reunión de Comité",
        MeetingType.VirtualMeeting => "Reunión Virtual",
        MeetingType.InformationalSession => "Sesión Informativa",
        _ => type.ToString()
    };

    private static string GetMeetingStatusName(MeetingStatus status) => status switch
    {
        MeetingStatus.Scheduled => "Programada",
        MeetingStatus.InProgress => "En Curso",
        MeetingStatus.Completed => "Completada",
        MeetingStatus.Cancelled => "Cancelada",
        MeetingStatus.Postponed => "Pospuesta",
        _ => status.ToString()
    };

    private static string GetAttendeeStatusName(AttendeeStatus status) => status switch
    {
        AttendeeStatus.Invited => "Invitado",
        AttendeeStatus.Confirmed => "Confirmado",
        AttendeeStatus.Declined => "Declinado",
        AttendeeStatus.Attended => "Asistió",
        AttendeeStatus.Absent => "Ausente",
        _ => status.ToString()
    };
}

public class GetUpcomingMeetingsQueryHandler : IRequestHandler<GetUpcomingMeetingsQuery, Result<List<MeetingDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetUpcomingMeetingsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<MeetingDto>>> Handle(GetUpcomingMeetingsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var meetings = await _context.Meetings
            .Include(m => m.Attendees)
            .Where(m => m.CondominiumId == request.CondominiumId)
            .Where(m => m.Status == MeetingStatus.Scheduled)
            .Where(m => m.ScheduledDate >= now)
            .OrderBy(m => m.ScheduledDate)
            .Take(10)
            .ToListAsync(cancellationToken);

        var totalUnits = await _context.Units
            .Where(u => _context.Buildings
                .Any(b => b.Id == u.BuildingId && b.CondominiumId == request.CondominiumId && !b.IsDeleted))
            .CountAsync(cancellationToken);

        var items = meetings.Select(m =>
        {
            var attendedUnits = m.Attendees.Where(a => a.AttendedAt != null).Select(a => a.UnitId).Distinct().Count();
            var quorumPercentage = totalUnits > 0 ? (decimal)attendedUnits / totalUnits * 100 : 0;

            return new MeetingDto(
                m.Id,
                m.CondominiumId,
                m.Title,
                m.Description,
                m.Type,
                GetMeetingTypeName(m.Type),
                m.Status,
                GetMeetingStatusName(m.Status),
                m.ScheduledDate,
                m.StartedAt,
                m.EndedAt,
                m.Location,
                m.VirtualMeetingUrl,
                m.Agenda,
                m.Minutes,
                m.RequiredQuorumPercentage,
                quorumPercentage,
                quorumPercentage >= m.RequiredQuorumPercentage,
                m.CreatedAt,
                m.Attendees.Select(a => new MeetingAttendeeDto(
                    a.Id, a.UnitId, null, a.ResidentId, a.ResidentName,
                    a.Status, GetAttendeeStatusName(a.Status),
                    a.ConfirmedAt, a.AttendedAt, a.IsProxy, a.ProxyName
                )).ToList()
            );
        }).ToList();

        return Result.Success(items);
    }

    private static string GetMeetingTypeName(MeetingType type) => type switch
    {
        MeetingType.OrdinaryAssembly => "Asamblea Ordinaria",
        MeetingType.ExtraordinaryAssembly => "Asamblea Extraordinaria",
        MeetingType.BoardMeeting => "Junta de Consejo",
        MeetingType.CommitteeMeeting => "Reunión de Comité",
        MeetingType.VirtualMeeting => "Reunión Virtual",
        MeetingType.InformationalSession => "Sesión Informativa",
        _ => type.ToString()
    };

    private static string GetMeetingStatusName(MeetingStatus status) => status switch
    {
        MeetingStatus.Scheduled => "Programada",
        MeetingStatus.InProgress => "En Curso",
        MeetingStatus.Completed => "Completada",
        MeetingStatus.Cancelled => "Cancelada",
        MeetingStatus.Postponed => "Pospuesta",
        _ => status.ToString()
    };

    private static string GetAttendeeStatusName(AttendeeStatus status) => status switch
    {
        AttendeeStatus.Invited => "Invitado",
        AttendeeStatus.Confirmed => "Confirmado",
        AttendeeStatus.Declined => "Declinado",
        AttendeeStatus.Attended => "Asistió",
        AttendeeStatus.Absent => "Ausente",
        _ => status.ToString()
    };
}

public class GetMeetingQuorumQueryHandler : IRequestHandler<GetMeetingQuorumQuery, Result<MeetingQuorumDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMeetingQuorumQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<MeetingQuorumDto>> Handle(GetMeetingQuorumQuery request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings
            .Include(m => m.Attendees)
            .FirstOrDefaultAsync(m => m.Id == request.MeetingId, cancellationToken);

        if (meeting == null)
            return Result.NotFound("Meeting not found");

        var totalUnits = await _context.Units
            .Where(u => _context.Buildings
                .Any(b => b.Id == u.BuildingId && b.CondominiumId == meeting.CondominiumId && !b.IsDeleted))
            .CountAsync(cancellationToken);

        var attendedUnits = meeting.Attendees.Where(a => a.AttendedAt != null).Select(a => a.UnitId).Distinct().Count();
        var quorumPercentage = totalUnits > 0 ? (decimal)attendedUnits / totalUnits * 100 : 0;

        return Result.Success(new MeetingQuorumDto(
            totalUnits,
            attendedUnits,
            quorumPercentage,
            meeting.RequiredQuorumPercentage,
            quorumPercentage >= meeting.RequiredQuorumPercentage
        ));
    }
}

#endregion

#region Forum Query Handlers

public class GetForumPostsQueryHandler : IRequestHandler<GetForumPostsQuery, Result<PagedList<ForumPostDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetForumPostsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PagedList<ForumPostDto>>> Handle(GetForumPostsQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ForumPosts
            .Include(p => p.Comments)
            .Where(p => p.CondominiumId == request.CondominiumId);

        if (request.Category.HasValue)
            query = query.Where(p => p.Category == request.Category.Value);

        if (request.Status.HasValue)
            query = query.Where(p => p.Status == request.Status.Value);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(p => p.IsPinned)
            .ThenByDescending(p => p.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new ForumPostDto(
                p.Id,
                p.CondominiumId,
                p.AuthorId,
                p.AuthorUnitId,
                p.AuthorName,
                p.Title,
                p.Content,
                p.Category,
                GetCategoryName(p.Category),
                p.Status,
                GetStatusName(p.Status),
                p.IsPinned,
                p.AllowComments,
                p.ViewCount,
                p.Comments.Count(c => !c.IsHidden),
                p.PinnedUntil,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedList<ForumPostDto>(items, totalCount, request.Page, request.PageSize));
    }

    private static string GetCategoryName(ForumCategory category) => category switch
    {
        ForumCategory.General => "General",
        ForumCategory.BuySell => "Compra/Venta",
        ForumCategory.Services => "Servicios",
        ForumCategory.Events => "Eventos",
        ForumCategory.LostAndFound => "Perdido y Encontrado",
        ForumCategory.Suggestions => "Sugerencias",
        ForumCategory.Questions => "Preguntas",
        ForumCategory.Recommendations => "Recomendaciones",
        _ => category.ToString()
    };

    private static string GetStatusName(ForumPostStatus status) => status switch
    {
        ForumPostStatus.Active => "Activo",
        ForumPostStatus.Archived => "Archivado",
        ForumPostStatus.Hidden => "Oculto",
        _ => status.ToString()
    };
}

public class GetForumPostByIdQueryHandler : IRequestHandler<GetForumPostByIdQuery, Result<ForumPostDetailDto>>
{
    private readonly IApplicationDbContext _context;

    public GetForumPostByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<ForumPostDetailDto>> Handle(GetForumPostByIdQuery request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts
            .Include(p => p.Comments)
                .ThenInclude(c => c.Replies)
            .Include(p => p.Attachments)
            .FirstOrDefaultAsync(p => p.Id == request.ForumPostId, cancellationToken);

        if (post == null)
            return Result.NotFound("Forum post not found");

        var dto = new ForumPostDetailDto(
            post.Id,
            post.CondominiumId,
            post.AuthorId,
            post.AuthorUnitId,
            post.AuthorName,
            post.Title,
            post.Content,
            post.Category,
            GetCategoryName(post.Category),
            post.Status,
            GetStatusName(post.Status),
            post.IsPinned,
            post.AllowComments,
            post.ViewCount,
            post.PinnedUntil,
            post.CreatedAt,
            post.UpdatedAt,
            post.Comments.Where(c => c.ParentCommentId == null).Select(c => MapComment(c)).ToList(),
            post.Attachments.Select(a => new ForumPostAttachmentDto(
                a.Id, a.FileName, a.FileUrl, a.ContentType, a.FileSize
            )).ToList()
        );

        return Result.Success(dto);
    }

    private static ForumCommentDto MapComment(Domain.Entities.Communications.ForumComment c) => new(
        c.Id,
        c.AuthorId,
        c.AuthorName,
        c.Content,
        c.ParentCommentId,
        c.IsHidden,
        c.CreatedAt,
        c.UpdatedAt,
        c.Replies.Select(r => MapComment(r)).ToList()
    );

    private static string GetCategoryName(ForumCategory category) => category switch
    {
        ForumCategory.General => "General",
        ForumCategory.BuySell => "Compra/Venta",
        ForumCategory.Services => "Servicios",
        ForumCategory.Events => "Eventos",
        ForumCategory.LostAndFound => "Perdido y Encontrado",
        ForumCategory.Suggestions => "Sugerencias",
        ForumCategory.Questions => "Preguntas",
        ForumCategory.Recommendations => "Recomendaciones",
        _ => category.ToString()
    };

    private static string GetStatusName(ForumPostStatus status) => status switch
    {
        ForumPostStatus.Active => "Activo",
        ForumPostStatus.Archived => "Archivado",
        ForumPostStatus.Hidden => "Oculto",
        _ => status.ToString()
    };
}

public class GetPinnedForumPostsQueryHandler : IRequestHandler<GetPinnedForumPostsQuery, Result<List<ForumPostDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetPinnedForumPostsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<List<ForumPostDto>>> Handle(GetPinnedForumPostsQuery request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var items = await _context.ForumPosts
            .Include(p => p.Comments)
            .Where(p => p.CondominiumId == request.CondominiumId)
            .Where(p => p.IsPinned)
            .Where(p => p.Status == ForumPostStatus.Active)
            .Where(p => !p.PinnedUntil.HasValue || p.PinnedUntil > now)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new ForumPostDto(
                p.Id,
                p.CondominiumId,
                p.AuthorId,
                p.AuthorUnitId,
                p.AuthorName,
                p.Title,
                p.Content,
                p.Category,
                GetCategoryName(p.Category),
                p.Status,
                GetStatusName(p.Status),
                p.IsPinned,
                p.AllowComments,
                p.ViewCount,
                p.Comments.Count(c => !c.IsHidden),
                p.PinnedUntil,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(items);
    }

    private static string GetCategoryName(ForumCategory category) => category switch
    {
        ForumCategory.General => "General",
        ForumCategory.BuySell => "Compra/Venta",
        ForumCategory.Services => "Servicios",
        ForumCategory.Events => "Eventos",
        ForumCategory.LostAndFound => "Perdido y Encontrado",
        ForumCategory.Suggestions => "Sugerencias",
        ForumCategory.Questions => "Preguntas",
        ForumCategory.Recommendations => "Recomendaciones",
        _ => category.ToString()
    };

    private static string GetStatusName(ForumPostStatus status) => status switch
    {
        ForumPostStatus.Active => "Activo",
        ForumPostStatus.Archived => "Archivado",
        ForumPostStatus.Hidden => "Oculto",
        _ => status.ToString()
    };
}

public class GetForumPostsByAuthorQueryHandler : IRequestHandler<GetForumPostsByAuthorQuery, Result<PagedList<ForumPostDto>>>
{
    private readonly IApplicationDbContext _context;

    public GetForumPostsByAuthorQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async ValueTask<Result<PagedList<ForumPostDto>>> Handle(GetForumPostsByAuthorQuery request, CancellationToken cancellationToken)
    {
        var query = _context.ForumPosts
            .Include(p => p.Comments)
            .Where(p => p.CondominiumId == request.CondominiumId)
            .Where(p => p.AuthorId == request.AuthorId);

        var totalCount = await query.CountAsync(cancellationToken);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .Select(p => new ForumPostDto(
                p.Id,
                p.CondominiumId,
                p.AuthorId,
                p.AuthorUnitId,
                p.AuthorName,
                p.Title,
                p.Content,
                p.Category,
                GetCategoryName(p.Category),
                p.Status,
                GetStatusName(p.Status),
                p.IsPinned,
                p.AllowComments,
                p.ViewCount,
                p.Comments.Count(c => !c.IsHidden),
                p.PinnedUntil,
                p.CreatedAt,
                p.UpdatedAt
            ))
            .ToListAsync(cancellationToken);

        return Result.Success(new PagedList<ForumPostDto>(items, totalCount, request.Page, request.PageSize));
    }

    private static string GetCategoryName(ForumCategory category) => category switch
    {
        ForumCategory.General => "General",
        ForumCategory.BuySell => "Compra/Venta",
        ForumCategory.Services => "Servicios",
        ForumCategory.Events => "Eventos",
        ForumCategory.LostAndFound => "Perdido y Encontrado",
        ForumCategory.Suggestions => "Sugerencias",
        ForumCategory.Questions => "Preguntas",
        ForumCategory.Recommendations => "Recomendaciones",
        _ => category.ToString()
    };

    private static string GetStatusName(ForumPostStatus status) => status switch
    {
        ForumPostStatus.Active => "Activo",
        ForumPostStatus.Archived => "Archivado",
        ForumPostStatus.Hidden => "Oculto",
        _ => status.ToString()
    };
}

#endregion
