using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class TasksController : ControllerBase
{
    private readonly TaskService _taskService;

    public TasksController(TaskService taskService) => _taskService = taskService;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int? projectId, [FromQuery] int? userId)
    {
        var role = User.FindFirstValue(ClaimTypes.Role)!;
        var currentUserId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        return Ok(await _taskService.GetAllAsync(projectId, userId, currentUserId, role));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var task = await _taskService.GetByIdAsync(id);
        return task == null ? NotFound() : Ok(task);
    }

    [HttpPost]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateTaskRequest req)
    {
        var task = await _taskService.CreateAsync(req);
        return CreatedAtAction(nameof(GetById), new { id = task.TaskId }, task);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateTaskRequest req)
    {
        var task = await _taskService.UpdateAsync(id, req);
        return task == null ? NotFound() : Ok(task);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _taskService.DeleteAsync(id);
        return result ? NoContent() : NotFound();
    }

    [HttpPost("{id}/take")]
    public async Task<IActionResult> TakeTask(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var task = await _taskService.TakeTaskAsync(id, userId);
        return task == null ? BadRequest("המשימה כבר הוקצתה או לא קיימת") : Ok(task);
    }
}
