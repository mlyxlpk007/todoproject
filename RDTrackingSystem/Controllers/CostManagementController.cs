using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using RDTrackingSystem.Data;
using RDTrackingSystem.Models;
using RDTrackingSystem.Services;

namespace RDTrackingSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CostManagementController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<CostManagementController> _logger;

    public CostManagementController(ApplicationDbContext context, ILogger<CostManagementController> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ========== 产品成本主表 CRUD ==========
    
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetProductCosts([FromQuery] string? productId = null, [FromQuery] string? projectId = null)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var query = _context.ProductCosts
                .Include(pc => pc.Product)
                .Include(pc => pc.ProductVersion)
                .Include(pc => pc.BomItems)
                .Include(pc => pc.LaborCosts)
                .Include(pc => pc.ManufacturingCosts)
                .AsQueryable();
            
            if (!string.IsNullOrEmpty(productId))
            {
                query = query.Where(pc => pc.ProductId == productId);
            }
            
            if (!string.IsNullOrEmpty(projectId))
            {
                query = query.Where(pc => pc.ProjectId == projectId);
            }
            
            var costs = await query.OrderByDescending(pc => pc.UpdatedAt).ToListAsync();
            
            var result = costs.Select(pc =>
            {
                var bomTotal = pc.BomItems.Sum(b => b.TotalPrice);
                var laborTotal = pc.LaborCosts.Sum(l => l.TotalCost);
                var manufacturingTotal = pc.ManufacturingCosts.Sum(m => m.TotalCost);
                var totalCost = bomTotal + laborTotal + manufacturingTotal;
                
                return new
                {
                    id = pc.Id,
                    productId = pc.ProductId,
                    productName = pc.Product?.Name,
                    productCode = pc.Product?.Code,
                    productVersionId = pc.ProductVersionId,
                    productVersion = pc.ProductVersion?.Version,
                    projectId = pc.ProjectId,
                    specification = pc.Specification,
                    status = pc.Status,
                    notes = pc.Notes,
                    bomTotal = bomTotal,
                    laborTotal = laborTotal,
                    manufacturingTotal = manufacturingTotal,
                    totalCost = totalCost,
                    bomItemCount = pc.BomItems.Count,
                    laborCostCount = pc.LaborCosts.Count,
                    manufacturingCostCount = pc.ManufacturingCosts.Count,
                    createdAt = pc.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                    updatedAt = pc.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                };
            }).ToList();
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取产品成本列表失败");
            return StatusCode(500, new { error = $"获取产品成本列表失败: {ex.Message}" });
        }
    }
    
    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetProductCost(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var cost = await _context.ProductCosts
                .Include(pc => pc.Product)
                .Include(pc => pc.ProductVersion)
                .Include(pc => pc.BomItems)
                .Include(pc => pc.LaborCosts)
                .Include(pc => pc.ManufacturingCosts)
                .FirstOrDefaultAsync(pc => pc.Id == id);
            
            if (cost == null)
            {
                return NotFound(new { error = "产品成本不存在" });
            }
            
            var bomTotal = cost.BomItems.Sum(b => b.TotalPrice);
            var laborTotal = cost.LaborCosts.Sum(l => l.TotalCost);
            var manufacturingTotal = cost.ManufacturingCosts.Sum(m => m.TotalCost);
            var totalCost = bomTotal + laborTotal + manufacturingTotal;
            
            var pricing = await _context.ProductPricings
                .Where(pp => pp.ProductCostId == id)
                .OrderByDescending(pp => pp.EffectiveDate)
                .FirstOrDefaultAsync();
            
            var result = new
            {
                id = cost.Id,
                productId = cost.ProductId,
                productName = cost.Product?.Name,
                productCode = cost.Product?.Code,
                productVersionId = cost.ProductVersionId,
                productVersion = cost.ProductVersion?.Version,
                projectId = cost.ProjectId,
                specification = cost.Specification,
                status = cost.Status,
                notes = cost.Notes,
                bomItems = cost.BomItems.OrderBy(b => b.OrderIndex).Select(b => new
                {
                    id = b.Id,
                    materialName = b.MaterialName,
                    materialCode = b.MaterialCode,
                    materialType = b.MaterialType,
                    unit = b.Unit,
                    quantity = b.Quantity,
                    unitPrice = b.UnitPrice,
                    totalPrice = b.TotalPrice,
                    supplier = b.Supplier,
                    category = b.Category,
                    notes = b.Notes,
                    orderIndex = b.OrderIndex
                }).ToList(),
                laborCosts = cost.LaborCosts.OrderBy(l => l.WorkDate).Select(l => new
                {
                    id = l.Id,
                    taskId = l.TaskId,
                    projectId = l.ProjectId,
                    assetId = l.AssetId,
                    engineerId = l.EngineerId,
                    engineerName = l.EngineerName,
                    workDescription = l.WorkDescription,
                    role = l.Role,
                    hours = l.Hours,
                    hourlyRate = l.HourlyRate,
                    totalCost = l.TotalCost,
                    workDate = l.WorkDate,
                    notes = l.Notes
                }).ToList(),
                manufacturingCosts = cost.ManufacturingCosts.OrderBy(m => m.OrderIndex).Select(m => new
                {
                    id = m.Id,
                    costName = m.CostName,
                    costType = m.CostType,
                    unit = m.Unit,
                    quantity = m.Quantity,
                    unitCost = m.UnitCost,
                    totalCost = m.TotalCost,
                    coefficient = m.Coefficient,
                    supplier = m.Supplier,
                    notes = m.Notes,
                    orderIndex = m.OrderIndex
                }).ToList(),
                pricing = pricing != null ? new
                {
                    id = pricing.Id,
                    sellingPrice = pricing.SellingPrice,
                    minPrice = pricing.MinPrice,
                    maxPrice = pricing.MaxPrice,
                    profitMargin = pricing.ProfitMargin,
                    currency = pricing.Currency,
                    market = pricing.Market,
                    notes = pricing.Notes,
                    effectiveDate = pricing.EffectiveDate.ToString("yyyy-MM-dd"),
                    expiryDate = pricing.ExpiryDate?.ToString("yyyy-MM-dd")
                } : null,
                bomTotal = bomTotal,
                laborTotal = laborTotal,
                manufacturingTotal = manufacturingTotal,
                totalCost = totalCost,
                createdAt = cost.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = cost.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            };
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取产品成本详情失败");
            return StatusCode(500, new { error = $"获取产品成本详情失败: {ex.Message}" });
        }
    }
    
    [HttpPost]
    public async Task<ActionResult<object>> CreateProductCost([FromBody] dynamic costData)
    {
        try
        {
            // 确保数据库表存在
            DatabaseSchemaMigrator.MigrateSchema();
            
            // 使用 EF Core 确保表已创建（如果还没有创建）
            await _context.Database.EnsureCreatedAsync();
            
            // 处理不同的 JSON 解析方式
            JObject json;
            if (costData is JObject jObj)
            {
                json = jObj;
            }
            else if (costData is System.Text.Json.JsonElement jsonElement)
            {
                // 如果是 System.Text.Json 的 JsonElement，先转换为字符串再解析
                var jsonString = jsonElement.GetRawText();
                _logger.LogInformation($"从 JsonElement 解析，原始字符串: {jsonString}");
                json = JObject.Parse(jsonString);
            }
            else
            {
                // 尝试从请求体直接读取
                Request.EnableBuffering();
                Request.Body.Position = 0;
                using var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8, leaveOpen: true);
                var bodyString = await reader.ReadToEndAsync();
                Request.Body.Position = 0;
                _logger.LogInformation($"从请求体读取，原始字符串: {bodyString}");
                json = JObject.Parse(bodyString);
            }
            
            // 调试：记录接收到的数据
            _logger.LogInformation($"创建产品成本 - 接收到的数据: {json.ToString()}");
            _logger.LogInformation($"创建产品成本 - productId: {json["productId"]?.ToString()}");
            
            var productId = json["productId"]?.ToString();
            if (string.IsNullOrEmpty(productId))
            {
                _logger.LogWarning($"创建产品成本失败 - productId 为空，完整数据: {json.ToString()}");
                return BadRequest(new { error = "产品ID不能为空" });
            }
            
            // 处理空字符串，将其转换为 null（外键约束要求）
            var productVersionId = json["productVersionId"]?.ToString();
            if (string.IsNullOrWhiteSpace(productVersionId))
            {
                productVersionId = null;
            }
            
            var projectId = json["projectId"]?.ToString();
            if (string.IsNullOrWhiteSpace(projectId))
            {
                projectId = null;
            }
            
            // 验证 ProductId 是否存在
            var productExists = await _context.Products.AnyAsync(p => p.Id == productId);
            if (!productExists)
            {
                return BadRequest(new { error = $"产品不存在: {productId}" });
            }
            
            // 如果指定了 ProductVersionId，验证它是否存在
            if (!string.IsNullOrEmpty(productVersionId))
            {
                var versionExists = await _context.ProductVersions.AnyAsync(v => v.Id == productVersionId);
                if (!versionExists)
                {
                    return BadRequest(new { error = $"产品版本不存在: {productVersionId}" });
                }
            }
            
            var cost = new ProductCost
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = productId,
                ProductVersionId = productVersionId, // 使用处理后的值（null 或有效ID）
                ProjectId = projectId, // 使用处理后的值（null 或有效ID）
                Specification = json["specification"]?.ToString(),
                Status = json["status"]?.ToString() ?? "draft",
                Notes = json["notes"]?.ToString(),
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            _context.ProductCosts.Add(cost);
            await _context.SaveChangesAsync();
            
            return Ok(new { id = cost.Id, message = "产品成本创建成功" });
        }
        catch (DbUpdateException dbEx)
        {
            _logger.LogError(dbEx, "创建产品成本失败 - 数据库错误");
            var innerException = dbEx.InnerException?.Message ?? dbEx.Message;
            var stackTrace = dbEx.InnerException?.StackTrace ?? dbEx.StackTrace;
            _logger.LogError($"内部异常详情: {innerException}\n堆栈跟踪: {stackTrace}", dbEx, "CostManagementController");
            return StatusCode(500, new { error = $"创建产品成本失败: {innerException}", details = stackTrace });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建产品成本失败");
            return StatusCode(500, new { error = $"创建产品成本失败: {ex.Message}" });
        }
    }
    
    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateProductCost(string id, [FromBody] dynamic costData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var cost = await _context.ProductCosts.FindAsync(id);
            if (cost == null)
            {
                return NotFound(new { error = "产品成本不存在" });
            }
            
            // 处理不同的 JSON 解析方式
            JObject json;
            if (costData is JObject jObj)
            {
                json = jObj;
            }
            else if (costData is System.Text.Json.JsonElement jsonElement)
            {
                // 如果是 System.Text.Json 的 JsonElement，先转换为字符串再解析
                var jsonString = jsonElement.GetRawText();
                json = JObject.Parse(jsonString);
            }
            else
            {
                // 尝试从请求体直接读取
                Request.Body.Position = 0;
                using var reader = new StreamReader(Request.Body, System.Text.Encoding.UTF8, leaveOpen: true);
                var bodyString = await reader.ReadToEndAsync();
                Request.Body.Position = 0;
                json = JObject.Parse(bodyString);
            }
            
            // 调试：记录接收到的数据
            _logger.LogInformation($"更新产品成本 - ID: {id}, 接收到的数据: {json.ToString()}");
            
            // 处理空字符串，将其转换为 null（对于可选字段）
            var productVersionId = json["productVersionId"]?.ToString();
            if (string.IsNullOrWhiteSpace(productVersionId))
            {
                productVersionId = null;
            }
            
            var projectId = json["projectId"]?.ToString();
            if (string.IsNullOrWhiteSpace(projectId))
            {
                projectId = null;
            }
            
            // 更新字段
            if (json["productId"] != null && !string.IsNullOrWhiteSpace(json["productId"].ToString()))
            {
                cost.ProductId = json["productId"].ToString();
            }
            
            cost.ProductVersionId = productVersionId;
            cost.ProjectId = projectId;
            
            // 规格型号和备注允许为空字符串
            if (json["specification"] != null)
            {
                cost.Specification = json["specification"]?.ToString();
            }
            
            if (json["status"] != null && !string.IsNullOrWhiteSpace(json["status"].ToString()))
            {
                cost.Status = json["status"].ToString();
            }
            
            if (json["notes"] != null)
            {
                cost.Notes = json["notes"]?.ToString();
            }
            
            cost.UpdatedAt = DateTime.Now;
            
            // 调试：记录更新后的数据
            _logger.LogInformation($"更新产品成本 - 更新后: Specification={cost.Specification}, Notes={cost.Notes}, Status={cost.Status}");
            
            await _context.SaveChangesAsync();
            
            // 再次验证保存后的数据
            await _context.Entry(cost).ReloadAsync();
            _logger.LogInformation($"更新产品成本 - 保存后验证: Specification={cost.Specification}, Notes={cost.Notes}, Status={cost.Status}");
            
            return Ok(new { message = "产品成本更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新产品成本失败");
            return StatusCode(500, new { error = $"更新产品成本失败: {ex.Message}" });
        }
    }
    
    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteProductCost(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var cost = await _context.ProductCosts.FindAsync(id);
            if (cost == null)
            {
                return NotFound(new { error = "产品成本不存在" });
            }
            
            _context.ProductCosts.Remove(cost);
            await _context.SaveChangesAsync();
            return Ok(new { message = "产品成本已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除产品成本失败");
            return StatusCode(500, new { error = $"删除产品成本失败: {ex.Message}" });
        }
    }
    
    // ========== BOM物料管理 ==========
    
    [HttpPost("{productCostId}/bom-items")]
    public async Task<ActionResult<object>> CreateBomItem(string productCostId, [FromBody] dynamic itemData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var cost = await _context.ProductCosts.FindAsync(productCostId);
            if (cost == null)
            {
                return NotFound(new { error = "产品成本不存在" });
            }
            
            // 处理 JSON 解析
            JObject json;
            if (itemData is JObject jObj)
            {
                json = jObj;
            }
            else if (itemData is System.Text.Json.JsonElement jsonElement)
            {
                var jsonString = jsonElement.GetRawText();
                json = JObject.Parse(jsonString);
            }
            else
            {
                json = JObject.FromObject(itemData);
            }
            
            var quantity = json["quantity"] != null ? Convert.ToDecimal(json["quantity"]) : 1;
            var unitPrice = json["unitPrice"] != null ? Convert.ToDecimal(json["unitPrice"]) : 0;
            var totalPrice = quantity * unitPrice;
            
            // 获取当前产品的最大 OrderIndex
            var existingItems = await _context.BomItems
                .Where(b => b.ProductCostId == productCostId)
                .ToListAsync();
            
            var maxOrder = existingItems.Any() 
                ? existingItems.Max(b => b.OrderIndex) 
                : -1;
            
            var item = new BomItem
            {
                Id = Guid.NewGuid().ToString(),
                ProductCostId = productCostId,
                MaterialName = json["materialName"]?.ToString() ?? string.Empty,
                MaterialCode = json["materialCode"]?.ToString(),
                MaterialType = json["materialType"]?.ToString(),
                Unit = json["unit"]?.ToString() ?? "pcs",
                Quantity = quantity,
                UnitPrice = unitPrice,
                TotalPrice = totalPrice,
                Supplier = json["supplier"]?.ToString(),
                Category = json["category"]?.ToString(),
                Notes = json["notes"]?.ToString(),
                OrderIndex = maxOrder + 1,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            _context.BomItems.Add(item);
            await _context.SaveChangesAsync();
            
            return Ok(new { id = item.Id, message = "BOM物料添加成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "添加BOM物料失败");
            return StatusCode(500, new { error = $"添加BOM物料失败: {ex.Message}" });
        }
    }
    
    [HttpPut("bom-items/{id}")]
    public async Task<ActionResult> UpdateBomItem(string id, [FromBody] dynamic itemData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var item = await _context.BomItems.FindAsync(id);
            if (item == null)
            {
                return NotFound(new { error = "BOM物料不存在" });
            }
            
            // 处理 JSON 解析
            JObject json;
            if (itemData is JObject jObj)
            {
                json = jObj;
            }
            else if (itemData is System.Text.Json.JsonElement jsonElement)
            {
                var jsonString = jsonElement.GetRawText();
                json = JObject.Parse(jsonString);
            }
            else
            {
                json = JObject.FromObject(itemData);
            }
            
            if (json["materialName"] != null) item.MaterialName = json["materialName"].ToString();
            if (json["materialCode"] != null) item.MaterialCode = json["materialCode"]?.ToString();
            if (json["materialType"] != null) item.MaterialType = json["materialType"]?.ToString();
            if (json["unit"] != null) item.Unit = json["unit"].ToString();
            if (json["quantity"] != null) item.Quantity = Convert.ToDecimal(json["quantity"]);
            if (json["unitPrice"] != null) item.UnitPrice = Convert.ToDecimal(json["unitPrice"]);
            if (json["supplier"] != null) item.Supplier = json["supplier"]?.ToString();
            if (json["category"] != null) item.Category = json["category"]?.ToString();
            if (json["notes"] != null) item.Notes = json["notes"]?.ToString();
            if (json["orderIndex"] != null) item.OrderIndex = Convert.ToInt32(json["orderIndex"]);
            
            item.TotalPrice = item.Quantity * item.UnitPrice;
            item.UpdatedAt = DateTime.Now;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "BOM物料更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新BOM物料失败");
            return StatusCode(500, new { error = $"更新BOM物料失败: {ex.Message}" });
        }
    }
    
    [HttpDelete("bom-items/{id}")]
    public async Task<ActionResult> DeleteBomItem(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var item = await _context.BomItems.FindAsync(id);
            if (item == null)
            {
                return NotFound(new { error = "BOM物料不存在" });
            }
            
            _context.BomItems.Remove(item);
            await _context.SaveChangesAsync();
            return Ok(new { message = "BOM物料已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除BOM物料失败");
            return StatusCode(500, new { error = $"删除BOM物料失败: {ex.Message}" });
        }
    }
    
    // ========== 人力成本管理 ==========
    
    [HttpPost("{productCostId}/labor-costs")]
    public async Task<ActionResult<object>> CreateLaborCost(string productCostId, [FromBody] dynamic laborData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var hours = laborData.hours != null ? Convert.ToDecimal(laborData.hours) : 0;
            var hourlyRate = laborData.hourlyRate != null ? Convert.ToDecimal(laborData.hourlyRate) : 0;
            var totalCost = hours * hourlyRate;
            
            var labor = new LaborCost
            {
                Id = Guid.NewGuid().ToString(),
                ProductCostId = productCostId,
                TaskId = laborData.taskId?.ToString(),
                ProjectId = laborData.projectId?.ToString(),
                AssetId = laborData.assetId?.ToString(),
                EngineerId = laborData.engineerId?.ToString(),
                EngineerName = laborData.engineerName?.ToString(),
                WorkDescription = laborData.workDescription?.ToString(),
                Role = laborData.role?.ToString(),
                Hours = hours,
                HourlyRate = hourlyRate,
                TotalCost = totalCost,
                WorkDate = laborData.workDate?.ToString(),
                Notes = laborData.notes?.ToString(),
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            _context.LaborCosts.Add(labor);
            await _context.SaveChangesAsync();
            
            return Ok(new { id = labor.Id, message = "人力成本添加成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "添加人力成本失败");
            return StatusCode(500, new { error = $"添加人力成本失败: {ex.Message}" });
        }
    }
    
    [HttpPut("labor-costs/{id}")]
    public async Task<ActionResult> UpdateLaborCost(string id, [FromBody] dynamic laborData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var labor = await _context.LaborCosts.FindAsync(id);
            if (labor == null)
            {
                return NotFound(new { error = "人力成本不存在" });
            }
            
            if (laborData.taskId != null) labor.TaskId = laborData.taskId?.ToString();
            if (laborData.projectId != null) labor.ProjectId = laborData.projectId?.ToString();
            if (laborData.assetId != null) labor.AssetId = laborData.assetId?.ToString();
            if (laborData.engineerId != null) labor.EngineerId = laborData.engineerId?.ToString();
            if (laborData.engineerName != null) labor.EngineerName = laborData.engineerName?.ToString();
            if (laborData.workDescription != null) labor.WorkDescription = laborData.workDescription?.ToString();
            if (laborData.role != null) labor.Role = laborData.role?.ToString();
            if (laborData.hours != null) labor.Hours = Convert.ToDecimal(laborData.hours);
            if (laborData.hourlyRate != null) labor.HourlyRate = Convert.ToDecimal(laborData.hourlyRate);
            if (laborData.workDate != null) labor.WorkDate = laborData.workDate?.ToString();
            if (laborData.notes != null) labor.Notes = laborData.notes?.ToString();
            
            labor.TotalCost = labor.Hours * labor.HourlyRate;
            labor.UpdatedAt = DateTime.Now;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "人力成本更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新人力成本失败");
            return StatusCode(500, new { error = $"更新人力成本失败: {ex.Message}" });
        }
    }
    
    [HttpDelete("labor-costs/{id}")]
    public async Task<ActionResult> DeleteLaborCost(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var labor = await _context.LaborCosts.FindAsync(id);
            if (labor == null)
            {
                return NotFound(new { error = "人力成本不存在" });
            }
            
            _context.LaborCosts.Remove(labor);
            await _context.SaveChangesAsync();
            return Ok(new { message = "人力成本已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除人力成本失败");
            return StatusCode(500, new { error = $"删除人力成本失败: {ex.Message}" });
        }
    }
    
    // ========== 制造成本管理 ==========
    
    [HttpPost("{productCostId}/manufacturing-costs")]
    public async Task<ActionResult<object>> CreateManufacturingCost(string productCostId, [FromBody] dynamic manufacturingData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var quantity = manufacturingData.quantity != null ? Convert.ToDecimal(manufacturingData.quantity) : 1;
            var unitCost = manufacturingData.unitCost != null ? Convert.ToDecimal(manufacturingData.unitCost) : 0;
            var coefficient = manufacturingData.coefficient != null ? Convert.ToDecimal(manufacturingData.coefficient) : 1.0m;
            var totalCost = quantity * unitCost * coefficient;
            
            var maxOrder = await _context.ManufacturingCosts
                .Where(m => m.ProductCostId == productCostId)
                .Select(m => (int?)m.OrderIndex)
                .DefaultIfEmpty(-1)
                .MaxAsync() ?? -1;
            
            var manufacturing = new ManufacturingCost
            {
                Id = Guid.NewGuid().ToString(),
                ProductCostId = productCostId,
                CostName = manufacturingData.costName?.ToString() ?? string.Empty,
                CostType = manufacturingData.costType?.ToString(),
                Unit = manufacturingData.unit?.ToString() ?? "pcs",
                Quantity = quantity,
                UnitCost = unitCost,
                TotalCost = totalCost,
                Coefficient = coefficient,
                Supplier = manufacturingData.supplier?.ToString(),
                Notes = manufacturingData.notes?.ToString(),
                OrderIndex = maxOrder + 1,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            _context.ManufacturingCosts.Add(manufacturing);
            await _context.SaveChangesAsync();
            
            return Ok(new { id = manufacturing.Id, message = "制造成本添加成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "添加制造成本失败");
            return StatusCode(500, new { error = $"添加制造成本失败: {ex.Message}" });
        }
    }
    
    [HttpPut("manufacturing-costs/{id}")]
    public async Task<ActionResult> UpdateManufacturingCost(string id, [FromBody] dynamic manufacturingData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var manufacturing = await _context.ManufacturingCosts.FindAsync(id);
            if (manufacturing == null)
            {
                return NotFound(new { error = "制造成本不存在" });
            }
            
            if (manufacturingData.costName != null) manufacturing.CostName = manufacturingData.costName.ToString();
            if (manufacturingData.costType != null) manufacturing.CostType = manufacturingData.costType?.ToString();
            if (manufacturingData.unit != null) manufacturing.Unit = manufacturingData.unit.ToString();
            if (manufacturingData.quantity != null) manufacturing.Quantity = Convert.ToDecimal(manufacturingData.quantity);
            if (manufacturingData.unitCost != null) manufacturing.UnitCost = Convert.ToDecimal(manufacturingData.unitCost);
            if (manufacturingData.coefficient != null) manufacturing.Coefficient = Convert.ToDecimal(manufacturingData.coefficient);
            if (manufacturingData.supplier != null) manufacturing.Supplier = manufacturingData.supplier?.ToString();
            if (manufacturingData.notes != null) manufacturing.Notes = manufacturingData.notes?.ToString();
            if (manufacturingData.orderIndex != null) manufacturing.OrderIndex = Convert.ToInt32(manufacturingData.orderIndex);
            
            manufacturing.TotalCost = manufacturing.Quantity * manufacturing.UnitCost * manufacturing.Coefficient;
            manufacturing.UpdatedAt = DateTime.Now;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "制造成本更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新制造成本失败");
            return StatusCode(500, new { error = $"更新制造成本失败: {ex.Message}" });
        }
    }
    
    [HttpDelete("manufacturing-costs/{id}")]
    public async Task<ActionResult> DeleteManufacturingCost(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var manufacturing = await _context.ManufacturingCosts.FindAsync(id);
            if (manufacturing == null)
            {
                return NotFound(new { error = "制造成本不存在" });
            }
            
            _context.ManufacturingCosts.Remove(manufacturing);
            await _context.SaveChangesAsync();
            return Ok(new { message = "制造成本已删除" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "删除制造成本失败");
            return StatusCode(500, new { error = $"删除制造成本失败: {ex.Message}" });
        }
    }
    
    // ========== 售价管理 ==========
    
    [HttpPost("{productCostId}/pricing")]
    public async Task<ActionResult<object>> CreatePricing(string productCostId, [FromBody] dynamic pricingData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var pricing = new ProductPricing
            {
                Id = Guid.NewGuid().ToString(),
                ProductCostId = productCostId,
                SellingPrice = pricingData.sellingPrice != null ? Convert.ToDecimal(pricingData.sellingPrice) : 0,
                MinPrice = pricingData.minPrice != null ? Convert.ToDecimal(pricingData.minPrice) : null,
                MaxPrice = pricingData.maxPrice != null ? Convert.ToDecimal(pricingData.maxPrice) : null,
                ProfitMargin = pricingData.profitMargin != null ? Convert.ToDecimal(pricingData.profitMargin) : null,
                Currency = pricingData.currency?.ToString() ?? "CNY",
                Market = pricingData.market?.ToString(),
                Notes = pricingData.notes?.ToString(),
                EffectiveDate = pricingData.effectiveDate != null ? DateTime.Parse(pricingData.effectiveDate.ToString()) : DateTime.Now,
                ExpiryDate = pricingData.expiryDate != null ? DateTime.Parse(pricingData.expiryDate.ToString()) : null,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            _context.ProductPricings.Add(pricing);
            await _context.SaveChangesAsync();
            
            return Ok(new { id = pricing.Id, message = "售价配置创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建售价配置失败");
            return StatusCode(500, new { error = $"创建售价配置失败: {ex.Message}" });
        }
    }
    
    [HttpPut("pricing/{id}")]
    public async Task<ActionResult> UpdatePricing(string id, [FromBody] dynamic pricingData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var pricing = await _context.ProductPricings.FindAsync(id);
            if (pricing == null)
            {
                return NotFound(new { error = "售价配置不存在" });
            }
            
            if (pricingData.sellingPrice != null) pricing.SellingPrice = Convert.ToDecimal(pricingData.sellingPrice);
            if (pricingData.minPrice != null) pricing.MinPrice = Convert.ToDecimal(pricingData.minPrice);
            if (pricingData.maxPrice != null) pricing.MaxPrice = Convert.ToDecimal(pricingData.maxPrice);
            if (pricingData.profitMargin != null) pricing.ProfitMargin = Convert.ToDecimal(pricingData.profitMargin);
            if (pricingData.currency != null) pricing.Currency = pricingData.currency.ToString();
            if (pricingData.market != null) pricing.Market = pricingData.market?.ToString();
            if (pricingData.notes != null) pricing.Notes = pricingData.notes?.ToString();
            if (pricingData.effectiveDate != null) pricing.EffectiveDate = DateTime.Parse(pricingData.effectiveDate.ToString());
            if (pricingData.expiryDate != null) pricing.ExpiryDate = DateTime.Parse(pricingData.expiryDate.ToString());
            
            pricing.UpdatedAt = DateTime.Now;
            
            await _context.SaveChangesAsync();
            return Ok(new { message = "售价配置更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新售价配置失败");
            return StatusCode(500, new { error = $"更新售价配置失败: {ex.Message}" });
        }
    }
    
    // ========== 成本分析 ==========
    
    [HttpGet("{id}/analysis")]
    public async Task<ActionResult<object>> GetCostAnalysis(string id)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            var cost = await _context.ProductCosts
                .Include(pc => pc.BomItems)
                .Include(pc => pc.LaborCosts)
                .Include(pc => pc.ManufacturingCosts)
                .FirstOrDefaultAsync(pc => pc.Id == id);
            
            if (cost == null)
            {
                return NotFound(new { error = "产品成本不存在" });
            }
            
            var bomTotal = cost.BomItems.Sum(b => b.TotalPrice);
            var laborTotal = cost.LaborCosts.Sum(l => l.TotalCost);
            var manufacturingTotal = cost.ManufacturingCosts.Sum(m => m.TotalCost);
            var totalCost = bomTotal + laborTotal + manufacturingTotal;
            
            // 成本占比分析
            var costBreakdown = new
            {
                bom = new { total = bomTotal, percentage = totalCost > 0 ? (bomTotal / totalCost * 100) : 0 },
                labor = new { total = laborTotal, percentage = totalCost > 0 ? (laborTotal / totalCost * 100) : 0 },
                manufacturing = new { total = manufacturingTotal, percentage = totalCost > 0 ? (manufacturingTotal / totalCost * 100) : 0 }
            };
            
            // BOM物料成本分析（按类型、分类）
            var bomByType = cost.BomItems
                .GroupBy(b => b.MaterialType ?? "其他")
                .Select(g => new { type = g.Key, total = g.Sum(b => b.TotalPrice), count = g.Count() })
                .OrderByDescending(x => x.total)
                .ToList();
            
            var bomByCategory = cost.BomItems
                .GroupBy(b => b.Category ?? "其他")
                .Select(g => new { category = g.Key, total = g.Sum(b => b.TotalPrice), count = g.Count() })
                .OrderByDescending(x => x.total)
                .ToList();
            
            // 高成本物料（降本空间分析）
            var highCostMaterials = cost.BomItems
                .OrderByDescending(b => b.TotalPrice)
                .Take(10)
                .Select(b => new
                {
                    materialName = b.MaterialName,
                    materialCode = b.MaterialCode,
                    totalPrice = b.TotalPrice,
                    unitPrice = b.UnitPrice,
                    quantity = b.Quantity,
                    supplier = b.Supplier
                })
                .ToList();
            
            // 人力成本分析（按工程师、角色）
            var laborByEngineer = cost.LaborCosts
                .GroupBy(l => l.EngineerName ?? "未知")
                .Select(g => new { engineer = g.Key, total = g.Sum(l => l.TotalCost), hours = g.Sum(l => l.Hours) })
                .OrderByDescending(x => x.total)
                .ToList();
            
            var laborByRole = cost.LaborCosts
                .GroupBy(l => l.Role ?? "其他")
                .Select(g => new { role = g.Key, total = g.Sum(l => l.TotalCost), hours = g.Sum(l => l.Hours) })
                .OrderByDescending(x => x.total)
                .ToList();
            
            var result = new
            {
                totalCost = totalCost,
                costBreakdown = costBreakdown,
                bomAnalysis = new
                {
                    total = bomTotal,
                    itemCount = cost.BomItems.Count,
                    byType = bomByType,
                    byCategory = bomByCategory,
                    highCostMaterials = highCostMaterials
                },
                laborAnalysis = new
                {
                    total = laborTotal,
                    itemCount = cost.LaborCosts.Count,
                    totalHours = cost.LaborCosts.Sum(l => l.Hours),
                    byEngineer = laborByEngineer,
                    byRole = laborByRole
                },
                manufacturingAnalysis = new
                {
                    total = manufacturingTotal,
                    itemCount = cost.ManufacturingCosts.Count,
                    byType = cost.ManufacturingCosts
                        .GroupBy(m => m.CostType ?? "其他")
                        .Select(g => new { type = g.Key, total = g.Sum(m => m.TotalCost), count = g.Count() })
                        .OrderByDescending(x => x.total)
                        .ToList()
                }
            };
            
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取成本分析失败");
            return StatusCode(500, new { error = $"获取成本分析失败: {ex.Message}" });
        }
    }
    
    // ========== 复制成本记录（基于已有版本创建新版本） ==========
    
    [HttpPost("{id}/duplicate")]
    public async Task<ActionResult<object>> DuplicateProductCost(string id, [FromBody] dynamic duplicateData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
            
            // 获取源成本记录
            var sourceCost = await _context.ProductCosts
                .Include(pc => pc.BomItems)
                .Include(pc => pc.LaborCosts)
                .Include(pc => pc.ManufacturingCosts)
                .FirstOrDefaultAsync(pc => pc.Id == id);
            
            if (sourceCost == null)
            {
                return NotFound(new { error = "源产品成本不存在" });
            }
            
            // 处理 JSON 解析
            JObject json;
            if (duplicateData is JObject jObj)
            {
                json = jObj;
            }
            else if (duplicateData is System.Text.Json.JsonElement jsonElement)
            {
                var jsonString = jsonElement.GetRawText();
                json = JObject.Parse(jsonString);
            }
            else
            {
                json = JObject.FromObject(duplicateData);
            }
            
            // 获取新的产品版本ID（如果提供）
            var newProductVersionId = json["productVersionId"]?.ToString();
            if (string.IsNullOrWhiteSpace(newProductVersionId))
            {
                newProductVersionId = null;
            }
            
            // 如果指定了新的产品版本ID，验证它是否存在
            if (!string.IsNullOrEmpty(newProductVersionId))
            {
                var versionExists = await _context.ProductVersions.AnyAsync(v => v.Id == newProductVersionId);
                if (!versionExists)
                {
                    return BadRequest(new { error = $"产品版本不存在: {newProductVersionId}" });
                }
            }
            
            // 创建新的成本记录
            var newCost = new ProductCost
            {
                Id = Guid.NewGuid().ToString(),
                ProductId = sourceCost.ProductId,
                ProductVersionId = newProductVersionId, // 使用新的版本ID，如果为空则保持为null
                ProjectId = json["projectId"]?.ToString() ?? sourceCost.ProjectId,
                Specification = json["specification"]?.ToString() ?? sourceCost.Specification,
                Status = json["status"]?.ToString() ?? "draft",
                Notes = json["notes"]?.ToString() ?? sourceCost.Notes,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };
            
            _context.ProductCosts.Add(newCost);
            await _context.SaveChangesAsync(); // 先保存以获取新成本ID
            
            // 复制BOM物料
            foreach (var bomItem in sourceCost.BomItems)
            {
                var newBomItem = new BomItem
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductCostId = newCost.Id,
                    MaterialName = bomItem.MaterialName,
                    MaterialCode = bomItem.MaterialCode,
                    MaterialType = bomItem.MaterialType,
                    Unit = bomItem.Unit,
                    Quantity = bomItem.Quantity,
                    UnitPrice = bomItem.UnitPrice,
                    TotalPrice = bomItem.TotalPrice,
                    Supplier = bomItem.Supplier,
                    Category = bomItem.Category,
                    Notes = bomItem.Notes,
                    OrderIndex = bomItem.OrderIndex,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                _context.BomItems.Add(newBomItem);
            }
            
            // 复制人力成本
            foreach (var laborCost in sourceCost.LaborCosts)
            {
                var newLaborCost = new LaborCost
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductCostId = newCost.Id,
                    TaskId = laborCost.TaskId,
                    ProjectId = laborCost.ProjectId,
                    AssetId = laborCost.AssetId,
                    EngineerId = laborCost.EngineerId,
                    EngineerName = laborCost.EngineerName,
                    WorkDescription = laborCost.WorkDescription,
                    Role = laborCost.Role,
                    Hours = laborCost.Hours,
                    HourlyRate = laborCost.HourlyRate,
                    TotalCost = laborCost.TotalCost,
                    WorkDate = laborCost.WorkDate,
                    Notes = laborCost.Notes,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                _context.LaborCosts.Add(newLaborCost);
            }
            
            // 复制制造成本
            foreach (var manufacturingCost in sourceCost.ManufacturingCosts)
            {
                var newManufacturingCost = new ManufacturingCost
                {
                    Id = Guid.NewGuid().ToString(),
                    ProductCostId = newCost.Id,
                    CostName = manufacturingCost.CostName,
                    CostType = manufacturingCost.CostType,
                    Unit = manufacturingCost.Unit,
                    Quantity = manufacturingCost.Quantity,
                    UnitCost = manufacturingCost.UnitCost,
                    TotalCost = manufacturingCost.TotalCost,
                    Coefficient = manufacturingCost.Coefficient,
                    Supplier = manufacturingCost.Supplier,
                    Notes = manufacturingCost.Notes,
                    OrderIndex = manufacturingCost.OrderIndex,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                _context.ManufacturingCosts.Add(newManufacturingCost);
            }
            
            await _context.SaveChangesAsync();
            
            return Ok(new { id = newCost.Id, message = "成本记录复制成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "复制成本记录失败");
            return StatusCode(500, new { error = $"复制成本记录失败: {ex.Message}" });
        }
    }
}
