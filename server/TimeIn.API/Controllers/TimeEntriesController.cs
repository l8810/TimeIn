using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TimeEntriesController : ControllerBase
{
    private readonly TimeEntryService _timeEntryService;

    public TimeEntriesController(TimeEntryService timeEntryService) =>
        _timeEntryService = timeEntryService;

    private int CurrentUserId =>
        int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);

    private string CurrentUserRole =>
        User.FindFirstValue(ClaimTypes.Role)!;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] TimeEntryFilterRequest filter)
    {
        var entries = await _timeEntryService.GetAllAsync(filter, CurrentUserId, CurrentUserRole);
        return Ok(entries);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var entry = await _timeEntryService.GetByIdAsync(id);
        return entry == null ? NotFound() : Ok(entry);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTimeEntryRequest request)
    {
        var (entry, error) = await _timeEntryService.CreateAsync(request, CurrentUserId);
        if (entry == null) return BadRequest(new { message = error });
        return CreatedAtAction(nameof(GetById), new { id = entry.TimeEntryId }, new { entry, warning = error });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTimeEntryRequest request)
    {
        var (entry, error) = await _timeEntryService.UpdateAsync(id, request, CurrentUserId, CurrentUserRole);
        if (entry == null && error != null) return Conflict(new { message = error });
        return entry == null ? NotFound() : Ok(entry);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var success = await _timeEntryService.DeleteAsync(id, CurrentUserId, CurrentUserRole);
        return success ? NoContent() : NotFound();
    }

    [HttpPatch("{id}/submit")]
    public async Task<IActionResult> Submit(int id)
    {
        var (entry, error) = await _timeEntryService.SubmitAsync(id, CurrentUserId, CurrentUserRole);
        if (entry == null && error != null) return BadRequest(new { message = error });
        return entry == null ? NotFound() : Ok(entry);
    }

    [HttpPatch("{id}/approve")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Approve(int id)
    {
        var (entry, error) = await _timeEntryService.ApproveAsync(id, CurrentUserId, CurrentUserRole);
        if (entry == null && error != null) return BadRequest(new { message = error });
        return entry == null ? NotFound() : Ok(entry);
    }

    [HttpPatch("{id}/reject")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Reject(int id, [FromBody] RejectRequest req)
    {
        var (entry, error) = await _timeEntryService.RejectAsync(id, CurrentUserId, CurrentUserRole, req.Reason);
        if (entry == null && error != null) return BadRequest(new { message = error });
        return entry == null ? NotFound() : Ok(entry);
    }

    [HttpGet("timer/active")]
    public async Task<IActionResult> GetActiveTimer()
    {
        var timer = await _timeEntryService.GetActiveTimerAsync(CurrentUserId);
        return Ok(timer);
    }

    [HttpPost("timer/start")]
    public async Task<IActionResult> StartTimer([FromBody] TimerStartRequest request)
    {
        var timer = await _timeEntryService.StartTimerAsync(request, CurrentUserId);
        return Ok(timer);
    }

    [HttpPost("timer/pause")]
    public async Task<IActionResult> PauseTimer()
    {
        var timer = await _timeEntryService.PauseTimerAsync(CurrentUserId);
        return timer == null ? NotFound() : Ok(timer);
    }

    [HttpPost("timer/resume")]
    public async Task<IActionResult> ResumeTimer()
    {
        var timer = await _timeEntryService.ResumeTimerAsync(CurrentUserId);
        return timer == null ? NotFound() : Ok(timer);
    }

    [HttpPost("timer/stop")]
    public async Task<IActionResult> StopTimer([FromBody] StopTimerRequest? request = null)
    {
        var entry = await _timeEntryService.StopTimerAsync(CurrentUserId, request?.Description);
        return entry == null ? NotFound() : Ok(entry);
    }
}
