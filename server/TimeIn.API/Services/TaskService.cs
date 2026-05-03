using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;
using TaskStatus = TimeIn.API.Models.TaskStatus;

namespace TimeIn.API.Services;

public class TaskService
{
    private readonly AppDbContext _db;

    public TaskService(AppDbContext db) => _db = db;

    public async Task<List<TaskDto>> GetAllAsync(int? projectId, int? assignedUserId, int callerUserId, string callerRole)
    {
        var query = _db.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedUser)
            .Include(t => t.AssignedTeam)
            .Include(t => t.TimeEntries)
            .AsQueryable();

        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId);
        if (assignedUserId.HasValue) query = query.Where(t => t.AssignedUserId == assignedUserId);

        if (callerRole == "Employee" || callerRole == "Manager")
        {
            var teamId = await _db.Users
                .Where(u => u.UserId == callerUserId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();
            query = teamId != null
                ? query.Where(t => t.ProjectId == null || t.Project!.TeamId == teamId)
                : query.Where(t => false);
        }

        return await query.Select(t => new TaskDto
        {
            TaskId = t.TaskId,
            TaskName = t.TaskName,
            Description = t.Description,
            ProjectId = t.ProjectId,
            ProjectName = t.Project != null ? t.Project.ProjectName : null,
            AssignedUserId = t.AssignedUserId,
            AssignedUserName = t.AssignedUser != null ? t.AssignedUser.FullName : null,
            AssignedTeamId = t.AssignedTeamId,
            AssignedTeamName = t.AssignedTeam != null ? t.AssignedTeam.TeamName : null,
            Status = t.Status.ToString(),
            Priority = t.Priority.ToString(),
            ClickUpTaskId = t.ClickUpTaskId,
            EstimatedHours = t.EstimatedHours,
            LoggedHours = Math.Round(t.TimeEntries.Sum(te => te.DurationMinutes) / 60.0, 2),
            CreatedAt = t.CreatedAt
        }).ToListAsync();
    }

    public async Task<TaskDto?> GetByIdAsync(int id)
    {
        var t = await _db.Tasks
            .Include(t => t.Project)
            .Include(t => t.AssignedUser)
            .Include(t => t.AssignedTeam)
            .Include(t => t.TimeEntries)
            .FirstOrDefaultAsync(t => t.TaskId == id);

        if (t == null) return null;

        return new TaskDto
        {
            TaskId = t.TaskId,
            TaskName = t.TaskName,
            Description = t.Description,
            ProjectId = t.ProjectId,
            ProjectName = t.Project?.ProjectName,
            AssignedUserId = t.AssignedUserId,
            AssignedUserName = t.AssignedUser?.FullName,
            AssignedTeamId = t.AssignedTeamId,
            AssignedTeamName = t.AssignedTeam?.TeamName,
            Status = t.Status.ToString(),
            Priority = t.Priority.ToString(),
            ClickUpTaskId = t.ClickUpTaskId,
            EstimatedHours = t.EstimatedHours,
            LoggedHours = Math.Round(t.TimeEntries.Sum(te => te.DurationMinutes) / 60.0, 2),
            CreatedAt = t.CreatedAt
        };
    }

    public async Task<TaskDto> CreateAsync(CreateTaskRequest req)
    {
        var task = new TaskItem
        {
            TaskName = req.TaskName,
            Description = req.Description,
            ProjectId = req.ProjectId,
            AssignedUserId = req.AssignedUserId,
            AssignedTeamId = req.AssignedTeamId,
            Priority = Enum.Parse<TaskPriority>(req.Priority, true),
            ClickUpTaskId = req.ClickUpTaskId,
            EstimatedHours = req.EstimatedHours
        };
        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();
        return (await GetByIdAsync(task.TaskId))!;
    }

    public async Task<TaskDto?> UpdateAsync(int id, UpdateTaskRequest req)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return null;

        if (req.TaskName != null) task.TaskName = req.TaskName;
        if (req.Description != null) task.Description = req.Description;
        if (req.ClearProject) task.ProjectId = null;
        else if (req.ProjectId.HasValue) task.ProjectId = req.ProjectId;
        if (req.AssignedUserId.HasValue) task.AssignedUserId = req.AssignedUserId;
        if (req.ClearAssignedTeam) task.AssignedTeamId = null;
        else if (req.AssignedTeamId.HasValue) task.AssignedTeamId = req.AssignedTeamId;
        if (req.Status != null) task.Status = Enum.Parse<TaskStatus>(req.Status, true);
        if (req.Priority != null) task.Priority = Enum.Parse<TaskPriority>(req.Priority, true);
        if (req.ClearClickUpTaskId) task.ClickUpTaskId = null;
        else if (req.ClickUpTaskId != null) task.ClickUpTaskId = req.ClickUpTaskId;
        if (req.EstimatedHours.HasValue) task.EstimatedHours = req.EstimatedHours;

        await _db.SaveChangesAsync();
        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task == null) return false;
        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();
        return true;
    }

    public async Task<TaskDto?> TakeTaskAsync(int taskId, int userId)
    {
        var task = await _db.Tasks.FindAsync(taskId);
        if (task == null || task.AssignedUserId != null) return null;
        task.AssignedUserId = userId;
        await _db.SaveChangesAsync();
        return await GetByIdAsync(taskId);
    }
}
