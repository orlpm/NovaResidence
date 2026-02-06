using MediatR;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Communications.Commands;

#region Announcements

public record CreateAnnouncementCommand(
    Guid CondominiumId,
    string Title,
    string Content,
    AnnouncementType Type,
    AnnouncementPriority Priority,
    DateTime? ExpiresAt = null,
    DateTime? MeetingDate = null,
    string? MeetingLocation = null,
    bool PublishImmediately = false
) : IRequest<Result<Guid>>;

public record UpdateAnnouncementCommand(
    Guid AnnouncementId,
    string Title,
    string Content,
    AnnouncementType Type,
    AnnouncementPriority Priority,
    DateTime? ExpiresAt,
    DateTime? MeetingDate,
    string? MeetingLocation
) : IRequest<Result>;

public record PublishAnnouncementCommand(Guid AnnouncementId) : IRequest<Result>;

public record UnpublishAnnouncementCommand(Guid AnnouncementId) : IRequest<Result>;

public record DeleteAnnouncementCommand(Guid AnnouncementId) : IRequest<Result>;

public record MarkAnnouncementAsReadCommand(Guid AnnouncementId, Guid UnitId, Guid ResidentId) : IRequest<Result>;

public record AddAnnouncementAttachmentCommand(
    Guid AnnouncementId,
    string FileName,
    string FileUrl,
    string? ContentType,
    long FileSize
) : IRequest<Result<Guid>>;

#endregion

#region Polls

public record CreatePollCommand(
    Guid CondominiumId,
    string Title,
    string Description,
    PollType Type,
    DateTime StartDate,
    DateTime EndDate,
    List<string> Options,
    bool AllowMultipleVotes = false,
    bool IsAnonymous = false,
    bool RequiresQuorum = false,
    int? QuorumPercentage = null
) : IRequest<Result<Guid>>;

public record UpdatePollCommand(
    Guid PollId,
    string Title,
    string Description,
    DateTime StartDate,
    DateTime EndDate
) : IRequest<Result>;

public record PublishPollCommand(Guid PollId) : IRequest<Result>;

public record ClosePollCommand(Guid PollId) : IRequest<Result>;

public record CancelPollCommand(Guid PollId) : IRequest<Result>;

public record DeletePollCommand(Guid PollId) : IRequest<Result>;

public record CastVoteCommand(
    Guid PollId,
    Guid PollOptionId,
    Guid UnitId,
    Guid? ResidentId
) : IRequest<Result<Guid>>;

public record AddPollOptionCommand(Guid PollId, string Text) : IRequest<Result<Guid>>;

public record RemovePollOptionCommand(Guid PollOptionId) : IRequest<Result>;

#endregion

#region Meetings

public record CreateMeetingCommand(
    Guid CondominiumId,
    string Title,
    string Description,
    MeetingType Type,
    DateTime ScheduledDate,
    string? Location = null,
    string? VirtualMeetingUrl = null,
    string? Agenda = null,
    int RequiredQuorumPercentage = 50
) : IRequest<Result<Guid>>;

public record UpdateMeetingCommand(
    Guid MeetingId,
    string Title,
    string Description,
    DateTime ScheduledDate,
    string? Location,
    string? VirtualMeetingUrl,
    string? Agenda
) : IRequest<Result>;

public record StartMeetingCommand(Guid MeetingId) : IRequest<Result>;

public record EndMeetingCommand(Guid MeetingId, string? Minutes = null) : IRequest<Result>;

public record CancelMeetingCommand(Guid MeetingId) : IRequest<Result>;

public record DeleteMeetingCommand(Guid MeetingId) : IRequest<Result>;

public record SetMeetingMinutesCommand(Guid MeetingId, string Minutes) : IRequest<Result>;

public record InviteToMeetingCommand(
    Guid MeetingId,
    Guid UnitId,
    Guid? ResidentId,
    string? ResidentName
) : IRequest<Result<Guid>>;

public record ConfirmMeetingAttendanceCommand(Guid MeetingId, Guid AttendeeId) : IRequest<Result>;

public record DeclineMeetingAttendanceCommand(Guid MeetingId, Guid AttendeeId) : IRequest<Result>;

public record MarkAttendeeArrivedCommand(Guid MeetingId, Guid AttendeeId) : IRequest<Result>;

public record SetMeetingProxyCommand(Guid MeetingId, Guid AttendeeId, string ProxyName) : IRequest<Result>;

#endregion

#region Forum

public record CreateForumPostCommand(
    Guid CondominiumId,
    Guid AuthorId,
    Guid? AuthorUnitId,
    string AuthorName,
    string Title,
    string Content,
    ForumCategory Category,
    bool AllowComments = true
) : IRequest<Result<Guid>>;

public record UpdateForumPostCommand(
    Guid ForumPostId,
    string Title,
    string Content,
    ForumCategory Category,
    bool AllowComments
) : IRequest<Result>;

public record PinForumPostCommand(Guid ForumPostId, DateTime? Until = null) : IRequest<Result>;

public record UnpinForumPostCommand(Guid ForumPostId) : IRequest<Result>;

public record ArchiveForumPostCommand(Guid ForumPostId) : IRequest<Result>;

public record HideForumPostCommand(Guid ForumPostId) : IRequest<Result>;

public record RestoreForumPostCommand(Guid ForumPostId) : IRequest<Result>;

public record DeleteForumPostCommand(Guid ForumPostId) : IRequest<Result>;

public record IncrementForumPostViewsCommand(Guid ForumPostId) : IRequest<Result>;

public record AddForumCommentCommand(
    Guid ForumPostId,
    Guid AuthorId,
    string AuthorName,
    string Content,
    Guid? ParentCommentId = null
) : IRequest<Result<Guid>>;

public record UpdateForumCommentCommand(Guid CommentId, string Content) : IRequest<Result>;

public record HideForumCommentCommand(Guid CommentId) : IRequest<Result>;

public record ShowForumCommentCommand(Guid CommentId) : IRequest<Result>;

public record DeleteForumCommentCommand(Guid CommentId) : IRequest<Result>;

#endregion
