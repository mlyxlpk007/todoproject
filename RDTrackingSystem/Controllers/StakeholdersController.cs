using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RDTrackingSystem.Data;
using RDTrackingSystem.Models;
using RDTrackingSystem.Services;

namespace RDTrackingSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class StakeholdersController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<StakeholdersController> _logger;

    public StakeholdersController(ApplicationDbContext context, ILogger<StakeholdersController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetStakeholders()
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var stakeholders = await _context.Stakeholders
                .OrderBy(s => s.Name)
                .ToListAsync();

            var result = stakeholders.Select(s => new
            {
                id = s.Id,
                name = s.Name,
                type = s.Type,
                email = s.Email,
                phone = s.Phone,
                company = s.Company,
                notes = s.Notes,
                createdAt = s.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = s.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取相关方列表失败");
            return StatusCode(500, new { error = $"获取相关方列表失败: {ex.Message}" });
        }
    }
}
