namespace TimeIn.API.Models;

public class ReportingRules
{
    public int RulesId { get; set; }
    public bool IsTaskMandatory { get; set; } = true;
    public int MaxHoursPerDay { get; set; } = 24;
    public int RetroactiveDaysAllowed { get; set; } = 7;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int? UpdatedByUserId { get; set; }

    public User? UpdatedByUser { get; set; }
}
