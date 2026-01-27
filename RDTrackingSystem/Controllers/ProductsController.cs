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
public class ProductsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ProductsController> _logger;

    public ProductsController(ApplicationDbContext context, ILogger<ProductsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetProducts()
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var products = await _context.Products
                .Include(p => p.Modules)
                .Include(p => p.Versions)
                .OrderByDescending(p => p.UpdatedAt)
                .ToListAsync();

            var result = products.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                code = p.Code,
                description = p.Description,
                currentVersion = p.CurrentVersion,
                status = p.Status,
                createdAt = p.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = p.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                moduleCount = p.Modules.Count,
                versionCount = p.Versions.Count
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取产品列表失败");
            return StatusCode(500, new { error = $"获取产品列表失败: {ex.Message}" });
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetProduct(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var product = await _context.Products
                .Include(p => p.Modules.OrderBy(m => m.OrderIndex))
                    .ThenInclude(m => m.SubModules.OrderBy(sm => sm.OrderIndex))
                        .ThenInclude(sm => sm.Functions.OrderBy(f => f.OrderIndex))
                            .ThenInclude(f => f.Assets)
                .Include(p => p.Modules)
                    .ThenInclude(m => m.SubModules)
                        .ThenInclude(sm => sm.Functions)
                            .ThenInclude(f => f.Engineers)
                .Include(p => p.Modules)
                    .ThenInclude(m => m.SubModules)
                        .ThenInclude(sm => sm.Functions)
                            .ThenInclude(f => f.Customers)
                .Include(p => p.Modules)
                    .ThenInclude(m => m.SubModules)
                        .ThenInclude(sm => sm.Functions)
                            .ThenInclude(f => f.Tasks)
                .Include(p => p.Versions.OrderByDescending(v => v.CreatedAt))
                .FirstOrDefaultAsync(p => p.Id == id);

            if (product == null)
            {
                return NotFound(new { error = "产品不存在" });
            }

            var result = new
            {
                id = product.Id,
                name = product.Name,
                code = product.Code,
                description = product.Description,
                currentVersion = product.CurrentVersion,
                status = product.Status,
                createdAt = product.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = product.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                modules = product.Modules.Select(m => new
                {
                    id = m.Id,
                    name = m.Name,
                    type = m.Type,
                    description = m.Description,
                    orderIndex = m.OrderIndex,
                    subModules = m.SubModules.Select(sm => new
                    {
                        id = sm.Id,
                        name = sm.Name,
                        description = sm.Description,
                        orderIndex = sm.OrderIndex,
                        functions = sm.Functions.Select(f => new
                        {
                            id = f.Id,
                            name = f.Name,
                            description = f.Description,
                            orderIndex = f.OrderIndex,
                            assets = f.Assets.Select(a => new
                            {
                                id = a.Id,
                                assetId = a.AssetId,
                                assetVersion = a.AssetVersion
                            }).ToList(),
                            engineers = f.Engineers.Select(e => new
                            {
                                id = e.Id,
                                engineerId = e.EngineerId
                            }).ToList(),
                            customers = f.Customers.Select(c => new
                            {
                                id = c.Id,
                                customerName = c.CustomerName,
                                region = c.Region
                            }).ToList(),
                            tasks = f.Tasks.Select(t => new
                            {
                                id = t.Id,
                                taskId = t.TaskId
                            }).ToList()
                        }).ToList()
                    }).ToList()
                }).ToList(),
                versions = product.Versions.Select(v => new
                {
                    id = v.Id,
                    version = v.Version,
                    description = v.Description,
                    status = v.Status,
                    releaseDate = v.ReleaseDate?.ToString("yyyy-MM-dd"),
                    createdAt = v.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList()
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取产品详情失败");
            return StatusCode(500, new { error = $"获取产品详情失败: {ex.Message}" });
        }
    }

    [HttpGet("structure")]
    public async Task<ActionResult<IEnumerable<object>>> GetProductsStructure()
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var products = await _context.Products
                .Include(p => p.Modules.OrderBy(m => m.OrderIndex))
                    .ThenInclude(m => m.SubModules.OrderBy(sm => sm.OrderIndex))
                        .ThenInclude(sm => sm.Functions.OrderBy(f => f.OrderIndex))
                            .ThenInclude(f => f.Assets)
                .Include(p => p.Modules)
                    .ThenInclude(m => m.SubModules)
                        .ThenInclude(sm => sm.Functions)
                            .ThenInclude(f => f.Engineers)
                .Include(p => p.Modules)
                    .ThenInclude(m => m.SubModules)
                        .ThenInclude(sm => sm.Functions)
                            .ThenInclude(f => f.Customers)
                .Include(p => p.Modules)
                    .ThenInclude(m => m.SubModules)
                        .ThenInclude(sm => sm.Functions)
                            .ThenInclude(f => f.Tasks)
                .OrderByDescending(p => p.UpdatedAt)
                .ToListAsync();

            var result = products.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                code = p.Code,
                modules = p.Modules.Select(m => new
                {
                    id = m.Id,
                    name = m.Name,
                    type = m.Type,
                    subModules = m.SubModules.Select(sm => new
                    {
                        id = sm.Id,
                        name = sm.Name,
                        functions = sm.Functions.Select(f => new
                        {
                            id = f.Id,
                            name = f.Name,
                            assets = f.Assets.Select(a => new
                            {
                                id = a.Id,
                                assetId = a.AssetId,
                                assetVersion = a.AssetVersion
                            }).ToList(),
                            engineers = f.Engineers.Select(e => new
                            {
                                id = e.Id,
                                engineerId = e.EngineerId
                            }).ToList(),
                            customers = f.Customers.Select(c => new
                            {
                                id = c.Id,
                                customerName = c.CustomerName,
                                region = c.Region
                            }).ToList(),
                            tasks = f.Tasks.Select(t => new
                            {
                                id = t.Id,
                                taskId = t.TaskId
                            }).ToList()
                        }).ToList()
                    }).ToList()
                }).ToList()
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取产品结构失败");
            return StatusCode(500, new { error = $"获取产品结构失败: {ex.Message}" });
        }
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateProduct([FromBody] dynamic productData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var product = new Product
            {
                Id = Guid.NewGuid().ToString(),
                Name = productData.name?.ToString() ?? string.Empty,
                Code = productData.code?.ToString() ?? string.Empty,
                Description = productData.description?.ToString(),
                CurrentVersion = productData.currentVersion?.ToString(),
                Status = productData.status?.ToString() ?? "active",
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Products.Add(product);
            await _context.SaveChangesAsync();

            return Ok(new { id = product.Id, message = "产品创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建产品失败");
            return StatusCode(500, new { error = $"创建产品失败: {ex.Message}" });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateProduct(string id, [FromBody] dynamic productData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound(new { error = "产品不存在" });
            }

            product.Name = productData.name?.ToString() ?? product.Name;
            product.Code = productData.code?.ToString() ?? product.Code;
            product.Description = productData.description?.ToString();
            product.CurrentVersion = productData.currentVersion?.ToString();
            product.Status = productData.status?.ToString() ?? product.Status;
            product.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(new { message = "产品更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新产品失败");
            return StatusCode(500, new { error = $"更新产品失败: {ex.Message}" });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteProduct(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var product = await _context.Products.FindAsync(id);
            if (product == null)
            {
                return NotFound(new { error = "产品不存在" });
            }

            _context.Products.Remove(product);
            await _context.SaveChangesAsync();
            return Ok(new { message = "产品已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除产品失败");
            return StatusCode(500, new { error = $"删除产品失败: {ex.Message}" });
        }
    }

    [HttpGet("analytics")]
    public async Task<ActionResult<object>> GetProductAnalytics()
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var totalProducts = await _context.Products.CountAsync();
            var activeVersions = await _context.ProductVersions
                .Where(v => v.Status == "stable" || v.Status == "beta")
                .CountAsync();
            var totalReleases = await _context.ProductVersions.CountAsync();
            
            // 计算关联项目数（通过功能关联的任务）
            var relatedProjectIds = await _context.ProductFunctionTasks
                .Join(_context.Tasks, pft => pft.TaskId, t => t.Id, (pft, t) => t.ProjectId)
                .Distinct()
                .CountAsync();

            var result = new
            {
                totalProducts,
                activeVersions,
                totalReleases,
                relatedProjects = relatedProjectIds
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取产品分析数据失败");
            return StatusCode(500, new { error = $"获取产品分析数据失败: {ex.Message}" });
        }
    }

    [HttpGet("versions")]
    public async Task<ActionResult<IEnumerable<object>>> GetProductVersions()
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var versions = await _context.ProductVersions
                .Include(v => v.Product)
                .OrderByDescending(v => v.CreatedAt)
                .ToListAsync();

            var result = versions.Select(v => new
            {
                id = v.Id,
                productId = v.ProductId,
                productName = v.Product?.Name,
                productCode = v.Product?.Code,
                version = v.Version,
                description = v.Description,
                status = v.Status,
                releaseDate = v.ReleaseDate?.ToString("yyyy-MM-dd"),
                createdAt = v.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            }).ToList();

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取产品版本列表失败");
            return StatusCode(500, new { error = $"获取产品版本列表失败: {ex.Message}" });
        }
    }

    [HttpPost("{productId}/versions")]
    public async Task<ActionResult<object>> CreateProductVersion(string productId, [FromBody] dynamic versionData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                return NotFound(new { error = "产品不存在" });
            }

            DateTime? releaseDate = null;
            DateTime parsedDate = DateTime.Now; 
            if (versionData.releaseDate != null && DateTime.TryParse(versionData.releaseDate.ToString(), out parsedDate))
            {
                releaseDate = parsedDate;
            }

            var version = new ProductVersion
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = productId,
                Version = versionData.version?.ToString() ?? string.Empty,
                Description = versionData.description?.ToString(),
                Status = versionData.status?.ToString() ?? "draft",
                ReleaseDate = releaseDate,
                CreatedAt = DateTime.Now
            };

            _context.ProductVersions.Add(version);
            
            // 如果这是稳定版本，更新产品的当前版本
            if (version.Status == "stable")
            {
                product.CurrentVersion = version.Version;
                product.UpdatedAt = DateTime.Now;
            }
            
            await _context.SaveChangesAsync();

            return Ok(new { id = version.Id, message = "产品版本创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建产品版本失败");
            return StatusCode(500, new { error = $"创建产品版本失败: {ex.Message}" });
        }
    }

    [HttpPut("versions/{id}")]
    public async Task<ActionResult> UpdateProductVersion(string id, [FromBody] dynamic versionData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var version = await _context.ProductVersions.FindAsync(id);
            if (version == null)
            {
                return NotFound(new { error = "版本不存在" });
            }

            if (versionData.version != null)
            {
                version.Version = versionData.version.ToString();
            }
            if (versionData.description != null)
            {
                version.Description = versionData.description?.ToString();
            }
            if (versionData.status != null)
            {
                version.Status = versionData.status.ToString();
            }
            if (versionData.releaseDate != null)
            {
                if (DateTime.TryParse(versionData.releaseDate.ToString(), out DateTime releaseDate))
                {
                    version.ReleaseDate = releaseDate;
                }
            }

            // 如果这是稳定版本，更新产品的当前版本
            if (version.Status == "stable")
            {
                var product = await _context.Products.FindAsync(version.ProductId);
                if (product != null)
                {
                    product.CurrentVersion = version.Version;
                    product.UpdatedAt = DateTime.Now;
                }
            }
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "产品版本更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新产品版本失败");
            return StatusCode(500, new { error = $"更新产品版本失败: {ex.Message}" });
        }
    }

    [HttpDelete("versions/{id}")]
    public async Task<ActionResult> DeleteProductVersion(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var version = await _context.ProductVersions.FindAsync(id);
            if (version == null)
            {
                return NotFound(new { error = "版本不存在" });
            }

            _context.ProductVersions.Remove(version);
            await _context.SaveChangesAsync();
            return Ok(new { message = "产品版本已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除产品版本失败");
            return StatusCode(500, new { error = $"删除产品版本失败: {ex.Message}" });
        }
    }

    // ========== 模块管理 ==========
    [HttpPost("{productId}/modules")]
    public async Task<ActionResult<object>> CreateModule(string productId, [FromBody] dynamic moduleData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var product = await _context.Products.FindAsync(productId);
            if (product == null)
            {
                return NotFound(new { error = "产品不存在" });
            }

            // 先查询所有模块，然后在客户端计算最大值（因为 DefaultIfEmpty 无法被翻译）
            var modules = await _context.ProductModules
                .Where(m => m.ProductId == productId)
                .Select(m => m.OrderIndex)
                .ToListAsync();
            
            var maxOrder = modules.Any() ? modules.Max() : -1;

            var module = new ProductModule
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = productId,
                Name = moduleData.name?.ToString() ?? string.Empty,
                Type = moduleData.type?.ToString() ?? "other",
                Description = moduleData.description?.ToString(),
                OrderIndex = maxOrder + 1,
                CreatedAt = DateTime.Now
            };

            _context.ProductModules.Add(module);
            await _context.SaveChangesAsync();

            return Ok(new { id = module.Id, message = "模块创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建模块失败");
            return StatusCode(500, new { error = $"创建模块失败: {ex.Message}" });
        }
    }

    [HttpPut("modules/{id}")]
    public async Task<ActionResult> UpdateModule(string id, [FromBody] dynamic moduleData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var module = await _context.ProductModules.FindAsync(id);
            if (module == null)
            {
                return NotFound(new { error = "模块不存在" });
            }

            module.Name = moduleData.name?.ToString() ?? module.Name;
            module.Type = moduleData.type?.ToString() ?? module.Type;
            module.Description = moduleData.description?.ToString();
            if (moduleData.orderIndex != null)
            {
                module.OrderIndex = Convert.ToInt32(moduleData.orderIndex);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "模块更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新模块失败");
            return StatusCode(500, new { error = $"更新模块失败: {ex.Message}" });
        }
    }

    [HttpDelete("modules/{id}")]
    public async Task<ActionResult> DeleteModule(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var module = await _context.ProductModules.FindAsync(id);
            if (module == null)
            {
                return NotFound(new { error = "模块不存在" });
            }

            _context.ProductModules.Remove(module);
            await _context.SaveChangesAsync();
            return Ok(new { message = "模块已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除模块失败");
            return StatusCode(500, new { error = $"删除模块失败: {ex.Message}" });
        }
    }

    // ========== 子模块管理 ==========
    [HttpPost("modules/{moduleId}/submodules")]
    public async Task<ActionResult<object>> CreateSubModule(string moduleId, [FromBody] dynamic subModuleData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var module = await _context.ProductModules.FindAsync(moduleId);
            if (module == null)
            {
                return NotFound(new { error = "模块不存在" });
            }

            // 先查询所有子模块，然后在客户端计算最大值（因为 DefaultIfEmpty 无法被翻译）
            var subModules = await _context.ProductSubModules
                .Where(sm => sm.ModuleId == moduleId)
                .Select(sm => sm.OrderIndex)
                .ToListAsync();
            
            var maxOrder = subModules.Any() ? subModules.Max() : -1;

            var subModule = new ProductSubModule
            {
                Id = Guid.NewGuid().ToString(),
                ModuleId = moduleId,
                Name = subModuleData.name?.ToString() ?? string.Empty,
                Description = subModuleData.description?.ToString(),
                OrderIndex = maxOrder + 1,
                CreatedAt = DateTime.Now
            };

            _context.ProductSubModules.Add(subModule);
            await _context.SaveChangesAsync();

            return Ok(new { id = subModule.Id, message = "子模块创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建子模块失败");
            return StatusCode(500, new { error = $"创建子模块失败: {ex.Message}" });
        }
    }

    [HttpPut("submodules/{id}")]
    public async Task<ActionResult> UpdateSubModule(string id, [FromBody] dynamic subModuleData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var subModule = await _context.ProductSubModules.FindAsync(id);
            if (subModule == null)
            {
                return NotFound(new { error = "子模块不存在" });
            }

            subModule.Name = subModuleData.name?.ToString() ?? subModule.Name;
            subModule.Description = subModuleData.description?.ToString();
            if (subModuleData.orderIndex != null)
            {
                subModule.OrderIndex = Convert.ToInt32(subModuleData.orderIndex);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "子模块更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新子模块失败");
            return StatusCode(500, new { error = $"更新子模块失败: {ex.Message}" });
        }
    }

    [HttpDelete("submodules/{id}")]
    public async Task<ActionResult> DeleteSubModule(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var subModule = await _context.ProductSubModules.FindAsync(id);
            if (subModule == null)
            {
                return NotFound(new { error = "子模块不存在" });
            }

            _context.ProductSubModules.Remove(subModule);
            await _context.SaveChangesAsync();
            return Ok(new { message = "子模块已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除子模块失败");
            return StatusCode(500, new { error = $"删除子模块失败: {ex.Message}" });
        }
    }

    // ========== 功能管理 ==========
    [HttpPost("submodules/{subModuleId}/functions")]
    public async Task<ActionResult<object>> CreateFunction(string subModuleId, [FromBody] dynamic functionData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var subModule = await _context.ProductSubModules.FindAsync(subModuleId);
            if (subModule == null)
            {
                return NotFound(new { error = "子模块不存在" });
            }

            // 先查询所有功能，然后在客户端计算最大值（因为 DefaultIfEmpty 无法被翻译）
            var functions = await _context.ProductFunctions
                .Where(f => f.SubModuleId == subModuleId)
                .Select(f => f.OrderIndex)
                .ToListAsync();
            
            var maxOrder = functions.Any() ? functions.Max() : -1;

            var function = new ProductFunction
            {
                Id = Guid.NewGuid().ToString(),
                SubModuleId = subModuleId,
                Name = functionData.name?.ToString() ?? string.Empty,
                Description = functionData.description?.ToString(),
                OrderIndex = maxOrder + 1,
                CreatedAt = DateTime.Now
            };

            _context.ProductFunctions.Add(function);
            await _context.SaveChangesAsync();

            return Ok(new { id = function.Id, message = "功能创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建功能失败");
            return StatusCode(500, new { error = $"创建功能失败: {ex.Message}" });
        }
    }

    [HttpPut("functions/{id}")]
    public async Task<ActionResult> UpdateFunction(string id, [FromBody] dynamic functionData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var function = await _context.ProductFunctions.FindAsync(id);
            if (function == null)
            {
                return NotFound(new { error = "功能不存在" });
            }

            function.Name = functionData.name?.ToString() ?? function.Name;
            function.Description = functionData.description?.ToString();
            if (functionData.orderIndex != null)
            {
                function.OrderIndex = Convert.ToInt32(functionData.orderIndex);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "功能更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新功能失败");
            return StatusCode(500, new { error = $"更新功能失败: {ex.Message}" });
        }
    }

    [HttpDelete("functions/{id}")]
    public async Task<ActionResult> DeleteFunction(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var function = await _context.ProductFunctions.FindAsync(id);
            if (function == null)
            {
                return NotFound(new { error = "功能不存在" });
            }

            _context.ProductFunctions.Remove(function);
            await _context.SaveChangesAsync();
            return Ok(new { message = "功能已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除功能失败");
            return StatusCode(500, new { error = $"删除功能失败: {ex.Message}" });
        }
    }

    // ========== 功能关联管理 ==========
    [HttpPost("functions/{functionId}/assets")]
    public async Task<ActionResult<object>> AddFunctionAsset(string functionId, [FromBody] dynamic assetData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var function = await _context.ProductFunctions.FindAsync(functionId);
            if (function == null)
            {
                return NotFound(new { error = "功能不存在" });
            }

            var functionAsset = new ProductFunctionAsset
            {
                Id = Guid.NewGuid().ToString(),
                FunctionId = functionId,
                AssetId = assetData.assetId?.ToString() ?? string.Empty,
                AssetVersion = assetData.assetVersion?.ToString(),
                CreatedAt = DateTime.Now
            };

            _context.ProductFunctionAssets.Add(functionAsset);
            await _context.SaveChangesAsync();

            return Ok(new { id = functionAsset.Id, message = "资产关联成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "添加资产关联失败");
            return StatusCode(500, new { error = $"添加资产关联失败: {ex.Message}" });
        }
    }

    [HttpDelete("functions/{functionId}/assets/{assetId}")]
    public async Task<ActionResult> RemoveFunctionAsset(string functionId, string assetId)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var functionAsset = await _context.ProductFunctionAssets
                .FirstOrDefaultAsync(fa => fa.FunctionId == functionId && fa.Id == assetId);
            
            if (functionAsset == null)
            {
                return NotFound(new { error = "资产关联不存在" });
            }

            _context.ProductFunctionAssets.Remove(functionAsset);
            await _context.SaveChangesAsync();
            return Ok(new { message = "资产关联已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除资产关联失败");
            return StatusCode(500, new { error = $"删除资产关联失败: {ex.Message}" });
        }
    }

    [HttpPost("functions/{functionId}/engineers")]
    public async Task<ActionResult<object>> AddFunctionEngineer(string functionId, [FromBody] dynamic engineerData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var function = await _context.ProductFunctions.FindAsync(functionId);
            if (function == null)
            {
                return NotFound(new { error = "功能不存在" });
            }

            var functionEngineer = new ProductFunctionEngineer
            {
                Id = Guid.NewGuid().ToString(),
                FunctionId = functionId,
                EngineerId = engineerData.engineerId?.ToString() ?? string.Empty,
                CreatedAt = DateTime.Now
            };

            _context.ProductFunctionEngineers.Add(functionEngineer);
            await _context.SaveChangesAsync();

            return Ok(new { id = functionEngineer.Id, message = "工程师关联成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "添加工程师关联失败");
            return StatusCode(500, new { error = $"添加工程师关联失败: {ex.Message}" });
        }
    }

    [HttpDelete("functions/{functionId}/engineers/{engineerId}")]
    public async Task<ActionResult> RemoveFunctionEngineer(string functionId, string engineerId)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var functionEngineer = await _context.ProductFunctionEngineers
                .FirstOrDefaultAsync(fe => fe.FunctionId == functionId && fe.Id == engineerId);
            
            if (functionEngineer == null)
            {
                return NotFound(new { error = "工程师关联不存在" });
            }

            _context.ProductFunctionEngineers.Remove(functionEngineer);
            await _context.SaveChangesAsync();
            return Ok(new { message = "工程师关联已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除工程师关联失败");
            return StatusCode(500, new { error = $"删除工程师关联失败: {ex.Message}" });
        }
    }

    [HttpPost("functions/{functionId}/customers")]
    public async Task<ActionResult<object>> AddFunctionCustomer(string functionId, [FromBody] dynamic customerData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var function = await _context.ProductFunctions.FindAsync(functionId);
            if (function == null)
            {
                return NotFound(new { error = "功能不存在" });
            }

            var functionCustomer = new ProductFunctionCustomer
            {
                Id = Guid.NewGuid().ToString(),
                FunctionId = functionId,
                CustomerName = customerData.customerName?.ToString() ?? string.Empty,
                Region = customerData.region?.ToString(),
                CreatedAt = DateTime.Now
            };

            _context.ProductFunctionCustomers.Add(functionCustomer);
            await _context.SaveChangesAsync();

            return Ok(new { id = functionCustomer.Id, message = "客户关联成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "添加客户关联失败");
            return StatusCode(500, new { error = $"添加客户关联失败: {ex.Message}" });
        }
    }

    [HttpDelete("functions/{functionId}/customers/{customerId}")]
    public async Task<ActionResult> RemoveFunctionCustomer(string functionId, string customerId)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var functionCustomer = await _context.ProductFunctionCustomers
                .FirstOrDefaultAsync(fc => fc.FunctionId == functionId && fc.Id == customerId);
            
            if (functionCustomer == null)
            {
                return NotFound(new { error = "客户关联不存在" });
            }

            _context.ProductFunctionCustomers.Remove(functionCustomer);
            await _context.SaveChangesAsync();
            return Ok(new { message = "客户关联已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除客户关联失败");
            return StatusCode(500, new { error = $"删除客户关联失败: {ex.Message}" });
        }
    }

    [HttpPost("functions/{functionId}/tasks")]
    public async Task<ActionResult<object>> AddFunctionTask(string functionId, [FromBody] dynamic taskData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var function = await _context.ProductFunctions.FindAsync(functionId);
            if (function == null)
            {
                return NotFound(new { error = "功能不存在" });
            }

            var functionTask = new ProductFunctionTask
            {
                Id = Guid.NewGuid().ToString(),
                FunctionId = functionId,
                TaskId = taskData.taskId?.ToString() ?? string.Empty,
                CreatedAt = DateTime.Now
            };

            _context.ProductFunctionTasks.Add(functionTask);
            await _context.SaveChangesAsync();

            return Ok(new { id = functionTask.Id, message = "任务关联成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "添加任务关联失败");
            return StatusCode(500, new { error = $"添加任务关联失败: {ex.Message}" });
        }
    }

    [HttpDelete("functions/{functionId}/tasks/{taskId}")]
    public async Task<ActionResult> RemoveFunctionTask(string functionId, string taskId)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var functionTask = await _context.ProductFunctionTasks
                .FirstOrDefaultAsync(ft => ft.FunctionId == functionId && ft.Id == taskId);
            
            if (functionTask == null)
            {
                return NotFound(new { error = "任务关联不存在" });
            }

            _context.ProductFunctionTasks.Remove(functionTask);
            await _context.SaveChangesAsync();
            return Ok(new { message = "任务关联已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除任务关联失败");
            return StatusCode(500, new { error = $"删除任务关联失败: {ex.Message}" });
        }
    }
}
