using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NovaResidence.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SubscriptionUserBased : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subscriptions_Condominiums_CondominiumId",
                schema: "billing",
                table: "Subscriptions");

            migrationBuilder.RenameColumn(
                name: "CondominiumId",
                schema: "billing",
                table: "Subscriptions",
                newName: "AdminUserId");

            migrationBuilder.RenameIndex(
                name: "IX_Subscriptions_CondominiumId",
                schema: "billing",
                table: "Subscriptions",
                newName: "IX_Subscriptions_AdminUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_Users_AdminUserId",
                schema: "billing",
                table: "Subscriptions",
                column: "AdminUserId",
                principalSchema: "auth",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Subscriptions_Users_AdminUserId",
                schema: "billing",
                table: "Subscriptions");

            migrationBuilder.RenameColumn(
                name: "AdminUserId",
                schema: "billing",
                table: "Subscriptions",
                newName: "CondominiumId");

            migrationBuilder.RenameIndex(
                name: "IX_Subscriptions_AdminUserId",
                schema: "billing",
                table: "Subscriptions",
                newName: "IX_Subscriptions_CondominiumId");

            migrationBuilder.AddForeignKey(
                name: "FK_Subscriptions_Condominiums_CondominiumId",
                schema: "billing",
                table: "Subscriptions",
                column: "CondominiumId",
                principalSchema: "condo",
                principalTable: "Condominiums",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
