using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;

namespace TimeIn.API.Services;

public class TeamService
{
    private readonly AppDbContext _db;

    public TeamService(AppDbContext db) => _db = db;

    public async Task<List<TeamDto>> GetAllAsync()
    {
        return await _db.Teams
            .Include(t => t.Leader)
            .Select(t => new TeamDto
            {
                TeamId = t.TeamId,
                TeamName = t.TeamName,
                LeaderId = t.LeaderId,
                LeaderName = t.Leader != null ? t.Leader.FullName : null,
                MemberCount = t.Users.Count(u => u.IsActive)
            }).ToListAsync();
    }

    public async Task<(TeamDto? team, string? error)> CreateAsync(CreateTeamRequest req)
    {
        if (!req.LeaderId.HasValue && req.NewLeader == null)
            return (null, "יש לבחור ראש צוות או ליצור עובד חדש.");

        var team = new Team { TeamName = req.TeamName, CreatedAt = DateTime.UtcNow };
        _db.Teams.Add(team);
        await _db.SaveChangesAsync();

        User? leader = null;

        if (req.NewLeader != null)
        {
            if (await _db.Users.AnyAsync(u => u.Email.ToLower() == req.NewLeader.Email.ToLower()))
            {
                _db.Teams.Remove(team);
                await _db.SaveChangesAsync();
                return (null, "האימייל של ראש הצוות כבר קיים במערכת.");
            }

            leader = new User
            {
                FullName = req.NewLeader.FullName,
                Email = req.NewLeader.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.NewLeader.Password),
                Role = UserRole.Manager,
                TeamId = team.TeamId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };
            _db.Users.Add(leader);
            await _db.SaveChangesAsync();
        }
        else if (req.LeaderId.HasValue)
        {
            leader = await _db.Users.FindAsync(req.LeaderId.Value);
            if (leader != null)
            {
                leader.TeamId = team.TeamId;
                leader.Role = UserRole.Manager;
                await _db.SaveChangesAsync();
            }
        }

        if (leader != null)
        {
            team.LeaderId = leader.UserId;
            await _db.SaveChangesAsync();
        }

        return (new TeamDto
        {
            TeamId = team.TeamId,
            TeamName = team.TeamName,
            LeaderId = team.LeaderId,
            LeaderName = leader?.FullName,
            MemberCount = leader != null ? 1 : 0
        }, null);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var team = await _db.Teams.FindAsync(id);
        if (team == null) return false;
        _db.Teams.Remove(team);
        await _db.SaveChangesAsync();
        return true;
    }
}
