using MediatR;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Communications;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Communications.Commands;

#region Announcement Handlers

public class CreateAnnouncementCommandHandler : IRequestHandler<CreateAnnouncementCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CreateAnnouncementCommandHandler> _logger;

    public CreateAnnouncementCommandHandler(IApplicationDbContext context, ILogger<CreateAnnouncementCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(CreateAnnouncementCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var announcement = Announcement.Create(
                request.CondominiumId,
                request.Title,
                request.Content,
                request.Type,
                request.Priority,
                request.ExpiresAt,
                request.MeetingDate,
                request.MeetingLocation
            );

            if (request.PublishImmediately)
            {
                announcement.Publish();
            }

            _context.Announcements.Add(announcement);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created announcement {AnnouncementId}", announcement.Id);
            return Result.Success(announcement.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating announcement");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating announcement: {ex.Message}" }, null));
        }
    }
}

public class UpdateAnnouncementCommandHandler : IRequestHandler<UpdateAnnouncementCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<UpdateAnnouncementCommandHandler> _logger;

    public UpdateAnnouncementCommandHandler(IApplicationDbContext context, ILogger<UpdateAnnouncementCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result> Handle(UpdateAnnouncementCommand request, CancellationToken cancellationToken)
    {
        var announcement = await _context.Announcements.FindAsync(request.AnnouncementId);
        if (announcement == null)
            return Result.NotFound("Announcement not found");

        announcement.Update(
            request.Title,
            request.Content,
            request.Type,
            request.Priority,
            request.ExpiresAt,
            request.MeetingDate,
            request.MeetingLocation
        );

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class PublishAnnouncementCommandHandler : IRequestHandler<PublishAnnouncementCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public PublishAnnouncementCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(PublishAnnouncementCommand request, CancellationToken cancellationToken)
    {
        var announcement = await _context.Announcements.FindAsync(request.AnnouncementId);
        if (announcement == null)
            return Result.NotFound("Announcement not found");

        announcement.Publish();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class UnpublishAnnouncementCommandHandler : IRequestHandler<UnpublishAnnouncementCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UnpublishAnnouncementCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UnpublishAnnouncementCommand request, CancellationToken cancellationToken)
    {
        var announcement = await _context.Announcements.FindAsync(request.AnnouncementId);
        if (announcement == null)
            return Result.NotFound("Announcement not found");

        announcement.Unpublish();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class DeleteAnnouncementCommandHandler : IRequestHandler<DeleteAnnouncementCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeleteAnnouncementCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteAnnouncementCommand request, CancellationToken cancellationToken)
    {
        var announcement = await _context.Announcements.FindAsync(request.AnnouncementId);
        if (announcement == null)
            return Result.NotFound("Announcement not found");

        announcement.IsDeleted = true;
        announcement.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class MarkAnnouncementAsReadCommandHandler : IRequestHandler<MarkAnnouncementAsReadCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public MarkAnnouncementAsReadCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(MarkAnnouncementAsReadCommand request, CancellationToken cancellationToken)
    {
        var recipient = await _context.AnnouncementRecipients
            .FirstOrDefaultAsync(r => r.AnnouncementId == request.AnnouncementId 
                && r.UnitId == request.UnitId 
                && r.ResidentId == request.ResidentId, cancellationToken);

        if (recipient == null)
        {
            recipient = AnnouncementRecipient.Create(request.AnnouncementId, request.UnitId, request.ResidentId);
            _context.AnnouncementRecipients.Add(recipient);
        }

        recipient.MarkAsRead();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class AddAnnouncementAttachmentCommandHandler : IRequestHandler<AddAnnouncementAttachmentCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public AddAnnouncementAttachmentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(AddAnnouncementAttachmentCommand request, CancellationToken cancellationToken)
    {
        var attachment = AnnouncementAttachment.Create(
            request.AnnouncementId,
            request.FileName,
            request.FileUrl,
            request.ContentType,
            request.FileSize
        );

        _context.AnnouncementAttachments.Add(attachment);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(attachment.Id);
    }
}

public class AddForumPostAttachmentCommandHandler : IRequestHandler<AddForumPostAttachmentCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public AddForumPostAttachmentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(AddForumPostAttachmentCommand request, CancellationToken cancellationToken)
    {
        var attachment = ForumPostAttachment.Create(
            request.ForumPostId,
            request.FileName,
            request.FileUrl,
            request.ContentType,
            request.FileSize
        );

        _context.ForumPostAttachments.Add(attachment);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(attachment.Id);
    }
}

#endregion

#region Poll Handlers

public class CreatePollCommandHandler : IRequestHandler<CreatePollCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CreatePollCommandHandler> _logger;

    public CreatePollCommandHandler(IApplicationDbContext context, ILogger<CreatePollCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(CreatePollCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var poll = Poll.Create(
                request.CondominiumId,
                request.Title,
                request.Description,
                request.Type,
                request.StartDate,
                request.EndDate,
                request.AllowMultipleVotes,
                request.IsAnonymous,
                request.RequiresQuorum,
                request.QuorumPercentage
            );

            _context.Polls.Add(poll);

            // Add options
            for (int i = 0; i < request.Options.Count; i++)
            {
                var option = PollOption.Create(poll.Id, request.Options[i], i);
                _context.PollOptions.Add(option);
            }

            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created poll {PollId}", poll.Id);
            return Result.Success(poll.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating poll");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating poll: {ex.Message}" }, null));
        }
    }
}

public class UpdatePollCommandHandler : IRequestHandler<UpdatePollCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UpdatePollCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdatePollCommand request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls.FindAsync(request.PollId);
        if (poll == null)
            return Result.NotFound("Poll not found");

        poll.Update(request.Title, request.Description, request.StartDate, request.EndDate);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class PublishPollCommandHandler : IRequestHandler<PublishPollCommand, Result>
{
    private readonly IApplicationDbContext _context;
    private readonly IOperationalNotifier _notifier;

    public PublishPollCommandHandler(IApplicationDbContext context, IOperationalNotifier notifier)
    {
        _context = context;
        _notifier = notifier;
    }

    public async Task<Result> Handle(PublishPollCommand request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls.FindAsync(request.PollId);
        if (poll == null)
            return Result.NotFound("Poll not found");

        poll.Publish();
        await _context.SaveChangesAsync(cancellationToken);
        await _notifier.NotifyResidentsAsync(
            poll.CondominiumId,
            NotificationType.Poll,
            "Nueva encuesta",
            poll.Title,
            "Poll",
            poll.Id,
            "/resident/communications",
            cancellationToken);
        return Result.Success();
    }
}

public class ClosePollCommandHandler : IRequestHandler<ClosePollCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ClosePollCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ClosePollCommand request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls.FindAsync(request.PollId);
        if (poll == null)
            return Result.NotFound("Poll not found");

        poll.Close();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class CancelPollCommandHandler : IRequestHandler<CancelPollCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public CancelPollCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(CancelPollCommand request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls.FindAsync(request.PollId);
        if (poll == null)
            return Result.NotFound("Poll not found");

        poll.Cancel();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class DeletePollCommandHandler : IRequestHandler<DeletePollCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeletePollCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeletePollCommand request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls.FindAsync(request.PollId);
        if (poll == null)
            return Result.NotFound("Poll not found");

        poll.IsDeleted = true;
        poll.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class CastVoteCommandHandler : IRequestHandler<CastVoteCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CastVoteCommandHandler> _logger;

    public CastVoteCommandHandler(IApplicationDbContext context, ILogger<CastVoteCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(CastVoteCommand request, CancellationToken cancellationToken)
    {
        var poll = await _context.Polls
            .Include(p => p.Votes)
            .FirstOrDefaultAsync(p => p.Id == request.PollId, cancellationToken);

        if (poll == null)
            return Result.NotFound("Poll not found");

        if (poll.Status != PollStatus.Active)
            return Result.Error(new Ardalis.Result.ErrorList(new[] { "Poll is not active" }, null));

        if (DateTime.UtcNow < poll.StartDate || DateTime.UtcNow > poll.EndDate)
            return Result.Error(new Ardalis.Result.ErrorList(new[] { "Poll is not within voting period" }, null));

        // Check if unit already voted (unless multiple votes allowed)
        if (!poll.AllowMultipleVotes)
        {
            var existingVote = await _context.PollVotes
                .AnyAsync(v => v.PollId == request.PollId && v.UnitId == request.UnitId, cancellationToken);
            
            if (existingVote)
                return Result.Error(new Ardalis.Result.ErrorList(new[] { "This unit has already voted" }, null));
        }

        var vote = PollVote.Create(request.PollId, request.PollOptionId, request.UnitId, request.ResidentId);
        _context.PollVotes.Add(vote);
        await _context.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Vote cast for poll {PollId} by unit {UnitId}", request.PollId, request.UnitId);
        return Result.Success(vote.Id);
    }
}

public class AddPollOptionCommandHandler : IRequestHandler<AddPollOptionCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public AddPollOptionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(AddPollOptionCommand request, CancellationToken cancellationToken)
    {
        var maxOrder = await _context.PollOptions
            .Where(o => o.PollId == request.PollId)
            .MaxAsync(o => (int?)o.DisplayOrder, cancellationToken) ?? -1;

        var option = PollOption.Create(request.PollId, request.Text, maxOrder + 1);
        _context.PollOptions.Add(option);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(option.Id);
    }
}

public class RemovePollOptionCommandHandler : IRequestHandler<RemovePollOptionCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public RemovePollOptionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(RemovePollOptionCommand request, CancellationToken cancellationToken)
    {
        var option = await _context.PollOptions.FindAsync(request.PollOptionId);
        if (option == null)
            return Result.NotFound("Poll option not found");

        option.IsDeleted = true;
        option.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

#endregion

#region Meeting Handlers

public class CreateMeetingCommandHandler : IRequestHandler<CreateMeetingCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CreateMeetingCommandHandler> _logger;

    public CreateMeetingCommandHandler(IApplicationDbContext context, ILogger<CreateMeetingCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(CreateMeetingCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var meeting = Meeting.Create(
                request.CondominiumId,
                request.Title,
                request.Description,
                request.Type,
                request.ScheduledDate,
                request.Location,
                request.VirtualMeetingUrl,
                request.Agenda,
                request.RequiredQuorumPercentage
            );

            _context.Meetings.Add(meeting);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created meeting {MeetingId}", meeting.Id);
            return Result.Success(meeting.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating meeting");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating meeting: {ex.Message}" }, null));
        }
    }
}

public class UpdateMeetingCommandHandler : IRequestHandler<UpdateMeetingCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UpdateMeetingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdateMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings.FindAsync(request.MeetingId);
        if (meeting == null)
            return Result.NotFound("Meeting not found");

        meeting.Update(
            request.Title,
            request.Description,
            request.ScheduledDate,
            request.Location,
            request.VirtualMeetingUrl,
            request.Agenda
        );

        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class StartMeetingCommandHandler : IRequestHandler<StartMeetingCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public StartMeetingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(StartMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings.FindAsync(request.MeetingId);
        if (meeting == null)
            return Result.NotFound("Meeting not found");

        meeting.Start();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class EndMeetingCommandHandler : IRequestHandler<EndMeetingCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public EndMeetingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(EndMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings.FindAsync(request.MeetingId);
        if (meeting == null)
            return Result.NotFound("Meeting not found");

        meeting.End(request.Minutes);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class CancelMeetingCommandHandler : IRequestHandler<CancelMeetingCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public CancelMeetingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(CancelMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings.FindAsync(request.MeetingId);
        if (meeting == null)
            return Result.NotFound("Meeting not found");

        meeting.Cancel();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class DeleteMeetingCommandHandler : IRequestHandler<DeleteMeetingCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeleteMeetingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings.FindAsync(request.MeetingId);
        if (meeting == null)
            return Result.NotFound("Meeting not found");

        meeting.IsDeleted = true;
        meeting.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class SetMeetingMinutesCommandHandler : IRequestHandler<SetMeetingMinutesCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public SetMeetingMinutesCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(SetMeetingMinutesCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings.FindAsync(request.MeetingId);
        if (meeting == null)
            return Result.NotFound("Meeting not found");

        meeting.SetMinutes(request.Minutes);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class InviteToMeetingCommandHandler : IRequestHandler<InviteToMeetingCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly IOperationalNotifier _notifier;

    public InviteToMeetingCommandHandler(IApplicationDbContext context, IOperationalNotifier notifier)
    {
        _context = context;
        _notifier = notifier;
    }

    public async Task<Result<Guid>> Handle(InviteToMeetingCommand request, CancellationToken cancellationToken)
    {
        var meeting = await _context.Meetings.FindAsync(new object[] { request.MeetingId }, cancellationToken);
        if (meeting == null)
            return Result.NotFound("Meeting not found");

        var attendee = MeetingAttendee.Create(
            request.MeetingId,
            request.UnitId,
            request.ResidentId,
            request.ResidentName
        );

        _context.MeetingAttendees.Add(attendee);
        await _context.SaveChangesAsync(cancellationToken);

        var residentUserId = await _context.Residents
            .Where(resident => resident.Id == request.ResidentId && resident.UserId != null)
            .Select(resident => resident.UserId)
            .FirstOrDefaultAsync(cancellationToken);

        if (residentUserId.HasValue)
        {
            await _notifier.NotifyUsersAsync(
                new[] { residentUserId.Value },
                meeting.CondominiumId,
                NotificationType.Meeting,
                "Invitación a asamblea",
                meeting.Title,
                "Meeting",
                meeting.Id,
                "/resident/communications",
                cancellationToken);
        }

        return Result.Success(attendee.Id);
    }
}

public class ConfirmMeetingAttendanceCommandHandler : IRequestHandler<ConfirmMeetingAttendanceCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ConfirmMeetingAttendanceCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ConfirmMeetingAttendanceCommand request, CancellationToken cancellationToken)
    {
        var attendee = await _context.MeetingAttendees
            .FirstOrDefaultAsync(a => a.MeetingId == request.MeetingId && a.Id == request.AttendeeId, cancellationToken);
        
        if (attendee == null)
            return Result.NotFound("Attendee not found");

        attendee.Confirm();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class DeclineMeetingAttendanceCommandHandler : IRequestHandler<DeclineMeetingAttendanceCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeclineMeetingAttendanceCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeclineMeetingAttendanceCommand request, CancellationToken cancellationToken)
    {
        var attendee = await _context.MeetingAttendees
            .FirstOrDefaultAsync(a => a.MeetingId == request.MeetingId && a.Id == request.AttendeeId, cancellationToken);
        
        if (attendee == null)
            return Result.NotFound("Attendee not found");

        attendee.Decline();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class MarkAttendeeArrivedCommandHandler : IRequestHandler<MarkAttendeeArrivedCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public MarkAttendeeArrivedCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(MarkAttendeeArrivedCommand request, CancellationToken cancellationToken)
    {
        var attendee = await _context.MeetingAttendees
            .FirstOrDefaultAsync(a => a.MeetingId == request.MeetingId && a.Id == request.AttendeeId, cancellationToken);
        
        if (attendee == null)
            return Result.NotFound("Attendee not found");

        attendee.MarkAttended();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class SetMeetingProxyCommandHandler : IRequestHandler<SetMeetingProxyCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public SetMeetingProxyCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(SetMeetingProxyCommand request, CancellationToken cancellationToken)
    {
        var attendee = await _context.MeetingAttendees
            .FirstOrDefaultAsync(a => a.MeetingId == request.MeetingId && a.Id == request.AttendeeId, cancellationToken);
        
        if (attendee == null)
            return Result.NotFound("Attendee not found");

        attendee.SetProxy(request.ProxyName);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

#endregion

#region Forum Handlers

public class CreateForumPostCommandHandler : IRequestHandler<CreateForumPostCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;
    private readonly ILogger<CreateForumPostCommandHandler> _logger;

    public CreateForumPostCommandHandler(IApplicationDbContext context, ILogger<CreateForumPostCommandHandler> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Result<Guid>> Handle(CreateForumPostCommand request, CancellationToken cancellationToken)
    {
        try
        {
            var post = ForumPost.Create(
                request.CondominiumId,
                request.AuthorId,
                request.AuthorUnitId,
                request.AuthorName,
                request.Title,
                request.Content,
                request.Category,
                request.AllowComments
            );

            _context.ForumPosts.Add(post);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Created forum post {PostId}", post.Id);
            return Result.Success(post.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating forum post");
            return Result.Error(new Ardalis.Result.ErrorList(new[] { $"Error creating forum post: {ex.Message}" }, null));
        }
    }
}

public class UpdateForumPostCommandHandler : IRequestHandler<UpdateForumPostCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UpdateForumPostCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdateForumPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.Update(request.Title, request.Content, request.Category, request.AllowComments);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class PinForumPostCommandHandler : IRequestHandler<PinForumPostCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public PinForumPostCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(PinForumPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.Pin(request.Until);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class UnpinForumPostCommandHandler : IRequestHandler<UnpinForumPostCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UnpinForumPostCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UnpinForumPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.Unpin();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class ArchiveForumPostCommandHandler : IRequestHandler<ArchiveForumPostCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ArchiveForumPostCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ArchiveForumPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.Archive();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class HideForumPostCommandHandler : IRequestHandler<HideForumPostCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public HideForumPostCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(HideForumPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.Hide();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class RestoreForumPostCommandHandler : IRequestHandler<RestoreForumPostCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public RestoreForumPostCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(RestoreForumPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.Restore();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class DeleteForumPostCommandHandler : IRequestHandler<DeleteForumPostCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeleteForumPostCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteForumPostCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.IsDeleted = true;
        post.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class IncrementForumPostViewsCommandHandler : IRequestHandler<IncrementForumPostViewsCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public IncrementForumPostViewsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(IncrementForumPostViewsCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        post.IncrementViewCount();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class AddForumCommentCommandHandler : IRequestHandler<AddForumCommentCommand, Result<Guid>>
{
    private readonly IApplicationDbContext _context;

    public AddForumCommentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result<Guid>> Handle(AddForumCommentCommand request, CancellationToken cancellationToken)
    {
        var post = await _context.ForumPosts.FindAsync(request.ForumPostId);
        if (post == null)
            return Result.NotFound("Forum post not found");

        if (!post.AllowComments)
            return Result.Error(new Ardalis.Result.ErrorList(new[] { "Comments are not allowed on this post" }, null));

        var comment = ForumComment.Create(
            request.ForumPostId,
            request.AuthorId,
            request.AuthorName,
            request.Content,
            request.ParentCommentId
        );

        _context.ForumComments.Add(comment);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success(comment.Id);
    }
}

public class UpdateForumCommentCommandHandler : IRequestHandler<UpdateForumCommentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public UpdateForumCommentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(UpdateForumCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await _context.ForumComments.FindAsync(request.CommentId);
        if (comment == null)
            return Result.NotFound("Comment not found");

        comment.Update(request.Content);
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class HideForumCommentCommandHandler : IRequestHandler<HideForumCommentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public HideForumCommentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(HideForumCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await _context.ForumComments.FindAsync(request.CommentId);
        if (comment == null)
            return Result.NotFound("Comment not found");

        comment.Hide();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class ShowForumCommentCommandHandler : IRequestHandler<ShowForumCommentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public ShowForumCommentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(ShowForumCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await _context.ForumComments.FindAsync(request.CommentId);
        if (comment == null)
            return Result.NotFound("Comment not found");

        comment.Show();
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

public class DeleteForumCommentCommandHandler : IRequestHandler<DeleteForumCommentCommand, Result>
{
    private readonly IApplicationDbContext _context;

    public DeleteForumCommentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Result> Handle(DeleteForumCommentCommand request, CancellationToken cancellationToken)
    {
        var comment = await _context.ForumComments.FindAsync(request.CommentId);
        if (comment == null)
            return Result.NotFound("Comment not found");

        comment.IsDeleted = true;
        comment.DeletedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }
}

#endregion
