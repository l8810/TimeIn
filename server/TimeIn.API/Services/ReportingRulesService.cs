using Microsoft.EntityFrameworkCore;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Models;

namespace TimeIn.API.Services;

public class ReportingRulesService
{
    private readonly AppDbContext _db;

    public ReportingRulesService(AppDbContext db) => _db = db;

    public async Task<ReportingRulesDTO> GetAsync()
    {
        var rules = await _db.ReportingRules
            .Include(r => r.UpdatedByUser)
            .FirstOrDefaultAsync();

        if (rules == null)
        {
            rules = new Models.ReportingRules();
            _db.ReportingRules.Add(rules);
            await _db.SaveChangesAsync();
        }

        return new ReportingRulesDTO
        {
            RulesId = rules.RulesId,
            IsTaskMandatory = rules.IsTaskMandatory,
            MaxHoursPerDay = rules.MaxHoursPerDay,
            RetroactiveDaysAllowed = rules.RetroactiveDaysAllowed,
            UpdatedAt = rules.UpdatedAt,
            UpdatedByUserId = rules.UpdatedByUserId,
            UpdatedByUserName = rules.UpdatedByUser?.FullName
        };
    }

    public async Task<ReportingRulesDTO> UpdateAsync(UpdateReportingRulesRequest req, int userId)
    {
        var rules = await _db.ReportingRules.FirstOrDefaultAsync()
            ?? throw new InvalidOperationException("Reporting rules not found");

        rules.IsTaskMandatory = req.IsTaskMandatory;
        rules.MaxHoursPerDay = req.MaxHoursPerDay;
        rules.RetroactiveDaysAllowed = req.RetroactiveDaysAllowed;
        rules.UpdatedAt = DateTime.UtcNow;
        rules.UpdatedByUserId = userId;

        _db.ReportingRules.Update(rules);
        await _db.SaveChangesAsync();

        await _db.Entry(rules).Reference(r => r.UpdatedByUser).LoadAsync();

        return new ReportingRulesDTO
        {
            RulesId = rules.RulesId,
            IsTaskMandatory = rules.IsTaskMandatory,
            MaxHoursPerDay = rules.MaxHoursPerDay,
            RetroactiveDaysAllowed = rules.RetroactiveDaysAllowed,
            UpdatedAt = rules.UpdatedAt,
            UpdatedByUserId = rules.UpdatedByUserId,
            UpdatedByUserName = rules.UpdatedByUser?.FullName
        };
    }
}
