using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;
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
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;

    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    public IntegrationsController(ClickUpService clickUp, AppDbContext db, GitService git,
        IConfiguration config, IHttpClientFactory httpClientFactory)
    {
        _clickUp = clickUp;
        _db = db;
        _git = git;
        _config = config;
        _httpClientFactory = httpClientFactory;
    }

    [HttpGet("connection-settings")]
    public async Task<IActionResult> GetConnectionSettings()
    {
        var dbApiKey = await _db.SystemSettings
            .Where(s => s.Key == "ClickUp:ApiKey").Select(s => s.Value).FirstOrDefaultAsync();
        var apiKey = !string.IsNullOrWhiteSpace(dbApiKey) ? dbApiKey : _config["ClickUp:ApiKey"];

        var gitInfo = await _git.GetRepoInfoAsync();

        return Ok(new ConnectionSettingsDto
        {
            ClickUpApiKeyMasked = MaskKey(apiKey),
            ClickUpApiKeyConfigured = !string.IsNullOrWhiteSpace(apiKey),
            GitRemoteUrl = gitInfo.RemoteUrl ?? string.Empty
        });
    }

    [HttpPut("connection-settings")]
    public async Task<IActionResult> UpdateConnectionSettings([FromBody] UpdateConnectionSettingsRequest req)
    {
        if (req.ClickUpApiKey != null)
        {
            var s = await _db.SystemSettings.FindAsync("ClickUp:ApiKey");
            if (s == null)
                _db.SystemSettings.Add(new SystemSetting { Key = "ClickUp:ApiKey", Value = req.ClickUpApiKey.Trim() });
            else
                s.Value = req.ClickUpApiKey.Trim();
        }

        if (req.GitRemoteUrl != null)
            await _git.UpdateRemoteUrlAsync(req.GitRemoteUrl.Trim());

        await _db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("test-clickup-key")]
    public async Task<IActionResult> TestClickUpKey([FromBody] TestClickUpKeyRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.ApiKey))
            return Ok(new TestClickUpKeyResponse { IsConnected = false });

        var http = _httpClientFactory.CreateClient();
        http.BaseAddress = new Uri("https://api.clickup.com/api/v2/");
        http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(req.ApiKey.Trim());

        try
        {
            var response = await http.GetAsync("team");
            if (!response.IsSuccessStatusCode)
                return Ok(new TestClickUpKeyResponse { IsConnected = false });

            var json = await response.Content.ReadAsStringAsync();
            var data = JsonSerializer.Deserialize<ClickUpWorkspaceResponse>(json, _json);
            return Ok(new TestClickUpKeyResponse
            {
                IsConnected = true,
                WorkspaceName = data?.Teams.FirstOrDefault()?.Name
            });
        }
        catch
        {
            return Ok(new TestClickUpKeyResponse { IsConnected = false });
        }
    }

    private static string MaskKey(string? key)
    {
        if (string.IsNullOrWhiteSpace(key)) return string.Empty;
        if (key.Length <= 8) return new string('*', key.Length);
        return key[..4] + new string('*', key.Length - 8) + key[^4..];
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
