using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;

namespace TimeIn.API.Services;

public class UserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db) => _db = db;

    public async Task<List<UserDto>> GetAllAsync(int callerUserId, string callerRole)
    {
        var query = _db.Users.Include(u => u.Team).AsQueryable();

        if (callerRole == "Manager")
        {
            var callerTeamId = await _db.Users
                .Where(u => u.UserId == callerUserId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();

            query = callerTeamId != null
                ? query.Where(u => u.TeamId == callerTeamId)
                : query.Where(u => false);
        }

        return await query.Select(u => new UserDto
        {
            UserId = u.UserId,
            FullName = u.FullName,
            Email = u.Email,
            Role = u.Role.ToString(),
            TeamId = u.TeamId,
            TeamName = u.Team != null ? u.Team.TeamName : null,
            IsActive = u.IsActive
        }).ToListAsync();
    }

    public async Task<UserDto?> GetByIdAsync(int id)
    {
        var u = await _db.Users.Include(u => u.Team).FirstOrDefaultAsync(u => u.UserId == id);
        return u == null ? null : AuthService.MapToDto(u);
    }

    public async Task<(UserDto? user, string? error)> CreateAsync(CreateUserRequest req, int callerUserId, string callerRole)
    {
        if (await _db.Users.AnyAsync(u => u.Email.ToLower() == req.Email.ToLower()))
            return (null, "האימייל כבר קיים במערכת. לא ניתן לרשום שני משתמשים עם אותו אימייל.");

        if (callerRole == "Admin" && !req.TeamId.HasValue)
            return (null, "יש לשייך את העובד לצוות.");

        if (callerRole == "Manager")
        {
            req.Role = "Employee";
            req.TeamId = await _db.Users
                .Where(u => u.UserId == callerUserId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();
        }

        var user = new User
        {
            FullName = req.FullName,
            Email = req.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = Enum.Parse<UserRole>(req.Role, true),
            TeamId = req.TeamId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Team).LoadAsync();
        return (AuthService.MapToDto(user), null);
    }

    public async Task<(UserDto? user, string? error)> UpdateAsync(int id, UpdateUserRequest req, int callerId, string callerRole)
    {
        var user = await _db.Users.Include(u => u.Team).FirstOrDefaultAsync(u => u.UserId == id);
        if (user == null) return (null, "not found");

        if (callerRole == "Manager")
        {
            var callerTeamId = await _db.Users
                .Where(u => u.UserId == callerId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();

            if (user.TeamId != callerTeamId || user.Role != UserRole.Employee)
                return (null, "forbidden");

            // Manager can update name and active status of their employees
            if (req.FullName != null) user.FullName = req.FullName;
            if (req.IsActive.HasValue) user.IsActive = req.IsActive.Value;
        }
        else
        {
            if (req.FullName != null) user.FullName = req.FullName;
            if (req.TeamId.HasValue) user.TeamId = req.TeamId.Value == 0 ? null : req.TeamId;
            if (req.Role != null) user.Role = Enum.Parse<UserRole>(req.Role, true);
            if (req.IsActive.HasValue) user.IsActive = req.IsActive.Value;
        }

        await _db.SaveChangesAsync();
        await _db.Entry(user).Reference(u => u.Team).LoadAsync();
        return (AuthService.MapToDto(user), null);
    }

    public async Task<bool?> DeactivateAsync(int id, int callerUserId, string callerRole)
    {
        var user = await _db.Users.FindAsync(id);
        if (user == null) return false;

        if (callerRole == "Manager")
        {
            var callerTeamId = await _db.Users
                .Where(u => u.UserId == callerUserId)
                .Select(u => u.TeamId)
                .FirstOrDefaultAsync();

            if (user.TeamId != callerTeamId || user.Role != UserRole.Employee)
                return null;
        }

        user.IsActive = false;
        await _db.SaveChangesAsync();
        return true;
    }
}
