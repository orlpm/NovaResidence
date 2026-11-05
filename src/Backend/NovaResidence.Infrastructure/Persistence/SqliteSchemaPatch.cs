using Microsoft.EntityFrameworkCore;

namespace NovaResidence.Infrastructure.Persistence;

public static class SqliteSchemaPatch
{
    public static async Task ApplyAsync(ApplicationDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS ProviderAppointments (
                Id TEXT NOT NULL CONSTRAINT PK_ProviderAppointments PRIMARY KEY,
                CondominiumId TEXT NOT NULL,
                ProviderUserId TEXT NOT NULL,
                Title TEXT NOT NULL,
                ScheduledAt TEXT NOT NULL,
                Notes TEXT NULL,
                Status INTEGER NOT NULL,
                CreatedAt TEXT NOT NULL,
                CreatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                UpdatedBy TEXT NULL,
                IsDeleted INTEGER NOT NULL,
                DeletedAt TEXT NULL,
                DeletedBy TEXT NULL
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS CondominiumDocuments (
                Id TEXT NOT NULL CONSTRAINT PK_CondominiumDocuments PRIMARY KEY,
                CondominiumId TEXT NOT NULL,
                Title TEXT NOT NULL,
                DocumentType INTEGER NOT NULL,
                FileName TEXT NOT NULL,
                FileUrl TEXT NOT NULL,
                UploadedById TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                CreatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                UpdatedBy TEXT NULL,
                IsDeleted INTEGER NOT NULL,
                DeletedAt TEXT NULL,
                DeletedBy TEXT NULL
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS CondominiumAreaReservations (
                Id TEXT NOT NULL CONSTRAINT PK_CondominiumAreaReservations PRIMARY KEY,
                CondominiumId TEXT NOT NULL,
                CommonAreaId TEXT NOT NULL,
                UserId TEXT NOT NULL,
                UnitId TEXT NOT NULL,
                ReservationDate TEXT NOT NULL,
                StartTime TEXT NOT NULL,
                EndTime TEXT NOT NULL,
                Purpose TEXT NULL,
                Status INTEGER NOT NULL,
                AreaName TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                CreatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                UpdatedBy TEXT NULL,
                IsDeleted INTEGER NOT NULL,
                DeletedAt TEXT NULL,
                DeletedBy TEXT NULL
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS PackageDeliveries (
                Id TEXT NOT NULL CONSTRAINT PK_PackageDeliveries PRIMARY KEY,
                CondominiumId TEXT NOT NULL,
                UnitId TEXT NOT NULL,
                UnitNumber TEXT NOT NULL,
                Carrier TEXT NOT NULL,
                Description TEXT NOT NULL,
                TrackingCode TEXT NULL,
                Status INTEGER NOT NULL,
                ReceivedAt TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                CreatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                UpdatedBy TEXT NULL,
                IsDeleted INTEGER NOT NULL,
                DeletedAt TEXT NULL,
                DeletedBy TEXT NULL
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS ParkingSpots (
                Id TEXT NOT NULL CONSTRAINT PK_ParkingSpots PRIMARY KEY,
                CondominiumId TEXT NOT NULL,
                Code TEXT NOT NULL,
                AssignedPlate TEXT NULL,
                CreatedAt TEXT NOT NULL,
                CreatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                UpdatedBy TEXT NULL,
                IsDeleted INTEGER NOT NULL,
                DeletedAt TEXT NULL,
                DeletedBy TEXT NULL
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS ResidentVehicles (
                Id TEXT NOT NULL CONSTRAINT PK_ResidentVehicles PRIMARY KEY,
                CondominiumId TEXT NOT NULL,
                UnitId TEXT NOT NULL,
                Plate TEXT NOT NULL,
                Brand TEXT NOT NULL,
                Color TEXT NULL,
                SpotCode TEXT NULL,
                CreatedAt TEXT NOT NULL,
                CreatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                UpdatedBy TEXT NULL,
                IsDeleted INTEGER NOT NULL,
                DeletedAt TEXT NULL,
                DeletedBy TEXT NULL
            );
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE TABLE IF NOT EXISTS SecurityRounds (
                Id TEXT NOT NULL CONSTRAINT PK_SecurityRounds PRIMARY KEY,
                CondominiumId TEXT NOT NULL,
                GuardUserId TEXT NOT NULL,
                Area TEXT NOT NULL,
                Notes TEXT NOT NULL,
                StartedAt TEXT NOT NULL,
                CreatedAt TEXT NOT NULL,
                CreatedBy TEXT NULL,
                UpdatedAt TEXT NULL,
                UpdatedBy TEXT NULL,
                IsDeleted INTEGER NOT NULL,
                DeletedAt TEXT NULL,
                DeletedBy TEXT NULL
            );
            """);

        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "ALTER TABLE Payments ADD COLUMN ReceiptNumber TEXT NULL;");
        }
        catch (Microsoft.Data.Sqlite.SqliteException)
        {
            // The receipt column is already present.
        }

        try
        {
            await context.Database.ExecuteSqlRawAsync(
                "ALTER TABLE Visits ADD COLUMN AccessCode TEXT NULL;");
        }
        catch (Microsoft.Data.Sqlite.SqliteException)
        {
            // The access code column is already present.
        }

        await context.Database.ExecuteSqlRawAsync(
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_Visits_AccessCode ON Visits (AccessCode);");

        await AddColumnIfMissingAsync(context, "ALTER TABLE ParkingSpots ADD COLUMN UnitId TEXT NULL;");
        await AddColumnIfMissingAsync(context, "ALTER TABLE ParkingSpots ADD COLUMN ResidentId TEXT NULL;");
        await AddColumnIfMissingAsync(context, "ALTER TABLE ResidentVehicles ADD COLUMN ResidentId TEXT NULL;");
        await AddColumnIfMissingAsync(context, "ALTER TABLE Visits ADD COLUMN ResidentVehicleId TEXT NULL;");
    }

    private static async Task AddColumnIfMissingAsync(ApplicationDbContext context, string sql)
    {
        try
        {
            await context.Database.ExecuteSqlRawAsync(sql);
        }
        catch (Microsoft.Data.Sqlite.SqliteException)
        {
            // The column is already present.
        }
    }
}
