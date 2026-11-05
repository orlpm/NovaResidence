using System.Data;
using Microsoft.EntityFrameworkCore;

namespace NovaResidence.Infrastructure.Persistence;

/// <summary>
/// Ordered, idempotent schema changes for Postgres. CreateTables builds the current
/// model once. Later columns are a new entry here. Each id is stored in SchemaPatches
/// and is not applied again. SQL Server migrations must not run against this database.
/// </summary>
public static class PostgresSchemaPatch
{
    private sealed record Patch(string Id, string Sql);

    private static readonly Patch[] Patches =
    [
        new(
            "001_payments_receipt_and_visit_access_code",
            """
            ALTER TABLE "Payments" ADD COLUMN IF NOT EXISTS "ReceiptNumber" text NULL;
            ALTER TABLE "Visits" ADD COLUMN IF NOT EXISTS "AccessCode" character varying(12) NULL;
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Visits_AccessCode" ON "Visits" ("AccessCode");
            """),
        new(
            "002_parking_resident_and_visit_vehicle",
            """
            ALTER TABLE "ParkingSpots" ADD COLUMN IF NOT EXISTS "UnitId" uuid NULL;
            ALTER TABLE "ParkingSpots" ADD COLUMN IF NOT EXISTS "ResidentId" uuid NULL;
            ALTER TABLE "ResidentVehicles" ADD COLUMN IF NOT EXISTS "ResidentId" uuid NULL;
            ALTER TABLE "Visits" ADD COLUMN IF NOT EXISTS "ResidentVehicleId" uuid NULL;
            """)
    ];

    public static async Task ApplyAsync(ApplicationDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS "SchemaPatches" (
                "Id" character varying(128) NOT NULL PRIMARY KEY,
                "AppliedAt" timestamp with time zone NOT NULL
            );
            """);

        foreach (var patch in Patches)
        {
            if (await AlreadyAppliedAsync(context, patch.Id))
                continue;

            await using var transaction = await context.Database.BeginTransactionAsync();
            await context.Database.ExecuteSqlRawAsync(patch.Sql);
            await context.Database.ExecuteSqlInterpolatedAsync(
                $"""INSERT INTO "SchemaPatches" ("Id", "AppliedAt") VALUES ({patch.Id}, now())""");
            await transaction.CommitAsync();
        }
    }

    private static async Task<bool> AlreadyAppliedAsync(ApplicationDbContext context, string id)
    {
        var connection = context.Database.GetDbConnection();
        var openedHere = connection.State != ConnectionState.Open;
        if (openedHere)
            await connection.OpenAsync();

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """SELECT EXISTS (SELECT 1 FROM "SchemaPatches" WHERE "Id" = @id)""";
            var parameter = command.CreateParameter();
            parameter.ParameterName = "id";
            parameter.Value = id;
            command.Parameters.Add(parameter);
            return (bool)(await command.ExecuteScalarAsync())!;
        }
        finally
        {
            if (openedHere)
                await connection.CloseAsync();
        }
    }
}
