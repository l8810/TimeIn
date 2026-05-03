using System.ComponentModel.DataAnnotations;

namespace TimeIn.API.DTOs;

public class TimeEntryDto
{
    public int TimeEntryId { get; set; }
    public int UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public int? TaskId { get; set; }
    public string? TaskName { get; set; }
    public string? ManualTaskName { get; set; }
    public DateTime Date { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public int DurationMinutes { get; set; }
    public double DurationHours => Math.Round(DurationMinutes / 60.0, 2);
    public string? WorkType { get; set; }
    public string? Description { get; set; }
    public string Source { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? RejectionReason { get; set; }
    public string? RelatedCommitIds { get; set; }
    public string? RelatedClickUpTaskId { get; set; }
    public string? ClickUpUrl => RelatedClickUpTaskId != null ? $"https://app.clickup.com/t/{RelatedClickUpTaskId}" : null;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class RejectRequest
{
    public string? Reason { get; set; }
}

public class CreateTimeEntryRequest
{
    [Required] public int ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? ManualTaskName { get; set; }
    [Required] public DateTime Date { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? WorkType { get; set; }
    public string? Description { get; set; }
    public string Source { get; set; } = "Manual";
    public string Status { get; set; } = "Draft";
    public string? RelatedCommitIds { get; set; }
    public string? RelatedClickUpTaskId { get; set; }
}

public class UpdateTimeEntryRequest
{
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? ManualTaskName { get; set; }
    public DateTime? Date { get; set; }
    public string? StartTime { get; set; }
    public string? EndTime { get; set; }
    public int? DurationMinutes { get; set; }
    public string? WorkType { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public string? RelatedCommitIds { get; set; }
    public string? RelatedClickUpTaskId { get; set; }
}

public class TimeEntryFilterRequest
{
    public int? UserId { get; set; }
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
    public string? Status { get; set; }
}

public class TimerStartRequest
{
    [Required] public int ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? Description { get; set; }
}

public class StopTimerRequest
{
    public string? Description { get; set; }
}

public class ActiveTimerDto
{
    public int ActiveTimerId { get; set; }
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public int? TaskId { get; set; }
    public string? TaskName { get; set; }
    public DateTime StartedAt { get; set; }
    public int AccumulatedMinutes { get; set; }
    public bool IsPaused { get; set; }
    public string? Description { get; set; }
    public int CurrentDurationMinutes { get; set; }
}
