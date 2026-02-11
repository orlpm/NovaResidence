using MediatR;
using Ardalis.Result;
using NovaResidence.Application.Common.Interfaces;
using Microsoft.Extensions.Logging;

namespace NovaResidence.Application.Features.Condominiums.Commands.DeleteCondominium;

public class DeleteCondominiumCommandHandler : IRequestHandler<DeleteCondominiumCommand, Result>
{
    private readonly ICondominiumRepository _condominiumRepository;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ILogger<DeleteCondominiumCommandHandler> _logger;

    public DeleteCondominiumCommandHandler(
        ICondominiumRepository condominiumRepository,
        IUnitOfWork unitOfWork,
        ILogger<DeleteCondominiumCommandHandler> logger)
    {
        _condominiumRepository = condominiumRepository;
        _unitOfWork = unitOfWork;
        _logger = logger;
    }

    public async Task<Result> Handle(DeleteCondominiumCommand request, CancellationToken cancellationToken)
    {
        _logger.LogInformation("Deleting condominium {CondominiumId}", request.CondominiumId);

        var condominium = await _condominiumRepository.GetByIdAsync(request.CondominiumId, cancellationToken);
        
        if (condominium == null)
        {
            return Result.NotFound($"Condominium with ID {request.CondominiumId} not found");
        }

        // Soft delete - set IsDeleted flag
        condominium.IsDeleted = true;
        condominium.DeletedAt = DateTime.UtcNow;
        condominium.Deactivate();

        await _condominiumRepository.UpdateAsync(condominium, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Condominium {CondominiumId} ({Name}) soft-deleted", request.CondominiumId, condominium.Name);

        return Result.Success();
    }
}
