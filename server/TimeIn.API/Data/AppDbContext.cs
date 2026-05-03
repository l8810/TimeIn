using Microsoft.EntityFrameworkCore;
using TimeIn.API.Models;
using TaskStatus = TimeIn.API.Models.TaskStatus;

namespace TimeIn.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Team> Teams { get; set; }
    public DbSet<User> Users { get; set; }
    public DbSet<Project> Projects { get; set; }
    public DbSet<ProjectMember> ProjectMembers { get; set; }
    public DbSet<TaskItem> Tasks { get; set; }
    public DbSet<TimeEntry> TimeEntries { get; set; }
    public DbSet<GitCommit> GitCommits { get; set; }
    public DbSet<ActiveTimer> ActiveTimers { get; set; }
    public DbSet<ReportingRules> ReportingRules { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Team>(e =>
        {
            e.HasKey(t => t.TeamId);
            e.HasIndex(t => t.TeamName).IsUnique();
            e.Property(t => t.TeamName).HasMaxLength(100);
            e.HasOne(t => t.Leader).WithMany()
                .HasForeignKey(t => t.LeaderId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(u => u.UserId);
            e.HasIndex(u => u.Email).IsUnique();
            e.Property(u => u.Role).HasConversion<string>();
            e.HasOne(u => u.Team).WithMany(t => t.Users)
                .HasForeignKey(u => u.TeamId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<Project>(e =>
        {
            e.HasKey(p => p.ProjectId);
            e.Property(p => p.Status).HasConversion<string>();
            e.HasOne(p => p.Manager).WithMany(u => u.ManagedProjects)
                .HasForeignKey(p => p.ManagerId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(p => p.Team).WithMany(t => t.Projects)
                .HasForeignKey(p => p.TeamId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ProjectMember>(e =>
        {
            e.HasKey(pm => new { pm.ProjectId, pm.UserId });
            e.HasOne(pm => pm.Project).WithMany(p => p.Members)
                .HasForeignKey(pm => pm.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(pm => pm.User).WithMany(u => u.ProjectMemberships)
                .HasForeignKey(pm => pm.UserId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TaskItem>(e =>
        {
            e.HasKey(t => t.TaskId);
            e.Property(t => t.Status).HasConversion<string>();
            e.Property(t => t.Priority).HasConversion<string>();
            e.HasOne(t => t.Project).WithMany(p => p.Tasks)
                .HasForeignKey(t => t.ProjectId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(t => t.AssignedUser).WithMany(u => u.AssignedTasks)
                .HasForeignKey(t => t.AssignedUserId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<TimeEntry>(e =>
        {
            e.HasKey(te => te.TimeEntryId);
            e.Property(te => te.Source).HasConversion<string>();
            e.Property(te => te.Status).HasConversion<string>();
            e.HasOne(te => te.User).WithMany(u => u.TimeEntries)
                .HasForeignKey(te => te.UserId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(te => te.Project).WithMany(p => p.TimeEntries)
                .HasForeignKey(te => te.ProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(te => te.Task).WithMany(t => t.TimeEntries)
                .HasForeignKey(te => te.TaskId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<GitCommit>(e =>
        {
            e.HasKey(g => g.CommitId);
            e.HasIndex(g => g.CommitHash).IsUnique();
            e.HasOne(g => g.LinkedUser).WithMany()
                .HasForeignKey(g => g.LinkedUserId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(g => g.LinkedTask).WithMany()
                .HasForeignKey(g => g.LinkedTaskId).OnDelete(DeleteBehavior.SetNull);
            e.HasOne(g => g.LinkedTimeEntry).WithMany()
                .HasForeignKey(g => g.LinkedTimeEntryId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ActiveTimer>(e =>
        {
            e.HasKey(a => a.ActiveTimerId);
            e.HasOne(a => a.User).WithMany()
                .HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(a => a.Project).WithMany()
                .HasForeignKey(a => a.ProjectId).OnDelete(DeleteBehavior.Restrict);
            e.HasOne(a => a.Task).WithMany()
                .HasForeignKey(a => a.TaskId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<ReportingRules>(e =>
        {
            e.HasKey(r => r.RulesId);
            e.HasOne(r => r.UpdatedByUser).WithMany()
                .HasForeignKey(r => r.UpdatedByUserId).OnDelete(DeleteBehavior.SetNull);
        });

        SeedData(modelBuilder);
    }

    private static void SeedData(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Team>().HasData(
            new Team { TeamId = 1, TeamName = "Management", CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Team { TeamId = 2, TeamName = "Dev Team", CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );

        modelBuilder.Entity<User>().HasData(
            new User
            {
                UserId = 1,
                FullName = "Admin User",
                Email = "admin@timein.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
                Role = UserRole.Admin,
                TeamId = 1,
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                UserId = 2,
                FullName = "Manager One",
                Email = "manager@timein.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Manager123!"),
                Role = UserRole.Manager,
                TeamId = 2,
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new User
            {
                UserId = 3,
                FullName = "Employee One",
                Email = "employee@timein.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Employee123!"),
                Role = UserRole.Employee,
                TeamId = 2,
                IsActive = true,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<Project>().HasData(
            new Project
            {
                ProjectId = 1,
                ProjectName = "TimeIn Platform",
                Description = "Work hours reporting system",
                Status = ProjectStatus.Active,
                ManagerId = 2,
                TeamId = 2,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<TaskItem>().HasData(
            new TaskItem
            {
                TaskId = 1,
                TaskName = "Setup Backend API",
                Description = "Initialize .NET API project",
                ProjectId = 1,
                AssignedUserId = 3,
                Status = TaskStatus.Done,
                Priority = TaskPriority.High,
                EstimatedHours = 8,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            },
            new TaskItem
            {
                TaskId = 2,
                TaskName = "Build Angular Frontend",
                Description = "Create Angular client application",
                ProjectId = 1,
                AssignedUserId = 3,
                Status = TaskStatus.InProgress,
                Priority = TaskPriority.High,
                EstimatedHours = 16,
                CreatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );

        modelBuilder.Entity<ReportingRules>().HasData(
            new ReportingRules
            {
                RulesId = 1,
                IsTaskMandatory = true,
                MaxHoursPerDay = 12,
                RetroactiveDaysAllowed = 7,
                UpdatedAt = new DateTime(2024, 1, 1, 0, 0, 0, DateTimeKind.Utc)
            }
        );
    }
}
