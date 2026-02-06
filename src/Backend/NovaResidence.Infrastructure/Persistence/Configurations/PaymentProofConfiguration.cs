using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Billing;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class PaymentProofConfiguration : IEntityTypeConfiguration<PaymentProof>
{
    public void Configure(EntityTypeBuilder<PaymentProof> builder)
    {
        builder.ToTable("PaymentProofs");

        builder.HasKey(pp => pp.Id);

        builder.Property(pp => pp.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(pp => pp.PaymentMethod)
            .IsRequired();

        builder.Property(pp => pp.ReferenceNumber)
            .HasMaxLength(100);

        builder.Property(pp => pp.BankName)
            .HasMaxLength(100);

        builder.Property(pp => pp.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(pp => pp.OriginalFileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(pp => pp.FilePath)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(pp => pp.ContentType)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(pp => pp.Notes)
            .HasMaxLength(1000);

        builder.Property(pp => pp.ReviewComments)
            .HasMaxLength(1000);

        builder.Property(pp => pp.Status)
            .IsRequired();

        builder.Property(pp => pp.PaymentDate)
            .IsRequired();

        builder.Property(pp => pp.SubmittedAt)
            .IsRequired();

        // Relationships
        builder.HasOne(pp => pp.Condominium)
            .WithMany()
            .HasForeignKey(pp => pp.CondominiumId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pp => pp.Unit)
            .WithMany()
            .HasForeignKey(pp => pp.UnitId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pp => pp.Charge)
            .WithMany()
            .HasForeignKey(pp => pp.ChargeId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pp => pp.SubmittedBy)
            .WithMany()
            .HasForeignKey(pp => pp.SubmittedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pp => pp.ReviewedBy)
            .WithMany()
            .HasForeignKey(pp => pp.ReviewedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(pp => pp.Payment)
            .WithMany()
            .HasForeignKey(pp => pp.PaymentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Indexes
        builder.HasIndex(pp => pp.CondominiumId);
        builder.HasIndex(pp => pp.UnitId);
        builder.HasIndex(pp => pp.ChargeId);
        builder.HasIndex(pp => pp.Status);
        builder.HasIndex(pp => pp.SubmittedAt);
    }
}
