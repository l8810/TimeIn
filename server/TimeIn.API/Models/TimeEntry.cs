namespace TimeIn.API.Models;

public enum TimeEntrySource { Manual, Timer, Git, ClickUp, Suggested }
public enum TimeEntryStatus { Draft, Submitted, Approved, Rejected }

public class TimeEntry
{
    public int TimeEntryId { get; set; }
    public int UserId { get; set; }
    public int ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? ManualTaskName { get; set; }
    public DateTime Date { get; set; }
    public TimeSpan? StartTime { get; set; }
    public TimeSpan? EndTime { get; set; }
    public int DurationMinutes { get; set; }
    public string? WorkType { get; set; }
    public string? Description { get; set; }
    public TimeEntrySource Source { get; set; } = TimeEntrySource.Manual;
    public TimeEntryStatus Status { get; set; } = TimeEntryStatus.Draft;
    public string? RejectionReason { get; set; }
    public string? RelatedCommitIds { get; set; }
    public string? RelatedClickUpTaskId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public Project Project { get; set; } = null!;
    public TaskItem? Task { get; set; }
}
