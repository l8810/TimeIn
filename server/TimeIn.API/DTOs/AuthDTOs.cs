using System.ComponentModel.DataAnnotations;

namespace TimeIn.API.DTOs;

public class LoginRequest
{
    [Required, EmailAddress]
    public string Email { get; set; } = string.Empty;
    [Required]
    public string Password { get; set; } = string.Empty;
}

public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public UserDto User { get; set; } = null!;
}

public class UserDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public int? TeamId { get; set; }
    public string? TeamName { get; set; }
    public bool IsActive { get; set; }
}

public class CreateUserRequest
{
    [Required] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, MinLength(6)] public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = "Employee";
    public int? TeamId { get; set; }
}

public class UpdateUserRequest
{
    public string? FullName { get; set; }
    public int? TeamId { get; set; }
    public string? Role { get; set; }
    public bool? IsActive { get; set; }
}

public class TeamDto
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int? LeaderId { get; set; }
    public string? LeaderName { get; set; }
    public int MemberCount { get; set; }
}

public class CreateTeamRequest
{
    [Required, MinLength(2)] public string TeamName { get; set; } = string.Empty;
    public int? LeaderId { get; set; }
    public NewLeaderRequest? NewLeader { get; set; }
}

public class NewLeaderRequest
{
    [Required] public string FullName { get; set; } = string.Empty;
    [Required, EmailAddress] public string Email { get; set; } = string.Empty;
    [Required, MinLength(6)] public string Password { get; set; } = string.Empty;
}
