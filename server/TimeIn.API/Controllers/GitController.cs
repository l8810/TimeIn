using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/git")]
[Authorize]
public class GitController : ControllerBase
{
    private readonly GitHubService _github;
    private readonly AppDbContext _db;

    public GitController(GitHubService github, AppDbContext db)
    {
        _github = github;
        _db = db;
    }

    [HttpGet("commits")]
    public async Task<IActionResult> GetCommits(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int? userId)
    {
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var callerRole = User.FindFirst(ClaimTypes.Role)!.Value;

        string? emailFilter = null;
        if (callerRole == "Employee")
        {
            var user = await _db.Users.FindAsync(callerId);
            emailFilter = user?.Email;
        }
        else if (userId.HasValue)
        {
            var user = await _db.Users.FindAsync(userId.Value);
            emailFilter = user?.Email;
        }
        // Manager/Admin with no userId → all commits, no filter

        var commits = await _github.GetCommitsAsync(emailFilter, from, to);
        return Ok(commits);
    }

    [HttpPost("commits/link")]
    public async Task<IActionResult> LinkCommit([FromBody] LinkCommitRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var result = await _github.LinkCommitAsync(req, userId);
        return Ok(result);
    }

    [HttpDelete("commits/link/{hash}")]
    public async Task<IActionResult> UnlinkCommit(string hash)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var ok = await _github.UnlinkCommitAsync(hash, userId);
        return ok ? Ok() : NotFound();
    }

    [HttpGet("gaps")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetGaps([FromQuery] DateTime from, [FromQuery] DateTime to)
    {
        var callerId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)!.Value);
        var callerRole = User.FindFirst(ClaimTypes.Role)!.Value;

        int? teamId = null;
        if (callerRole == "Manager")
            teamId = await _db.Users.Where(u => u.UserId == callerId).Select(u => u.TeamId).FirstOrDefaultAsync();

        var gaps = await _github.GetGapsAsync(from, to, teamId);
        return Ok(gaps);
    }

    [HttpGet("status")]
    [AllowAnonymous]
    public IActionResult GetStatus() => Ok(new
    {
        configured = _github.IsConfigured,
        repo = _github.RepoFullName
    });
}
