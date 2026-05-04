using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;

namespace TimeIn.API.Services;

public class TimeEntryService
{
    private readonly AppDbContext _db;
    private readonly ClickUpService _clickUp;
    private readonly ILogger<TimeEntryService> _logger;

    public TimeEntryService(AppDbContext db, ClickUpService clickUp, ILogger<TimeEntryService> logger)
    {
        _db = db;
        _clickUp = clickUp;
        _logger = logger;
    }

    public async Task<List<TimeEntryDto>> GetAllAsync(TimeEntryFilterRequest filter, int currentUserId, string currentRole)
    {
        var query = _db.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .Include(te => te.Task)
            .AsQueryable();

        var normalizedRole = currentRole?.Trim();

        if (string.Equals(normalizedRole, "Employee", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(te => te.UserId == currentUserId);
        }
        else if (string.Equals(normalizedRole, "Manager", StringComparison.OrdinalIgnoreCase))
        {
            var teamId = await _db.Users
                .Where(u => u.UserId == currentUserId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();

            if (teamId != null)
            {
                query = query.Where(te => te.User.TeamId == teamId);
            }
            else
            {
                query = query.Where(te => false);
            }

            if (filter.UserId.HasValue)
                query = query.Where(te => te.UserId == filter.UserId);
        }
        else if (filter.UserId.HasValue)
        {
            query = query.Where(te => te.UserId == filter.UserId);
        }

        if (filter.ProjectId.HasValue) query = query.Where(te => te.ProjectId == filter.ProjectId);
        if (filter.TaskId.HasValue) query = query.Where(te => te.TaskId == filter.TaskId);
        if (filter.FromDate.HasValue) query = query.Where(te => te.Date >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue) query = query.Where(te => te.Date <= filter.ToDate.Value.Date);
        if (filter.Status != null) query = query.Where(te => te.Status.ToString() == filter.Status);

        return await query.OrderByDescending(te => te.Date).ThenByDescending(te => te.CreatedAt)
            .Select(te => MapToDto(te)).ToListAsync();
    }

    public async Task<TimeEntryDto?> GetByIdAsync(int id)
    {
        var te = await _db.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .Include(te => te.Task)
            .FirstOrDefaultAsync(te => te.TimeEntryId == id);
        return te == null ? null : MapToDto(te);
    }

    public async Task<(TimeEntryDto? entry, string? error)> CreateAsync(CreateTimeEntryRequest req, int userId)
    {
        int duration = CalculateDuration(req.StartTime, req.EndTime, req.DurationMinutes);
        if (duration <= 0) return (null, "Duration must be positive.");

        var rules = await _db.ReportingRules.FirstOrDefaultAsync();
        if (rules != null)
        {
            var entryDate = req.Date.Date;
            var today = DateTime.Today;

            if (entryDate > today)
                return (null, "לא ניתן לדווח שעות לתאריך עתידי.");

            if ((today - entryDate).Days > rules.RetroactiveDaysAllowed)
                return (null, $"לא ניתן לדווח שעות ליותר מ-{rules.RetroactiveDaysAllowed} ימים אחורה.");

            if (rules.IsTaskMandatory && !req.TaskId.HasValue && string.IsNullOrWhiteSpace(req.ManualTaskName))
                return (null, "יש לבחור משימה — זהו שדה חובה לפי הגדרות המערכת.");

            var existingMinutes = await _db.TimeEntries
                .Where(te => te.UserId == userId && te.Date == entryDate && te.Status != TimeEntryStatus.Rejected)
                .SumAsync(te => te.DurationMinutes);

            if (existingMinutes + duration > rules.MaxHoursPerDay * 60)
                return (null, $"חריגה ממגבלת השעות היומית ({rules.MaxHoursPerDay} שעות). עד כה דווחו {existingMinutes / 60.0:F1} שעות ביום זה.");
        }

        if (await CheckOverlapAsync(userId, req.Date, req.StartTime, req.EndTime, null))
            return (null, "קיים דיווח אחר בטווח הזמן הזה. לא ניתן לשמור דיווחים חופפים.");

        var entry = new TimeEntry
        {
            UserId = userId,
            ProjectId = req.ProjectId,
            TaskId = req.TaskId,
            ManualTaskName = req.TaskId == null ? req.ManualTaskName : null,
            Date = req.Date.Date,
            StartTime = ParseTime(req.StartTime),
            EndTime = ParseTime(req.EndTime),
            DurationMinutes = duration,
            WorkType = req.WorkType,
            Description = req.Description,
            Source = Enum.Parse<TimeEntrySource>(req.Source, true),
            Status = Enum.Parse<TimeEntryStatus>(req.Status, true),
            RelatedCommitIds = req.RelatedCommitIds,
            RelatedClickUpTaskId = req.RelatedClickUpTaskId
        };

        _db.TimeEntries.Add(entry);
        await _db.SaveChangesAsync();

        var dto = await GetByIdAsync(entry.TimeEntryId);
        return (dto, null);
    }

    public async Task<(TimeEntryDto?, string?)> UpdateAsync(int id, UpdateTimeEntryRequest req, int userId, string role)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return (null, null);
        if (role == "Employee" && entry.UserId != userId) return (null, null);
        if (role == "Employee" && (entry.Status == TimeEntryStatus.Submitted || entry.Status == TimeEntryStatus.Approved))
            return (null, "לא ניתן לערוך דיווח שהוגש לאישור.");

        var checkDate = req.Date?.Date ?? entry.Date;
        var checkStart = req.StartTime ?? entry.StartTime?.ToString(@"hh\:mm");
        var checkEnd = req.EndTime ?? entry.EndTime?.ToString(@"hh\:mm");

        if (await CheckOverlapAsync(entry.UserId, checkDate, checkStart, checkEnd, id))
            return (null, "קיים דיווח אחר בטווח הזמן הזה. לא ניתן לשמור דיווחים חופפים.");

        if (req.ProjectId.HasValue) entry.ProjectId = req.ProjectId.Value;
        entry.TaskId = req.TaskId;
        entry.ManualTaskName = req.TaskId == null ? req.ManualTaskName : null;
        if (req.Date.HasValue) entry.Date = req.Date.Value.Date;
        if (req.StartTime != null) entry.StartTime = ParseTime(req.StartTime);
        if (req.EndTime != null) entry.EndTime = ParseTime(req.EndTime);
        if (req.DurationMinutes.HasValue) entry.DurationMinutes = req.DurationMinutes.Value;
        if (req.WorkType != null) entry.WorkType = req.WorkType;
        if (req.Description != null) entry.Description = req.Description;
        if (req.Status != null) entry.Status = Enum.Parse<TimeEntryStatus>(req.Status, true);
        if (req.RelatedCommitIds != null) entry.RelatedCommitIds = req.RelatedCommitIds;
        if (req.RelatedClickUpTaskId != null) entry.RelatedClickUpTaskId = req.RelatedClickUpTaskId;

        entry.UpdatedAt = DateTime.UtcNow;

        if (entry.StartTime.HasValue && entry.EndTime.HasValue)
            entry.DurationMinutes = (int)(entry.EndTime.Value - entry.StartTime.Value).TotalMinutes;

        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id), null);
    }

    public async Task<bool> DeleteAsync(int id, int userId, string role)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return false;
        if (role == "Employee" && entry.UserId != userId) return false;
        if (role == "Employee" && entry.Status == TimeEntryStatus.Submitted) return false;
        if (role == "Employee" && entry.Status == TimeEntryStatus.Approved) return false;

        _db.TimeEntries.Remove(entry);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<(TimeEntryDto?, string?)> SubmitAsync(int id, int userId, string role)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return (null, null);
        if (role == "Employee" && entry.UserId != userId) return (null, null);
        if (entry.Status != TimeEntryStatus.Draft && entry.Status != TimeEntryStatus.Rejected)
            return (null, "ניתן לשלוח לאישור רק טיוטות.");
        entry.Status = TimeEntryStatus.Submitted;
        entry.RejectionReason = null;
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id), null);
    }

    public async Task<(TimeEntryDto?, string?)> ApproveAsync(int id, int managerId, string role)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return (null, null);
        if (role == "Manager")
        {
            var teamId = await _db.Users.Where(u => u.UserId == managerId).Select(u => u.TeamId).FirstOrDefaultAsync();
            var entryTeam = await _db.Users.Where(u => u.UserId == entry.UserId).Select(u => u.TeamId).FirstOrDefaultAsync();
            if (teamId != null && entryTeam != teamId) return (null, null);
        }
        if (entry.Status != TimeEntryStatus.Submitted) return (null, "ניתן לאשר רק דיווחים שהוגשו.");
        entry.Status = TimeEntryStatus.Approved;
        entry.RejectionReason = null;
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();

        // Push time to ClickUp (non-blocking — approval succeeds even if ClickUp is down)
        try
        {
            var clickUpTaskId = entry.RelatedClickUpTaskId;
            if (string.IsNullOrEmpty(clickUpTaskId) && entry.TaskId.HasValue)
            {
                var task = await _db.Tasks.FindAsync(entry.TaskId.Value);
                clickUpTaskId = task?.ClickUpTaskId;
            }
            if (!string.IsNullOrEmpty(clickUpTaskId))
                await _clickUp.LogTimeAsync(clickUpTaskId, entry.Date, entry.StartTime, entry.DurationMinutes, entry.Description);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ClickUp sync failed for approved entry {EntryId}", entry.TimeEntryId);
        }

        return (await GetByIdAsync(id), null);
    }

    public async Task<(TimeEntryDto?, string?)> RejectAsync(int id, int managerId, string role, string? reason)
    {
        var entry = await _db.TimeEntries.FindAsync(id);
        if (entry == null) return (null, null);
        if (role == "Manager")
        {
            var teamId = await _db.Users.Where(u => u.UserId == managerId).Select(u => u.TeamId).FirstOrDefaultAsync();
            var entryTeam = await _db.Users.Where(u => u.UserId == entry.UserId).Select(u => u.TeamId).FirstOrDefaultAsync();
            if (teamId != null && entryTeam != teamId) return (null, null);
        }
        if (entry.Status != TimeEntryStatus.Submitted) return (null, "ניתן לדחות רק דיווחים שהוגשו.");
        entry.Status = TimeEntryStatus.Rejected;
        entry.RejectionReason = reason;
        entry.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(id), null);
    }

    public async Task<ActiveTimerDto?> GetActiveTimerAsync(int userId)
    {
        var timer = await _db.ActiveTimers
            .Include(t => t.Project)
            .Include(t => t.Task)
            .FirstOrDefaultAsync(t => t.UserId == userId);

        if (timer == null) return null;

        int current = timer.AccumulatedMinutes;
        if (!timer.IsPaused)
            current += (int)(DateTime.UtcNow - timer.StartedAt).TotalMinutes - timer.AccumulatedMinutes;

        return new ActiveTimerDto
        {
            ActiveTimerId = timer.ActiveTimerId,
            ProjectId = timer.ProjectId,
            ProjectName = timer.Project.ProjectName,
            TaskId = timer.TaskId,
            TaskName = timer.Task?.TaskName,
            StartedAt = timer.StartedAt,
            AccumulatedMinutes = timer.AccumulatedMinutes,
            IsPaused = timer.IsPaused,
            Description = timer.Description,
            CurrentDurationMinutes = (int)(DateTime.UtcNow - timer.StartedAt).TotalMinutes + timer.AccumulatedMinutes
        };
    }

    public async Task<ActiveTimerDto> StartTimerAsync(TimerStartRequest req, int userId)
    {
        var existing = await _db.ActiveTimers.FirstOrDefaultAsync(t => t.UserId == userId);
        if (existing != null) _db.ActiveTimers.Remove(existing);

        var timer = new ActiveTimer
        {
            UserId = userId,
            ProjectId = req.ProjectId,
            TaskId = req.TaskId,
            StartedAt = DateTime.UtcNow,
            Description = req.Description
        };
        _db.ActiveTimers.Add(timer);
        await _db.SaveChangesAsync();
        return (await GetActiveTimerAsync(userId))!;
    }

    public async Task<ActiveTimerDto?> PauseTimerAsync(int userId)
    {
        var timer = await _db.ActiveTimers.FirstOrDefaultAsync(t => t.UserId == userId);
        if (timer == null || timer.IsPaused) return null;

        timer.AccumulatedMinutes += (int)(DateTime.UtcNow - timer.StartedAt).TotalMinutes;
        timer.IsPaused = true;
        timer.PausedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return await GetActiveTimerAsync(userId);
    }

    public async Task<ActiveTimerDto?> ResumeTimerAsync(int userId)
    {
        var timer = await _db.ActiveTimers.FirstOrDefaultAsync(t => t.UserId == userId);
        if (timer == null || !timer.IsPaused) return null;

        timer.StartedAt = DateTime.UtcNow;
        timer.IsPaused = false;
        timer.PausedAt = null;
        await _db.SaveChangesAsync();
        return await GetActiveTimerAsync(userId);
    }

    public async Task<TimeEntryDto?> StopTimerAsync(int userId, string? description)
    {
        var timer = await _db.ActiveTimers.FirstOrDefaultAsync(t => t.UserId == userId);
        if (timer == null) return null;

        int duration = timer.AccumulatedMinutes;
        if (!timer.IsPaused) duration += (int)(DateTime.UtcNow - timer.StartedAt).TotalMinutes;

        var entry = new TimeEntry
        {
            UserId = userId,
            ProjectId = timer.ProjectId,
            TaskId = timer.TaskId,
            Date = DateTime.UtcNow.Date,
            DurationMinutes = duration,
            Description = description ?? timer.Description,
            Source = TimeEntrySource.Timer,
            Status = TimeEntryStatus.Draft
        };
        _db.TimeEntries.Add(entry);
        _db.ActiveTimers.Remove(timer);
        await _db.SaveChangesAsync();

        return await GetByIdAsync(entry.TimeEntryId);
    }

    private async Task<bool> CheckOverlapAsync(int userId, DateTime date, string? start, string? end, int? excludeId)
    {
        if (start == null || end == null) return false;
        var s = ParseTime(start);
        var e = ParseTime(end);
        if (!s.HasValue || !e.HasValue) return false;

        return await _db.TimeEntries.AnyAsync(te =>
            te.UserId == userId &&
            te.Date == date.Date &&
            te.StartTime.HasValue && te.EndTime.HasValue &&
            te.StartTime < e && te.EndTime > s &&
            (excludeId == null || te.TimeEntryId != excludeId));
    }

    private static int CalculateDuration(string? start, string? end, int? duration)
    {
        if (duration.HasValue && duration.Value > 0) return duration.Value;
        var s = ParseTime(start);
        var e = ParseTime(end);
        if (s.HasValue && e.HasValue) return (int)(e.Value - s.Value).TotalMinutes;
        return 0;
    }

    private static TimeSpan? ParseTime(string? timeStr)
    {
        if (string.IsNullOrEmpty(timeStr)) return null;
        if (TimeSpan.TryParse(timeStr, out var ts)) return ts;
        return null;
    }

    private static TimeEntryDto MapToDto(TimeEntry te) => new()
    {
        TimeEntryId = te.TimeEntryId,
        UserId = te.UserId,
        UserName = te.User?.FullName ?? string.Empty,
        ProjectId = te.ProjectId,
        ProjectName = te.Project?.ProjectName ?? string.Empty,
        TaskId = te.TaskId,
        TaskName = te.Task?.TaskName,
        ManualTaskName = te.ManualTaskName,
        Date = te.Date,
        StartTime = te.StartTime?.ToString(@"hh\:mm"),
        EndTime = te.EndTime?.ToString(@"hh\:mm"),
        DurationMinutes = te.DurationMinutes,
        WorkType = te.WorkType,
        Description = te.Description,
        Source = te.Source.ToString(),
        Status = te.Status.ToString(),
        RejectionReason = te.RejectionReason,
        RelatedCommitIds = te.RelatedCommitIds,
        RelatedClickUpTaskId = te.RelatedClickUpTaskId,
        CreatedAt = te.CreatedAt,
        UpdatedAt = te.UpdatedAt
    };
}
