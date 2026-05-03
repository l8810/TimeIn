using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Helpers;
using TimeIn.API.Models;

namespace TimeIn.API.Services;

public class AuthService
{
    private readonly AppDbContext _db;
    private readonly JwtHelper _jwt;

    public AuthService(AppDbContext db, JwtHelper jwt)
    {
        _db = db;
        _jwt = jwt;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request)
    {
        var user = await _db.Users
            .Include(u => u.Team)
            .FirstOrDefaultAsync(u => u.Email == request.Email && u.IsActive);
        if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            return null;

        return new LoginResponse
        {
            Token = _jwt.GenerateToken(user),
            User = MapToDto(user)
        };
    }

    public async Task<UserDto?> GetCurrentUserAsync(int userId)
    {
        var user = await _db.Users.Include(u => u.Team).FirstOrDefaultAsync(u => u.UserId == userId);
        return user == null ? null : MapToDto(user);
    }

    public static UserDto MapToDto(User user) => new()
    {
        UserId = user.UserId,
        FullName = user.FullName,
        Email = user.Email,
        Role = user.Role.ToString(),
        TeamId = user.TeamId,
        TeamName = user.Team?.TeamName,
        IsActive = user.IsActive
    };
}
