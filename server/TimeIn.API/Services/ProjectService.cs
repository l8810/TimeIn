using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;

namespace TimeIn.API.Services;

public class ProjectService
{
    private readonly AppDbContext _db;

    public ProjectService(AppDbContext db) => _db = db;

    public async Task<List<ProjectDto>> GetAllAsync(int userId, string role)
    {
        var query = _db.Projects
            .Include(p => p.Manager)
            .Include(p => p.Team)
            .Include(p => p.Tasks)
            .Include(p => p.Members)
            .AsQueryable();

        if (role == "Employee" || role == "Manager")
        {
            var teamId = await _db.Users
                .Where(u => u.UserId == userId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();
            query = teamId != null
                ? query.Where(p => p.TeamId == teamId)
                : query.Where(p => p.Members.Any(m => m.UserId == userId));
        }

        var approvedMinutesByProject = await _db.TimeEntries
            .Where(te => te.Status == TimeEntryStatus.Approved)
            .GroupBy(te => te.ProjectId)
            .ToDictionaryAsync(g => g.Key, g => g.Sum(te => te.DurationMinutes));

        return await query.Select(p => new ProjectDto
        {
            ProjectId = p.ProjectId,
            ProjectName = p.ProjectName,
            Description = p.Description,
            Status = p.Status.ToString(),
            ManagerId = p.ManagerId,
            ManagerName = p.Manager.FullName,
            TeamId = p.TeamId,
            TeamName = p.Team != null ? p.Team.TeamName : null,
            ExternalClickUpListId = p.ExternalClickUpListId,
            GitRepositoryUrl = p.GitRepositoryUrl,
            CreatedAt = p.CreatedAt,
            TotalTasks = p.Tasks.Count,
            TotalHours = Math.Round(approvedMinutesByProject.GetValueOrDefault(p.ProjectId) / 60.0, 2),
            MemberCount = p.Members.Count,
            IsCurrentUserMember = p.Members.Any(m => m.UserId == userId)
        }).ToListAsync();
    }

    public async Task<ProjectDto?> GetByIdAsync(int id)
    {
        var p = await _db.Projects
            .Include(p => p.Manager)
            .Include(p => p.Team)
            .Include(p => p.Tasks)
            .Include(p => p.Members)
            .FirstOrDefaultAsync(p => p.ProjectId == id);

        if (p == null) return null;

        var approvedMinutes = await _db.TimeEntries
            .Where(te => te.ProjectId == id && te.Status == TimeEntryStatus.Approved)
            .SumAsync(te => (int?)te.DurationMinutes) ?? 0;

        return new ProjectDto
        {
            ProjectId = p.ProjectId,
            ProjectName = p.ProjectName,
            Description = p.Description,
            Status = p.Status.ToString(),
            ManagerId = p.ManagerId,
            ManagerName = p.Manager.FullName,
            TeamId = p.TeamId,
            TeamName = p.Team?.TeamName,
            ExternalClickUpListId = p.ExternalClickUpListId,
            GitRepositoryUrl = p.GitRepositoryUrl,
            CreatedAt = p.CreatedAt,
            TotalTasks = p.Tasks.Count,
            TotalHours = Math.Round(approvedMinutes / 60.0, 2),
            MemberCount = p.Members.Count
        };
    }

    public async Task<ProjectDto> CreateAsync(CreateProjectRequest req, int callerUserId, string callerRole)
    {
        int managerId = callerUserId;
        int? teamId = req.TeamId;

        if (callerRole == "Manager")
        {
            managerId = callerUserId;
            teamId = await _db.Users
                .Where(u => u.UserId == callerUserId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();
        }
        else if (callerRole == "Admin")
        {
            if (teamId.HasValue)
            {
                if (req.ManagerId.HasValue)
                {
                    var selectedManager = await _db.Users
                        .Where(u => u.UserId == req.ManagerId.Value && u.Role == UserRole.Manager)
                        .FirstOrDefaultAsync();

                    if (selectedManager?.TeamId == teamId)
                    {
                        managerId = req.ManagerId.Value;
                    }
                    else
                    {
                        var teamManagerId = await _db.Users
                            .Where(u => u.TeamId == teamId && u.Role == UserRole.Manager)
                            .OrderBy(u => u.FullName)
                            .Select(u => (int?)u.UserId)
                            .FirstOrDefaultAsync();

                        if (teamManagerId.HasValue)
                        {
                            managerId = teamManagerId.Value;
                        }
                    }
                }
                else
                {
                    var teamManagerId = await _db.Users
                        .Where(u => u.TeamId == teamId && u.Role == UserRole.Manager)
                        .OrderBy(u => u.FullName)
                        .Select(u => (int?)u.UserId)
                        .FirstOrDefaultAsync();

                    if (teamManagerId.HasValue)
                    {
                        managerId = teamManagerId.Value;
                    }
                }
            }
        }

        if (callerRole != "Admin" && req.ManagerId.HasValue)
        {
            managerId = callerUserId;
        }

        var project = new Project
        {
            ProjectName = req.ProjectName,
            Description = req.Description,
            ManagerId = managerId,
            TeamId = teamId,
            ExternalClickUpListId = req.ExternalClickUpListId,
            GitRepositoryUrl = req.GitRepositoryUrl
        };
        _db.Projects.Add(project);
        await _db.SaveChangesAsync();

        _db.ProjectMembers.Add(new ProjectMember { ProjectId = project.ProjectId, UserId = managerId });
        await _db.SaveChangesAsync();

        return (await GetByIdAsync(project.ProjectId))!;
    }

    public async Task<ProjectDto?> UpdateAsync(int id, UpdateProjectRequest req)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return null;

        if (req.ProjectName != null) project.ProjectName = req.ProjectName;
        if (req.Description != null) project.Description = req.Description;
        if (req.Status != null) project.Status = Enum.Parse<ProjectStatus>(req.Status, true);
        if (req.ManagerId.HasValue) project.ManagerId = req.ManagerId.Value;
        if (req.TeamId.HasValue) project.TeamId = req.TeamId.Value == 0 ? null : req.TeamId;
        if (req.ExternalClickUpListId != null) project.ExternalClickUpListId = req.ExternalClickUpListId;
        if (req.GitRepositoryUrl != null) project.GitRepositoryUrl = req.GitRepositoryUrl;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return false;
        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<ProjectMemberDto>> GetMembersAsync(int projectId)
    {
        return await _db.ProjectMembers
            .Where(pm => pm.ProjectId == projectId)
            .Include(pm => pm.User)
            .Select(pm => new ProjectMemberDto
            {
                UserId = pm.UserId,
                FullName = pm.User.FullName,
                Role = pm.User.Role.ToString(),
                JoinedAt = pm.JoinedAt
            }).ToListAsync();
    }

    public async Task<bool> AddMemberAsync(int projectId, int userId)
    {
        if (await _db.ProjectMembers.AnyAsync(pm => pm.ProjectId == projectId && pm.UserId == userId))
            return false;
        _db.ProjectMembers.Add(new ProjectMember { ProjectId = projectId, UserId = userId });
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<bool> RemoveMemberAsync(int projectId, int userId)
    {
        var member = await _db.ProjectMembers
            .FirstOrDefaultAsync(pm => pm.ProjectId == projectId && pm.UserId == userId);
        if (member == null) return false;
        _db.ProjectMembers.Remove(member);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<List<TaskDto>> GetProjectTasksAsync(int projectId, int userId, string role)
    {
        var query = _db.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedUser)
            .Where(t => t.ProjectId == projectId);

        var approvedMinutesByTask = await _db.TimeEntries
            .Where(te => te.ProjectId == projectId && te.Status == TimeEntryStatus.Approved && te.TaskId.HasValue)
            .GroupBy(te => te.TaskId!.Value)
            .ToDictionaryAsync(g => g.Key, g => g.Sum(te => te.DurationMinutes));

        return await query.Select(t => new TaskDto
        {
            TaskId = t.TaskId,
            TaskName = t.TaskName,
            Description = t.Description,
            ProjectId = t.ProjectId,
            ProjectName = t.Project.ProjectName,
            AssignedUserId = t.AssignedUserId,
            AssignedUserName = t.AssignedUser != null ? t.AssignedUser.FullName : null,
            Status = t.Status.ToString(),
            Priority = t.Priority.ToString(),
            ClickUpTaskId = t.ClickUpTaskId,
            EstimatedHours = t.EstimatedHours,
            LoggedHours = Math.Round(approvedMinutesByTask.GetValueOrDefault(t.TaskId) / 60.0, 2),
            CreatedAt = t.CreatedAt
        }).ToListAsync();
    }
}
