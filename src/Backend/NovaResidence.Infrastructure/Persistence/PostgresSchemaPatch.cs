using Microsoft.EntityFrameworkCore;

namespace NovaResidence.Infrastructure.Persistence;

/// <summary>
/// Adds columns introduced after the first Postgres database was created.
/// EnsureCreated does not alter an existing database.
/// </summary>
public static class PostgresSchemaPatch
{
    public static async Task ApplyAsync(ApplicationDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS "ReceiptNumber" text NULL;
            ALTER TABLE "Visits" ADD COLUMN IF NOT EXISTS "AccessCode" character varying(12) NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Visits_AccessCode" ON "Visits" ("AccessCode");
            """);
    }
}
