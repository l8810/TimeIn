using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeIn.API.Data;
using TimeIn.API.DTOs;
using TimeIn.API.Services;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/clickup")]
public class ClickUpController : ControllerBase
{
    private readonly ClickUpService _clickUp;
    private readonly AppDbContext _db;
    private readonly ILogger<ClickUpController> _logger;

    public ClickUpController(ClickUpService clickUp, AppDbContext db, ILogger<ClickUpController> logger)
    {
        _clickUp = clickUp;
        _db = db;
        _logger = logger;
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpGet("tasks/{projectId:int}")]
    public async Task<IActionResult> GetTasksForProject(int projectId)
    {
        var tasks = await _clickUp.GetTasksForProjectAsync(projectId);
        return Ok(tasks);
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpPost("sync/list/{listId}")]
    public async Task<IActionResult> SyncList(string listId)
    {
        var result = await _clickUp.SyncTasksFromListAsync(listId, null);
        if (result.Errors.Count > 0 && result.Created == 0 && result.Updated == 0)
            return StatusCode(502, new { message = "ClickUp sync failed.", errors = result.Errors });
        return Ok(result);
    }

    [Authorize(Roles = "Manager,Admin")]
    [HttpPost("sync/{projectId:int}")]
    public async Task<IActionResult> SyncProject(int projectId)
    {
        var project = await _db.Projects.FindAsync(projectId);
        if (project == null)
            return NotFound(new { message = "Project not found." });

        if (string.IsNullOrWhiteSpace(project.ExternalClickUpListId))
            return BadRequest(new { message = "This project has no ClickUp List ID configured." });

        var result = await _clickUp.SyncTasksFromListAsync(project.ExternalClickUpListId, projectId);

        if (result.Errors.Count > 0 && result.Created == 0 && result.Updated == 0)
            return StatusCode(502, new { message = "ClickUp sync failed.", errors = result.Errors });

        return Ok(result);
    }

    // ClickUp calls this endpoint when a task is created or updated
    [AllowAnonymous]
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook()
    {
        string body;
        using (var reader = new System.IO.StreamReader(Request.Body))
            body = await reader.ReadToEndAsync();

        var signature = Request.Headers["X-Signature"].FirstOrDefault();
        if (!_clickUp.VerifyWebhookSignature(body, signature))
        {
            _logger.LogWarning("ClickUp webhook received with invalid signature");
            return Unauthorized();
        }

        var evt = System.Text.Json.JsonSerializer.Deserialize<ClickUpWebhookEvent>(body,
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });

        if (evt?.TaskId == null || evt.Event == "taskDeleted")
            return Ok();

        _ = Task.Run(() => _clickUp.HandleWebhookEventAsync(evt.TaskId));
        return Ok();
    }

    // Call this once after deploying to register the webhook with ClickUp
    [Authorize(Roles = "Admin")]
    [HttpPost("webhook/register")]
    public async Task<IActionResult> RegisterWebhook([FromBody] RegisterWebhookRequest req)
    {
        var secret = await _clickUp.RegisterWebhookAsync(req.EndpointUrl);
        if (secret == null)
            return StatusCode(502, new { message = "Failed to register webhook with ClickUp." });

        return Ok(new { message = "Webhook registered.", secret, note = "Save this secret in ClickUp:WebhookSecret in appsettings." });
    }
}

public class RegisterWebhookRequest
{
    public string EndpointUrl { get; set; } = string.Empty;
}
