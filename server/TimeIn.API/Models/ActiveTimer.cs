namespace TimeIn.API.Models;

public class ActiveTimer
{
    public int ActiveTimerId { get; set; }
    public int UserId { get; set; }
    public int ProjectId { get; set; }
    public int? TaskId { get; set; }
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public int AccumulatedMinutes { get; set; } = 0;
    public bool IsPaused { get; set; } = false;
    public DateTime? PausedAt { get; set; }
    public string? Description { get; set; }

    public User User { get; set; } = null!;
    public Project Project { get; set; } = null!;
    public TaskItem? Task { get; set; }
}
