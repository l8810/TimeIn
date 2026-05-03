namespace TimeIn.API.Models;

public class GitCommit
{
    public int CommitId { get; set; }
    public string Repository { get; set; } = string.Empty;
    public string Branch { get; set; } = string.Empty;
    public string CommitHash { get; set; } = string.Empty;
    public string CommitMessage { get; set; } = string.Empty;
    public string CommitAuthor { get; set; } = string.Empty;
    public string? AuthorEmail { get; set; }
    public DateTime CommitDate { get; set; }
    public int? LinkedUserId { get; set; }
    public int? LinkedTaskId { get; set; }
    public int? LinkedTimeEntryId { get; set; }

    public User? LinkedUser { get; set; }
    public TaskItem? LinkedTask { get; set; }
    public TimeEntry? LinkedTimeEntry { get; set; }
}
