namespace TimeIn.API.Models;

public enum ProjectStatus { Active, Paused, Completed, Archived }

public class Project
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Active;
    public int ManagerId { get; set; }
    public int? TeamId { get; set; }
    public string? ExternalClickUpListId { get; set; }
    public string? GitRepositoryUrl { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Manager { get; set; } = null!;
    public Team? Team { get; set; }
    public ICollection<TaskItem> Tasks { get; set; } = new List<TaskItem>();
    public ICollection<TimeEntry> TimeEntries { get; set; } = new List<TimeEntry>();
    public ICollection<ProjectMember> Members { get; set; } = new List<ProjectMember>();
}
