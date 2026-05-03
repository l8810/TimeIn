using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/integrations")]
[Authorize(Roles = "Admin")]
public class IntegrationsController : ControllerBase
{
    private readonly ClickUpService _clickUp;
    private readonly AppDbContext _db;
    private readonly GitService _git;

    public IntegrationsController(ClickUpService clickUp, AppDbContext db, GitService git)
    {
        _clickUp = clickUp;
        _db = db;
        _git = git;
    }

    [HttpGet("git")]
    public async Task<IActionResult> GetGitInfo() => Ok(await _git.GetRepoInfoAsync());

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        var (isConnected, workspaceName) = await _clickUp.TestConnectionAsync();

        var projects = await _db.Projects
            .Select(p => new ProjectMappingDto
            {
                ProjectId = p.ProjectId,
                ProjectName = p.ProjectName,
                ClickUpListId = p.ExternalClickUpListId
            }).ToListAsync();

        foreach (var p in projects.Where(p => p.ClickUpListId != null))
        {
            var log = _clickUp.GetLastSync(p.ClickUpListId!);
            if (log.HasValue)
            {
                p.LastSyncedAt = log.Value.SyncedAt;
                p.TasksSynced = log.Value.TaskCount;
            }
        }

        return Ok(new IntegrationStatusDto
        {
            ClickUp = new ClickUpStatusDto
            {
                IsConnected = isConnected,
                WorkspaceName = workspaceName,
                WebhookConfigured = !string.IsNullOrWhiteSpace(
                    HttpContext.RequestServices
                        .GetRequiredService<IConfiguration>()["ClickUp:WebhookSecret"]),
                ProjectMappings = projects
            }
        });
    }

    [HttpPut("mapping/{projectId:int}")]
    public async Task<IActionResult> UpdateMapping(int projectId, [FromBody] UpdateMappingRequest req)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null) return NotFound();
        project.ExternalClickUpListId = string.IsNullOrWhiteSpace(req.ClickUpListId) ? null : req.ClickUpListId.Trim();
        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("sync-all")]
    public async Task<IActionResult> SyncAll()
    {
        var projects = await _db.Projects
            .Where(p => p.ExternalClickUpListId != null)
            .ToListAsync();

        var results = new List<object>();
        foreach (var p in projects)
        {
            var result = await _clickUp.SyncTasksFromListAsync(p.ExternalClickUpListId!, p.ProjectId);
            results.Add(new { projectName = p.ProjectName, result.Created, result.Updated, result.Errors });
        }
        return Ok(results);
    }

    [HttpPost("sync/{projectId:int}")]
    public async Task<IActionResult> SyncOne(int projectId)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null) return NotFound();
        if (string.IsNullOrWhiteSpace(project.ExternalClickUpListId))
            return BadRequest(new { message = "אין List ID מוגדר לפרויקט זה" });

        var result = await _clickUp.SyncTasksFromListAsync(project.ExternalClickUpListId, projectId);
        return Ok(result);
    }
}
