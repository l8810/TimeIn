using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeIn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignedTeamToTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssignedTeamId",
                table: "Tasks",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "TaskId",
                keyValue: 1,
                column: "AssignedTeamId",
                value: null);

            migrationBuilder.UpdateData(
                table: "Tasks",
                keyColumn: "TaskId",
                keyValue: 2,
                column: "AssignedTeamId",
                value: null);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$Xjx6VTV3/adD7Bt4s9EBhuyW4OLXp65Bb.DBkpJXrbdTiYCHoWAAS");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 2,
                column: "PasswordHash",
                value: "$2a$11$pDeCozOJcgcdG202RaXCQe12eaNhMpRPJlHuRkK/wjRRiKSgWBMfm");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 3,
                column: "PasswordHash",
                value: "$2a$11$QaErhK6XEKvZvxBAxGHLMucP.J6N00UbdNLtKmmXFTXMnfj.oVayq");

            migrationBuilder.CreateIndex(
                name: "IX_Tasks_AssignedTeamId",
                table: "Tasks",
                column: "AssignedTeamId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tasks_Teams_AssignedTeamId",
                table: "Tasks",
                column: "AssignedTeamId",
                principalTable: "Teams",
                principalColumn: "TeamId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tasks_Teams_AssignedTeamId",
                table: "Tasks");

            migrationBuilder.DropIndex(
                name: "IX_Tasks_AssignedTeamId",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "AssignedTeamId",
                table: "Tasks");

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
        }
    }
}
