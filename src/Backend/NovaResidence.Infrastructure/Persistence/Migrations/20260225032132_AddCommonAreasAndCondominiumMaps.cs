using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NovaResidence.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCommonAreasAndCondominiumMaps : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CondominiumCommonAreas",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CondominiumId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    BuildingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Level = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CoordinateX = table.Column<decimal>(type: "decimal(10,4)", precision: 10, scale: 4, nullable: true),
                    CoordinateY = table.Column<decimal>(type: "decimal(10,4)", precision: 10, scale: 4, nullable: true),
                    ImageUrlsJson = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CondominiumCommonAreas", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CondominiumCommonAreas_Buildings_BuildingId",
                        column: x => x.BuildingId,
                        principalSchema: "condo",
                        principalTable: "Buildings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "CondominiumMaps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CondominiumId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ScopeType = table.Column<int>(type: "int", nullable: false),
                    ScopeReference = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    BackgroundImageUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CondominiumMaps", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Visits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CondominiumId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    RequestedById = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    VisitorName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    VisitorIdentification = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    VisitorPhone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    VisitorEmail = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    VisitorCount = table.Column<int>(type: "int", nullable: false),
                    VehiclePlate = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    VehicleDescription = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    ExpectedArrival = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpectedDeparture = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckInAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckOutAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CheckedInById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CheckedOutById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApprovedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectedById = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RejectionReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Visits", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "CondominiumMapMarkers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CondominiumMapId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Tooltip = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    MarkerType = table.Column<int>(type: "int", nullable: false),
                    MarkerColor = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    CoordinateX = table.Column<decimal>(type: "decimal(10,4)", precision: 10, scale: 4, nullable: false),
                    CoordinateY = table.Column<decimal>(type: "decimal(10,4)", precision: 10, scale: 4, nullable: false),
                    LayerName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LayerEnabledByDefault = table.Column<bool>(type: "bit", nullable: false),
                    AmenityId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    CommonAreaId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    BuildingId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ExternalReference = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedBy = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DeletedBy = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CondominiumMapMarkers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CondominiumMapMarkers_CondominiumMaps_CondominiumMapId",
                        column: x => x.CondominiumMapId,
                        principalTable: "CondominiumMaps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumCommonAreas_BuildingId",
                table: "CondominiumCommonAreas",
                column: "BuildingId");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumCommonAreas_CondominiumId",
                table: "CondominiumCommonAreas",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumCommonAreas_IsActive",
                table: "CondominiumCommonAreas",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumCommonAreas_Type",
                table: "CondominiumCommonAreas",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumMapMarkers_CondominiumMapId",
                table: "CondominiumMapMarkers",
                column: "CondominiumMapId");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumMapMarkers_IsActive",
                table: "CondominiumMapMarkers",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumMapMarkers_LayerName",
                table: "CondominiumMapMarkers",
                column: "LayerName");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumMapMarkers_MarkerType",
                table: "CondominiumMapMarkers",
                column: "MarkerType");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumMaps_CondominiumId",
                table: "CondominiumMaps",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumMaps_IsActive",
                table: "CondominiumMaps",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_CondominiumMaps_ScopeType",
                table: "CondominiumMaps",
                column: "ScopeType");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_CondominiumId",
                table: "Visits",
                column: "CondominiumId");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_ExpectedArrival",
                table: "Visits",
                column: "ExpectedArrival");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_RequestedById",
                table: "Visits",
                column: "RequestedById");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_Status",
                table: "Visits",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_Type",
                table: "Visits",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_Visits_UnitId",
                table: "Visits",
                column: "UnitId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CondominiumCommonAreas");

            migrationBuilder.DropTable(
                name: "CondominiumMapMarkers");

            migrationBuilder.DropTable(
                name: "Visits");

            migrationBuilder.DropTable(
                name: "CondominiumMaps");
        }
    }
}
