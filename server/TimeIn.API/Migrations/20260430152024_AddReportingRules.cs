using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeIn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReportingRules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReportingRules",
                columns: table => new
                {
                    RulesId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IsTaskMandatory = table.Column<bool>(type: "bit", nullable: false),
                    MaxHoursPerDay = table.Column<int>(type: "int", nullable: false),
                    RetroactiveDaysAllowed = table.Column<int>(type: "int", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportingRules", x => x.RulesId);
                    table.ForeignKey(
                        name: "FK_ReportingRules_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.InsertData(
                table: "ReportingRules",
                columns: new[] { "RulesId", "IsTaskMandatory", "MaxHoursPerDay", "RetroactiveDaysAllowed", "UpdatedAt", "UpdatedByUserId" },
                values: new object[] { 1, true, 12, 7, new DateTime(2024, 1, 1, 0, 0, 0, 0, DateTimeKind.Utc), null });

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$pTt3mVMsCqhrlnKqfntGzOL0hEpG0xpbsJCsO3K.iA.ZIgDVTS0UK");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 2,
                column: "PasswordHash",
                value: "$2a$11$6lRIe/.MhRsxg7hL34ubiedt0Qz4Wj7INledFdKEVW2tmTqo2xkP2");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 3,
                column: "PasswordHash",
                value: "$2a$11$3.ZXRbaSy9grAuZoHq3GoeIiaC.D6xFV/D6nVvFKzludYhISRBFuq");

            migrationBuilder.CreateIndex(
                name: "IX_ReportingRules_UpdatedByUserId",
                table: "ReportingRules",
                column: "UpdatedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReportingRules");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$ucDJ/tVMBVM6YOUQ/rNKrecD75GVKp2zSYJ3uYZpldvXQFO1CUCMS");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 2,
                column: "PasswordHash",
                value: "$2a$11$SF4Tzzcf3yc6OVn0BjW39uPKBTqCBgbPS774PG23N5mbaBgbRYXXK");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 3,
                column: "PasswordHash",
                value: "$2a$11$nWjIQqSESCsv4yPeJ.gCP.deMoFT/Wd0ErUFscpIKoHdUPG9aXubK");
        }
    }
}
