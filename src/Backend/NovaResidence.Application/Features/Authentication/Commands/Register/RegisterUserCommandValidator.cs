using FluentValidation;

namespace NovaResidence.Application.Features.Authentication.Commands.Register;

public class RegisterUserCommandValidator : AbstractValidator<RegisterUserCommand>
{
    public RegisterUserCommandValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required")
            .EmailAddress().WithMessage("Invalid email format")
            .MaximumLength(256);

        RuleFor(x => x.Password)
            .NotEmpty().WithMessage("La contraseña es obligatoria")
            .MinimumLength(8).WithMessage("La contraseña debe tener al menos 8 caracteres")
            .Matches(@"[A-Z]").WithMessage("La contraseña debe incluir al menos una mayúscula")
            .Matches(@"[a-z]").WithMessage("La contraseña debe incluir al menos una minúscula")
            .Matches(@"[0-9]").WithMessage("La contraseña debe incluir al menos un número")
            .Matches(@"[^a-zA-Z0-9]").WithMessage("La contraseña debe incluir al menos un símbolo");

        RuleFor(x => x.FirstName)
            .NotEmpty().WithMessage("First name is required")
            .MaximumLength(100);

        RuleFor(x => x.LastName)
            .NotEmpty().WithMessage("Last name is required")
            .MaximumLength(100);

        // Teléfono: acepta números de 7-15 dígitos con o sin código de país (+)
        RuleFor(x => x.PhoneNumber)
            .Matches(@"^\+?[\d\s\-]{7,20}$")
            .When(x => !string.IsNullOrEmpty(x.PhoneNumber))
            .WithMessage("Invalid phone number format");
    }
}
