using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RDTrackingSystem.Data;
using RDTrackingSystem.Models;

namespace RDTrackingSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetHealthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AssetHealthController> _logger;

    public AssetHealthController(ApplicationDbContext context, ILogger<AssetHealthController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet("{assetId}")]
    public async Task<ActionResult<object>> GetAssetHealth(string assetId)
    {
        try
        {
            var asset = await _context.Assets
                .Include(a => a.Versions)
                .Include(a => a.ProjectRelations)
                .FirstOrDefaultAsync(a => a.Id == assetId);

            if (asset == null)
            {
                return NotFound(new { error = "资产不存在" });
            }

            // 计算健康度指标
            var healthMetrics = CalculateHealthMetrics(asset);

            // 保存健康度快照
            var snapshot = new AssetHealthMetrics
            {
                Id = Guid.NewGuid().ToString(),
                AssetId = assetId,
                ReuseRate = healthMetrics.ReuseRate,
                DefectDensity = healthMetrics.DefectDensity,
                ChangeFrequency = healthMetrics.ChangeFrequency,
                RegressionCost = healthMetrics.RegressionCost,
                MaintenanceBurden = healthMetrics.MaintenanceBurden,
                HealthScore = healthMetrics.HealthScore,
                CalculatedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            _context.AssetHealthMetrics.Add(snapshot);
            await _context.SaveChangesAsync();

            return Ok(healthMetrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取资产健康度失败");
            return StatusCode(500, new { error = $"获取资产健康度失败: {ex.Message}" });
        }
    }

    [HttpGet("{assetId}/history")]
    public async Task<ActionResult<IEnumerable<object>>> GetAssetHealthHistory(string assetId, [FromQuery] int days = 30)
    {
        try
        {
            var cutoffDate = DateTime.Now.AddDays(-days);
            var history = await _context.AssetHealthMetrics
                .Where(ahm => ahm.AssetId == assetId && ahm.CalculatedAt >= cutoffDate)
                .OrderByDescending(ahm => ahm.CalculatedAt)
                .ToListAsync();

            var result = history.Select(h => new
            {
                id = h.Id,
                reuseRate = h.ReuseRate,
                defectDensity = h.DefectDensity,
                changeFrequency = h.ChangeFrequency,
                regressionCost = h.RegressionCost,
                maintenanceBurden = h.MaintenanceBurden,
                healthScore = h.HealthScore,
                calculatedAt = h.CalculatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取资产健康度历史失败");
            return StatusCode(500, new { error = $"获取资产健康度历史失败: {ex.Message}" });
        }
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<object>> GetHealthDashboard()
    {
        try
        {
            var assets = await _context.Assets
                .Include(a => a.Versions)
                .Include(a => a.ProjectRelations)
                .ToListAsync();

            var dashboardData = new
            {
                totalAssets = assets.Count,
                assetsByType = assets.GroupBy(a => a.Type).Select(g => new
                {
                    type = g.Key,
                    count = g.Count()
                }).ToList(),
                assetsByMaturity = assets.GroupBy(a => a.Maturity).Select(g => new
                {
                    maturity = g.Key,
                    count = g.Count()
                }).ToList(),
                topReusedAssets = assets.OrderByDescending(a => a.ReuseCount).Take(10).Select(a => new
                {
                    id = a.Id,
                    name = a.Name,
                    type = a.Type,
                    reuseCount = a.ReuseCount
                }).ToList(),
                assetsHealth = assets.Select(a =>
                {
                    var metrics = CalculateHealthMetrics(a);
                    return new
                    {
                        id = a.Id,
                        name = a.Name,
                        type = a.Type,
                        maturity = a.Maturity,
                        healthScore = metrics.HealthScore,
                        reuseRate = metrics.ReuseRate,
                        defectDensity = metrics.DefectDensity,
                        changeFrequency = metrics.ChangeFrequency
                    };
                }).OrderByDescending(a => a.healthScore).ToList()
            };

            return Ok(dashboardData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取健康度仪表盘失败");
            return StatusCode(500, new { error = $"获取健康度仪表盘失败: {ex.Message}" });
        }
    }

    private HealthMetricsResult CalculateHealthMetrics(Asset asset)
    {
        // 复用率：使用该资产的项目数 / 总项目数
        var totalProjects = _context.Projects.Count();
        var reuseRate = totalProjects > 0 ? (double)asset.ReuseCount / totalProjects : 0.0;

        // 缺陷密度：从最新版本获取，如果没有则默认为0
        var latestVersion = asset.Versions.OrderByDescending(v => v.VersionDate).FirstOrDefault();
        var defectDensity = latestVersion?.DefectDensity ?? 0.0;

        // 变更频率：版本数 / 资产存在月数
        var monthsSinceCreation = Math.Max(1, (DateTime.Now - asset.CreatedAt).TotalDays / 30);
        var changeFrequency = asset.Versions.Count / monthsSinceCreation;

        // 回归成本：从最新版本获取，如果没有则默认为0
        var regressionCost = latestVersion?.RegressionCost ?? 0.0;

        // 维护负担：从最新版本获取，如果没有则默认为0
        var maintenanceBurden = latestVersion?.MaintenanceBurden ?? 0.0;

        // 综合健康度评分（0-100）
        // 复用率越高越好（权重30%）
        // 缺陷密度越低越好（权重25%）
        // 变更频率适中最好（权重15%）
        // 回归成本越低越好（权重15%）
        // 维护负担越低越好（权重15%）
        var reuseScore = Math.Min(100, reuseRate * 100 * 10); // 复用率转换为0-100分
        var defectScore = Math.Max(0, 100 - defectDensity * 10); // 缺陷密度越低分数越高
        var changeScore = changeFrequency > 0 && changeFrequency < 5 ? 100 : Math.Max(0, 100 - (changeFrequency - 5) * 10); // 变更频率适中最好
        var regressionScore = Math.Max(0, 100 - regressionCost); // 回归成本越低分数越高
        var maintenanceScore = Math.Max(0, 100 - maintenanceBurden); // 维护负担越低分数越高

        var healthScore = reuseScore * 0.3 + defectScore * 0.25 + changeScore * 0.15 + regressionScore * 0.15 + maintenanceScore * 0.15;

        return new HealthMetricsResult
        {
            ReuseRate = Math.Round(reuseRate, 4),
            DefectDensity = Math.Round(defectDensity, 2),
            ChangeFrequency = Math.Round(changeFrequency, 2),
            RegressionCost = Math.Round(regressionCost, 2),
            MaintenanceBurden = Math.Round(maintenanceBurden, 2),
            HealthScore = Math.Round(healthScore, 2)
        };
    }

    private class HealthMetricsResult
    {
        public double ReuseRate { get; set; }
        public double DefectDensity { get; set; }
        public double ChangeFrequency { get; set; }
        public double RegressionCost { get; set; }
        public double MaintenanceBurden { get; set; }
        public double HealthScore { get; set; }
    }
}
