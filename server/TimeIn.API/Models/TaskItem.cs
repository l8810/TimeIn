namespace TimeIn.API.Models;

public enum TaskStatus { Todo, InProgress, Done, Cancelled }
public enum TaskPriority { Low, Medium, High, Urgent }

public class TaskItem
{
    public int TaskId { get; set; }
    public string TaskName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public int? AssignedUserId { get; set; }
    public TaskStatus Status { get; set; } = TaskStatus.Todo;
    public TaskPriority Priority { get; set; } = TaskPriority.Medium;
    public string? ClickUpTaskId { get; set; }
    public decimal? EstimatedHours { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? AssignedTeamId { get; set; }

    public Project? Project { get; set; }
    public User? AssignedUser { get; set; }
    public Team? AssignedTeam { get; set; }
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
}
