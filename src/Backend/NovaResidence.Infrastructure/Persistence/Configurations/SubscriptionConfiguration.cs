using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Subscriptions;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class SubscriptionPlanConfiguration : IEntityTypeConfiguration<SubscriptionPlan>
{
    public void Configure(EntityTypeBuilder<SubscriptionPlan> builder)
    {
        builder.ToTable("SubscriptionPlans", "billing");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(p => p.Description)
            .HasMaxLength(500);

        builder.Property(p => p.PricePerUnit)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.FixedMonthlyPrice)
            .HasPrecision(18, 2);

        builder.Property(p => p.Features)
            .HasMaxLength(2000);

        builder.Property(p => p.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(p => p.IsActive);
        builder.HasIndex(p => p.DisplayOrder);
    }
}

public class SubscriptionConfiguration : IEntityTypeConfiguration<Subscription>
{
    public void Configure(EntityTypeBuilder<Subscription> builder)
    {
        builder.ToTable("Subscriptions", "billing");

        builder.HasKey(s => s.Id);

        builder.Property(s => s.Status)
            .IsRequired();

        builder.Property(s => s.MonthlyAmount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(s => s.CancellationReason)
            .HasMaxLength(500);

        builder.HasOne(s => s.AdminUser)
            .WithMany()
            .HasForeignKey(s => s.AdminUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(s => s.Plan)
            .WithMany()
            .HasForeignKey(s => s.SubscriptionPlanId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(s => s.Payments)
            .WithOne(p => p.Subscription)
            .HasForeignKey(p => p.SubscriptionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(s => s.AdminUserId);
        builder.HasIndex(s => s.Status);
        builder.HasIndex(s => s.CurrentPeriodEnd);
    }
}

public class SubscriptionPaymentConfiguration : IEntityTypeConfiguration<SubscriptionPayment>
{
    public void Configure(EntityTypeBuilder<SubscriptionPayment> builder)
    {
        builder.ToTable("SubscriptionPayments", "billing");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Amount)
            .HasPrecision(18, 2)
            .IsRequired();

        builder.Property(p => p.PaymentMethod)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(p => p.ReferenceNumber)
            .HasMaxLength(100);

        builder.Property(p => p.Notes)
            .HasMaxLength(500);

        builder.Property(p => p.ProofUrl)
            .HasMaxLength(500);

        builder.HasIndex(p => p.SubscriptionId);
        builder.HasIndex(p => p.PaymentDate);
    }
}
