using Ardalis.Result;
using MediatR;

namespace NovaResidence.Application.Features.Permissions.Queries;

public record GetAllPermissionsQuery : IRequest<Result<List<PermissionDto>>>;

public class PermissionDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsSystem { get; set; }
    public bool IsActive { get; set; }
}
