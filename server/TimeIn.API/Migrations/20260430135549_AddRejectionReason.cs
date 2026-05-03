using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeIn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRejectionReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "TimeEntries",
                type: "nvarchar(max)",
                nullable: true);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "TimeEntries");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$iDvGwiqKtXZv1iSmMYkCxewQA2/Oac8B1Tue6IU2VTuoOSh4BGdyG");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 2,
                column: "PasswordHash",
                value: "$2a$11$Jd32HnoSxsQQe72dpOB5TuSi655gGGKv/LYFI9DrIEAsHzkEzyjnq");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 3,
                column: "PasswordHash",
                value: "$2a$11$ypd7iLQZWIlYBUECOEtO0eojvIJqWbA1B2kTscKhwn9eqSYRu5Ecy");
        }
    }
}
