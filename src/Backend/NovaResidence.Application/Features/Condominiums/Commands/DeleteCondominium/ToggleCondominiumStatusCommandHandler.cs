using Mediator;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Condominiums.Commands.DeleteCondominium;

public class ToggleCondominiumStatusCommandHandler : IRequestHandler<ToggleCondominiumStatusCommand, Result>
{
    private readonly ICondominiumRepository _condominiumRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<ToggleCondominiumStatusCommandHandler> _logger;

    public ToggleCondominiumStatusCommandHandler(
        ICondominiumRepository condominiumRepository,
        IUnitOfWork unitOfWork,
        ILogger<ToggleCondominiumStatusCommandHandler> logger)
    {
        _condominiumRepository = condominiumRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async ValueTask<Result> Handle(ToggleCondominiumStatusCommand request, CancellationToken cancellationToken)
    {
        var condominium = await _condominiumRepository.GetByIdAsync(request.CondominiumId, cancellationToken);

        if (condominium == null)
        {
            return Result.NotFound($"Condominium with ID {request.CondominiumId} not found");
        }

        if (request.Activate)
        {
            condominium.Activate();
            _logger.LogInformation("Condominium {CondominiumId} ({Name}) activated", request.CondominiumId, condominium.Name);
        }
        else
        {
            condominium.Deactivate();
            _logger.LogInformation("Condominium {CondominiumId} ({Name}) deactivated", request.CondominiumId, condominium.Name);
        }

        await _condominiumRepository.UpdateAsync(condominium, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }
}
