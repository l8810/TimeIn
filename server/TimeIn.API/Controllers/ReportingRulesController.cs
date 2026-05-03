using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TimeIn.API.DTOs;
using TimeIn.API.Services;
using System.Security.Claims;

namespace TimeIn.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ReportingRulesController : ControllerBase
{
    private readonly ReportingRulesService _service;

    public ReportingRulesController(ReportingRulesService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Get()
    {
        var rules = await _service.GetAsync();
        return Ok(rules);
    }

    [HttpPut]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update([FromBody] UpdateReportingRulesRequest req)
    {
        var userId = int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");
        var updated = await _service.UpdateAsync(req, userId);
        return Ok(updated);
    }
}
