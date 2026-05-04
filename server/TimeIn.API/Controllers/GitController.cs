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

        IEnumerable<string>? emailFilter = null;
        if (callerRole == "Employee")
        {
            var user = await _db.Users.FindAsync(callerId);
            emailFilter = user == null ? null : new[] { user.Email };
        }
        else if (callerRole == "Manager")
        {
            var managerTeamId = await _db.Users
                .Where(u => u.UserId == callerId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();

            if (userId.HasValue)
            {
                var user = await _db.Users.FindAsync(userId.Value);
                if (user == null) return NotFound();
                if (user.TeamId != managerTeamId) return Forbid();
                emailFilter = new[] { user.Email };
            }
            else
            {
                emailFilter = await _db.Users
                    .Where(u => u.TeamId == managerTeamId && u.IsActive)
                    .Select(u => u.Email)
                    .ToListAsync();
            }
        }
        else if (userId.HasValue)
        {
            var user = await _db.Users.FindAsync(userId.Value);
            emailFilter = user == null ? null : new[] { user.Email };
        }

        // Add 1 day so "until" is end-of-day inclusive (GitHub API excludes the boundary timestamp)
        var commits = await _github.GetCommitsAsync(emailFilter, from, to?.AddDays(1));
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

    [HttpGet("commits/task-counts")]
    public async Task<IActionResult> GetTaskCommitCounts()
    {
        var counts = await _db.GitCommits
            .Where(g => g.LinkedTaskId != null)
            .GroupBy(g => g.LinkedTaskId!.Value)
            .Select(g => new { taskId = g.Key, count = g.Count() })
            .ToDictionaryAsync(x => x.taskId, x => x.count);
        return Ok(counts);
    }

    [HttpGet("commits/task/{taskId}")]
    public async Task<IActionResult> GetCommitsByTask(int taskId)
    {
        var commits = await _db.GitCommits
            .Where(g => g.LinkedTaskId == taskId)
            .OrderByDescending(g => g.CommitDate)
            .Select(g => new GitCommitDto
            {
                CommitId = g.CommitId,
                Hash = g.CommitHash,
                ShortHash = g.CommitHash.Length >= 7 ? g.CommitHash.Substring(0, 7) : g.CommitHash,
                Message = g.CommitMessage,
                AuthorName = g.CommitAuthor,
                AuthorEmail = g.AuthorEmail,
                Date = g.CommitDate,
                Url = "https://github.com/" + _github.RepoFullName + "/commit/" + g.CommitHash,
                LinkedTaskId = g.LinkedTaskId
            })
            .ToListAsync();
        return Ok(commits);
    }

    [HttpGet("status")]
    [AllowAnonymous]
    public IActionResult GetStatus() => Ok(new
    {
        configured = _github.IsConfigured,
        repo = _github.RepoFullName
    });
}
