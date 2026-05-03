using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TeamsController : ControllerBase
{
    private readonly TeamService _teamService;

    public TeamsController(TeamService teamService) => _teamService = teamService;

    [HttpGet]
    public async Task<IActionResult> GetAll() => Ok(await _teamService.GetAllAsync());

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] CreateTeamRequest req)
    {
        var (team, error) = await _teamService.CreateAsync(req);
        if (team == null) return BadRequest(new { message = error });
        return CreatedAtAction(nameof(GetAll), team);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _teamService.DeleteAsync(id);
        return result ? NoContent() : NotFound();
    }
}
