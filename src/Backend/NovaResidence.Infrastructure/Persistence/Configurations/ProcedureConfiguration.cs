using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Procedures;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class ProcedureTemplateConfiguration : IEntityTypeConfiguration<ProcedureTemplate>
{
    public void Configure(EntityTypeBuilder<ProcedureTemplate> builder)
    {
        builder.ToTable("ProcedureTemplates", "ops");

        builder.HasKey(t => t.Id);

        builder.Property(t => t.Code)
            .IsRequired()
            .HasMaxLength(120);

        builder.Property(t => t.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(t => t.AuthorityName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(t => t.Description)
            .IsRequired()
            .HasMaxLength(2000);

        builder.Property(t => t.Requirements)
            .HasMaxLength(4000);

        builder.Property(t => t.Type)
            .HasConversion<int>();

        builder.Property(t => t.IsActive)
            .HasDefaultValue(true);

        builder.HasIndex(t => t.Code)
            .IsUnique();

        builder.HasIndex(t => new { t.CountryId, t.StateId, t.IsActive });

        builder.HasOne(t => t.Country)
            .WithMany()
            .HasForeignKey(t => t.CountryId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(t => t.State)
            .WithMany()
            .HasForeignKey(t => t.StateId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public class ResidentProcedureConfiguration : IEntityTypeConfiguration<ResidentProcedure>
{
    public void Configure(EntityTypeBuilder<ResidentProcedure> builder)
    {
        builder.ToTable("ResidentProcedures", "ops");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Type)
            .HasConversion<int>();

        builder.Property(p => p.Title)
            .IsRequired()
            .HasMaxLength(250);

        builder.Property(p => p.Description)
            .IsRequired()
            .HasMaxLength(3000);

        builder.Property(p => p.Requirements)
            .HasMaxLength(3000);

        builder.Property(p => p.CompletionNotes)
            .HasMaxLength(2000);

        builder.HasIndex(p => new { p.CondominiumId, p.Status, p.DueDate });
        builder.HasIndex(p => p.ResidentId);

        builder.HasOne(p => p.ProcedureTemplate)
            .WithMany()
            .HasForeignKey(p => p.ProcedureTemplateId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
