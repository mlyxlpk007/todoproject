using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using RDTrackingSystem.Data;
using RDTrackingSystem.Models;
using RDTrackingSystem.Services;

namespace RDTrackingSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AssetsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AssetsController> _logger;

    public AssetsController(ApplicationDbContext context, ILogger<AssetsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetAssets()
    {
        try
        {
            var assets = await _context.Assets
                .Include(a => a.Versions)
                .Include(a => a.ProjectRelations)
                .ToListAsync();

            var result = assets.Select(a => new
            {
                id = a.Id,
                name = a.Name,
                type = a.Type,
                maturity = a.Maturity,
                ownerId = a.OwnerId,
                ownerName = a.OwnerName,
                description = a.Description,
                tags = !string.IsNullOrEmpty(a.Tags) ? JsonConvert.DeserializeObject<string[]>(a.Tags) : Array.Empty<string>(),
                reuseCount = a.ReuseCount,
                relatedProjectIds = !string.IsNullOrEmpty(a.RelatedProjectIds) ? JsonConvert.DeserializeObject<string[]>(a.RelatedProjectIds) : Array.Empty<string>(),
                createdAt = a.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = a.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                versionCount = a.Versions.Count,
                latestVersion = a.Versions.OrderByDescending(v => v.VersionDate).FirstOrDefault()?.Version
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取资产列表失败");
            return StatusCode(500, new { error = $"获取资产列表失败: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetAsset(string id)
    {
        try
        {
            var asset = await _context.Assets
                .Include(a => a.Versions.OrderByDescending(v => v.VersionDate))
                .Include(a => a.ProjectRelations)
                .ThenInclude(apr => apr.Project)
                .FirstOrDefaultAsync(a => a.Id == id);

            if (asset == null)
            {
                return NotFound(new { error = "资产不存在" });
            }

            var result = new
            {
                id = asset.Id,
                name = asset.Name,
                type = asset.Type,
                maturity = asset.Maturity,
                ownerId = asset.OwnerId,
                ownerName = asset.OwnerName,
                description = asset.Description,
                tags = !string.IsNullOrEmpty(asset.Tags) ? JsonConvert.DeserializeObject<string[]>(asset.Tags) : Array.Empty<string>(),
                reuseCount = asset.ReuseCount,
                relatedProjectIds = !string.IsNullOrEmpty(asset.RelatedProjectIds) ? JsonConvert.DeserializeObject<string[]>(asset.RelatedProjectIds) : Array.Empty<string>(),
                createdAt = asset.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = asset.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                versions = asset.Versions.Select(v => new
                {
                    id = v.Id,
                    version = v.Version,
                    changeReason = v.ChangeReason,
                    qualityChanges = v.QualityChanges,
                    technicalDebt = v.TechnicalDebt,
                    changedBy = v.ChangedBy,
                    qualityScore = v.QualityScore,
                    defectDensity = v.DefectDensity,
                    changeFrequency = v.ChangeFrequency,
                    regressionCost = v.RegressionCost,
                    maintenanceBurden = v.MaintenanceBurden,
                    versionDate = v.VersionDate.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList(),
                projectRelations = asset.ProjectRelations.Select(apr => new
                {
                    id = apr.Id,
                    projectId = apr.ProjectId,
                    projectName = apr.Project?.ProjectName,
                    relationType = apr.RelationType,
                    version = apr.Version,
                    notes = apr.Notes,
                    createdAt = apr.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList()
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取资产详情失败");
            return StatusCode(500, new { error = $"获取资产详情失败: {ex.Message}" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateAsset([FromBody] dynamic assetData)
    {
        try
        {
            // 确保数据库架构是最新的（创建缺失的表）
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                _logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}");
            }

            if (assetData == null)
            {
                return BadRequest(new { error = "资产数据为空" });
            }

            var asset = new Asset
            {
                Id = assetData.id?.ToString() ?? Guid.NewGuid().ToString(),
                Name = assetData.name?.ToString() ?? string.Empty,
                Type = assetData.type?.ToString() ?? string.Empty,
                Maturity = assetData.maturity?.ToString() ?? "试验",
                OwnerId = assetData.ownerId?.ToString(),
                OwnerName = assetData.ownerName?.ToString(),
                Description = assetData.description?.ToString(),
                Tags = assetData.tags != null ? JsonConvert.SerializeObject(assetData.tags) : null,
                ReuseCount = 0,
                RelatedProjectIds = null,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Assets.Add(asset);
            await _context.SaveChangesAsync();

            return Ok(new { id = asset.Id, message = "资产创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建资产失败");
            return StatusCode(500, new { error = $"创建资产失败: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateAsset(string id, [FromBody] dynamic assetData)
    {
        try
        {
            var asset = await _context.Assets.FindAsync(id);
            if (asset == null)
            {
                return NotFound(new { error = "资产不存在" });
            }

            asset.Name = assetData.name?.ToString() ?? asset.Name;
            asset.Type = assetData.type?.ToString() ?? asset.Type;
            asset.Maturity = assetData.maturity?.ToString() ?? asset.Maturity;
            asset.OwnerId = assetData.ownerId?.ToString();
            asset.OwnerName = assetData.ownerName?.ToString();
            asset.Description = assetData.description?.ToString();
            asset.Tags = assetData.tags != null ? JsonConvert.SerializeObject(assetData.tags) : asset.Tags;
            asset.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new { message = "资产更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新资产失败");
            return StatusCode(500, new { error = $"更新资产失败: {ex.Message}" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteAsset(string id)
    {
        try
        {
            var asset = await _context.Assets.FindAsync(id);
            if (asset == null)
            {
                return NotFound(new { error = "资产不存在" });
            }

            _context.Assets.Remove(asset);
            await _context.SaveChangesAsync();
            return Ok(new { message = "资产已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除资产失败");
            return StatusCode(500, new { error = $"删除资产失败: {ex.Message}" });
        }
    }

    [HttpPost("{assetId}/versions")]
    public async Task<ActionResult<object>> CreateAssetVersion(string assetId, [FromBody] dynamic versionData)
    {
        try
        {
            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null)
            {
                return NotFound(new { error = "资产不存在" });
            }

            // 解析版本日期
            DateTime versionDate = DateTime.Now;
            DateTime parsedDate= DateTime.Now; 
            if (versionData.versionDate != null && DateTime.TryParse(versionData.versionDate.ToString(), out parsedDate))
            {
                versionDate = parsedDate;
            }

            var version = new AssetVersion
            {
                Id = versionData.id?.ToString() ?? Guid.NewGuid().ToString(),
                AssetId = assetId,
                Version = versionData.version?.ToString() ?? string.Empty,
                ChangeReason = versionData.changeReason?.ToString(),
                QualityChanges = versionData.qualityChanges?.ToString(),
                TechnicalDebt = versionData.technicalDebt?.ToString(),
                ChangedBy = versionData.changedBy?.ToString(),
                QualityScore = versionData.qualityScore != null ? (double?)Convert.ToDouble(versionData.qualityScore) : null,
                DefectDensity = versionData.defectDensity != null ? (double?)Convert.ToDouble(versionData.defectDensity) : null,
                ChangeFrequency = versionData.changeFrequency != null ? (double?)Convert.ToDouble(versionData.changeFrequency) : null,
                RegressionCost = versionData.regressionCost != null ? (double?)Convert.ToDouble(versionData.regressionCost) : null,
                MaintenanceBurden = versionData.maintenanceBurden != null ? (double?)Convert.ToDouble(versionData.maintenanceBurden) : null,
                VersionDate = versionDate,
                CreatedAt = DateTime.Now
            };

            _context.AssetVersions.Add(version);
            await _context.SaveChangesAsync();

            return Ok(new { id = version.Id, message = "资产版本创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建资产版本失败");
            return StatusCode(500, new { error = $"创建资产版本失败: {ex.Message}" });
        }
    }

    [HttpPost("project-relation")]
    public async Task<ActionResult<object>> CreateProjectRelation([FromBody] dynamic relationData)
    {
        try
        {
            // 先提取所有需要的值，避免在LINQ中使用dynamic
            string assetId = relationData.assetId?.ToString() ?? string.Empty;
            string projectId = relationData.projectId?.ToString() ?? string.Empty;
            string relationType = relationData.relationType?.ToString() ?? "used";

            if (string.IsNullOrEmpty(assetId) || string.IsNullOrEmpty(projectId))
            {
                return BadRequest(new { error = "资产ID和项目ID不能为空" });
            }

            var asset = await _context.Assets.FindAsync(assetId);
            if (asset == null)
            {
                return NotFound(new { error = "资产不存在" });
            }

            var project = await _context.Projects.FindAsync(projectId);
            if (project == null)
            {
                return NotFound(new { error = "项目不存在" });
            }

            // 检查是否已存在相同关系
            var existingRelation = await _context.AssetProjectRelations
                .FirstOrDefaultAsync(apr => apr.AssetId == assetId && apr.ProjectId == projectId && apr.RelationType == relationType);

            if (existingRelation != null)
            {
                // 更新现有关系
                existingRelation.Version = relationData.version?.ToString();
                existingRelation.Notes = relationData.notes?.ToString();
                await _context.SaveChangesAsync();
                return Ok(new { id = existingRelation.Id, message = "项目关系更新成功" });
            }

            var relation = new AssetProjectRelation
            {
                Id = relationData.id?.ToString() ?? Guid.NewGuid().ToString(),
                AssetId = assetId,
                ProjectId = projectId,
                RelationType = relationType,
                Version = relationData.version?.ToString(),
                Notes = relationData.notes?.ToString(),
                CreatedAt = DateTime.Now
            };

            _context.AssetProjectRelations.Add(relation);

            // 更新资产的复用次数和关联项目列表
            asset.ReuseCount = await _context.AssetProjectRelations
                .Where(apr => apr.AssetId == assetId && apr.RelationType == "used")
                .CountAsync();

            var relatedProjectIds = await _context.AssetProjectRelations
                .Where(apr => apr.AssetId == assetId)
                .Select(apr => apr.ProjectId)
                .Distinct()
                .ToListAsync();
            asset.RelatedProjectIds = JsonConvert.SerializeObject(relatedProjectIds);

            await _context.SaveChangesAsync();

            return Ok(new { id = relation.Id, message = "项目关系创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建项目关系失败");
            return StatusCode(500, new { error = $"创建项目关系失败: {ex.Message}" });
        }
    }

    [HttpGet("project/{projectId}")]
    public async Task<ActionResult<IEnumerable<object>>> GetAssetsByProject(string projectId)
    {
        try
        {
            var relations = await _context.AssetProjectRelations
                .Where(apr => apr.ProjectId == projectId)
                .Include(apr => apr.Asset)
                .ToListAsync();

            var result = relations.Select(apr => new
            {
                id = apr.Id,
                assetId = apr.AssetId,
                assetName = apr.Asset?.Name,
                assetType = apr.Asset?.Type,
                relationType = apr.RelationType,
                version = apr.Version,
                notes = apr.Notes,
                createdAt = apr.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取项目资产失败");
            return StatusCode(500, new { error = $"获取项目资产失败: {ex.Message}" });
        }
    }
}
