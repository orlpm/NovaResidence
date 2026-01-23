using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NovaResidence.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDefaultRoleToUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "DefaultRole",
                schema: "auth",
                table: "Users",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DefaultRole",
                schema: "auth",
                table: "Users");
        }
    }
}
