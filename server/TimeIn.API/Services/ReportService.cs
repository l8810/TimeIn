using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;

namespace TimeIn.API.Services;

public class ReportService
{
    private readonly AppDbContext _db;

    public ReportService(AppDbContext db) => _db = db;

    public async Task<DashboardDto> GetDashboardAsync(int userId)
    {
        var today = DateTime.UtcNow.Date;
        var weekStart = today.AddDays(-(int)today.DayOfWeek);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var entries = await _db.TimeEntries
            .Include(te => te.Project)
            .Include(te => te.Task)
            .Include(te => te.User)
            .Where(te => te.UserId == userId && te.Status == Models.TimeEntryStatus.Approved)
            .OrderByDescending(te => te.Date)
            .ToListAsync();

        var timer = await _db.ActiveTimers
            .Include(t => t.Project)
            .Include(t => t.Task)
            .FirstOrDefaultAsync(t => t.UserId == userId);

        ActiveTimerDto? activeTimer = null;
        if (timer != null)
        {
            activeTimer = new ActiveTimerDto
            {
                ActiveTimerId = timer.ActiveTimerId,
                ProjectId = timer.ProjectId,
                ProjectName = timer.Project.ProjectName,
                TaskId = timer.TaskId,
                TaskName = timer.Task?.TaskName,
                StartedAt = timer.StartedAt,
                AccumulatedMinutes = timer.AccumulatedMinutes,
                IsPaused = timer.IsPaused,
                Description = timer.Description,
                CurrentDurationMinutes = (int)(DateTime.UtcNow - timer.StartedAt).TotalMinutes + timer.AccumulatedMinutes
            };
        }

        List<ProjectHoursDto> ProjectsFor(IEnumerable<Models.TimeEntry> src) =>
            src.GroupBy(e => new { e.ProjectId, e.Project.ProjectName })
               .Select(g => new ProjectHoursDto
               {
                   ProjectId = g.Key.ProjectId,
                   ProjectName = g.Key.ProjectName,
                   Hours = Math.Round(g.Sum(e => e.DurationMinutes) / 60.0, 2)
               }).OrderByDescending(p => p.Hours).ToList();

        List<TaskHoursItem> TasksFor(IEnumerable<Models.TimeEntry> src) =>
            src.GroupBy(e => e.Task?.TaskName ?? e.ManualTaskName ?? "כללי")
               .Select(g => new TaskHoursItem
               {
                   TaskName = g.Key,
                   Hours = Math.Round(g.Sum(e => e.DurationMinutes) / 60.0, 2)
               }).OrderByDescending(t => t.Hours).ToList();

        var todayEntries  = entries.Where(e => e.Date == today).ToList();
        var weekEntries   = entries.Where(e => e.Date >= weekStart).ToList();
        var monthEntries  = entries.Where(e => e.Date >= monthStart).ToList();

        return new DashboardDto
        {
            TodayHours  = Math.Round(todayEntries.Sum(e => e.DurationMinutes)  / 60.0, 2),
            WeekHours   = Math.Round(weekEntries.Sum(e => e.DurationMinutes)   / 60.0, 2),
            MonthHours  = Math.Round(monthEntries.Sum(e => e.DurationMinutes)  / 60.0, 2),
            WeekBreakdown = Enumerable.Range(0, 7).Select(i =>
            {
                var d = weekStart.AddDays(i);
                var dayEntries = entries.Where(e => e.Date == d).ToList();
                return new DailyHoursDto
                {
                    Date = d,
                    Hours = Math.Round(dayEntries.Sum(e => e.DurationMinutes) / 60.0, 2),
                    Entries = dayEntries.Count
                };
            }).ToList(),
            ProjectBreakdown = ProjectsFor(entries),
            TodayProjectBreakdown = ProjectsFor(todayEntries),
            TodayTaskBreakdown    = TasksFor(todayEntries),
            WeekProjectBreakdown  = ProjectsFor(weekEntries),
            WeekTaskBreakdown     = TasksFor(weekEntries),
            MonthProjectBreakdown = ProjectsFor(monthEntries),
            MonthTaskBreakdown    = TasksFor(monthEntries),
            RecentEntries = entries.Take(5).Select(te => new TimeEntryDto
            {
                TimeEntryId = te.TimeEntryId,
                UserId = te.UserId,
                UserName = te.User?.FullName ?? "",
                ProjectId = te.ProjectId,
                ProjectName = te.Project?.ProjectName ?? "",
                TaskId = te.TaskId,
                TaskName = te.Task?.TaskName,
                Date = te.Date,
                StartTime = te.StartTime?.ToString(@"hh\:mm"),
                EndTime = te.EndTime?.ToString(@"hh\:mm"),
                DurationMinutes = te.DurationMinutes,
                Description = te.Description,
                Source = te.Source.ToString(),
                Status = te.Status.ToString(),
                CreatedAt = te.CreatedAt,
                UpdatedAt = te.UpdatedAt
            }).ToList(),
            ActiveTimer = activeTimer
        };
    }

    public async Task<ManagerDashboardDto> GetManagerDashboardAsync(int managerId, string role)
    {
        var today = DateTime.UtcNow.Date;
        var weekStart = today.AddDays(-(int)today.DayOfWeek);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        int? teamId = null;
        if (role == "Manager")
            teamId = await _db.Users.Where(u => u.UserId == managerId).Select(u => u.TeamId).FirstOrDefaultAsync();

        var teamMembers = await _db.Users
            .Where(u => u.IsActive && (teamId == null || u.TeamId == teamId))
            .Select(u => new { u.UserId, u.FullName })
            .ToListAsync();

        var memberIds = teamMembers.Select(m => m.UserId).ToList();

        var entries = await _db.TimeEntries
            .Where(te => memberIds.Contains(te.UserId) && te.Date >= monthStart
                      && te.Status == Models.TimeEntryStatus.Approved)
            .ToListAsync();

        // Team week breakdown
        var teamWeek = Enumerable.Range(0, 7).Select(i =>
        {
            var d = weekStart.AddDays(i);
            var dayEntries = entries.Where(e => e.Date == d).ToList();
            return new DailyHoursDto
            {
                Date = d,
                Hours = Math.Round(dayEntries.Sum(e => e.DurationMinutes) / 60.0, 2),
                Entries = dayEntries.Count
            };
        }).ToList();

        // Team member hours
        var memberHours = teamMembers.Select(m =>
        {
            var memberEntries = entries.Where(e => e.UserId == m.UserId).ToList();
            return new MemberHoursDto
            {
                UserId = m.UserId,
                FullName = m.FullName,
                WeekHours = Math.Round(memberEntries.Where(e => e.Date >= weekStart).Sum(e => e.DurationMinutes) / 60.0, 2),
                MonthHours = Math.Round(memberEntries.Sum(e => e.DurationMinutes) / 60.0, 2)
            };
        }).OrderByDescending(m => m.WeekHours).ToList();

        // Project task stats
        var projects = await _db.Projects
            .Where(p => teamId == null || p.TeamId == teamId)
            .Select(p => new { p.ProjectId, p.ProjectName })
            .ToListAsync();

        var projectIds = projects.Select(p => p.ProjectId).ToList();
        var tasks = await _db.Tasks.Where(t => t.ProjectId.HasValue && projectIds.Contains(t.ProjectId.Value)).ToListAsync();
        var projectEntries = await _db.TimeEntries
            .Where(te => projectIds.Contains(te.ProjectId) && te.Status == Models.TimeEntryStatus.Approved)
            .ToListAsync();

        var projectStats = projects.Select(p =>
        {
            var pTasks = tasks.Where(t => t.ProjectId == p.ProjectId).ToList();
            var done = pTasks.Count(t => t.Status == Models.TaskStatus.Done);
            var inProgress = pTasks.Count(t => t.Status == Models.TaskStatus.InProgress);
            var todo = pTasks.Count(t => t.Status == Models.TaskStatus.Todo);
            var total = pTasks.Count;
            var hours = Math.Round(projectEntries.Where(e => e.ProjectId == p.ProjectId).Sum(e => e.DurationMinutes) / 60.0, 2);
            return new ProjectTaskStats
            {
                ProjectId = p.ProjectId,
                ProjectName = p.ProjectName,
                TotalTasks = total,
                DoneTasks = done,
                InProgressTasks = inProgress,
                TodoTasks = todo,
                CompletionPercent = total > 0 ? Math.Round(done * 100.0 / total, 1) : 0,
                TotalHours = hours
            };
        }).ToList();

        var weekEntries = entries.Where(e => e.Date >= weekStart).ToList();
        return new ManagerDashboardDto
        {
            ProjectStats = projectStats,
            TeamMemberHours = memberHours,
            TeamWeekBreakdown = teamWeek,
            TeamTotalHoursThisWeek = Math.Round(weekEntries.Sum(e => e.DurationMinutes) / 60.0, 2),
            TeamTotalHoursThisMonth = Math.Round(entries.Sum(e => e.DurationMinutes) / 60.0, 2)
        };
    }

    public async Task<AdminDashboardDto> GetAdminDashboardAsync()
    {
        var today = DateTime.UtcNow.Date;
        var weekStart = today.AddDays(-(int)today.DayOfWeek);
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var teams    = await _db.Teams.ToListAsync();
        var users    = await _db.Users.Where(u => u.IsActive).ToListAsync();
        var projects = await _db.Projects.ToListAsync();
        var tasks    = await _db.Tasks.ToListAsync();
        var entries  = await _db.TimeEntries
            .Where(te => te.Date >= monthStart && te.Status == Models.TimeEntryStatus.Approved)
            .ToListAsync();

        var teamStats = teams.Select(team =>
        {
            var memberIds  = users.Where(u => u.TeamId == team.TeamId).Select(u => u.UserId).ToList();
            var projectIds = projects.Where(p => p.TeamId == team.TeamId).Select(p => p.ProjectId).ToList();
            var teamTasks  = tasks.Where(t => t.ProjectId.HasValue && projectIds.Contains(t.ProjectId.Value)).ToList();
            var monthEntries = entries.Where(e => memberIds.Contains(e.UserId)).ToList();
            var weekEntries  = monthEntries.Where(e => e.Date >= weekStart).ToList();

            var done  = teamTasks.Count(t => t.Status == Models.TaskStatus.Done);
            var total = teamTasks.Count;

            return new TeamStatsDto
            {
                TeamId           = team.TeamId,
                TeamName         = team.TeamName,
                MemberCount      = memberIds.Count,
                ProjectCount     = projectIds.Count,
                WeekHours        = Math.Round(weekEntries.Sum(e => e.DurationMinutes)  / 60.0, 2),
                MonthHours       = Math.Round(monthEntries.Sum(e => e.DurationMinutes) / 60.0, 2),
                TotalTasks       = total,
                DoneTasks        = done,
                CompletionPercent = total > 0 ? Math.Round(done * 100.0 / total, 1) : 0
            };
        }).OrderByDescending(t => t.MonthHours).ToList();

        var weekHours  = Math.Round(entries.Where(e => e.Date >= weekStart).Sum(e => e.DurationMinutes)  / 60.0, 2);
        var monthHours = Math.Round(entries.Sum(e => e.DurationMinutes) / 60.0, 2);

        var topEmployees = users
            .Select(u =>
            {
                var uEntries = entries.Where(e => e.UserId == u.UserId).ToList();
                var teamName = teams.FirstOrDefault(t => t.TeamId == u.TeamId)?.TeamName;
                return new TopEmployeeDto
                {
                    UserId     = u.UserId,
                    FullName   = u.FullName,
                    TeamName   = teamName,
                    WeekHours  = Math.Round(uEntries.Where(e => e.Date >= weekStart).Sum(e => e.DurationMinutes) / 60.0, 2),
                    MonthHours = Math.Round(uEntries.Sum(e => e.DurationMinutes) / 60.0, 2)
                };
            })
            .Where(e => e.MonthHours > 0)
            .OrderByDescending(e => e.MonthHours)
            .Take(10)
            .ToList();

        return new AdminDashboardDto
        {
            TotalTeams          = teams.Count,
            TotalEmployees      = users.Count,
            TotalProjects       = projects.Count,
            TotalHoursThisWeek  = weekHours,
            TotalHoursThisMonth = monthHours,
            TeamStats           = teamStats,
            TopEmployees        = topEmployees
        };
    }

    public async Task<List<UserSummaryReport>> GetUserReportAsync(ReportFilterRequest filter, int callerUserId, string callerRole)
    {
        var query = _db.TimeEntries
            .Include(te => te.User).ThenInclude(u => u.Team)
            .Include(te => te.Project)
            .Where(te => te.Status == Models.TimeEntryStatus.Approved)
            .AsQueryable();

        if (filter.UserId.HasValue) query = query.Where(te => te.UserId == filter.UserId);
        if (filter.ProjectId.HasValue) query = query.Where(te => te.ProjectId == filter.ProjectId);
        if (filter.FromDate.HasValue) query = query.Where(te => te.Date >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue) query = query.Where(te => te.Date <= filter.ToDate.Value.Date);

        if (callerRole == "Manager")
        {
            var teamId = await _db.Users.Where(u => u.UserId == callerUserId).Select(u => u.TeamId).FirstOrDefaultAsync();
            query = teamId != null ? query.Where(te => te.User.TeamId == teamId) : query.Where(te => false);
        }

        var data = await query.ToListAsync();

        return data.GroupBy(te => new { te.UserId, te.User.FullName, TeamName = te.User.Team?.TeamName })
            .Select(g => new UserSummaryReport
            {
                UserId = g.Key.UserId,
                FullName = g.Key.FullName,
                Team = g.Key.TeamName,
                TotalHours = Math.Round(g.Sum(e => e.DurationMinutes) / 60.0, 2),
                TotalEntries = g.Count(),
                ActiveProjects = g.Select(e => e.ProjectId).Distinct().Count(),
                Projects = g.Select(e => e.Project.ProjectName).Distinct().ToList()
            }).ToList();
    }

    public async Task<List<ProjectSummaryReport>> GetProjectReportAsync(ReportFilterRequest filter, int callerUserId, string callerRole)
    {
        var query = _db.TimeEntries
            .Include(te => te.Project)
            .Include(te => te.Task)
            .Include(te => te.User)
            .Where(te => te.Status == Models.TimeEntryStatus.Approved)
            .AsQueryable();

        if (filter.ProjectId.HasValue) query = query.Where(te => te.ProjectId == filter.ProjectId);
        if (filter.FromDate.HasValue) query = query.Where(te => te.Date >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue) query = query.Where(te => te.Date <= filter.ToDate.Value.Date);

        if (callerRole == "Manager")
        {
            var teamId = await _db.Users.Where(u => u.UserId == callerUserId).Select(u => u.TeamId).FirstOrDefaultAsync();
            query = teamId != null ? query.Where(te => te.Project.TeamId == teamId) : query.Where(te => false);
        }

        var data = await query.ToListAsync();

        return data.GroupBy(te => new { te.ProjectId, te.Project.ProjectName })
            .Select(g => new ProjectSummaryReport
            {
                ProjectId = g.Key.ProjectId,
                ProjectName = g.Key.ProjectName,
                TotalHours = Math.Round(g.Sum(e => e.DurationMinutes) / 60.0, 2),
                TotalEmployees = g.Select(e => e.UserId).Distinct().Count(),
                TotalTasks = g.Where(e => e.TaskId.HasValue).Select(e => e.TaskId).Distinct().Count(),
                Workers = g.Where(e => e.User != null)
                    .Select(e => e.User!.FullName).Distinct().OrderBy(n => n).ToList(),
                TopTasks = g.Where(e => e.TaskId.HasValue)
                    .GroupBy(e => new { e.TaskId, e.Task!.TaskName })
                    .Select(tg => new TaskHoursSummary
                    {
                        TaskId = tg.Key.TaskId!.Value,
                        TaskName = tg.Key.TaskName,
                        TotalHours = Math.Round(tg.Sum(e => e.DurationMinutes) / 60.0, 2),
                        LastWorkedOn = tg.Max(e => e.Date)
                    }).OrderByDescending(t => t.TotalHours).Take(5).ToList()
            }).ToList();
    }

    public async Task<List<TaskHoursSummary>> GetTaskReportAsync(ReportFilterRequest filter, int callerUserId, string callerRole)
    {
        var query = _db.TimeEntries
            .Include(te => te.Task)
            .Include(te => te.User)
            .Include(te => te.Project)
            .Where(te => te.TaskId.HasValue && te.Status == Models.TimeEntryStatus.Approved)
            .AsQueryable();

        if (filter.ProjectId.HasValue) query = query.Where(te => te.ProjectId == filter.ProjectId);
        if (filter.FromDate.HasValue) query = query.Where(te => te.Date >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue) query = query.Where(te => te.Date <= filter.ToDate.Value.Date);

        if (callerRole == "Manager")
        {
            var teamId = await _db.Users.Where(u => u.UserId == callerUserId).Select(u => u.TeamId).FirstOrDefaultAsync();
            query = teamId != null ? query.Where(te => te.Project.TeamId == teamId) : query.Where(te => false);
        }

        var data = await query.ToListAsync();

        return data.GroupBy(te => new { te.TaskId, te.Task!.TaskName, ProjectName = te.Project.ProjectName, te.Task.ClickUpTaskId, te.Task.EstimatedHours })
            .Select(g => new TaskHoursSummary
            {
                TaskId = g.Key.TaskId!.Value,
                TaskName = g.Key.TaskName,
                ProjectName = g.Key.ProjectName,
                TotalHours = Math.Round(g.Sum(e => e.DurationMinutes) / 60.0, 2),
                EstimatedHours = g.Key.EstimatedHours.HasValue ? Math.Round((double)g.Key.EstimatedHours.Value, 2) : null,
                AssignedUser = g.Select(e => e.User.FullName).Distinct().FirstOrDefault(),
                LastWorkedOn = g.Max(e => e.Date),
                ClickUpTaskId = g.Key.ClickUpTaskId
            }).OrderByDescending(t => t.TotalHours).ToList();
    }

    public async Task<AnomalyReport> GetAnomaliesAsync(ReportFilterRequest filter, int callerUserId, string callerRole)
    {
        var query = _db.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .Include(te => te.Task)
            .AsQueryable();

        if (filter.UserId.HasValue) query = query.Where(te => te.UserId == filter.UserId);
        if (filter.FromDate.HasValue) query = query.Where(te => te.Date >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue) query = query.Where(te => te.Date <= filter.ToDate.Value.Date);

        if (callerRole == "Manager")
        {
            var teamId = await _db.Users.Where(u => u.UserId == callerUserId).Select(u => u.TeamId).FirstOrDefaultAsync();
            query = teamId != null ? query.Where(te => te.User.TeamId == teamId) : query.Where(te => false);
        }

        var data = await query.ToListAsync();

        var longEntries = data.Where(e => e.DurationMinutes > 600).Select(te => new TimeEntryDto
        {
            TimeEntryId = te.TimeEntryId,
            UserId = te.UserId,
            UserName = te.User?.FullName ?? "",
            ProjectId = te.ProjectId,
            ProjectName = te.Project?.ProjectName ?? "",
            Date = te.Date,
            DurationMinutes = te.DurationMinutes,
            Description = te.Description,
            Status = te.Status.ToString(),
            Source = te.Source.ToString(),
            CreatedAt = te.CreatedAt,
            UpdatedAt = te.UpdatedAt
        }).ToList();

        // Missing days: for each user, find working days (Sun–Thu) with no entries
        var missingDays = new List<MissingDayEntry>();
        if (filter.FromDate.HasValue && filter.ToDate.HasValue)
        {
            var from = filter.FromDate.Value.Date;
            var to = filter.ToDate.Value.Date;
            var workingDays = Enumerable.Range(0, (to - from).Days + 1)
                .Select(i => from.AddDays(i))
                .Where(d => d.DayOfWeek != DayOfWeek.Friday && d.DayOfWeek != DayOfWeek.Saturday)
                .ToList();

            var byUser = data.GroupBy(e => new { e.UserId, e.User!.FullName });
            foreach (var userGroup in byUser)
            {
                var daysWithEntries = userGroup.Select(e => e.Date.Date).ToHashSet();
                foreach (var day in workingDays)
                {
                    if (!daysWithEntries.Contains(day))
                        missingDays.Add(new MissingDayEntry { FullName = userGroup.Key.FullName, Date = day });
                }
            }
            missingDays = missingDays.OrderBy(m => m.FullName).ThenBy(m => m.Date).ToList();
        }

        // Overlaps: entries on the same day for the same user where time ranges intersect
        var overlaps = new List<OverlapEntry>();
        var entriesWithTime = data
            .Where(e => e.StartTime.HasValue && e.EndTime.HasValue)
            .ToList();

        var byUserDay = entriesWithTime
            .GroupBy(e => new { e.UserId, e.Date.Date });

        foreach (var group in byUserDay)
        {
            var list = group.OrderBy(e => e.StartTime).ToList();
            for (int i = 0; i < list.Count; i++)
            {
                for (int j = i + 1; j < list.Count; j++)
                {
                    var a = list[i];
                    var b = list[j];
                    if (a.StartTime < b.EndTime && b.StartTime < a.EndTime)
                    {
                        TimeEntryDto ToDto(Models.TimeEntry te) => new TimeEntryDto
                        {
                            TimeEntryId = te.TimeEntryId,
                            UserId = te.UserId,
                            UserName = te.User?.FullName ?? "",
                            ProjectId = te.ProjectId,
                            ProjectName = te.Project?.ProjectName ?? "",
                            Date = te.Date,
                            StartTime = te.StartTime?.ToString(@"hh\:mm"),
                            EndTime = te.EndTime?.ToString(@"hh\:mm"),
                            DurationMinutes = te.DurationMinutes,
                            Description = te.Description,
                            Status = te.Status.ToString(),
                            Source = te.Source.ToString(),
                            CreatedAt = te.CreatedAt,
                            UpdatedAt = te.UpdatedAt
                        };
                        overlaps.Add(new OverlapEntry { Entry1 = ToDto(a), Entry2 = ToDto(b) });
                    }
                }
            }
        }

        return new AnomalyReport
        {
            LongEntries = longEntries,
            MissingDays = missingDays,
            Overlaps = overlaps
        };
    }

    public async Task<EntriesReportResult> GetEntriesReportAsync(ReportFilterRequest filter, int callerUserId, string callerRole)
    {
        var query = _db.TimeEntries
            .Include(te => te.User)
            .Include(te => te.Project)
            .Include(te => te.Task)
            .AsQueryable();

        if (callerRole == "Manager")
        {
            var teamId = await _db.Users.Where(u => u.UserId == callerUserId).Select(u => u.TeamId).FirstOrDefaultAsync();
            query = teamId != null ? query.Where(te => te.User.TeamId == teamId) : query.Where(te => false);
        }

        if (filter.UserId.HasValue)    query = query.Where(te => te.UserId == filter.UserId);
        if (filter.ProjectId.HasValue) query = query.Where(te => te.ProjectId == filter.ProjectId);
        if (filter.TaskId.HasValue)    query = query.Where(te => te.TaskId == filter.TaskId);
        if (filter.FromDate.HasValue)  query = query.Where(te => te.Date >= filter.FromDate.Value.Date);
        if (filter.ToDate.HasValue)    query = query.Where(te => te.Date <= filter.ToDate.Value.Date);
        if (filter.Status != null && Enum.TryParse<Models.TimeEntryStatus>(filter.Status, true, out var statusEnum))
            query = query.Where(te => te.Status == statusEnum);
        else if (filter.Status == null)
            query = query.Where(te => te.Status != Models.TimeEntryStatus.Draft);

        var entries = await query.OrderByDescending(te => te.Date).ThenByDescending(te => te.CreatedAt).ToListAsync();

        var dtos = entries.Select(te => new TimeEntryDto
        {
            TimeEntryId = te.TimeEntryId,
            UserId = te.UserId,
            UserName = te.User?.FullName ?? "",
            ProjectId = te.ProjectId,
            ProjectName = te.Project?.ProjectName ?? "",
            TaskId = te.TaskId,
            TaskName = te.Task?.TaskName ?? te.ManualTaskName,
            ManualTaskName = te.ManualTaskName,
            Date = te.Date,
            StartTime = te.StartTime?.ToString(@"hh\:mm"),
            EndTime = te.EndTime?.ToString(@"hh\:mm"),
            DurationMinutes = te.DurationMinutes,
            Description = te.Description,
            Source = te.Source.ToString(),
            Status = te.Status.ToString(),
            RejectionReason = te.RejectionReason,
            RelatedClickUpTaskId = te.RelatedClickUpTaskId,
            CreatedAt = te.CreatedAt,
            UpdatedAt = te.UpdatedAt
        }).ToList();

        return new EntriesReportResult
        {
            Entries = dtos,
            TotalCount = dtos.Count,
            TotalHours = Math.Round(entries.Where(e => e.Status == Models.TimeEntryStatus.Approved).Sum(e => e.DurationMinutes) / 60.0, 2)
        };
    }
}
