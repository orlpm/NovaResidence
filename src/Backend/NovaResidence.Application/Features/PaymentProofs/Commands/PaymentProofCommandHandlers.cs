using MediatR;
using Microsoft.EntityFrameworkCore;
using NovaResidence.Application.Common.Interfaces;
using NovaResidence.Domain.Entities.Billing;
using NovaResidence.Domain.Enums;

namespace NovaResidence.Application.Features.PaymentProofs.Commands;

public class SubmitPaymentProofCommandHandler : IRequestHandler<SubmitPaymentProofCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public SubmitPaymentProofCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(SubmitPaymentProofCommand request, CancellationToken cancellationToken)
    {
        // Verify charge exists
        var charge = await _context.Charges
            .FirstOrDefaultAsync(c => c.Id == request.ChargeId, cancellationToken);
        
        if (charge == null)
            throw new InvalidOperationException($"Charge with id {request.ChargeId} not found");

        if (charge.Status == ChargeStatus.Paid)
            throw new InvalidOperationException("Cannot submit payment proof for a fully paid charge");

        var proof = PaymentProof.Create(
            request.CondominiumId,
            request.UnitId,
            request.ChargeId,
            request.SubmittedById,
            request.Amount,
            request.PaymentMethod,
            request.PaymentDate,
            request.FileName,
            request.OriginalFileName,
            request.FilePath,
            request.ContentType,
            request.FileSize,
            request.ReferenceNumber,
            request.BankName,
            request.Notes
        );

        _context.PaymentProofs.Add(proof);
        await _context.SaveChangesAsync(cancellationToken);

        return proof.Id;
    }
}

public class ApprovePaymentProofCommandHandler : IRequestHandler<ApprovePaymentProofCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ApprovePaymentProofCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ApprovePaymentProofCommand request, CancellationToken cancellationToken)
    {
        var proof = await _context.PaymentProofs
            .Include(p => p.Charge)
            .FirstOrDefaultAsync(p => p.Id == request.PaymentProofId, cancellationToken);

        if (proof == null)
            throw new InvalidOperationException($"Payment proof with id {request.PaymentProofId} not found");

        // Create the actual payment
        var payment = Payment.Create(
            proof.ChargeId,
            proof.Amount,
            proof.PaymentMethod,
            proof.PaymentDate,
            request.ReviewedById,
            proof.ReferenceNumber,
            $"Payment from proof: {proof.OriginalFileName}"
        );

        _context.Payments.Add(payment);

        // Apply payment to charge
        proof.Charge.ApplyPayment(payment);

        // Approve the proof
        proof.Approve(request.ReviewedById, payment.Id, request.Comments);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}

public class RejectPaymentProofCommandHandler : IRequestHandler<RejectPaymentProofCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public RejectPaymentProofCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(RejectPaymentProofCommand request, CancellationToken cancellationToken)
    {
        var proof = await _context.PaymentProofs
            .FirstOrDefaultAsync(p => p.Id == request.PaymentProofId, cancellationToken);

        if (proof == null)
            throw new InvalidOperationException($"Payment proof with id {request.PaymentProofId} not found");

        proof.Reject(request.ReviewedById, request.Reason);

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
