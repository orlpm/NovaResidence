using Ardalis.Result;
using MediatR;

namespace NovaResidence.Application.Features.Permissions.Commands;

public record GrantUserPermissionCommand(
    Guid UserId,
    string PermissionCode,
    Guid? CondominiumId = null,
    DateTime? ExpiresAt = null,
    string? Reason = null
) : IRequest<Result>;
