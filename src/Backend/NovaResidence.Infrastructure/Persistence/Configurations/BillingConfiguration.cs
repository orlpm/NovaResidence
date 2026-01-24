using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Billing;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class ChargeConfiguration : IEntityTypeConfiguration<Charge>
{
    public void Configure(EntityTypeBuilder<Charge> builder)
    {
        builder.ToTable("Charges");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Concept)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(c => c.Description)
            .HasMaxLength(500);

        builder.Property(c => c.CancellationReason)
            .HasMaxLength(500);

        builder.Property(c => c.ForgiveReason)
            .HasMaxLength(500);

        builder.Property(c => c.FeeType)
            .IsRequired();

        builder.Property(c => c.Status)
            .IsRequired();

        builder.Property(c => c.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(c => c.PaidAmount)
            .HasPrecision(18, 2);

        builder.Property(c => c.LateFeePercentage)
            .HasPrecision(5, 2);

        builder.Property(c => c.LateFeeAmount)
            .HasPrecision(18, 2);

        builder.HasMany(c => c.Payments)
            .WithOne(p => p.Charge)
            .HasForeignKey(p => p.ChargeId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(c => c.CondominiumId);
        builder.HasIndex(c => c.UnitId);
        builder.HasIndex(c => c.Status);
        builder.HasIndex(c => c.FeeType);
        builder.HasIndex(c => c.DueDate);
        builder.HasIndex(c => new { c.BillingPeriodYear, c.BillingPeriodMonth });
    }
}

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.PaymentMethod)
            .IsRequired();

        builder.Property(p => p.ReferenceNumber)
            .HasMaxLength(100);

        builder.Property(p => p.Notes)
            .HasMaxLength(500);

        builder.Property(p => p.RefundReason)
            .HasMaxLength(500);

        builder.HasIndex(p => p.ChargeId);
        builder.HasIndex(p => p.PaymentDate);
        builder.HasIndex(p => p.PaymentMethod);
        builder.HasIndex(p => p.IsVerified);
    }
}

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("Invoices");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.InvoiceNumber)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(i => i.Notes)
            .HasMaxLength(500);

        builder.Property(i => i.Subtotal)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(i => i.Tax)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(i => i.Total)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(i => i.PaidAmount)
            .HasPrecision(18, 2);

        builder.HasIndex(i => i.InvoiceNumber)
            .IsUnique();

        builder.HasIndex(i => i.UnitId);
        builder.HasIndex(i => i.CondominiumId);
        builder.HasIndex(i => new { i.BillingPeriodYear, i.BillingPeriodMonth });
    }
}

public class FeeConfigurationConfiguration : IEntityTypeConfiguration<FeeConfiguration>
{
    public void Configure(EntityTypeBuilder<FeeConfiguration> builder)
    {
        builder.ToTable("FeeConfigurations");

        builder.HasKey(fc => fc.Id);

        builder.Property(fc => fc.Name)
            .HasMaxLength(100)
            .IsRequired();

        builder.Property(fc => fc.Description)
            .HasMaxLength(500);

        builder.Property(fc => fc.FeeType)
            .IsRequired();

        builder.Property(fc => fc.DefaultAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(fc => fc.LateFeePercentage)
            .HasPrecision(5, 2);

        builder.HasIndex(fc => fc.CondominiumId);
        builder.HasIndex(fc => fc.FeeType);
        builder.HasIndex(fc => fc.IsActive);
    }
}
