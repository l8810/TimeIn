using System.ComponentModel.DataAnnotations;

namespace TimeIn.API.DTOs;

public class ProjectDto
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Status { get; set; } = string.Empty;
    public int ManagerId { get; set; }
    public string ManagerName { get; set; } = string.Empty;
    public int? TeamId { get; set; }
    public string? TeamName { get; set; }
    public string? ExternalClickUpListId { get; set; }
    public string? GitRepositoryUrl { get; set; }
    public DateTime CreatedAt { get; set; }
    public int TotalTasks { get; set; }
    public double TotalHours { get; set; }
    public int MemberCount { get; set; }
    public bool IsCurrentUserMember { get; set; }
}

public class ProjectMemberDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
}

public class AddMemberRequest
{
    public int UserId { get; set; }
}

public class CreateProjectRequest
{
    [Required] public string ProjectName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int? ManagerId { get; set; }
    public int? TeamId { get; set; }
    public string? ExternalClickUpListId { get; set; }
    public string? GitRepositoryUrl { get; set; }
}

public class UpdateProjectRequest
{
    public string? ProjectName { get; set; }
    public string? Description { get; set; }
    public string? Status { get; set; }
    public int? ManagerId { get; set; }
    public int? TeamId { get; set; }
    public string? ExternalClickUpListId { get; set; }
    public string? GitRepositoryUrl { get; set; }
}
