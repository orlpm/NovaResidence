using Mediator;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Authentication;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Authentication.Commands.Register;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, Result<RegisterUserResponse>>
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<RegisterUserCommandHandler> _logger;
    private readonly IResidentRepository _residentRepository;
    private readonly IPasswordHasher _passwordHasher;

    public RegisterUserCommandHandler(
        IUnitOfWork unitOfWork,
        ILogger<RegisterUserCommandHandler> logger,
        IResidentRepository residentRepository,
        IPasswordHasher passwordHasher)
    {
        _unitOfWork = unitOfWork;
        _logger = logger;
        _residentRepository = residentRepository;
        _passwordHasher = passwordHasher;
    }

    public async ValueTask<Result<RegisterUserResponse>> Handle(
        RegisterUserCommand request,
        CancellationToken cancellationToken)
    {
        _logger.LogInformation("Registering new user with email: {Email}, Role: {Role}, Token: {HasToken}", 
            request.Email, request.Role ?? "User", !string.IsNullOrEmpty(request.InvitationToken));

        // If invitation token is provided, verify and get resident info
        Domain.Entities.Condominiums.Resident? resident = null;
        if (!string.IsNullOrEmpty(request.InvitationToken))
        {
            resident = await _residentRepository.GetByInvitationTokenAsync(request.InvitationToken);
            
            if (resident == null)
            {
                return Result<RegisterUserResponse>.Error(new ErrorList(new[] { "Token de invitación inválido o expirado" }, null));
            }

            if (resident.IsRegistered)
            {
                return Result<RegisterUserResponse>.Error(new ErrorList(new[] { "Esta invitación ya fue utilizada" }, null));
            }

            if (resident.IsInvitationExpired())
            {
                return Result<RegisterUserResponse>.Error(new ErrorList(new[] { "Token de invitación expirado" }, null));
            }

            // Verify email matches
            if (!resident.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase))
            {
                return Result<RegisterUserResponse>.Error(new ErrorList(new[] { "El correo no coincide con la invitación" }, null));
            }
        }

        // Check if user already exists
        var existingUser = await _unitOfWork.Users.GetByEmailAsync(request.Email, cancellationToken);
        if (existingUser != null)
        {
            return Result<RegisterUserResponse>.Error(new ErrorList(new[] { "Ya existe un usuario con este correo" }, null));
        }

        var passwordHash = _passwordHasher.HashPassword(request.Password);

        // Determine role - if from invitation, role is "Resident", otherwise use provided role
        var userRole = !string.IsNullOrEmpty(request.InvitationToken) ? "Resident" : (request.Role ?? "User");

        // Create user entity with role
        var user = User.Create(
            request.Email,
            passwordHash,
            request.FirstName,
            request.LastName,
            request.PhoneNumber,
            userRole);

        // Save to database
        await _unitOfWork.Users.AddAsync(user, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // If this is a resident registration, link the user to the resident record
        if (resident != null)
        {
            resident.MarkAsRegistered(user.Id);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("Resident {ResidentId} linked to user {UserId}", resident.Id, user.Id);
        }

        _logger.LogInformation("User registered successfully with ID: {UserId}, Role: {Role}, Plan: {Plan}", 
            user.Id, userRole, request.SelectedPlan ?? "None");

        // TODO: Send welcome email
        // TODO: Publish UserRegistered event to event bus
        // TODO: Generate JWT token

        var response = new RegisterUserResponse(
            user.Id,
            user.Email,
            user.FirstName,
            user.LastName,
            Token: "temp-jwt-token"); // TODO: Generate real JWT

        return Result.Success(response);
    }
}
