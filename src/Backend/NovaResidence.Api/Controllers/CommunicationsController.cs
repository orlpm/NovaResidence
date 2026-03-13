using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MediatR;
using Ardalis.Result;
using NovaResidence.Api.Security;
using NovaResidence.Application.Features.Communications.Commands;
using NovaResidence.Application.Features.Communications.Queries;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CommunicationsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ITenantAccessService _tenantAccessService;

    public CommunicationsController(IMediator mediator, ITenantAccessService tenantAccessService)
    {
        _mediator = mediator;
        _tenantAccessService = tenantAccessService;
    }

    #region Announcements

    [HttpGet("announcements/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<PagedList<AnnouncementDto>>> GetAnnouncements(
        Guid condominiumId,
        [FromQuery] AnnouncementType? type = null,
        [FromQuery] bool? isPublished = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetAnnouncementsQuery(condominiumId, type, isPublished, page, pageSize));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("announcements/{id:guid}")]
    public async Task<ActionResult<AnnouncementDto>> GetAnnouncement(Guid id)
    {
        if (!await _tenantAccessService.CanAccessAnnouncementAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new GetAnnouncementByIdQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("announcements/published/{condominiumId:guid}")]
    public async Task<ActionResult<PagedList<AnnouncementDto>>> GetPublishedAnnouncements(
        Guid condominiumId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetPublishedAnnouncementsQuery(condominiumId, page, pageSize));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("announcements")]
    public async Task<ActionResult<Guid>> CreateAnnouncement([FromBody] CreateAnnouncementRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId))
            return TenantForbidden();

        var command = new CreateAnnouncementCommand(
            request.CondominiumId,
            request.Title,
            request.Content,
            request.Type,
            request.Priority,
            request.ExpiresAt,
            request.MeetingDate,
            request.MeetingLocation,
            request.PublishImmediately
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return CreatedAtAction(nameof(GetAnnouncement), new { id = result.Value }, result.Value);
    }

    [HttpPut("announcements/{id:guid}")]
    public async Task<ActionResult> UpdateAnnouncement(Guid id, [FromBody] UpdateAnnouncementRequest request)
    {
        if (!await _tenantAccessService.CanAccessAnnouncementAsync(User, id))
            return TenantForbidden();

        var command = new UpdateAnnouncementCommand(
            id,
            request.Title,
            request.Content,
            request.Type,
            request.Priority,
            request.ExpiresAt,
            request.MeetingDate,
            request.MeetingLocation
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("announcements/{id:guid}/publish")]
    public async Task<ActionResult> PublishAnnouncement(Guid id)
    {
        if (!await _tenantAccessService.CanAccessAnnouncementAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new PublishAnnouncementCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("announcements/{id:guid}/unpublish")]
    public async Task<ActionResult> UnpublishAnnouncement(Guid id)
    {
        if (!await _tenantAccessService.CanAccessAnnouncementAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new UnpublishAnnouncementCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpDelete("announcements/{id:guid}")]
    public async Task<ActionResult> DeleteAnnouncement(Guid id)
    {
        if (!await _tenantAccessService.CanAccessAnnouncementAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new DeleteAnnouncementCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("announcements/{id:guid}/mark-read")]
    public async Task<ActionResult> MarkAnnouncementAsRead(Guid id, [FromBody] MarkReadRequest request)
    {
        if (!await _tenantAccessService.CanAccessAnnouncementAsync(User, id)
            || !await _tenantAccessService.CanAccessUnitAsync(User, request.UnitId))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new MarkAnnouncementAsReadCommand(id, request.UnitId, request.ResidentId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("announcements/{id:guid}/attachments")]
    public async Task<ActionResult<Guid>> AddAnnouncementAttachment(Guid id, [FromBody] AddAnnouncementAttachmentRequest request)
    {
        if (!await _tenantAccessService.CanAccessAnnouncementAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new AddAnnouncementAttachmentCommand(
            id,
            request.FileName,
            request.FileUrl,
            request.ContentType,
            request.FileSize
        ));

        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound
                ? NotFound(result.Errors)
                : BadRequest(result.Errors);

        return Ok(result.Value);
    }

    #endregion

    private ActionResult TenantForbidden()
    {
        return StatusCode(StatusCodes.Status403Forbidden, new[] { "No tienes acceso a este condominio" });
    }

    #region Polls

    [HttpGet("polls/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<PagedList<PollDto>>> GetPolls(
        Guid condominiumId,
        [FromQuery] PollStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetPollsQuery(condominiumId, status, page, pageSize));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("polls/{id:guid}")]
    public async Task<ActionResult<PollDto>> GetPoll(Guid id)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new GetPollByIdQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("polls/active/{condominiumId:guid}")]
    public async Task<ActionResult<List<PollDto>>> GetActivePolls(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetActivePollsQuery(condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("polls/{id:guid}/results")]
    public async Task<ActionResult<PollResultsDto>> GetPollResults(Guid id)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new GetPollResultsQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("polls/{pollId:guid}/has-voted/{unitId:guid}")]
    public async Task<ActionResult<bool>> HasUnitVoted(Guid pollId, Guid unitId)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, pollId)
            || !await _tenantAccessService.CanAccessUnitAsync(User, unitId))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new HasUnitVotedQuery(pollId, unitId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("polls")]
    public async Task<ActionResult<Guid>> CreatePoll([FromBody] CreatePollRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId))
            return TenantForbidden();

        var command = new CreatePollCommand(
            request.CondominiumId,
            request.Title,
            request.Description,
            request.Type,
            request.StartDate,
            request.EndDate,
            request.Options,
            request.AllowMultipleVotes,
            request.IsAnonymous,
            request.RequiresQuorum,
            request.QuorumPercentage
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return CreatedAtAction(nameof(GetPoll), new { id = result.Value }, result.Value);
    }

    [HttpPut("polls/{id:guid}")]
    public async Task<ActionResult> UpdatePoll(Guid id, [FromBody] UpdatePollRequest request)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id))
            return TenantForbidden();

        var command = new UpdatePollCommand(
            id,
            request.Title,
            request.Description,
            request.StartDate,
            request.EndDate
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("polls/{id:guid}/publish")]
    public async Task<ActionResult> PublishPoll(Guid id)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new PublishPollCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("polls/{id:guid}/close")]
    public async Task<ActionResult> ClosePoll(Guid id)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new ClosePollCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("polls/{id:guid}/cancel")]
    public async Task<ActionResult> CancelPoll(Guid id)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new CancelPollCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpDelete("polls/{id:guid}")]
    public async Task<ActionResult> DeletePoll(Guid id)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new DeletePollCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("polls/{id:guid}/vote")]
    public async Task<ActionResult<Guid>> CastVote(Guid id, [FromBody] CastVoteRequest request)
    {
        if (!await _tenantAccessService.CanAccessPollAsync(User, id)
            || !await _tenantAccessService.CanAccessUnitAsync(User, request.UnitId))
        {
            return TenantForbidden();
        }

        var command = new CastVoteCommand(id, request.OptionId, request.UnitId, request.ResidentId);
        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    #endregion

    #region Meetings

    [HttpGet("meetings/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<PagedList<MeetingDto>>> GetMeetings(
        Guid condominiumId,
        [FromQuery] MeetingStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetMeetingsQuery(condominiumId, status, page, pageSize));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("meetings/{id:guid}")]
    public async Task<ActionResult<MeetingDto>> GetMeeting(Guid id)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new GetMeetingByIdQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("meetings/upcoming/{condominiumId:guid}")]
    public async Task<ActionResult<List<MeetingDto>>> GetUpcomingMeetings(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetUpcomingMeetingsQuery(condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("meetings/{id:guid}/quorum")]
    public async Task<ActionResult<MeetingQuorumDto>> GetMeetingQuorum(Guid id)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new GetMeetingQuorumQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("meetings")]
    public async Task<ActionResult<Guid>> CreateMeeting([FromBody] CreateMeetingRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId))
            return TenantForbidden();

        var command = new CreateMeetingCommand(
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

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return CreatedAtAction(nameof(GetMeeting), new { id = result.Value }, result.Value);
    }

    [HttpPut("meetings/{id:guid}")]
    public async Task<ActionResult> UpdateMeeting(Guid id, [FromBody] UpdateMeetingRequest request)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var command = new UpdateMeetingCommand(
            id,
            request.Title,
            request.Description,
            request.ScheduledDate,
            request.Location,
            request.VirtualMeetingUrl,
            request.Agenda
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("meetings/{id:guid}/start")]
    public async Task<ActionResult> StartMeeting(Guid id)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new StartMeetingCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("meetings/{id:guid}/end")]
    public async Task<ActionResult> EndMeeting(Guid id, [FromBody] EndMeetingRequest? request = null)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new EndMeetingCommand(id, request?.Minutes));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("meetings/{id:guid}/cancel")]
    public async Task<ActionResult> CancelMeeting(Guid id)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new CancelMeetingCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpDelete("meetings/{id:guid}")]
    public async Task<ActionResult> DeleteMeeting(Guid id)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new DeleteMeetingCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPut("meetings/{id:guid}/minutes")]
    public async Task<ActionResult> SetMeetingMinutes(Guid id, [FromBody] SetMinutesRequest request)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new SetMeetingMinutesCommand(id, request.Minutes));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("meetings/{id:guid}/invite")]
    public async Task<ActionResult<Guid>> InviteToMeeting(Guid id, [FromBody] InviteAttendeeRequest request)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, id)
            || !await _tenantAccessService.CanAccessUnitAsync(User, request.UnitId))
        {
            return TenantForbidden();
        }

        var command = new InviteToMeetingCommand(id, request.UnitId, request.ResidentId, request.ResidentName);
        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("meetings/{meetingId:guid}/attendees/{attendeeId:guid}/confirm")]
    public async Task<ActionResult> ConfirmAttendance(Guid meetingId, Guid attendeeId)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, meetingId)
            || !await _tenantAccessService.CanAccessMeetingAttendeeAsync(User, attendeeId))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new ConfirmMeetingAttendanceCommand(meetingId, attendeeId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("meetings/{meetingId:guid}/attendees/{attendeeId:guid}/decline")]
    public async Task<ActionResult> DeclineAttendance(Guid meetingId, Guid attendeeId)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, meetingId)
            || !await _tenantAccessService.CanAccessMeetingAttendeeAsync(User, attendeeId))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new DeclineMeetingAttendanceCommand(meetingId, attendeeId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("meetings/{meetingId:guid}/attendees/{attendeeId:guid}/arrived")]
    public async Task<ActionResult> MarkAttendeeArrived(Guid meetingId, Guid attendeeId)
    {
        if (!await _tenantAccessService.CanAccessMeetingAsync(User, meetingId)
            || !await _tenantAccessService.CanAccessMeetingAttendeeAsync(User, attendeeId))
        {
            return TenantForbidden();
        }

        var result = await _mediator.Send(new MarkAttendeeArrivedCommand(meetingId, attendeeId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    #endregion

    #region Forum

    [HttpGet("forum/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<PagedList<ForumPostDto>>> GetForumPosts(
        Guid condominiumId,
        [FromQuery] ForumCategory? category = null,
        [FromQuery] ForumPostStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetForumPostsQuery(condominiumId, category, status, page, pageSize));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("forum/{id:guid}")]
    public async Task<ActionResult<ForumPostDetailDto>> GetForumPost(Guid id)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new GetForumPostByIdQuery(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpGet("forum/pinned/{condominiumId:guid}")]
    public async Task<ActionResult<List<ForumPostDto>>> GetPinnedForumPosts(Guid condominiumId)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, condominiumId))
            return TenantForbidden();

        var result = await _mediator.Send(new GetPinnedForumPostsQuery(condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPost("forum")]
    public async Task<ActionResult<Guid>> CreateForumPost([FromBody] CreateForumPostRequest request)
    {
        if (!await _tenantAccessService.CanAccessCondominiumAsync(User, request.CondominiumId)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.AuthorId)
            || (request.AuthorUnitId.HasValue && !await _tenantAccessService.CanAccessUnitAsync(User, request.AuthorUnitId.Value)))
        {
            return TenantForbidden();
        }

        var command = new CreateForumPostCommand(
            request.CondominiumId,
            request.AuthorId,
            request.AuthorUnitId,
            request.AuthorName,
            request.Title,
            request.Content,
            request.Category,
            request.AllowComments
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return CreatedAtAction(nameof(GetForumPost), new { id = result.Value }, result.Value);
    }

    [HttpPut("forum/{id:guid}")]
    public async Task<ActionResult> UpdateForumPost(Guid id, [FromBody] UpdateForumPostRequest request)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var command = new UpdateForumPostCommand(
            id,
            request.Title,
            request.Content,
            request.Category,
            request.AllowComments
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("forum/{id:guid}/pin")]
    public async Task<ActionResult> PinForumPost(Guid id, [FromBody] PinPostRequest? request = null)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new PinForumPostCommand(id, request?.Until));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("forum/{id:guid}/unpin")]
    public async Task<ActionResult> UnpinForumPost(Guid id)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new UnpinForumPostCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("forum/{id:guid}/archive")]
    public async Task<ActionResult> ArchiveForumPost(Guid id)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new ArchiveForumPostCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("forum/{id:guid}/hide")]
    public async Task<ActionResult> HideForumPost(Guid id)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new HideForumPostCommand(id));

        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound
                ? NotFound(result.Errors)
                : BadRequest(result.Errors);

        return NoContent();
    }

    [HttpPost("forum/{id:guid}/restore")]
    public async Task<ActionResult> RestoreForumPost(Guid id)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new RestoreForumPostCommand(id));

        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound
                ? NotFound(result.Errors)
                : BadRequest(result.Errors);

        return NoContent();
    }

    [HttpDelete("forum/{id:guid}")]
    public async Task<ActionResult> DeleteForumPost(Guid id)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new DeleteForumPostCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("forum/{id:guid}/view")]
    public async Task<ActionResult> IncrementForumPostViews(Guid id)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, id))
            return TenantForbidden();

        var result = await _mediator.Send(new IncrementForumPostViewsCommand(id));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("forum/{postId:guid}/comments")]
    public async Task<ActionResult<Guid>> AddForumComment(Guid postId, [FromBody] AddForumCommentRequest request)
    {
        if (!await _tenantAccessService.CanAccessForumPostAsync(User, postId)
            || !await _tenantAccessService.CanAccessUserAsync(User, request.AuthorId))
        {
            return TenantForbidden();
        }

        var command = new AddForumCommentCommand(
            postId,
            request.AuthorId,
            request.AuthorName,
            request.Content,
            request.ParentCommentId
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    [HttpPut("forum/comments/{commentId:guid}")]
    public async Task<ActionResult> UpdateForumComment(Guid commentId, [FromBody] UpdateCommentRequest request)
    {
        if (!await _tenantAccessService.CanAccessForumCommentAsync(User, commentId))
            return TenantForbidden();

        var result = await _mediator.Send(new UpdateForumCommentCommand(commentId, request.Content));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    [HttpPost("forum/comments/{commentId:guid}/hide")]
    public async Task<ActionResult> HideForumComment(Guid commentId)
    {
        if (!await _tenantAccessService.CanAccessForumCommentAsync(User, commentId))
            return TenantForbidden();

        var result = await _mediator.Send(new HideForumCommentCommand(commentId));

        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound
                ? NotFound(result.Errors)
                : BadRequest(result.Errors);

        return NoContent();
    }

    [HttpPost("forum/comments/{commentId:guid}/show")]
    public async Task<ActionResult> ShowForumComment(Guid commentId)
    {
        if (!await _tenantAccessService.CanAccessForumCommentAsync(User, commentId))
            return TenantForbidden();

        var result = await _mediator.Send(new ShowForumCommentCommand(commentId));

        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound
                ? NotFound(result.Errors)
                : BadRequest(result.Errors);

        return NoContent();
    }

    [HttpDelete("forum/comments/{commentId:guid}")]
    public async Task<ActionResult> DeleteForumComment(Guid commentId)
    {
        if (!await _tenantAccessService.CanAccessForumCommentAsync(User, commentId))
            return TenantForbidden();

        var result = await _mediator.Send(new DeleteForumCommentCommand(commentId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    #endregion
}

#region Request Models

// Announcements
public record CreateAnnouncementRequest(
    Guid CondominiumId,
    string Title,
    string Content,
    AnnouncementType Type,
    AnnouncementPriority Priority,
    DateTime? ExpiresAt = null,
    DateTime? MeetingDate = null,
    string? MeetingLocation = null,
    bool PublishImmediately = false
);

public record UpdateAnnouncementRequest(
    string Title,
    string Content,
    AnnouncementType Type,
    AnnouncementPriority Priority,
    DateTime? ExpiresAt,
    DateTime? MeetingDate,
    string? MeetingLocation
);

public record AddAnnouncementAttachmentRequest(
    string FileName,
    string FileUrl,
    string? ContentType,
    long FileSize
);

public record MarkReadRequest(Guid UnitId, Guid ResidentId);

// Polls
public record CreatePollRequest(
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
);

public record UpdatePollRequest(
    string Title,
    string Description,
    DateTime StartDate,
    DateTime EndDate
);

public record CastVoteRequest(Guid OptionId, Guid UnitId, Guid? ResidentId);

// Meetings
public record CreateMeetingRequest(
    Guid CondominiumId,
    string Title,
    string Description,
    MeetingType Type,
    DateTime ScheduledDate,
    string? Location = null,
    string? VirtualMeetingUrl = null,
    string? Agenda = null,
    int RequiredQuorumPercentage = 50
);

public record UpdateMeetingRequest(
    string Title,
    string Description,
    DateTime ScheduledDate,
    string? Location,
    string? VirtualMeetingUrl,
    string? Agenda
);

public record EndMeetingRequest(string? Minutes);

public record SetMinutesRequest(string Minutes);

public record InviteAttendeeRequest(Guid UnitId, Guid? ResidentId, string? ResidentName);

// Forum
public record CreateForumPostRequest(
    Guid CondominiumId,
    Guid AuthorId,
    Guid? AuthorUnitId,
    string AuthorName,
    string Title,
    string Content,
    ForumCategory Category,
    bool AllowComments = true
);

public record UpdateForumPostRequest(
    string Title,
    string Content,
    ForumCategory Category,
    bool AllowComments
);

public record PinPostRequest(DateTime? Until);

public record AddForumCommentRequest(
    Guid AuthorId,
    string AuthorName,
    string Content,
    Guid? ParentCommentId = null
);

public record UpdateCommentRequest(string Content);

#endregion
