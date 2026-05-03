using System.Net.Http.Headers;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;
using TaskStatus = TimeIn.API.Models.TaskStatus;

namespace TimeIn.API.Services;

public class ClickUpService
{
    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly ILogger<ClickUpService> _logger;
    private readonly bool _isConfigured;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private readonly string? _webhookSecret;
    private readonly string? _workspaceId;

    private static readonly Dictionary<string, (DateTime SyncedAt, int TaskCount)> _syncLog = new();

    public ClickUpService(HttpClient http, AppDbContext db, IConfiguration config, ILogger<ClickUpService> logger)
    {
        _http = http;
        _db = db;
        _logger = logger;

        var apiKey = config["ClickUp:ApiKey"];
        _isConfigured = !string.IsNullOrWhiteSpace(apiKey);
        _webhookSecret = config["ClickUp:WebhookSecret"];
        _workspaceId = config["ClickUp:WorkspaceId"];

        if (_isConfigured)
        {
            _http.BaseAddress = new Uri("https://api.clickup.com/api/v2/");
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(apiKey!);
        }
    }

    public async Task<bool> LogTimeAsync(string clickUpTaskId, DateTime date, TimeSpan? startTime, int durationMinutes, string? description)
    {
        if (!_isConfigured) return false;

        var startDt = startTime.HasValue
            ? new DateTime(date.Year, date.Month, date.Day, startTime.Value.Hours, startTime.Value.Minutes, 0, DateTimeKind.Utc)
            : new DateTime(date.Year, date.Month, date.Day, 9, 0, 0, DateTimeKind.Utc);

        var startMs    = new DateTimeOffset(startDt).ToUnixTimeMilliseconds();
        var durationMs = (long)durationMinutes * 60 * 1000;

        var body    = new { start = startMs, duration = durationMs, description = description ?? "" };
        var content = new StringContent(System.Text.Json.JsonSerializer.Serialize(body),
                                        System.Text.Encoding.UTF8, "application/json");
        try
        {
            var response = await _http.PostAsync($"task/{clickUpTaskId}/time", content);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("ClickUp time log failed for task {TaskId}: {Status} – {Err}",
                    clickUpTaskId, (int)response.StatusCode, err);
                return false;
            }
            _logger.LogInformation("Logged {Min} min to ClickUp task {TaskId}", durationMinutes, clickUpTaskId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Exception while logging time to ClickUp task {TaskId}", clickUpTaskId);
            return false;
        }
    }

    public async Task<ClickUpSyncResult> SyncTasksFromListAsync(string listId, int? projectId)
    {
        var result = new ClickUpSyncResult();

        if (!_isConfigured)
        {
            result.Errors.Add("ClickUp API key is not configured.");
            return result;
        }

        ClickUpTaskListResponse? response;
        try
        {
            var httpResponse = await _http.GetAsync($"list/{listId}/task?include_closed=true");

            if (httpResponse.StatusCode == System.Net.HttpStatusCode.Unauthorized)
            {
                result.Errors.Add("Invalid ClickUp API key.");
                return result;
            }

            httpResponse.EnsureSuccessStatusCode();
            var json = await httpResponse.Content.ReadAsStringAsync();
            response = JsonSerializer.Deserialize<ClickUpTaskListResponse>(json, _jsonOptions);
        }
        catch (HttpRequestException ex)
        {
            _logger.LogError(ex, "ClickUp API request failed for list {ListId}", listId);
            result.Errors.Add($"ClickUp API error: {ex.Message}");
            return result;
        }

        if (response?.Tasks == null || response.Tasks.Count == 0)
            return result;

        foreach (var cuTask in response.Tasks)
        {
            try
            {
                var existing = await _db.Tasks
                    .FirstOrDefaultAsync(t => t.ClickUpTaskId == cuTask.Id);

                var status = MapStatus(cuTask.Status?.Status);
                var priority = MapPriority(cuTask.Priority?.Priority);
                var estimatedHours = cuTask.TimeEstimate.HasValue
                    ? Math.Round((decimal)cuTask.TimeEstimate.Value / 3_600_000m, 2)
                    : (decimal?)null;

                if (existing != null)
                {
                    existing.TaskName = cuTask.Name;
                    existing.Status = status;
                    existing.Priority = priority;
                    if (estimatedHours.HasValue)
                        existing.EstimatedHours = estimatedHours;
                    result.Updated++;
                }
                else
                {
                    _db.Tasks.Add(new TaskItem
                    {
                        TaskName = cuTask.Name,
                        Description = cuTask.Description,
                        ProjectId = projectId, // null = unassigned
                        ClickUpTaskId = cuTask.Id,
                        Status = status,
                        Priority = priority,
                        EstimatedHours = estimatedHours,
                        CreatedAt = DateTime.UtcNow
                    });
                    result.Created++;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sync ClickUp task {TaskId}", cuTask.Id);
                result.Errors.Add($"Task '{cuTask.Name}' ({cuTask.Id}): {ex.Message}");
            }
        }

        await _db.SaveChangesAsync();
        _syncLog[listId] = (DateTime.UtcNow, result.Created + result.Updated);
        return result;
    }

    public (DateTime SyncedAt, int TaskCount)? GetLastSync(string listId) =>
        _syncLog.TryGetValue(listId, out var entry) ? entry : null;

    public async Task<(bool IsConnected, string? WorkspaceName)> TestConnectionAsync()
    {
        if (!_isConfigured) return (false, null);
        try
        {
            var response = await _http.GetAsync("team");
            if (!response.IsSuccessStatusCode) return (false, null);
            var json = await response.Content.ReadAsStringAsync();
            var data = System.Text.Json.JsonSerializer.Deserialize<ClickUpWorkspaceResponse>(json, _jsonOptions);
            var name = data?.Teams.FirstOrDefault()?.Name;
            return (true, name);
        }
        catch { return (false, null); }
    }

    public async Task<List<ClickUpTaskSummaryDto>> GetTasksForProjectAsync(int projectId)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null || string.IsNullOrWhiteSpace(project.ExternalClickUpListId))
            return new List<ClickUpTaskSummaryDto>();

        if (!_isConfigured) return new List<ClickUpTaskSummaryDto>();

        try
        {
            var httpResponse = await _http.GetAsync($"list/{project.ExternalClickUpListId}/task?include_closed=false");
            if (!httpResponse.IsSuccessStatusCode) return new List<ClickUpTaskSummaryDto>();

            var json = await httpResponse.Content.ReadAsStringAsync();
            var response = JsonSerializer.Deserialize<ClickUpTaskListResponse>(json, _jsonOptions);
            if (response?.Tasks == null) return new List<ClickUpTaskSummaryDto>();

            return response.Tasks.Select(t => new ClickUpTaskSummaryDto
            {
                Id = t.Id,
                Name = t.Name,
                Status = t.Status?.Status,
                Priority = t.Priority?.Priority,
                EstimatedHours = t.TimeEstimate.HasValue ? Math.Round(t.TimeEstimate.Value / 3_600_000.0, 2) : null
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch ClickUp tasks for project {ProjectId}", projectId);
            return new List<ClickUpTaskSummaryDto>();
        }
    }

    public bool VerifyWebhookSignature(string body, string? signature)
    {
        if (string.IsNullOrWhiteSpace(_webhookSecret) || string.IsNullOrWhiteSpace(signature))
            return string.IsNullOrWhiteSpace(_webhookSecret); // if no secret configured, allow all

        using var hmac = new System.Security.Cryptography.HMACSHA256(
            System.Text.Encoding.UTF8.GetBytes(_webhookSecret));
        var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(body));
        var expected = Convert.ToHexString(hash).ToLower();
        return expected == signature.ToLower();
    }

    public async Task<bool> HandleWebhookEventAsync(string taskId)
    {
        if (!_isConfigured) return false;
        try
        {
            var httpResponse = await _http.GetAsync($"task/{taskId}");
            if (!httpResponse.IsSuccessStatusCode) return false;

            var json = await httpResponse.Content.ReadAsStringAsync();
            var cuTask = JsonSerializer.Deserialize<ClickUpTask>(json, _jsonOptions);
            if (cuTask == null) return false;

            var status = MapStatus(cuTask.Status?.Status);
            var priority = MapPriority(cuTask.Priority?.Priority);
            var estimatedHours = cuTask.TimeEstimate.HasValue
                ? Math.Round((decimal)cuTask.TimeEstimate.Value / 3_600_000m, 2)
                : (decimal?)null;

            // Auto-assign project based on which ClickUp list the task belongs to
            int? projectId = null;
            if (!string.IsNullOrWhiteSpace(cuTask.List?.Id))
            {
                projectId = await _db.Projects
                    .Where(p => p.ExternalClickUpListId == cuTask.List.Id)
                    .Select(p => (int?)p.ProjectId)
                    .FirstOrDefaultAsync();
            }

            var existing = await _db.Tasks.FirstOrDefaultAsync(t => t.ClickUpTaskId == cuTask.Id);
            if (existing != null)
            {
                existing.TaskName = cuTask.Name;
                existing.Status = status;
                existing.Priority = priority;
                if (estimatedHours.HasValue) existing.EstimatedHours = estimatedHours;
                // Only assign project if not already assigned and we found a match
                if (existing.ProjectId == null && projectId != null)
                    existing.ProjectId = projectId;
            }
            else
            {
                _db.Tasks.Add(new TaskItem
                {
                    TaskName = cuTask.Name,
                    Description = cuTask.Description,
                    ProjectId = projectId,
                    ClickUpTaskId = cuTask.Id,
                    Status = status,
                    Priority = priority,
                    EstimatedHours = estimatedHours,
                    CreatedAt = DateTime.UtcNow
                });
            }
            await _db.SaveChangesAsync();
            _logger.LogInformation("Webhook synced ClickUp task {TaskId} → project {ProjectId}", taskId, projectId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Webhook failed to sync task {TaskId}", taskId);
            return false;
        }
    }

    public async Task<string?> RegisterWebhookAsync(string endpointUrl)
    {
        if (!_isConfigured || string.IsNullOrWhiteSpace(_workspaceId)) return null;
        try
        {
            var body = new
            {
                endpoint = endpointUrl,
                events = new[] { "taskCreated", "taskUpdated", "taskDeleted" }
            };
            var content = new StringContent(JsonSerializer.Serialize(body),
                System.Text.Encoding.UTF8, "application/json");
            var response = await _http.PostAsync($"team/{_workspaceId}/webhook", content);
            if (!response.IsSuccessStatusCode) return null;

            var json = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<ClickUpWebhookRegistrationResponse>(json, _jsonOptions);
            var secret = result?.Webhook?.Secret;
            _logger.LogInformation("ClickUp webhook registered. ID: {Id}", result?.Webhook?.Id);
            return secret;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register ClickUp webhook");
            return null;
        }
    }

    private static TaskStatus MapStatus(string? raw) =>
        raw?.ToLowerInvariant().Replace(" ", "") switch
        {
            "inprogress" or "in_progress" or "active" => TaskStatus.InProgress,
            "complete" or "completed" or "done" or "closed" => TaskStatus.Done,
            "cancelled" or "canceled" => TaskStatus.Cancelled,
            _ => TaskStatus.Todo
        };

    private static TaskPriority MapPriority(string? raw) =>
        raw?.ToLowerInvariant() switch
        {
            "urgent" => TaskPriority.Urgent,
            "high"   => TaskPriority.High,
            "normal" => TaskPriority.Medium,
            "low"    => TaskPriority.Low,
            _        => TaskPriority.Medium
        };
}
