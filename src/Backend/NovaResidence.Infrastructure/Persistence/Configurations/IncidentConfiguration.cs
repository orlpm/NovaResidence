using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Incidents;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

public class IncidentConfiguration : IEntityTypeConfiguration<Incident>
{
    public void Configure(EntityTypeBuilder<Incident> builder)
    {
        builder.ToTable("Incidents");

        builder.HasKey(i => i.Id);

        builder.Property(i => i.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(i => i.Description)
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(i => i.ResolutionNotes)
            .HasMaxLength(2000);

        builder.Property(i => i.Location)
            .HasMaxLength(200);

        builder.Property(i => i.Type)
            .IsRequired();

        builder.Property(i => i.Status)
            .IsRequired();

        builder.Property(i => i.Priority)
            .IsRequired();

        builder.Property(i => i.EstimatedCost)
            .HasPrecision(18, 2);

        builder.Property(i => i.ActualCost)
            .HasPrecision(18, 2);

        builder.HasMany(i => i.Comments)
            .WithOne()
            .HasForeignKey(c => c.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(i => i.Attachments)
            .WithOne()
            .HasForeignKey(a => a.IncidentId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(i => i.CondominiumId);
        builder.HasIndex(i => i.UnitId);
        builder.HasIndex(i => i.Status);
        builder.HasIndex(i => i.Type);
        builder.HasIndex(i => i.Priority);
        builder.HasIndex(i => i.ReportedById);
        builder.HasIndex(i => i.AssignedToId);
    }
}

public class IncidentCommentConfiguration : IEntityTypeConfiguration<IncidentComment>
{
    public void Configure(EntityTypeBuilder<IncidentComment> builder)
    {
        builder.ToTable("IncidentComments");

        builder.HasKey(ic => ic.Id);

        builder.Property(ic => ic.Content)
            .HasMaxLength(2000)
            .IsRequired();

        builder.HasIndex(ic => ic.IncidentId);
        builder.HasIndex(ic => ic.UserId);
    }
}

public class IncidentAttachmentConfiguration : IEntityTypeConfiguration<IncidentAttachment>
{
    public void Configure(EntityTypeBuilder<IncidentAttachment> builder)
    {
        builder.ToTable("IncidentAttachments");

        builder.HasKey(ia => ia.Id);

        builder.Property(ia => ia.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(ia => ia.ContentType)
            .HasMaxLength(100);

        builder.Property(ia => ia.FileUrl)
            .HasMaxLength(500)
            .IsRequired();

        builder.HasIndex(ia => ia.IncidentId);
    }
}
