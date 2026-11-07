using Mediator;
using Ardalis.Result;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.ValueObjects;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Condominiums.Commands.UpdateCondominium;

public class UpdateCondominiumCommandHandler : IRequestHandler<UpdateCondominiumCommand, Result>
{
    private readonly ICondominiumRepository _condominiumRepository;
    private readonly IApplicationDbContext _context;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateCondominiumCommandHandler> _logger;

    public UpdateCondominiumCommandHandler(
        ICondominiumRepository condominiumRepository,
        IApplicationDbContext context,
        IUnitOfWork unitOfWork,
        ILogger<UpdateCondominiumCommandHandler> logger)
    {
        _condominiumRepository = condominiumRepository;
        _context = context;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async ValueTask<Result> Handle(UpdateCondominiumCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Updating condominium {Id}", request.CondominiumId);

        var condominium = await _condominiumRepository.GetByIdAsync(request.CondominiumId, cancellationToken);
        
        if (condominium == null)
        {
            return Result.NotFound($"Condominium with ID {request.CondominiumId} not found");
        }

        var resolvedCountryId = request.CountryId;
        var resolvedStateId = request.StateId;
        var countryName = request.Country;
        var stateName = request.State;

        if (request.StateId.HasValue)
        {
            var state = await _context.GeoStates
                .Include(s => s.Country)
                .FirstOrDefaultAsync(s => s.Id == request.StateId.Value, cancellationToken);
            if (state == null)
                return Result.Invalid(new[] { new ValidationError { Identifier = nameof(request.StateId), ErrorMessage = "Estado no encontrado" } });

            resolvedStateId = state.Id;
            resolvedCountryId = state.CountryId;
            stateName = state.Name;
            countryName = state.Country?.Name ?? request.Country;

            if (request.CountryId.HasValue && request.CountryId.Value != state.CountryId)
            {
                return Result.Invalid(new[]
                {
                    new ValidationError
                    {
                        Identifier = nameof(request.CountryId),
                        ErrorMessage = "El estado seleccionado no pertenece al país indicado"
                    }
                });
            }
        }
        else if (request.CountryId.HasValue)
        {
            var country = await _context.GeoCountries.FirstOrDefaultAsync(c => c.Id == request.CountryId.Value, cancellationToken);
            if (country == null)
                return Result.Invalid(new[] { new ValidationError { Identifier = nameof(request.CountryId), ErrorMessage = "País no encontrado" } });

            resolvedCountryId = country.Id;
            countryName = country.Name;

            var hasActiveStates = await _context.GeoStates
                .AnyAsync(s => s.CountryId == country.Id && s.IsActive, cancellationToken);

            if (hasActiveStates)
            {
                return Result.Invalid(new[]
                {
                    new ValidationError
                    {
                        Identifier = nameof(request.StateId),
                        ErrorMessage = "Debes seleccionar un estado para el país indicado"
                    }
                });
            }
        }

        // Update the condominium properties
        var newAddress = Address.Create(
            street: request.Street,
            city: request.City,
            state: stateName,
            postalCode: request.PostalCode,
            country: countryName
        );

        condominium.Update(
            request.Name, 
            request.Description,
            newAddress,
            null, // taxId
            null, // legalName
            resolvedCountryId,
            resolvedStateId
        );

        await _condominiumRepository.UpdateAsync(condominium, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Condominium {Id} updated successfully", request.CondominiumId);
        
        return Result.Success();
    }
}
