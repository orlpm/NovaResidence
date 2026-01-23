using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NovaResidence.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddResidentsTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Residents",
                schema: "condo",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnitId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PhoneNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    IsRegistered = table.Column<bool>(type: "bit", nullable: false),
                    InvitationToken = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    InvitationSentAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    RegisteredAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    MoveInDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    MoveOutDate = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                    table.PrimaryKey("PK_Residents", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Residents_Units_UnitId",
                        column: x => x.UnitId,
                        principalSchema: "condo",
                        principalTable: "Units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Residents_Email",
                schema: "condo",
                table: "Residents",
                column: "Email");

            migrationBuilder.CreateIndex(
                name: "IX_Residents_InvitationToken",
                schema: "condo",
                table: "Residents",
                column: "InvitationToken",
                unique: true,
                filter: "[InvitationToken] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Residents_UnitId",
                schema: "condo",
                table: "Residents",
                column: "UnitId");

            migrationBuilder.CreateIndex(
                name: "IX_Residents_UnitId_IsActive",
                schema: "condo",
                table: "Residents",
                columns: new[] { "UnitId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Residents_UserId",
                schema: "condo",
                table: "Residents",
                column: "UserId",
                filter: "[UserId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Residents",
                schema: "condo");
        }
    }
}
