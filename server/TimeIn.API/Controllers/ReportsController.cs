using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly ReportService _reportService;

    public ReportsController(ReportService reportService) =>
        _reportService = reportService;

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard()
    {
        var dashboard = await _reportService.GetDashboardAsync(CurrentUserId);
        return Ok(dashboard);
    }

    [HttpGet("admin-dashboard")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAdminDashboard()
    {
        var result = await _reportService.GetAdminDashboardAsync();
        return Ok(result);
    }

    [HttpGet("manager-dashboard")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetManagerDashboard()
    {
        var result = await _reportService.GetManagerDashboardAsync(CurrentUserId, CurrentUserRole);
        return Ok(result);
    }

    [HttpGet("users")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetUserReport([FromQuery] ReportFilterRequest filter)
    {
        var report = await _reportService.GetUserReportAsync(filter, CurrentUserId, CurrentUserRole);
        return Ok(report);
    }

    [HttpGet("projects")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetProjectReport([FromQuery] ReportFilterRequest filter)
    {
        var report = await _reportService.GetProjectReportAsync(filter, CurrentUserId, CurrentUserRole);
        return Ok(report);
    }

    [HttpGet("tasks")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetTaskReport([FromQuery] ReportFilterRequest filter)
    {
        var report = await _reportService.GetTaskReportAsync(filter, CurrentUserId, CurrentUserRole);
        return Ok(report);
    }

    [HttpGet("anomalies")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetAnomalies([FromQuery] ReportFilterRequest filter)
    {
        var report = await _reportService.GetAnomaliesAsync(filter, CurrentUserId, CurrentUserRole);
        return Ok(report);
    }

    [HttpGet("entries")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> GetEntries([FromQuery] ReportFilterRequest filter)
    {
        var result = await _reportService.GetEntriesReportAsync(filter, CurrentUserId, CurrentUserRole);
        return Ok(result);
    }
}
