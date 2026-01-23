using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.ValueObjects;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Condominiums.Commands.UpdateCondominium;

public class UpdateCondominiumCommandHandler : IRequestHandler<UpdateCondominiumCommand, Result>
{
    private readonly ICondominiumRepository _condominiumRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<UpdateCondominiumCommandHandler> _logger;

    public UpdateCondominiumCommandHandler(
        ICondominiumRepository condominiumRepository,
        IUnitOfWork unitOfWork,
        ILogger<UpdateCondominiumCommandHandler> logger)
    {
        _condominiumRepository = condominiumRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(UpdateCondominiumCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Updating condominium {Id}", request.CondominiumId);

        var condominium = await _condominiumRepository.GetByIdAsync(request.CondominiumId, cancellationToken);
        
        if (condominium == null)
        {
            return Result.NotFound($"Condominium with ID {request.CondominiumId} not found");
        }

        // Update the condominium properties
        var newAddress = Address.Create(
            street: request.Street,
            city: request.City,
            state: request.State,
            postalCode: request.PostalCode,
            country: request.Country
        );

        condominium.Update(
            request.Name, 
            request.Description,
            newAddress,
            null, // taxId
            null  // legalName
        );

        await _condominiumRepository.UpdateAsync(condominium, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Condominium {Id} updated successfully", request.CondominiumId);
        
        return Result.Success();
    }
}
