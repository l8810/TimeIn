using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;

namespace TimeIn.API.Services;

public class GitHubService
{
    private readonly HttpClient _http;
    private readonly AppDbContext _db;
    private readonly ILogger<GitHubService> _logger;
    private readonly string? _repoOwner;
    private readonly string? _repoName;
    private readonly bool _isConfigured;

    private static readonly JsonSerializerOptions _json = new() { PropertyNameCaseInsensitive = true };

    // Matches: #123, task/86exf4f80, [86exf4f80], TASK-123
    private static readonly Regex _taskPattern =
        new(@"(?:#|task[/-]|\[)([a-z0-9]{5,})\]?", RegexOptions.IgnoreCase);

    public GitHubService(HttpClient http, AppDbContext db, IConfiguration config, ILogger<GitHubService> logger)
    {
        _http = http;
        _db = db;
        _logger = logger;

        var token = config["GitHub:Token"];
        _repoOwner = config["GitHub:RepoOwner"];
        _repoName = config["GitHub:RepoName"];
        _isConfigured = !string.IsNullOrWhiteSpace(token)
                     && !string.IsNullOrWhiteSpace(_repoOwner)
                     && !string.IsNullOrWhiteSpace(_repoName);

        if (_isConfigured)
        {
            _http.BaseAddress = new Uri("https://api.github.com/");
            _http.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            _http.DefaultRequestHeaders.UserAgent.ParseAdd("TimeIn-App");
            _http.DefaultRequestHeaders.Accept.ParseAdd("application/vnd.github+json");
        }
    }

    public bool IsConfigured => _isConfigured;
    public string? RepoFullName => _isConfigured ? $"{_repoOwner}/{_repoName}" : null;

    public async Task<List<GitCommitDto>> GetCommitsAsync(
        IEnumerable<string>? authorEmails, DateTime? from, DateTime? to, int maxPages = 3)
    {
        if (!_isConfigured) return new();
        try
        {
            var since = (from ?? DateTime.UtcNow.AddDays(-30)).ToString("o");
            var until = (to ?? DateTime.UtcNow).ToString("o");
            var allCommits = new List<GitHubCommitResponse>();

            for (int page = 1; page <= maxPages; page++)
            {
                var url = $"repos/{_repoOwner}/{_repoName}/commits?since={since}&until={until}&per_page=100&page={page}";
                var resp = await _http.GetAsync(url);
                if (!resp.IsSuccessStatusCode) break;

                var json = await resp.Content.ReadAsStringAsync();
                var batch = JsonSerializer.Deserialize<List<GitHubCommitResponse>>(json, _json);
                if (batch == null || batch.Count == 0) break;
                allCommits.AddRange(batch);
                if (batch.Count < 100) break;
            }

            if (authorEmails != null)
            {
                var emails = authorEmails
                    .Where(e => !string.IsNullOrWhiteSpace(e))
                    .Select(e => e!.Trim())
                    .ToHashSet(StringComparer.OrdinalIgnoreCase);

                if (emails.Count > 0)
                {
                    allCommits = allCommits
                        .Where(c => c.Commit?.Author?.Email != null && emails.Contains(c.Commit.Author.Email))
                        .ToList();
                }
                else
                {
                    allCommits.Clear();
                }
            }

            // Load stored links
            var hashes = allCommits.Select(c => c.Sha).ToList();
            var stored = await _db.GitCommits
                .Include(g => g.LinkedUser)
                .Include(g => g.LinkedTask)
                .Where(g => hashes.Contains(g.CommitHash))
                .ToDictionaryAsync(g => g.CommitHash);

            return allCommits.Select(c =>
            {
                stored.TryGetValue(c.Sha ?? "", out var dbRecord);
                var message = c.Commit?.Message?.Split('\n')[0] ?? "";
                return new GitCommitDto
                {
                    CommitId = dbRecord?.CommitId,
                    Hash = c.Sha ?? "",
                    ShortHash = (c.Sha ?? "").Length >= 7 ? c.Sha![..7] : c.Sha ?? "",
                    Message = message,
                    AuthorName = c.Commit?.Author?.Name ?? "",
                    AuthorEmail = c.Commit?.Author?.Email,
                    Date = c.Commit?.Author?.Date ?? DateTime.UtcNow,
                    Url = c.HtmlUrl ?? "",
                    LinkedUserId = dbRecord?.LinkedUserId,
                    LinkedUserName = dbRecord?.LinkedUser?.FullName,
                    LinkedTaskId = dbRecord?.LinkedTaskId,
                    LinkedTaskName = dbRecord?.LinkedTask?.TaskName,
                    LinkedTimeEntryId = dbRecord?.LinkedTimeEntryId,
                    MatchedTaskId = ExtractTaskId(message)
                };
            }).OrderByDescending(c => c.Date).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to fetch GitHub commits");
            return new();
        }
    }

    public async Task<GitCommitDto?> LinkCommitAsync(LinkCommitRequest req, int userId)
    {
        var existing = await _db.GitCommits.FirstOrDefaultAsync(g => g.CommitHash == req.CommitHash);
        if (existing == null)
        {
            existing = new GitCommit
            {
                Repository = RepoFullName ?? "",
                Branch = "",
                CommitHash = req.CommitHash,
                CommitMessage = req.CommitMessage,
                CommitAuthor = req.AuthorName,
                AuthorEmail = req.AuthorEmail,
                CommitDate = req.CommitDate,
                LinkedUserId = userId
            };
            _db.GitCommits.Add(existing);
        }
        existing.LinkedUserId = userId;
        existing.LinkedTimeEntryId = req.TimeEntryId;
        existing.LinkedTaskId = req.TaskId;
        await _db.SaveChangesAsync();

        return new GitCommitDto
        {
            CommitId = existing.CommitId,
            Hash = existing.CommitHash,
            ShortHash = existing.CommitHash.Length >= 7 ? existing.CommitHash[..7] : existing.CommitHash,
            Message = existing.CommitMessage,
            AuthorName = existing.CommitAuthor,
            AuthorEmail = existing.AuthorEmail,
            Date = existing.CommitDate,
            LinkedUserId = existing.LinkedUserId,
            LinkedTimeEntryId = existing.LinkedTimeEntryId,
            LinkedTaskId = existing.LinkedTaskId
        };
    }

    public async Task<bool> UnlinkCommitAsync(string hash, int userId)
    {
        var record = await _db.GitCommits.FirstOrDefaultAsync(g => g.CommitHash == hash);
        if (record == null) return false;
        _db.GitCommits.Remove(record);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<GitGapDto>> GetGapsAsync(DateTime from, DateTime to, int? teamId)
    {
        var users = await _db.Users
            .Where(u => u.IsActive && (teamId == null || u.TeamId == teamId))
            .Select(u => new { u.UserId, u.FullName, u.Email })
            .ToListAsync();

        var entries = await _db.TimeEntries
            .Where(te => te.Date >= from.Date && te.Date <= to.Date
                      && te.Status == TimeEntryStatus.Approved)
            .Select(te => new { te.UserId, te.Date, te.DurationMinutes })
            .ToListAsync();

        var commits = await _db.GitCommits
            .Where(g => g.CommitDate >= from && g.CommitDate <= to && g.LinkedUserId != null)
            .Select(g => new { UserId = g.LinkedUserId!.Value, Date = g.CommitDate.Date })
            .ToListAsync();

        var workingDays = Enumerable.Range(0, (to.Date - from.Date).Days + 1)
            .Select(i => from.Date.AddDays(i))
            .Where(d => d.DayOfWeek != DayOfWeek.Friday && d.DayOfWeek != DayOfWeek.Saturday)
            .ToList();

        var gaps = new List<GitGapDto>();
        foreach (var user in users)
        {
            foreach (var day in workingDays)
            {
                var dayEntries = entries.Where(e => e.UserId == user.UserId && e.Date == day).ToList();
                var dayCommits = commits.Where(c => c.UserId == user.UserId && c.Date == day).ToList();
                if (!dayEntries.Any() && !dayCommits.Any()) continue;

                gaps.Add(new GitGapDto
                {
                    UserId = user.UserId,
                    FullName = user.FullName,
                    Date = day,
                    HasTimeEntry = dayEntries.Any(),
                    HasCommit = dayCommits.Any(),
                    CommitCount = dayCommits.Count,
                    LoggedHours = Math.Round(dayEntries.Sum(e => e.DurationMinutes) / 60.0, 2)
                });
            }
        }
        return gaps.OrderBy(g => g.Date).ThenBy(g => g.FullName).ToList();
    }

    private static string? ExtractTaskId(string message)
    {
        var match = _taskPattern.Match(message);
        return match.Success ? match.Groups[1].Value : null;
    }
}

// GitHub API response models (internal)
file class GitHubCommitResponse
{
    [JsonPropertyName("sha")] public string? Sha { get; set; }
    [JsonPropertyName("commit")] public GitHubCommitDetail? Commit { get; set; }
    [JsonPropertyName("html_url")] public string? HtmlUrl { get; set; }
}
file class GitHubCommitDetail
{
    [JsonPropertyName("message")] public string? Message { get; set; }
    [JsonPropertyName("author")] public GitHubAuthor? Author { get; set; }
}
file class GitHubAuthor
{
    [JsonPropertyName("name")] public string? Name { get; set; }
    [JsonPropertyName("email")] public string? Email { get; set; }
    [JsonPropertyName("date")] public DateTime Date { get; set; }
}
