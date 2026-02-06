using Ardalis.Result;
using MediatR;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Permissions.Commands;

public record SetCondominiumRolePermissionCommand(
    Guid CondominiumId,
    UserRole Role,
    string PermissionCode,
    bool IsGranted
) : IRequest<Result>;
