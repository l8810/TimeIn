using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TimeIn.API.Migrations
{
    /// <inheritdoc />
    public partial class AddManualTaskName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ManualTaskName",
                table: "TimeEntries",
                type: "nvarchar(max)",
                nullable: true);

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

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ManualTaskName",
                table: "TimeEntries");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$hyzfmXVxFVQoCX7EgxQecuogPMPa92folwL14S3cPLrTtfCCGoJ3C");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 2,
                column: "PasswordHash",
                value: "$2a$11$BkzyB9dUCLaAmFzerv2S3ui1mVbmlIjTkLg6vZfQqfmnCPeN7YIoK");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "UserId",
                keyValue: 3,
                column: "PasswordHash",
                value: "$2a$11$DcKusLub9B73GBAQezb4S..LE9Oau5OaLh154fwg72b5Snh7y4jn2");
        }
    }
}
