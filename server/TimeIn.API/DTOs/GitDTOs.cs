namespace TimeIn.API.DTOs;

public class GitCommitDto
{
    public int? CommitId { get; set; }
    public string Hash { get; set; } = string.Empty;
    public string ShortHash { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorEmail { get; set; }
    public DateTime Date { get; set; }
    public string? Branch { get; set; }
    public string Url { get; set; } = string.Empty;
    public int? LinkedUserId { get; set; }
    public string? LinkedUserName { get; set; }
    public int? LinkedTaskId { get; set; }
    public string? LinkedTaskName { get; set; }
    public int? LinkedTimeEntryId { get; set; }
    public string? MatchedTaskId { get; set; }
}

public class LinkCommitRequest
{
    public string CommitHash { get; set; } = string.Empty;
    public string CommitMessage { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? AuthorEmail { get; set; }
    public DateTime CommitDate { get; set; }
    public int? TimeEntryId { get; set; }
    public int? TaskId { get; set; }
}

public class GitGapDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public bool HasTimeEntry { get; set; }
    public bool HasCommit { get; set; }
    public int CommitCount { get; set; }
    public double LoggedHours { get; set; }
}
