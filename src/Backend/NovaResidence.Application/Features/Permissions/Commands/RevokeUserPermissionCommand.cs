using Ardalis.Result;
using MediatR;

namespace NovaResidence.Application.Features.Permissions.Commands;

public record RevokeUserPermissionCommand(
    Guid UserId,
    string PermissionCode,
    Guid? CondominiumId = null,
    string? Reason = null
) : IRequest<Result>;
