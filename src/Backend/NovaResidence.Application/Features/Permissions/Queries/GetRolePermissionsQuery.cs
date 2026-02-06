using Ardalis.Result;
using MediatR;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.Permissions.Queries;

public record GetRolePermissionsQuery(UserRole Role) : IRequest<Result<List<string>>>;
