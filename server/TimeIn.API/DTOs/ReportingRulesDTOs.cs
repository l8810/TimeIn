namespace TimeIn.API.DTOs;

public class ReportingRulesDTO
{
    public int RulesId { get; set; }
    public bool IsTaskMandatory { get; set; }
    public int MaxHoursPerDay { get; set; }
    public int RetroactiveDaysAllowed { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int? UpdatedByUserId { get; set; }
    public string? UpdatedByUserName { get; set; }
}

public class UpdateReportingRulesRequest
{
    public bool IsTaskMandatory { get; set; }
    public int MaxHoursPerDay { get; set; }
    public int RetroactiveDaysAllowed { get; set; }
}
