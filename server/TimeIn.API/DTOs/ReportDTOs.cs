namespace TimeIn.API.DTOs;

public class UserSummaryReport
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? Team { get; set; }
    public double TotalHours { get; set; }
    public int TotalEntries { get; set; }
    public int ActiveProjects { get; set; }
    public List<string> Projects { get; set; } = new();
}

public class ProjectSummaryReport
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public double TotalHours { get; set; }
    public int TotalEmployees { get; set; }
    public int TotalTasks { get; set; }
    public List<TaskHoursSummary> TopTasks { get; set; } = new();
    public List<string> Workers { get; set; } = new();
}

public class TaskHoursSummary
{
    public int TaskId { get; set; }
    public string TaskName { get; set; } = string.Empty;
    public string? ProjectName { get; set; }
    public double TotalHours { get; set; }
    public double? EstimatedHours { get; set; }
    public string? AssignedUser { get; set; }
    public DateTime? LastWorkedOn { get; set; }
    public string? ClickUpTaskId { get; set; }
    public string? ClickUpUrl => ClickUpTaskId != null ? $"https://app.clickup.com/t/{ClickUpTaskId}" : null;
}

public class DailyHoursDto
{
    public DateTime Date { get; set; }
    public double Hours { get; set; }
    public int Entries { get; set; }
}

public class DashboardDto
{
    public double TodayHours { get; set; }
    public double WeekHours { get; set; }
    public double MonthHours { get; set; }
    public List<DailyHoursDto> WeekBreakdown { get; set; } = new();
    public List<ProjectHoursDto> ProjectBreakdown { get; set; } = new();
    public List<TimeEntryDto> RecentEntries { get; set; } = new();
    public ActiveTimerDto? ActiveTimer { get; set; }

    public List<ProjectHoursDto> TodayProjectBreakdown { get; set; } = new();
    public List<TaskHoursItem> TodayTaskBreakdown { get; set; } = new();
    public List<ProjectHoursDto> WeekProjectBreakdown { get; set; } = new();
    public List<TaskHoursItem> WeekTaskBreakdown { get; set; } = new();
    public List<ProjectHoursDto> MonthProjectBreakdown { get; set; } = new();
    public List<TaskHoursItem> MonthTaskBreakdown { get; set; } = new();
}

public class ProjectHoursDto
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public double Hours { get; set; }
}

public class TaskHoursItem
{
    public string TaskName { get; set; } = string.Empty;
    public double Hours { get; set; }
}

public class ManagerDashboardDto
{
    public List<ProjectTaskStats> ProjectStats { get; set; } = new();
    public List<MemberHoursDto> TeamMemberHours { get; set; } = new();
    public List<DailyHoursDto> TeamWeekBreakdown { get; set; } = new();
    public double TeamTotalHoursThisWeek { get; set; }
    public double TeamTotalHoursThisMonth { get; set; }
}

public class ProjectTaskStats
{
    public int ProjectId { get; set; }
    public string ProjectName { get; set; } = string.Empty;
    public int TotalTasks { get; set; }
    public int DoneTasks { get; set; }
    public int InProgressTasks { get; set; }
    public int TodoTasks { get; set; }
    public double CompletionPercent { get; set; }
    public double TotalHours { get; set; }
}

public class MemberHoursDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public double WeekHours { get; set; }
    public double MonthHours { get; set; }
}

public class MissingDayEntry
{
    public string FullName { get; set; } = string.Empty;
    public DateTime Date { get; set; }
}

public class AdminDashboardDto
{
    public int TotalTeams { get; set; }
    public int TotalEmployees { get; set; }
    public int TotalProjects { get; set; }
    public double TotalHoursThisWeek { get; set; }
    public double TotalHoursThisMonth { get; set; }
    public List<TeamStatsDto> TeamStats { get; set; } = new();
    public List<TopEmployeeDto> TopEmployees { get; set; } = new();
}

public class TopEmployeeDto
{
    public int UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string? TeamName { get; set; }
    public double WeekHours { get; set; }
    public double MonthHours { get; set; }
}

public class TeamStatsDto
{
    public int TeamId { get; set; }
    public string TeamName { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public int ProjectCount { get; set; }
    public double WeekHours { get; set; }
    public double MonthHours { get; set; }
    public int TotalTasks { get; set; }
    public int DoneTasks { get; set; }
    public double CompletionPercent { get; set; }
}

public class AnomalyReport
{
    public List<TimeEntryDto> LongEntries { get; set; } = new();
    public List<MissingDayEntry> MissingDays { get; set; } = new();
    public List<OverlapEntry> Overlaps { get; set; } = new();
}

public class OverlapEntry
{
    public TimeEntryDto Entry1 { get; set; } = null!;
    public TimeEntryDto Entry2 { get; set; } = null!;
}

public class EntriesReportResult
{
    public List<TimeEntryDto> Entries { get; set; } = new();
    public double TotalHours { get; set; }
    public int TotalCount { get; set; }
}

public class ReportFilterRequest
{
    public int? UserId { get; set; }
    public int? ProjectId { get; set; }
    public int? TaskId { get; set; }
    public string? Status { get; set; }
    public DateTime? FromDate { get; set; }
    public DateTime? ToDate { get; set; }
}
