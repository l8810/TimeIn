using System.ComponentModel.DataAnnotations;

namespace TimeIn.API.DTOs;

public class TaskDto
{
    public int TaskId { get; set; }
    public string TaskName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public string? ProjectName { get; set; }
    public int? AssignedUserId { get; set; }
    public string? AssignedUserName { get; set; }
    public int? AssignedTeamId { get; set; }
    public string? AssignedTeamName { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string? ClickUpTaskId { get; set; }
    public decimal? EstimatedHours { get; set; }
    public double LoggedHours { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class CreateTaskRequest
{
    [Required] public string TaskName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public int? AssignedUserId { get; set; }
    public int? AssignedTeamId { get; set; }
    public string Priority { get; set; } = "Medium";
    public string? ClickUpTaskId { get; set; }
    public decimal? EstimatedHours { get; set; }
}

public class UpdateTaskRequest
{
    public string? TaskName { get; set; }
    public string? Description { get; set; }
    public int? ProjectId { get; set; }
    public bool ClearProject { get; set; }
    public int? AssignedUserId { get; set; }
    public int? AssignedTeamId { get; set; }
    public bool ClearAssignedTeam { get; set; }
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? ClickUpTaskId { get; set; }
    public bool ClearClickUpTaskId { get; set; }
    public decimal? EstimatedHours { get; set; }
}
