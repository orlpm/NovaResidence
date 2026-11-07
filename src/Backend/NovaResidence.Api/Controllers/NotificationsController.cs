using Microsoft.AspNetCore.Mvc;
using Mediator;
using Ardalis.Result;
using NovaResidence.Application.Features.Notifications.Commands;
using NovaResidence.Application.Features.Notifications.Queries;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotificationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Get user notifications with optional filters
    /// </summary>
    [HttpGet("user/{userId:guid}/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<PagedList<NotificationDto>>> GetUserNotifications(
        Guid userId,
        Guid condominiumId,
        [FromQuery] bool? isRead = null,
        [FromQuery] NotificationType? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var result = await _mediator.Send(new GetUserNotificationsQuery(userId, condominiumId, isRead, type, page, pageSize));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    /// <summary>
    /// Get notification summary (total, unread count, recent notifications)
    /// </summary>
    [HttpGet("summary/user/{userId:guid}/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<NotificationSummaryDto>> GetNotificationSummary(
        Guid userId,
        Guid condominiumId,
        [FromQuery] int recentCount = 5)
    {
        var result = await _mediator.Send(new GetNotificationSummaryQuery(userId, condominiumId, recentCount));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    /// <summary>
    /// Get unread notification count
    /// </summary>
    [HttpGet("unread-count/user/{userId:guid}/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<int>> GetUnreadCount(Guid userId, Guid condominiumId)
    {
        var result = await _mediator.Send(new GetUnreadNotificationCountQuery(userId, condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    /// <summary>
    /// Get a specific notification
    /// </summary>
    [HttpGet("{id:guid}/user/{userId:guid}")]
    public async Task<ActionResult<NotificationDto>> GetNotification(Guid id, Guid userId)
    {
        var result = await _mediator.Send(new GetNotificationByIdQuery(id, userId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    /// <summary>
    /// Create a notification (for admin use or internal services)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<Guid>> CreateNotification([FromBody] CreateNotificationRequest request)
    {
        var command = new CreateNotificationCommand(
            request.CondominiumId,
            request.UserId,
            request.Type,
            request.Title,
            request.Message,
            request.Priority,
            request.UnitId,
            request.RelatedEntityType,
            request.RelatedEntityId,
            request.ActionUrl,
            request.ExpiresAt
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    /// <summary>
    /// Create notifications for multiple users (bulk)
    /// </summary>
    [HttpPost("bulk")]
    public async Task<ActionResult<int>> CreateBulkNotifications([FromBody] CreateBulkNotificationsRequest request)
    {
        var command = new CreateBulkNotificationsCommand(
            request.CondominiumId,
            request.UserIds,
            request.Type,
            request.Title,
            request.Message,
            request.Priority,
            request.RelatedEntityType,
            request.RelatedEntityId,
            request.ActionUrl,
            request.ExpiresAt
        );

        var result = await _mediator.Send(command);
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    /// <summary>
    /// Mark a notification as read
    /// </summary>
    [HttpPost("{id:guid}/mark-read/user/{userId:guid}")]
    public async Task<ActionResult> MarkAsRead(Guid id, Guid userId)
    {
        var result = await _mediator.Send(new MarkNotificationAsReadCommand(id, userId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    /// <summary>
    /// Mark all user notifications as read
    /// </summary>
    [HttpPost("mark-all-read/user/{userId:guid}/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<int>> MarkAllAsRead(Guid userId, Guid condominiumId)
    {
        var result = await _mediator.Send(new MarkAllNotificationsAsReadCommand(userId, condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }

    /// <summary>
    /// Delete a notification
    /// </summary>
    [HttpDelete("{id:guid}/user/{userId:guid}")]
    public async Task<ActionResult> DeleteNotification(Guid id, Guid userId)
    {
        var result = await _mediator.Send(new DeleteNotificationCommand(id, userId));
        
        if (!result.IsSuccess)
            return result.Status == ResultStatus.NotFound 
                ? NotFound(result.Errors) 
                : BadRequest(result.Errors);
        
        return NoContent();
    }

    /// <summary>
    /// Delete all read notifications
    /// </summary>
    [HttpDelete("read/user/{userId:guid}/condominium/{condominiumId:guid}")]
    public async Task<ActionResult<int>> DeleteAllReadNotifications(Guid userId, Guid condominiumId)
    {
        var result = await _mediator.Send(new DeleteAllReadNotificationsCommand(userId, condominiumId));
        
        if (!result.IsSuccess)
            return BadRequest(result.Errors);
        
        return Ok(result.Value);
    }
}

// Request DTOs
public record CreateNotificationRequest(
    Guid CondominiumId,
    Guid UserId,
    NotificationType Type,
    string Title,
    string Message,
    NotificationPriority Priority = NotificationPriority.Normal,
    Guid? UnitId = null,
    string? RelatedEntityType = null,
    Guid? RelatedEntityId = null,
    string? ActionUrl = null,
    DateTime? ExpiresAt = null
);

public record CreateBulkNotificationsRequest(
    Guid CondominiumId,
    List<Guid> UserIds,
    NotificationType Type,
    string Title,
    string Message,
    NotificationPriority Priority = NotificationPriority.Normal,
    string? RelatedEntityType = null,
    Guid? RelatedEntityId = null,
    string? ActionUrl = null,
    DateTime? ExpiresAt = null
);
