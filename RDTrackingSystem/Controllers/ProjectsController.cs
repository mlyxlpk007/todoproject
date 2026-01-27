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
public class ProjectsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ProjectsController> _logger;

    public ProjectsController(ApplicationDbContext context, ILogger<ProjectsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetProjects()
    {
        Console.WriteLine($"[ProjectsController] GetProjects() 开始执行 - {DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}");
        try
        {
            if (_context == null)
            {
                var errorMsg = "数据库上下文为空";
                Console.WriteLine($"[ProjectsController] GetProjects() 错误: {errorMsg}");
                _logger.LogError(errorMsg);
                return Ok(new List<object>());
            }

            Console.WriteLine($"[ProjectsController] GetProjects() 检查数据库连接状态...");
            var canConnect = await _context.Database.CanConnectAsync();
            Console.WriteLine($"[ProjectsController] GetProjects() 数据库连接状态: {canConnect}");

            if (!canConnect)
            {
                var errorMsg = "无法连接到数据库";
                Console.WriteLine($"[ProjectsController] GetProjects() 错误: {errorMsg}");
                _logger.LogError(errorMsg);
                return Ok(new List<object>());
            }

            Console.WriteLine($"[ProjectsController] GetProjects() 开始查询数据库...");
            var projects = await _context.Projects.ToListAsync();
            Console.WriteLine($"[ProjectsController] GetProjects() 查询完成，找到 {projects.Count} 个项目");

            var result = projects.Select(p => new
            {
                id = p.Id,
                orderNumber = p.OrderNumber,
                projectName = p.ProjectName,
                salesName = p.SalesName,
                deviceQuantity = p.DeviceQuantity,
                size = p.Size,
                moduleModel = p.ModuleModel,
                currentStageId = p.CurrentStageId,
                priority = p.Priority,
                estimatedCompletion = p.EstimatedCompletion,
                certificationRequirements = p.CertificationRequirements,
                installationEnvironment = p.InstallationEnvironment,
                region = p.Region,
                technicalRequirements = p.TechnicalRequirements,
                notes = p.Notes,
                localPath = p.LocalPath,
                timeline = _context.TimelineEvents
                    .Where(te => te.ProjectId == p.Id)
                    .OrderBy(te => te.Date)
                    .GroupBy(te => te.StageId)
                    .Select(g => new
                    {
                        stageId = g.Key,
                        date = g.Min(te => te.Date).ToString("yyyy-MM-dd"),
                        events = g.Select(te => new
                        {
                            id = te.Id,
                            date = te.Date.ToString("yyyy-MM-dd"),
                            description = te.Description,
                            attachment = !string.IsNullOrEmpty(te.AttachmentName) ? new
                            {
                                name = te.AttachmentName,
                                type = te.AttachmentType
                            } : null
                        }).OrderBy(e => e.date).ToList()
                    }).ToList()
            }).ToList();

            Console.WriteLine($"[ProjectsController] GetProjects() 成功，返回 {result.Count} 个项目");
            _logger.LogInformation("GetProjects() 成功，返回 {Count} 个项目", result.Count);
            return Ok(result);
        }
        catch (Exception ex)
        {
            var errorMsg = $"获取项目列表失败: {ex.Message}";
            Console.WriteLine($"[ProjectsController] GetProjects() 异常: {errorMsg}");
            Console.WriteLine($"[ProjectsController] GetProjects() 堆栈跟踪: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[ProjectsController] GetProjects() 内部异常: {ex.InnerException.Message}");
            }
            _logger.LogError(ex, "获取项目列表失败: {Message}\n堆栈跟踪: {StackTrace}", ex.Message, ex.StackTrace);
            return Ok(new List<object>());
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetProject(string id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound();
        }

        var timelineEvents = await _context.TimelineEvents
            .Where(te => te.ProjectId == project.Id)
            .OrderBy(te => te.Date)
            .ToListAsync();

        var timeline = timelineEvents
            .GroupBy(te => te.StageId)
            .Select(g => new
            {
                stageId = g.Key,
                date = g.Min(te => te.Date).ToString("yyyy-MM-dd"),
                events = g.Select(te => new
                {
                    id = te.Id,
                    date = te.Date.ToString("yyyy-MM-dd"),
                    description = te.Description,
                    attachment = !string.IsNullOrEmpty(te.AttachmentName) ? new
                    {
                        name = te.AttachmentName,
                        type = te.AttachmentType
                    } : null
                }).OrderBy(e => e.date).ToList()
            }).ToList();

        return Ok(new
        {
            id = project.Id,
            orderNumber = project.OrderNumber,
            projectName = project.ProjectName,
            salesName = project.SalesName,
            deviceQuantity = project.DeviceQuantity,
            size = project.Size,
            moduleModel = project.ModuleModel,
            currentStageId = project.CurrentStageId,
            priority = project.Priority,
            estimatedCompletion = project.EstimatedCompletion,
            certificationRequirements = project.CertificationRequirements,
            installationEnvironment = project.InstallationEnvironment,
            region = project.Region,
            technicalRequirements = project.TechnicalRequirements,
            notes = project.Notes,
            localPath = project.LocalPath,
            timeline = timeline
        });
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateProject([FromBody] dynamic projectData)
    {
        Console.WriteLine($"[ProjectsController] CreateProject() 开始执行 - {DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}");
        try
        {
            // 确保数据库架构是最新的（添加缺失的字段）
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                Console.WriteLine($"[ProjectsController] CreateProject() 架构迁移警告: {migrateEx.Message}");
                // 继续执行，不阻止项目创建
            }
            
            if (projectData == null)
            {
                var errorMsg = "项目数据为空";
                Console.WriteLine($"[ProjectsController] CreateProject() 错误: {errorMsg}");
                return BadRequest(new { error = errorMsg });
            }

            string orderNumber = projectData.orderNumber?.ToString() ?? string.Empty;
            var projectId = projectData.id?.ToString() ?? Guid.NewGuid().ToString();
            
            Console.WriteLine($"[ProjectsController] CreateProject() 项目ID: {projectId}, 订单号: {orderNumber}");

            // 检查订单号是否已存在
            if (!string.IsNullOrEmpty(orderNumber))
            {
                string orderNum = orderNumber; // 确保是明确的 string 类型
                var existingProject = await _context.Projects.FirstOrDefaultAsync(p => p.OrderNumber == orderNum);
                if (existingProject != null)
                {
                    var errorMsg = $"订单号 '{orderNumber}' 已存在";
                    Console.WriteLine($"[ProjectsController] CreateProject() 错误: {errorMsg}");
                    _logger.LogWarning(errorMsg);
                    return BadRequest(new { error = errorMsg });
                }
            }

            // 创建项目文件夹结构
            string? localPath = null;
            try
            {
                var projectName = projectData.projectName?.ToString() ?? string.Empty;
                localPath = ProjectFolderService.CreateProjectFolderStructure(
                    orderNumber, 
                    projectName, 
                    projectId,
                    FileLogger.Instance);
                
                if (localPath != null)
                {
                    Console.WriteLine($"[ProjectsController] CreateProject() 项目文件夹创建成功: {localPath}");
                }
                else
                {
                    Console.WriteLine($"[ProjectsController] CreateProject() 项目文件夹创建失败，但继续创建项目记录");
                }
            }
            catch (Exception folderEx)
            {
                Console.WriteLine($"[ProjectsController] CreateProject() 创建项目文件夹时出错: {folderEx.Message}");
                // 文件夹创建失败不影响项目记录的创建
            }

            var project = new Project
            {
                Id = projectId,
                OrderNumber = orderNumber,
                ProjectName = projectData.projectName?.ToString() ?? string.Empty,
                SalesName = projectData.salesName?.ToString(),
                DeviceQuantity = projectData.deviceQuantity != null ? (int)projectData.deviceQuantity : 0,
                Size = projectData.size?.ToString(),
                ModuleModel = projectData.moduleModel?.ToString(),
                CurrentStageId = projectData.currentStageId?.ToString() ?? "requirements",
                Priority = projectData.priority?.ToString() ?? "medium",
                EstimatedCompletion = projectData.estimatedCompletion?.ToString(),
                CertificationRequirements = projectData.certificationRequirements?.ToString(),
                InstallationEnvironment = projectData.installationEnvironment?.ToString(),
                Region = projectData.region?.ToString(),
                TechnicalRequirements = projectData.technicalRequirements?.ToString(),
                Notes = projectData.notes?.ToString(),
                LocalPath = localPath,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            Console.WriteLine($"[ProjectsController] CreateProject() 准备添加到数据库...");
            _context.Projects.Add(project);
            
            // 处理 timeline 事件
            if (projectData.timeline != null)
            {
                try
                {
                    var timelineData = JsonConvert.DeserializeObject<List<dynamic>>(projectData.timeline.ToString());
                    if (timelineData != null)
                    {
                        foreach (var stageTimeline in timelineData)
                        {
                            string stageId = stageTimeline.stageId?.ToString() ?? string.Empty;
                            var events = stageTimeline.events as Newtonsoft.Json.Linq.JArray;
                            
                            if (events != null)
                            {
                                foreach (var evt in events)
                                {
                                    var evtToken = evt as Newtonsoft.Json.Linq.JToken;
                                    var timelineEvent = new TimelineEvent
                                    {
                                        Id = evtToken?["id"]?.ToString() ?? Guid.NewGuid().ToString(),
                                        ProjectId = projectId,
                                        StageId = stageId,
                                        Date = DateTime.TryParse(evtToken?["date"]?.ToString(), out var date) ? date : DateTime.Now,
                                        Description = evtToken?["description"]?.ToString() ?? string.Empty,
                                        AttachmentName = evtToken?["attachment"]?["name"]?.ToString(),
                                        AttachmentType = evtToken?["attachment"]?["type"]?.ToString(),
                                        CreatedAt = DateTime.Now
                                    };
                                    _context.TimelineEvents.Add(timelineEvent);
                                }
                            }
                        }
                    }
                }
                catch (Exception timelineEx)
                {
                    Console.WriteLine($"[ProjectsController] CreateProject() 处理 timeline 失败: {timelineEx.Message}");
                    // 继续执行，不因为 timeline 解析失败而阻止项目创建
                }
            }
            
            Console.WriteLine($"[ProjectsController] CreateProject() 准备保存到数据库...");
            var changeCount = await _context.SaveChangesAsync();
            Console.WriteLine($"[ProjectsController] CreateProject() 保存成功，影响行数: {changeCount}");

            // 自动保存相关方（销售）
            if (!string.IsNullOrWhiteSpace(project.SalesName))
            {
                await StakeholderService.SaveStakeholderAsync(_context, project.SalesName, "sales");
            }

            _logger.LogInformation("项目创建成功: ID={ProjectId}, OrderNumber={OrderNumber}", project.Id, project.OrderNumber);
            return Ok(new { id = project.Id, message = "项目创建成功" });
        }
        catch (System.UnauthorizedAccessException authEx)
        {
            var dbPath = DatabaseConstants.GetDatabasePath();
            var errorMsg = $"拒绝访问数据库文件: {dbPath}\n\n" +
                          $"可能的原因:\n" +
                          $"1. 数据库文件或目录权限不足\n" +
                          $"2. 文件被设置为只读\n" +
                          $"3. 程序没有足够的权限写入该位置\n\n" +
                          $"解决方案:\n" +
                          $"1. 检查文件属性，确保不是只读\n" +
                          $"2. 以管理员身份运行程序\n" +
                          $"3. 检查文件夹权限，确保有写入权限\n\n" +
                          $"错误详情: {authEx.Message}";
            Console.WriteLine($"[ProjectsController] CreateProject() 权限异常: {errorMsg}");
            _logger.LogError(authEx, "创建项目失败（权限异常）: {Message}", authEx.Message);
            return StatusCode(500, new { error = errorMsg });
        }
        catch (System.IO.IOException ioEx)
        {
            var dbPath = DatabaseConstants.GetDatabasePath();
            var errorMsg = $"数据库文件访问失败: {ioEx.Message}\n\n" +
                          $"数据库路径: {dbPath}\n\n" +
                          $"可能的原因:\n" +
                          $"1. 数据库文件被其他程序锁定\n" +
                          $"2. 文件权限不足\n" +
                          $"3. 磁盘空间不足\n\n" +
                          $"解决方案:\n" +
                          $"1. 关闭可能正在使用数据库的其他程序\n" +
                          $"2. 检查文件权限\n" +
                          $"3. 检查磁盘空间";
            Console.WriteLine($"[ProjectsController] CreateProject() IO异常: {errorMsg}");
            _logger.LogError(ioEx, "创建项目失败（IO异常）: {Message}", ioEx.Message);
            return StatusCode(500, new { error = errorMsg });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException dbEx)
        {
            var errorMsg = $"数据库更新失败: {dbEx.Message}";
            Console.WriteLine($"[ProjectsController] CreateProject() 数据库异常: {errorMsg}");
            Console.WriteLine($"[ProjectsController] CreateProject() 堆栈跟踪: {dbEx.StackTrace}");
            if (dbEx.InnerException != null)
            {
                Console.WriteLine($"[ProjectsController] CreateProject() 内部异常: {dbEx.InnerException.Message}");
                errorMsg += $"\n内部异常: {dbEx.InnerException.Message}";
                
                // 检查是否是权限问题
                if (dbEx.InnerException is System.UnauthorizedAccessException || 
                    dbEx.InnerException.Message.Contains("拒绝访问") ||
                    dbEx.InnerException.Message.Contains("Access") ||
                    dbEx.InnerException.Message.Contains("denied"))
                {
                    var dbPath = DatabaseConstants.GetDatabasePath();
                    errorMsg = $"拒绝访问数据库文件: {dbPath}\n\n" +
                              $"可能的原因:\n" +
                              $"1. 数据库文件或目录权限不足\n" +
                              $"2. 文件被设置为只读\n" +
                              $"3. 程序没有足够的权限写入该位置\n\n" +
                              $"解决方案:\n" +
                              $"1. 检查文件属性，确保不是只读\n" +
                              $"2. 以管理员身份运行程序\n" +
                              $"3. 检查文件夹权限，确保有写入权限";
                }
            }
            _logger.LogError(dbEx, "创建项目失败（数据库异常）: {Message}", dbEx.Message);
            return StatusCode(500, new { error = errorMsg, details = dbEx.InnerException?.Message });
        }
        catch (Exception ex)
        {
            var errorMsg = $"创建项目失败: {ex.Message}";
            Console.WriteLine($"[ProjectsController] CreateProject() 异常: {errorMsg}");
            Console.WriteLine($"[ProjectsController] CreateProject() 堆栈跟踪: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[ProjectsController] CreateProject() 内部异常: {ex.InnerException.Message}");
                errorMsg += $"\n内部异常: {ex.InnerException.Message}";
            }
            _logger.LogError(ex, "创建项目失败: {Message}\n堆栈跟踪: {StackTrace}", ex.Message, ex.StackTrace);
            return StatusCode(500, new { error = errorMsg, details = ex.InnerException?.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateProject(string id, [FromBody] dynamic projectData)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound();
        }

        try
        {
            // 更新 timeline 事件（先删除旧的，再添加新的）
            if (projectData.timeline != null)
            {
                // 删除该项目的所有旧事件
                var oldEvents = await _context.TimelineEvents
                    .Where(te => te.ProjectId == id)
                    .ToListAsync();
                _context.TimelineEvents.RemoveRange(oldEvents);
                
                // 添加新事件
                try
                {
                    var timelineData = JsonConvert.DeserializeObject<List<dynamic>>(projectData.timeline.ToString());
                    if (timelineData != null)
                    {
                        foreach (var stageTimeline in timelineData)
                        {
                            string stageId = stageTimeline.stageId?.ToString() ?? string.Empty;
                            var events = stageTimeline.events as Newtonsoft.Json.Linq.JArray;
                            
                            if (events != null)
                            {
                                foreach (var evt in events)
                                {
                                    var evtToken = evt as Newtonsoft.Json.Linq.JToken;
                                    var timelineEvent = new TimelineEvent
                                    {
                                        Id = evtToken?["id"]?.ToString() ?? Guid.NewGuid().ToString(),
                                        ProjectId = id,
                                        StageId = stageId,
                                        Date = DateTime.TryParse(evtToken?["date"]?.ToString(), out var date) ? date : DateTime.Now,
                                        Description = evtToken?["description"]?.ToString() ?? string.Empty,
                                        AttachmentName = evtToken?["attachment"]?["name"]?.ToString(),
                                        AttachmentType = evtToken?["attachment"]?["type"]?.ToString(),
                                        CreatedAt = DateTime.Now
                                    };
                                    _context.TimelineEvents.Add(timelineEvent);
                                }
                            }
                        }
                    }
                }
                catch (Exception timelineEx)
                {
                    Console.WriteLine($"[ProjectsController] UpdateProject() 处理 timeline 失败: {timelineEx.Message}");
                    // 继续执行，不因为 timeline 解析失败而阻止项目更新
                }
            }
            
            project.OrderNumber = projectData.orderNumber?.ToString() ?? project.OrderNumber;
            project.ProjectName = projectData.projectName?.ToString() ?? project.ProjectName;
            project.SalesName = projectData.salesName?.ToString();
            project.DeviceQuantity = projectData.deviceQuantity != null ? (int)projectData.deviceQuantity : project.DeviceQuantity;
            project.Size = projectData.size?.ToString();
            project.ModuleModel = projectData.moduleModel?.ToString();
            project.CurrentStageId = projectData.currentStageId?.ToString() ?? project.CurrentStageId;
            project.Priority = projectData.priority?.ToString() ?? project.Priority;
            project.EstimatedCompletion = projectData.estimatedCompletion?.ToString();
            project.CertificationRequirements = projectData.certificationRequirements?.ToString();
            project.InstallationEnvironment = projectData.installationEnvironment?.ToString();
            project.Region = projectData.region?.ToString();
            project.TechnicalRequirements = projectData.technicalRequirements?.ToString();
            project.Notes = projectData.notes?.ToString();
            project.LocalPath = projectData.localPath?.ToString();
            project.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            
            // 自动保存相关方（销售）
            if (!string.IsNullOrWhiteSpace(project.SalesName))
            {
                await StakeholderService.SaveStakeholderAsync(_context, project.SalesName, "sales");
            }
            
            return Ok(new { message = "项目更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新项目失败");
            return StatusCode(500, new { message = "更新项目失败", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteProject(string id)
    {
        var project = await _context.Projects.FindAsync(id);
        if (project == null)
        {
            return NotFound();
        }

        _context.Projects.Remove(project);
        await _context.SaveChangesAsync();
        return Ok(new { message = "项目已删除" });
    }
}
