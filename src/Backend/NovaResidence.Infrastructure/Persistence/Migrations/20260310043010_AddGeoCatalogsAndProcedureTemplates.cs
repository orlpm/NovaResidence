using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NovaResidence.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGeoCatalogsAndProcedureTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "catalog");

            migrationBuilder.EnsureSchema(
                name: "ops");

            migrationBuilder.RenameTable(
                name: "ResidentProcedures",
                newName: "ResidentProcedures",
                newSchema: "ops");

            migrationBuilder.AddColumn<Guid>(
                name: "CountryId",
                schema: "condo",
                table: "Condominiums",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "StateId",
                schema: "condo",
                table: "Condominiums",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                schema: "ops",
                table: "ResidentProcedures",
                type: "nvarchar(250)",
                maxLength: 250,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Requirements",
                schema: "ops",
                table: "ResidentProcedures",
                type: "nvarchar(3000)",
                maxLength: 3000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                schema: "ops",
                table: "ResidentProcedures",
                type: "nvarchar(3000)",
                maxLength: 3000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AlterColumn<string>(
                name: "CompletionNotes",
                schema: "ops",
                table: "ResidentProcedures",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)",
                oldNullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "ProcedureTemplateId",
                schema: "ops",
                table: "ResidentProcedures",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "GeoCountries",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(8)", maxLength: 8, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
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
                    table.PrimaryKey("PK_GeoCountries", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "GeoStates",
                schema: "catalog",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CountryId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
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
                    table.PrimaryKey("PK_GeoStates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GeoStates_GeoCountries_CountryId",
                        column: x => x.CountryId,
                        principalSchema: "catalog",
                        principalTable: "GeoCountries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ProcedureTemplates",
                schema: "ops",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Code = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AuthorityName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Requirements = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    IsMandatoryDefault = table.Column<bool>(type: "bit", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CountryId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StateId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
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
                    table.PrimaryKey("PK_ProcedureTemplates", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProcedureTemplates_GeoCountries_CountryId",
                        column: x => x.CountryId,
                        principalSchema: "catalog",
                        principalTable: "GeoCountries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ProcedureTemplates_GeoStates_StateId",
                        column: x => x.StateId,
                        principalSchema: "catalog",
                        principalTable: "GeoStates",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Condominiums_CountryId",
                schema: "condo",
                table: "Condominiums",
                column: "CountryId");

            migrationBuilder.CreateIndex(
                name: "IX_Condominiums_StateId",
                schema: "condo",
                table: "Condominiums",
                column: "StateId");

            migrationBuilder.CreateIndex(
                name: "IX_ResidentProcedures_CondominiumId_Status_DueDate",
                schema: "ops",
                table: "ResidentProcedures",
                columns: new[] { "CondominiumId", "Status", "DueDate" });

            migrationBuilder.CreateIndex(
                name: "IX_ResidentProcedures_ProcedureTemplateId",
                schema: "ops",
                table: "ResidentProcedures",
                column: "ProcedureTemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_ResidentProcedures_ResidentId",
                schema: "ops",
                table: "ResidentProcedures",
                column: "ResidentId");

            migrationBuilder.CreateIndex(
                name: "IX_GeoCountries_Code",
                schema: "catalog",
                table: "GeoCountries",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GeoCountries_Name",
                schema: "catalog",
                table: "GeoCountries",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_GeoStates_CountryId_Code",
                schema: "catalog",
                table: "GeoStates",
                columns: new[] { "CountryId", "Code" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_GeoStates_CountryId_Name",
                schema: "catalog",
                table: "GeoStates",
                columns: new[] { "CountryId", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureTemplates_Code",
                schema: "ops",
                table: "ProcedureTemplates",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureTemplates_CountryId_StateId_IsActive",
                schema: "ops",
                table: "ProcedureTemplates",
                columns: new[] { "CountryId", "StateId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_ProcedureTemplates_StateId",
                schema: "ops",
                table: "ProcedureTemplates",
                column: "StateId");

            migrationBuilder.AddForeignKey(
                name: "FK_Condominiums_GeoCountries_CountryId",
                schema: "condo",
                table: "Condominiums",
                column: "CountryId",
                principalSchema: "catalog",
                principalTable: "GeoCountries",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Condominiums_GeoStates_StateId",
                schema: "condo",
                table: "Condominiums",
                column: "StateId",
                principalSchema: "catalog",
                principalTable: "GeoStates",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ResidentProcedures_ProcedureTemplates_ProcedureTemplateId",
                schema: "ops",
                table: "ResidentProcedures",
                column: "ProcedureTemplateId",
                principalSchema: "ops",
                principalTable: "ProcedureTemplates",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Condominiums_GeoCountries_CountryId",
                schema: "condo",
                table: "Condominiums");

            migrationBuilder.DropForeignKey(
                name: "FK_Condominiums_GeoStates_StateId",
                schema: "condo",
                table: "Condominiums");

            migrationBuilder.DropForeignKey(
                name: "FK_ResidentProcedures_ProcedureTemplates_ProcedureTemplateId",
                schema: "ops",
                table: "ResidentProcedures");

            migrationBuilder.DropTable(
                name: "ProcedureTemplates",
                schema: "ops");

            migrationBuilder.DropTable(
                name: "GeoStates",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "GeoCountries",
                schema: "catalog");

            migrationBuilder.DropIndex(
                name: "IX_Condominiums_CountryId",
                schema: "condo",
                table: "Condominiums");

            migrationBuilder.DropIndex(
                name: "IX_Condominiums_StateId",
                schema: "condo",
                table: "Condominiums");

            migrationBuilder.DropIndex(
                name: "IX_ResidentProcedures_CondominiumId_Status_DueDate",
                schema: "ops",
                table: "ResidentProcedures");

            migrationBuilder.DropIndex(
                name: "IX_ResidentProcedures_ProcedureTemplateId",
                schema: "ops",
                table: "ResidentProcedures");

            migrationBuilder.DropIndex(
                name: "IX_ResidentProcedures_ResidentId",
                schema: "ops",
                table: "ResidentProcedures");

            migrationBuilder.DropColumn(
                name: "CountryId",
                schema: "condo",
                table: "Condominiums");

            migrationBuilder.DropColumn(
                name: "StateId",
                schema: "condo",
                table: "Condominiums");

            migrationBuilder.DropColumn(
                name: "ProcedureTemplateId",
                schema: "ops",
                table: "ResidentProcedures");

            migrationBuilder.RenameTable(
                name: "ResidentProcedures",
                schema: "ops",
                newName: "ResidentProcedures");

            migrationBuilder.AlterColumn<string>(
                name: "Title",
                table: "ResidentProcedures",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(250)",
                oldMaxLength: 250);

            migrationBuilder.AlterColumn<string>(
                name: "Requirements",
                table: "ResidentProcedures",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(3000)",
                oldMaxLength: 3000);

            migrationBuilder.AlterColumn<string>(
                name: "Description",
                table: "ResidentProcedures",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(3000)",
                oldMaxLength: 3000);

            migrationBuilder.AlterColumn<string>(
                name: "CompletionNotes",
                table: "ResidentProcedures",
                type: "nvarchar(max)",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(2000)",
                oldMaxLength: 2000,
                oldNullable: true);
        }
    }
}
