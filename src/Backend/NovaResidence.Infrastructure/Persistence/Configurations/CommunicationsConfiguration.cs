using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using NovaResidence.Domain.Entities.Communications;

namespace NovaResidence.Infrastructure.Persistence.Configurations;

#region Announcement Configuration

public class AnnouncementConfiguration : IEntityTypeConfiguration<Announcement>
{
    public void Configure(EntityTypeBuilder<Announcement> builder)
    {
        builder.ToTable("Announcements");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(a => a.Content)
            .IsRequired();

        builder.Property(a => a.Type)
            .IsRequired();

        builder.Property(a => a.Priority)
            .IsRequired();

        builder.Property(a => a.MeetingLocation)
            .HasMaxLength(300);

        builder.HasMany(a => a.Attachments)
            .WithOne(att => att.Announcement)
            .HasForeignKey(att => att.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(a => a.Recipients)
            .WithOne(r => r.Announcement)
            .HasForeignKey(r => r.AnnouncementId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(a => a.CondominiumId);
        builder.HasIndex(a => a.Type);
        builder.HasIndex(a => a.IsPublished);
        builder.HasIndex(a => a.PublishedAt);
        builder.HasIndex(a => a.ExpiresAt);
    }
}

public class AnnouncementAttachmentConfiguration : IEntityTypeConfiguration<AnnouncementAttachment>
{
    public void Configure(EntityTypeBuilder<AnnouncementAttachment> builder)
    {
        builder.ToTable("AnnouncementAttachments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(a => a.FileUrl)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(a => a.ContentType)
            .HasMaxLength(100);

        builder.HasIndex(a => a.AnnouncementId);
    }
}

public class AnnouncementRecipientConfiguration : IEntityTypeConfiguration<AnnouncementRecipient>
{
    public void Configure(EntityTypeBuilder<AnnouncementRecipient> builder)
    {
        builder.ToTable("AnnouncementRecipients");

        builder.HasKey(a => a.Id);

        builder.HasIndex(a => a.AnnouncementId);
        builder.HasIndex(a => a.UnitId);
        builder.HasIndex(a => a.ResidentId);
        builder.HasIndex(a => new { a.AnnouncementId, a.UnitId, a.ResidentId }).IsUnique();
    }
}

#endregion

#region Poll Configuration

public class PollConfiguration : IEntityTypeConfiguration<Poll>
{
    public void Configure(EntityTypeBuilder<Poll> builder)
    {
        builder.ToTable("Polls");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(p => p.Description)
            .HasMaxLength(2000);

        builder.Property(p => p.Type)
            .IsRequired();

        builder.Property(p => p.Status)
            .IsRequired();

        builder.Property(p => p.QuorumPercentage)
            .HasPrecision(5, 2);

        builder.HasMany(p => p.Options)
            .WithOne(o => o.Poll)
            .HasForeignKey(o => o.PollId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(p => p.Votes)
            .WithOne(v => v.Poll)
            .HasForeignKey(v => v.PollId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(p => p.CondominiumId);
        builder.HasIndex(p => p.Status);
        builder.HasIndex(p => p.StartDate);
        builder.HasIndex(p => p.EndDate);
    }
}

public class PollOptionConfiguration : IEntityTypeConfiguration<PollOption>
{
    public void Configure(EntityTypeBuilder<PollOption> builder)
    {
        builder.ToTable("PollOptions");

        builder.HasKey(o => o.Id);

        builder.Property(o => o.Text)
            .HasMaxLength(500)
            .IsRequired();

        builder.HasIndex(o => o.PollId);
    }
}

public class PollVoteConfiguration : IEntityTypeConfiguration<PollVote>
{
    public void Configure(EntityTypeBuilder<PollVote> builder)
    {
        builder.ToTable("PollVotes");

        builder.HasKey(v => v.Id);

        builder.HasOne(v => v.PollOption)
            .WithMany()
            .HasForeignKey(v => v.PollOptionId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(v => v.PollId);
        builder.HasIndex(v => v.PollOptionId);
        builder.HasIndex(v => v.UnitId);
        builder.HasIndex(v => v.ResidentId);
        builder.HasIndex(v => new { v.PollId, v.UnitId }).IsUnique(false);
    }
}

#endregion

#region Meeting Configuration

public class MeetingConfiguration : IEntityTypeConfiguration<Meeting>
{
    public void Configure(EntityTypeBuilder<Meeting> builder)
    {
        builder.ToTable("Meetings");

        builder.HasKey(m => m.Id);

        builder.Property(m => m.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(m => m.Description)
            .HasMaxLength(2000);

        builder.Property(m => m.Type)
            .IsRequired();

        builder.Property(m => m.Status)
            .IsRequired();

        builder.Property(m => m.Location)
            .HasMaxLength(300);

        builder.Property(m => m.VirtualMeetingUrl)
            .HasMaxLength(500);

        builder.Property(m => m.Agenda)
            .HasMaxLength(4000);

        builder.Property(m => m.Minutes);

        builder.HasMany(m => m.Attendees)
            .WithOne(a => a.Meeting)
            .HasForeignKey(a => a.MeetingId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(m => m.CondominiumId);
        builder.HasIndex(m => m.Status);
        builder.HasIndex(m => m.ScheduledDate);
        builder.HasIndex(m => m.Type);
    }
}

public class MeetingAttendeeConfiguration : IEntityTypeConfiguration<MeetingAttendee>
{
    public void Configure(EntityTypeBuilder<MeetingAttendee> builder)
    {
        builder.ToTable("MeetingAttendees");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.ResidentName)
            .HasMaxLength(200);

        builder.Property(a => a.ProxyName)
            .HasMaxLength(200);

        builder.HasIndex(a => a.MeetingId);
        builder.HasIndex(a => a.UnitId);
        builder.HasIndex(a => a.ResidentId);
        builder.HasIndex(a => new { a.MeetingId, a.UnitId }).IsUnique(false);
    }
}

#endregion

#region Forum Configuration

public class ForumPostConfiguration : IEntityTypeConfiguration<ForumPost>
{
    public void Configure(EntityTypeBuilder<ForumPost> builder)
    {
        builder.ToTable("ForumPosts");

        builder.HasKey(f => f.Id);

        builder.Property(f => f.Title)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(f => f.Content)
            .IsRequired();

        builder.Property(f => f.AuthorName)
            .HasMaxLength(200)
            .IsRequired();

        builder.Property(f => f.Category)
            .IsRequired();

        builder.Property(f => f.Status)
            .IsRequired();

        builder.HasMany(f => f.Comments)
            .WithOne(c => c.ForumPost)
            .HasForeignKey(c => c.ForumPostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasMany(f => f.Attachments)
            .WithOne(a => a.ForumPost)
            .HasForeignKey(a => a.ForumPostId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(f => f.CondominiumId);
        builder.HasIndex(f => f.AuthorId);
        builder.HasIndex(f => f.Category);
        builder.HasIndex(f => f.Status);
        builder.HasIndex(f => f.IsPinned);
        builder.HasIndex(f => f.CreatedAt);
    }
}

public class ForumCommentConfiguration : IEntityTypeConfiguration<ForumComment>
{
    public void Configure(EntityTypeBuilder<ForumComment> builder)
    {
        builder.ToTable("ForumComments");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.Content)
            .HasMaxLength(2000)
            .IsRequired();

        builder.Property(c => c.AuthorName)
            .HasMaxLength(200)
            .IsRequired();

        builder.HasOne(c => c.ParentComment)
            .WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentCommentId)
            .OnDelete(DeleteBehavior.NoAction);

        builder.HasIndex(c => c.ForumPostId);
        builder.HasIndex(c => c.AuthorId);
        builder.HasIndex(c => c.ParentCommentId);
    }
}

public class ForumPostAttachmentConfiguration : IEntityTypeConfiguration<ForumPostAttachment>
{
    public void Configure(EntityTypeBuilder<ForumPostAttachment> builder)
    {
        builder.ToTable("ForumPostAttachments");

        builder.HasKey(a => a.Id);

        builder.Property(a => a.FileName)
            .HasMaxLength(255)
            .IsRequired();

        builder.Property(a => a.FileUrl)
            .HasMaxLength(500)
            .IsRequired();

        builder.Property(a => a.ContentType)
            .HasMaxLength(100);

        builder.HasIndex(a => a.ForumPostId);
    }
}

#endregion
