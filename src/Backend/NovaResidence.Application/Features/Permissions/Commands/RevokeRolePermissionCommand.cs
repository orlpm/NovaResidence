using Ardalis.Result;
using MediatR;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Permissions.Commands;

public record RevokeRolePermissionCommand(
    UserRole Role,
    string PermissionCode
) : IRequest<Result>;
