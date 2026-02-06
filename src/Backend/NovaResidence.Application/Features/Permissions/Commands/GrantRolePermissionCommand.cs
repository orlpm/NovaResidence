using Ardalis.Result;
using MediatR;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Permissions.Commands;

public record GrantRolePermissionCommand(
    UserRole Role,
    string PermissionCode,
    bool CanOverride = true
) : IRequest<Result>;
