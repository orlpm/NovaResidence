using MediatR;
using Ardalis.Result;

namespace NovaResidence.Application.Features.Authentication.Commands.Register;

public record RegisterUserCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName,
    string? PhoneNumber = null,
    string? Role = null,
    string? SelectedPlan = null,
    string? InvitationToken = null) : IRequest<Result<RegisterUserResponse>>;

public record RegisterUserResponse(
    Guid UserId,
    string Email,
    string FirstName,
    string LastName,
    string? Token = null);
