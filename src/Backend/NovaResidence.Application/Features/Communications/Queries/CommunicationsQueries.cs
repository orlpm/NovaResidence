using MediatR;
using Ardalis.Result;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Communications.Queries;

#region DTOs

public record AnnouncementDto(
    Guid Id,
    Guid CondominiumId,
    string Title,
    string Content,
    AnnouncementType Type,
    string TypeName,
    AnnouncementPriority Priority,
    string PriorityName,
    bool IsPublished,
    DateTime? PublishedAt,
    DateTime? ExpiresAt,
    DateTime? MeetingDate,
    string? MeetingLocation,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<AnnouncementAttachmentDto> Attachments,
    int ReadCount
);

public record AnnouncementAttachmentDto(
    Guid Id,
    string FileName,
    string FileUrl,
    string? ContentType,
    long FileSize
);

public record PollDto(
    Guid Id,
    Guid CondominiumId,
    string Title,
    string Description,
    PollType Type,
    string TypeName,
    PollStatus Status,
    string StatusName,
    DateTime StartDate,
    DateTime EndDate,
    bool AllowMultipleVotes,
    bool IsAnonymous,
    bool RequiresQuorum,
    int? QuorumPercentage,
    DateTime CreatedAt,
    List<PollOptionDto> Options,
    int TotalVotes
);

public record PollOptionDto(
    Guid Id,
    string Text,
    int DisplayOrder,
    int VoteCount,
    decimal VotePercentage
);

public record PollResultsDto(
    Guid PollId,
    string Title,
    int TotalVotes,
    int TotalEligibleUnits,
    decimal ParticipationPercentage,
    bool HasQuorum,
    List<PollOptionResultDto> Options
);

public record PollOptionResultDto(
    Guid Id,
    string Text,
    int VoteCount,
    decimal Percentage
);

public record MeetingDto(
    Guid Id,
    Guid CondominiumId,
    string Title,
    string Description,
    MeetingType Type,
    string TypeName,
    MeetingStatus Status,
    string StatusName,
    DateTime ScheduledDate,
    DateTime? StartedAt,
    DateTime? EndedAt,
    string? Location,
    string? VirtualMeetingUrl,
    string? Agenda,
    string? Minutes,
    int RequiredQuorumPercentage,
    decimal CurrentQuorumPercentage,
    bool HasQuorum,
    DateTime CreatedAt,
    List<MeetingAttendeeDto> Attendees
);

public record MeetingAttendeeDto(
    Guid Id,
    Guid UnitId,
    string? UnitNumber,
    Guid? ResidentId,
    string? ResidentName,
    AttendeeStatus Status,
    string StatusName,
    DateTime? ConfirmedAt,
    DateTime? AttendedAt,
    bool IsProxy,
    string? ProxyName
);

public record ForumPostDto(
    Guid Id,
    Guid CondominiumId,
    Guid AuthorId,
    Guid? AuthorUnitId,
    string AuthorName,
    string Title,
    string Content,
    ForumCategory Category,
    string CategoryName,
    ForumPostStatus Status,
    string StatusName,
    bool IsPinned,
    bool AllowComments,
    int ViewCount,
    int CommentCount,
    DateTime? PinnedUntil,
    DateTime CreatedAt,
    DateTime? UpdatedAt
);

public record ForumPostDetailDto(
    Guid Id,
    Guid CondominiumId,
    Guid AuthorId,
    Guid? AuthorUnitId,
    string AuthorName,
    string Title,
    string Content,
    ForumCategory Category,
    string CategoryName,
    ForumPostStatus Status,
    string StatusName,
    bool IsPinned,
    bool AllowComments,
    int ViewCount,
    DateTime? PinnedUntil,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<ForumCommentDto> Comments,
    List<ForumPostAttachmentDto> Attachments
);

public record ForumCommentDto(
    Guid Id,
    Guid AuthorId,
    string AuthorName,
    string Content,
    Guid? ParentCommentId,
    bool IsHidden,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    List<ForumCommentDto> Replies
);

public record ForumPostAttachmentDto(
    Guid Id,
    string FileName,
    string FileUrl,
    string? ContentType,
    long FileSize
);

#endregion

#region Announcements Queries

public record GetAnnouncementsQuery(
    Guid CondominiumId,
    AnnouncementType? Type = null,
    bool? IsPublished = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<PagedList<AnnouncementDto>>>;

public record GetAnnouncementByIdQuery(Guid AnnouncementId) : IRequest<Result<AnnouncementDto>>;

public record GetPublishedAnnouncementsQuery(
    Guid CondominiumId,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<PagedList<AnnouncementDto>>>;

#endregion

#region Polls Queries

public record GetPollsQuery(
    Guid CondominiumId,
    PollStatus? Status = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<PagedList<PollDto>>>;

public record GetPollByIdQuery(Guid PollId) : IRequest<Result<PollDto>>;

public record GetActivePollsQuery(Guid CondominiumId) : IRequest<Result<List<PollDto>>>;

public record GetPollResultsQuery(Guid PollId) : IRequest<Result<PollResultsDto>>;

public record HasUnitVotedQuery(Guid PollId, Guid UnitId) : IRequest<Result<bool>>;

#endregion

#region Meetings Queries

public record GetMeetingsQuery(
    Guid CondominiumId,
    MeetingStatus? Status = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<PagedList<MeetingDto>>>;

public record GetMeetingByIdQuery(Guid MeetingId) : IRequest<Result<MeetingDto>>;

public record GetUpcomingMeetingsQuery(Guid CondominiumId) : IRequest<Result<List<MeetingDto>>>;

public record GetMeetingQuorumQuery(Guid MeetingId) : IRequest<Result<MeetingQuorumDto>>;

public record MeetingQuorumDto(
    int TotalUnits,
    int AttendedUnits,
    decimal QuorumPercentage,
    int RequiredPercentage,
    bool HasQuorum
);

#endregion

#region Forum Queries

public record GetForumPostsQuery(
    Guid CondominiumId,
    ForumCategory? Category = null,
    ForumPostStatus? Status = null,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<PagedList<ForumPostDto>>>;

public record GetForumPostByIdQuery(Guid ForumPostId) : IRequest<Result<ForumPostDetailDto>>;

public record GetPinnedForumPostsQuery(Guid CondominiumId) : IRequest<Result<List<ForumPostDto>>>;

public record GetForumPostsByAuthorQuery(
    Guid CondominiumId,
    Guid AuthorId,
    int Page = 1,
    int PageSize = 20
) : IRequest<Result<PagedList<ForumPostDto>>>;

#endregion

#region Pagination

public record PagedList<T>(
    List<T> Items,
    int TotalCount,
    int Page,
    int PageSize
)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool HasPreviousPage => Page > 1;
    public bool HasNextPage => Page < TotalPages;
}

#endregion
