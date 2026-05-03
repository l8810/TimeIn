using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly ProjectService _projectService;

    public ProjectsController(ProjectService projectService) => _projectService = projectService;

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role)!;
        return Ok(await _projectService.GetAllAsync(userId, role));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var project = await _projectService.GetByIdAsync(id);
        return project == null ? NotFound() : Ok(project);
    }

    [HttpPost]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Create([FromBody] CreateProjectRequest req)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role)!;
        var project = await _projectService.CreateAsync(req, userId, role);
        return CreatedAtAction(nameof(GetById), new { id = project.ProjectId }, project);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProjectRequest req)
    {
        var project = await _projectService.UpdateAsync(id, req);
        return project == null ? NotFound() : Ok(project);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _projectService.DeleteAsync(id);
        return result ? NoContent() : NotFound();
    }

    // ── Members ────────────────────────────────────────────────────

    [HttpGet("{id}/members")]
    public async Task<IActionResult> GetMembers(int id)
        => Ok(await _projectService.GetMembersAsync(id));

    [HttpPost("{id}/members")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> AddMember(int id, [FromBody] AddMemberRequest req)
    {
        var added = await _projectService.AddMemberAsync(id, req.UserId);
        return added ? Ok() : Conflict("המשתמש כבר חבר בפרויקט");
    }

    [HttpDelete("{id}/members/{userId}")]
    [Authorize(Roles = "Manager,Admin")]
    public async Task<IActionResult> RemoveMember(int id, int userId)
    {
        var removed = await _projectService.RemoveMemberAsync(id, userId);
        return removed ? NoContent() : NotFound();
    }

    // ── Tasks (employee view: my tasks + backlog) ─────────────────

    [HttpGet("{id}/tasks")]
    public async Task<IActionResult> GetProjectTasks(int id)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        var role = User.FindFirstValue(ClaimTypes.Role)!;
        return Ok(await _projectService.GetProjectTasksAsync(id, userId, role));
    }
}
