using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AssetFlow.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRequestLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "Assets",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "AssetRequests",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "AssetRequests",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "xmin",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "AssetRequests");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "AssetRequests");
        }
    }
}
