using System.Runtime.InteropServices;
using Microsoft.Web.WebView2.Core;
using RDTrackingSystem.Data;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Windows.Forms;
using RDTrackingSystem.Models;
using RDTrackingSystem.Models.DTOs;
using System.Collections.Generic;
using System.Linq;

namespace RDTrackingSystem.Services;

[ComVisible(true)]
public class WebViewBridge
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<WebViewBridge>? _logger;

    public WebViewBridge(ApplicationDbContext context, ILogger<WebViewBridge>? logger = null)
    {
        _context = context;
        _logger = logger;
        
        var fileLogger = FileLogger.Instance;
        fileLogger.LogInfo("WebViewBridge 对象已创建", "WebViewBridge");
        fileLogger.LogInfo($"数据库上下文: {(_context != null ? "已设置" : "为空")}", "WebViewBridge");
        
        // 测试数据库连接并查询数据
        if (_context != null)
        {
            try
            {
                var dbPath = DatabaseConstants.GetDatabasePath();
                fileLogger.LogInfo($"测试数据库连接，路径: {dbPath}", "WebViewBridge");
                
                // 测试连接
                var canConnect = _context.Database.CanConnect();
                fileLogger.LogInfo($"数据库连接测试结果: {canConnect}", "WebViewBridge");
                
                if (canConnect)
                {
                    // 查询用户数量
                    var userCount = _context.Users.Count();
                    fileLogger.LogInfo($"数据库中有 {userCount} 个用户", "WebViewBridge");
                    
                    // 查询任务数量
                    var taskCount = _context.Tasks.Count();
                    fileLogger.LogInfo($"数据库中有 {taskCount} 个任务", "WebViewBridge");
                    
                    // 查询项目数量
                    var projectCount = _context.Projects.Count();
                    fileLogger.LogInfo($"数据库中有 {projectCount} 个项目", "WebViewBridge");
                    
                    // 验证GetUsers()方法能正常工作，确保前端可以查询到数据
                    try
                    {
                        fileLogger.LogInfo("验证GetUsers()方法可用性...", "WebViewBridge");
                        var usersJson = GetUsers();
                        if (!string.IsNullOrEmpty(usersJson))
                        {
                            // 尝试解析JSON验证格式正确
                            var usersList = JsonConvert.DeserializeObject<List<UserDto>>(usersJson);
                            if (usersList != null)
                            {
                                fileLogger.LogInfo($"GetUsers()方法验证成功，返回了 {usersList.Count} 个用户，前端可以正常查询", "WebViewBridge");
                            }
                            else
                            {
                                fileLogger.LogWarning("GetUsers()返回的JSON无法解析为用户列表", "WebViewBridge");
                            }
                        }
                        else
                        {
                            fileLogger.LogWarning("GetUsers()返回空字符串", "WebViewBridge");
                        }
                    }
                    catch (Exception verifyEx)
                    {
                        fileLogger.LogError($"验证GetUsers()方法时出错: {verifyEx.Message}", verifyEx, "WebViewBridge");
                    }
                }
            }
            catch (Exception ex)
            {
                fileLogger.LogError($"测试数据库连接时出错: {ex.Message}", ex, "WebViewBridge");
            }
        }
    }

    // ========== 项目 API - 简化版本 ==========
    public string GetProjects()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetProjects() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var projects = _context.Projects.AsNoTracking().ToList();
            logger.LogInfo($"查询完成，找到 {projects.Count} 个项目", "WebViewBridge");

            var resultList = projects.Select(p => new ProjectDto
            {
                Id = p.Id ?? string.Empty,
                OrderNumber = p.OrderNumber ?? string.Empty,
                ProjectName = p.ProjectName ?? string.Empty,
                SalesName = p.SalesName,
                DeviceQuantity = p.DeviceQuantity,
                Size = p.Size,
                ModuleModel = p.ModuleModel,
                CurrentStageId = p.CurrentStageId ?? "requirements",
                Priority = p.Priority ?? "medium",
                EstimatedCompletion = p.EstimatedCompletion,
                CertificationRequirements = p.CertificationRequirements,
                InstallationEnvironment = p.InstallationEnvironment,
                Region = p.Region,
                TechnicalRequirements = p.TechnicalRequirements,
                Notes = p.Notes,
                LocalPath = p.LocalPath,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            }).ToList();

            return JsonConvert.SerializeObject(resultList, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取项目列表失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetProject(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetProject() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var project = _context.Projects.FirstOrDefault(p => p.Id == id);
            if (project == null)
            {
                return JsonConvert.SerializeObject(new { error = $"项目不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var timelineEvents = _context.TimelineEvents
                .Where(te => te.ProjectId == project.Id)
                .OrderBy(te => te.Date)
                .ToList();

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

            var result = new
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
            };

            logger.LogInfo($"GetProject() 成功，返回项目: {project.ProjectName}", "WebViewBridge");
            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取项目失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateProject(string projectDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateProject() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库架构是最新的
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var projectData = JsonConvert.DeserializeObject<dynamic>(projectDataJson);
            if (projectData == null)
            {
                return JsonConvert.SerializeObject(new { error = "项目数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            string orderNumber = projectData.orderNumber?.ToString() ?? string.Empty;
            var projectId = projectData.id?.ToString() ?? Guid.NewGuid().ToString();
            
            logger.LogInfo($"CreateProject() 项目ID: {projectId}, 订单号: {orderNumber}", "WebViewBridge");

            // 检查订单号是否已存在
            if (!string.IsNullOrEmpty(orderNumber))
            {
                var existingProject = _context.Projects.FirstOrDefault(p => p.OrderNumber == orderNumber);
                if (existingProject != null)
                {
                    var errorMsg = $"订单号已存在: {orderNumber}";
                    logger.LogWarning(errorMsg, "WebViewBridge");
                    return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
                    {
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    });
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
                    logger);
                
                if (string.IsNullOrEmpty(localPath))
                {
                    logger.LogWarning($"项目文件夹创建失败或路径为空，项目将不关联本地路径。订单号: {orderNumber}", "WebViewBridge");
                }
            }
            catch (Exception folderEx)
            {
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

            _context.Projects.Add(project);
            _context.SaveChanges();

            logger.LogInfo($"项目创建成功，ID: {projectId}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { id = project.Id, message = "项目创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"创建项目失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string UpdateProject(string id, string projectDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"UpdateProject() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库架构是最新的
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var project = _context.Projects.FirstOrDefault(p => p.Id == id);
            if (project == null)
            {
                return JsonConvert.SerializeObject(new { error = $"项目不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var projectData = JsonConvert.DeserializeObject<dynamic>(projectDataJson);
            if (projectData == null)
            {
                return JsonConvert.SerializeObject(new { error = "项目数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 检查订单号是否已存在（如果更改了订单号）
            string? newOrderNumber = projectData.orderNumber?.ToString();
            if (!string.IsNullOrEmpty(newOrderNumber) && newOrderNumber != project.OrderNumber)
            {
                var existingProject = _context.Projects.FirstOrDefault(p => p.OrderNumber == newOrderNumber && p.Id != id);
                if (existingProject != null)
                {
                    var errorMsg = $"订单号已存在: {newOrderNumber}";
                    logger.LogWarning(errorMsg, "WebViewBridge");
                    return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
                    {
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    });
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
            project.UpdatedAt = DateTime.Now;

            _context.SaveChanges();
            logger.LogInfo($"项目更新成功，ID: {id}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { message = "项目更新成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"更新项目失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteProject(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteProject() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var project = _context.Projects.FirstOrDefault(p => p.Id == id);
            if (project == null)
            {
                return JsonConvert.SerializeObject(new { error = $"项目不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            _context.Projects.Remove(project);
            _context.SaveChanges();
            logger.LogInfo($"项目删除成功，ID: {id}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { message = "项目删除成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"删除项目失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 用户 API - 简化版本 ==========
    public string GetUsers()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetUsers() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                var errorMsg = "数据库上下文为空";
                logger.LogError(errorMsg, null, "WebViewBridge");
                return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库连接可用
            if (!_context.Database.CanConnect())
            {
                var errorMsg = "无法连接到数据库";
                logger.LogError(errorMsg, null, "WebViewBridge");
                return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 让 EF Core 自动管理连接，不要手动干预
            var users = _context.Users.AsNoTracking().ToList();
            logger.LogInfo($"查询完成，找到 {users.Count} 个用户", "WebViewBridge");

            // 转换为 DTO
            var resultList = users.Select(u => new UserDto
            {
                Id = u.Id ?? string.Empty,
                Name = u.Name ?? string.Empty,
                Email = u.Email ?? string.Empty,
                Role = u.Role ?? string.Empty,
                Avatar = u.Avatar,
                SkillTags = u.SkillTags,
                MaxConcurrentTasks = u.MaxConcurrentTasks,
                AvailabilityRate = u.AvailabilityRate,
                LeavePercentage = u.LeavePercentage,
                MeetingPercentage = u.MeetingPercentage,
                SupportWorkPercentage = u.SupportWorkPercentage
            }).ToList();

            // 序列化为 JSON
            var jsonResult = JsonConvert.SerializeObject(resultList, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });

            logger.LogInfo($"GetUsers() 成功，返回 {resultList.Count} 个用户", "WebViewBridge");
            if (resultList.Count > 0)
            {
                logger.LogInfo($"第一个用户示例: ID={resultList[0].Id}, Name={resultList[0].Name}, Email={resultList[0].Email}", "WebViewBridge");
                logger.LogInfo($"JSON结果长度: {jsonResult.Length} 字符", "WebViewBridge");
            }
            return jsonResult;
        }
        catch (Exception ex)
        {
            var errorMsg = $"获取用户列表失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            if (ex.InnerException != null)
            {
                logger.LogError($"内部异常: {ex.InnerException.Message}", ex.InnerException, "WebViewBridge");
            }
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 用户 CRUD API ==========
    public string CreateUser(string userDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateUser() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                var errorMsg = "数据库上下文为空";
                logger.LogError(errorMsg, null, "WebViewBridge");
                return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            
            // 确保数据库架构是最新的（添加缺失的字段）
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var userData = JsonConvert.DeserializeObject<dynamic>(userDataJson);
            if (userData == null)
            {
                return JsonConvert.SerializeObject(new { error = "用户数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var userId = userData.id?.ToString() ?? Guid.NewGuid().ToString();
            string email = userData.email?.ToString() ?? string.Empty;

            // 检查邮箱是否已存在
            if (!string.IsNullOrEmpty(email))
            {
                var existingUser = _context.Users.FirstOrDefault(u => u.Email == email);
                if (existingUser != null)
                {
                    var errorMsg = $"邮箱 '{email}' 已存在";
                    logger.LogWarning(errorMsg, "WebViewBridge");
                    return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
                    {
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    });
                }
            }

            var user = new User
            {
                Id = userId,
                Name = userData.name?.ToString() ?? string.Empty,
                Email = email,
                Role = userData.role?.ToString() ?? string.Empty,
                Avatar = userData.avatar?.ToString(),
                SkillTags = userData.skillTags?.ToString(),
                MaxConcurrentTasks = userData.maxConcurrentTasks != null ? (int)userData.maxConcurrentTasks : 5,
                AvailabilityRate = userData.availabilityRate != null ? (double)userData.availabilityRate : 1.0,
                LeavePercentage = userData.leavePercentage != null ? (double)userData.leavePercentage : 0.0,
                MeetingPercentage = userData.meetingPercentage != null ? (double)userData.meetingPercentage : 0.1,
                SupportWorkPercentage = userData.supportWorkPercentage != null ? (double)userData.supportWorkPercentage : 0.1
            };

            logger.LogInfo($"准备添加用户: {user.Name} ({user.Email})", "WebViewBridge");
            _context.Users.Add(user);
            
            // 确保连接已打开并设置PRAGMA
            var changeCount = _context.SaveChanges();
            logger.LogInfo($"用户创建成功，影响行数: {changeCount}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { id = user.Id, message = "用户添加成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (System.UnauthorizedAccessException authEx)
        {
            var dbPath = DatabaseConstants.GetDatabasePath();
            var errorMsg = $"拒绝访问数据库文件: {dbPath}\n\n可能的原因:\n1. 数据库文件或目录权限不足\n2. 文件被设置为只读\n3. 程序没有足够的权限写入该位置\n\n解决方案:\n1. 检查文件属性，确保不是只读\n2. 以管理员身份运行程序\n3. 检查文件夹权限，确保有写入权限\n\n错误详情: {authEx.Message}";
            logger.LogError(errorMsg, authEx, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"创建用户失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg, details = ex.InnerException?.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string UpdateUser(string id, string userDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"UpdateUser() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var user = _context.Users.FirstOrDefault(u => u.Id == id);
            if (user == null)
            {
                return JsonConvert.SerializeObject(new { error = $"用户不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var userData = JsonConvert.DeserializeObject<dynamic>(userDataJson);
            if (userData != null)
            {
                if (userData.name != null) user.Name = userData.name.ToString();
                if (userData.email != null) user.Email = userData.email.ToString();
                if (userData.role != null) user.Role = userData.role.ToString();
                if (userData.avatar != null) user.Avatar = userData.avatar.ToString();
                if (userData.skillTags != null) user.SkillTags = userData.skillTags.ToString();
                if (userData.maxConcurrentTasks != null) user.MaxConcurrentTasks = (int)userData.maxConcurrentTasks;
                if (userData.availabilityRate != null) user.AvailabilityRate = (double)userData.availabilityRate;
                if (userData.leavePercentage != null) user.LeavePercentage = (double)userData.leavePercentage;
                if (userData.meetingPercentage != null) user.MeetingPercentage = (double)userData.meetingPercentage;
                if (userData.supportWorkPercentage != null) user.SupportWorkPercentage = (double)userData.supportWorkPercentage;
            }

            var changeCount = _context.SaveChanges();
            logger.LogInfo($"用户更新成功，影响行数: {changeCount}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { id = user.Id, message = "用户更新成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"更新用户失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteUser(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteUser() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var user = _context.Users.FirstOrDefault(u => u.Id == id);
            if (user == null)
            {
                return JsonConvert.SerializeObject(new { error = $"用户不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            _context.Users.Remove(user);
            var changeCount = _context.SaveChanges();
            logger.LogInfo($"用户删除成功，影响行数: {changeCount}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { message = "用户删除成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"删除用户失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 任务 API - 简化版本 ==========
    public string GetTasks()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetTasks() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var tasks = _context.Tasks.AsNoTracking().ToList();
            logger.LogInfo($"查询完成，找到 {tasks.Count} 个任务", "WebViewBridge");

            var resultList = tasks.Select(t =>
            {
                // 解析 AssignedToJson 字符串为 List<string>
                List<string> assignedTo = new List<string>();
                if (!string.IsNullOrEmpty(t.AssignedToJson))
                {
                    try
                    {
                        assignedTo = JsonConvert.DeserializeObject<List<string>>(t.AssignedToJson) ?? new List<string>();
                    }
                    catch
                    {
                        assignedTo = new List<string>();
                    }
                }
                
                return new TaskDto
                {
                    Id = t.Id ?? string.Empty,
                    Name = t.Name ?? string.Empty,
                    ProjectId = t.ProjectId,
                    AssignedTo = assignedTo,
                    StartDate = t.StartDate ?? string.Empty,
                    EndDate = t.EndDate ?? string.Empty,
                    Requirements = t.Requirements,
                    Stakeholder = t.Stakeholder,
                    Priority = t.Priority,
                    Status = t.Status ?? "pending",
                    TaskType = t.TaskType ?? "project",
                    CompletedDate = t.CompletedDate,
                    CompletionNotes = t.CompletionNotes,
                    CompletedBy = t.CompletedBy,
                    CreatedAt = t.CreatedAt,
                    UpdatedAt = t.UpdatedAt
                };
            }).ToList();

            return JsonConvert.SerializeObject(resultList, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取任务列表失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateTask(string taskDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateTask() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库架构是最新的
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var taskData = JsonConvert.DeserializeObject<dynamic>(taskDataJson);
            if (taskData == null)
            {
                return JsonConvert.SerializeObject(new { error = "任务数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var task = new Models.Task
            {
                Id = taskData.id?.ToString() ?? Guid.NewGuid().ToString(),
                Name = taskData.name?.ToString() ?? string.Empty,
                ProjectId = taskData.projectId?.ToString(),
                AssignedToJson = taskData.assignedTo != null 
                    ? JsonConvert.SerializeObject(taskData.assignedTo) 
                    : "[]",
                StartDate = taskData.startDate?.ToString() ?? string.Empty,
                EndDate = taskData.endDate?.ToString() ?? string.Empty,
                Requirements = !string.IsNullOrWhiteSpace(taskData.requirements?.ToString()) 
                    ? taskData.requirements.ToString() 
                    : null,
                Stakeholder = !string.IsNullOrWhiteSpace(taskData.stakeholder?.ToString()) 
                    ? taskData.stakeholder.ToString() 
                    : null,
                Priority = !string.IsNullOrWhiteSpace(taskData.priority?.ToString()) 
                    ? taskData.priority.ToString() 
                    : "medium",
                Status = !string.IsNullOrWhiteSpace(taskData.status?.ToString()) 
                    ? taskData.status.ToString() 
                    : "pending",
                TaskType = !string.IsNullOrWhiteSpace(taskData.taskType?.ToString()) 
                    ? taskData.taskType.ToString() 
                    : "project",
                CompletedDate = !string.IsNullOrWhiteSpace(taskData.completedDate?.ToString()) 
                    ? taskData.completedDate.ToString() 
                    : null,
                CompletionNotes = !string.IsNullOrWhiteSpace(taskData.completionNotes?.ToString()) 
                    ? taskData.completionNotes.ToString() 
                    : null,
                CompletedBy = !string.IsNullOrWhiteSpace(taskData.completedBy?.ToString()) 
                    ? taskData.completedBy.ToString() 
                    : null,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Tasks.Add(task);
            
            // 如果保存失败，尝试再次迁移并重试
            try
            {
                _context.SaveChanges();
            }
            catch (Microsoft.Data.Sqlite.SqliteException sqlEx) when (sqlEx.Message.Contains("no such column") || sqlEx.Message.Contains("unknown column"))
            {
                logger.LogWarning($"保存任务时发现字段缺失，尝试迁移: {sqlEx.Message}", "WebViewBridge");
                DatabaseSchemaMigrator.MigrateSchema();
                
                // 重新创建上下文并重试
                _context.Entry(task).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
                _context.Tasks.Add(task);
                _context.SaveChanges();
            }

            logger.LogInfo($"任务创建成功，ID: {task.Id}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { id = task.Id, message = "任务创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"创建任务失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string UpdateTask(string id, string taskDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"UpdateTask() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库架构是最新的
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var task = _context.Tasks.FirstOrDefault(t => t.Id == id);
            if (task == null)
            {
                return JsonConvert.SerializeObject(new { error = $"任务不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var taskData = JsonConvert.DeserializeObject<dynamic>(taskDataJson);
            if (taskData == null)
            {
                return JsonConvert.SerializeObject(new { error = "任务数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            task.Name = taskData.name?.ToString() ?? task.Name;
            task.ProjectId = taskData.projectId?.ToString();
            task.AssignedToJson = taskData.assignedTo != null 
                ? JsonConvert.SerializeObject(taskData.assignedTo) 
                : task.AssignedToJson;
            task.StartDate = taskData.startDate?.ToString() ?? task.StartDate;
            task.EndDate = taskData.endDate?.ToString() ?? task.EndDate;
            task.Requirements = taskData.requirements != null 
                ? (string.IsNullOrWhiteSpace(taskData.requirements.ToString()) ? null : taskData.requirements.ToString())
                : task.Requirements;
            task.Stakeholder = taskData.stakeholder != null 
                ? (string.IsNullOrWhiteSpace(taskData.stakeholder.ToString()) ? null : taskData.stakeholder.ToString())
                : task.Stakeholder;
            task.Priority = !string.IsNullOrWhiteSpace(taskData.priority?.ToString()) 
                ? taskData.priority.ToString() 
                : (task.Priority ?? "medium");
            task.Status = !string.IsNullOrWhiteSpace(taskData.status?.ToString()) 
                ? taskData.status.ToString() 
                : (task.Status ?? "pending");
            task.TaskType = !string.IsNullOrWhiteSpace(taskData.taskType?.ToString()) 
                ? taskData.taskType.ToString() 
                : (task.TaskType ?? "project");
            task.CompletedDate = taskData.completedDate != null 
                ? (string.IsNullOrWhiteSpace(taskData.completedDate.ToString()) ? null : taskData.completedDate.ToString())
                : task.CompletedDate;
            task.CompletionNotes = taskData.completionNotes != null 
                ? (string.IsNullOrWhiteSpace(taskData.completionNotes.ToString()) ? null : taskData.completionNotes.ToString())
                : task.CompletionNotes;
            task.CompletedBy = taskData.completedBy != null 
                ? (string.IsNullOrWhiteSpace(taskData.completedBy.ToString()) ? null : taskData.completedBy.ToString())
                : task.CompletedBy;
            task.UpdatedAt = DateTime.Now;

            _context.SaveChanges();
            logger.LogInfo($"任务更新成功，ID: {id}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { message = "任务更新成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"更新任务失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteTask(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteTask() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var task = _context.Tasks.FirstOrDefault(t => t.Id == id);
            if (task == null)
            {
                return JsonConvert.SerializeObject(new { error = $"任务不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            _context.Tasks.Remove(task);
            _context.SaveChanges();
            logger.LogInfo($"任务删除成功，ID: {id}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { message = "任务删除成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"删除任务失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 数据库配置 API ==========
    public string GetDatabaseConfig()
    {
        try
        {
            var dbPath = DatabaseConnectionHelper.GetNormalizedDatabasePath();
            var dbDirectory = Path.GetDirectoryName(dbPath);
            var fileExists = File.Exists(dbPath);
            var directoryExists = !string.IsNullOrEmpty(dbDirectory) && Directory.Exists(dbDirectory);
            
            long? fileSize = null;
            DateTime? lastModified = null;
            bool? isReadOnly = null;
            
            if (fileExists)
            {
                try
                {
                    var fileInfo = new FileInfo(dbPath);
                    fileSize = fileInfo.Length;
                    lastModified = fileInfo.LastWriteTime;
                    isReadOnly = fileInfo.IsReadOnly;
                }
                catch { }
            }
            
            bool? hasWritePermission = null;
            if (directoryExists)
            {
                try
                {
                    var testFile = Path.Combine(dbDirectory!, ".write_test");
                    File.WriteAllText(testFile, "test");
                    File.Delete(testFile);
                    hasWritePermission = true;
                }
                catch
                {
                    hasWritePermission = false;
                }
            }
            
            var result = new
            {
                currentPath = dbPath,
                directory = dbDirectory ?? "",
                fileExists = fileExists,
                directoryExists = directoryExists,
                fileSize = fileSize,
                fileSizeFormatted = fileSize.HasValue ? $"{fileSize.Value / 1024.0 / 1024.0:F2} MB" : null,
                lastModified = lastModified?.ToString("yyyy-MM-dd HH:mm:ss"),
                isReadOnly = isReadOnly,
                hasWritePermission = hasWritePermission,
                configFilePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "config.ini")
            };
            
            return JsonConvert.SerializeObject(result, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var logger = FileLogger.Instance;
            logger.LogError("GetDatabaseConfig() 执行失败", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }
    
    public string SetDatabasePath(string newPath)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"SetDatabasePath() 开始执行，新路径: {newPath}", "WebViewBridge");
        
        try
        {
            if (string.IsNullOrWhiteSpace(newPath))
            {
                return JsonConvert.SerializeObject(new { error = "路径不能为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            
            // 规范化路径
            string normalizedPath;
            var programBaseDir = AppDomain.CurrentDomain.BaseDirectory;
            if (Path.IsPathRooted(newPath))
            {
                normalizedPath = Path.GetFullPath(newPath);
            }
            else
            {
                normalizedPath = Path.GetFullPath(Path.Combine(programBaseDir, newPath));
            }
            
            logger.LogInfo($"规范化后的路径: {normalizedPath}", "WebViewBridge");
            
            // 验证目录
            var directory = Path.GetDirectoryName(normalizedPath);
            if (string.IsNullOrEmpty(directory))
            {
                return JsonConvert.SerializeObject(new { error = "无效的路径格式" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            
            // 确保目录存在且有写入权限
            try
            {
                if (!Directory.Exists(directory))
                {
                    Directory.CreateDirectory(directory);
                }
                
                var testFile = Path.Combine(directory, ".write_test");
                File.WriteAllText(testFile, "test");
                File.Delete(testFile);
            }
            catch (Exception ex)
            {
                var errorMsg = $"无法创建或访问目录: {directory}\n\n错误: {ex.Message}";
                logger.LogError(errorMsg, ex, "WebViewBridge");
                return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            
            // 保存配置（尝试使用相对路径）
            string configPath;
            try
            {
                var relativePath = Path.GetRelativePath(programBaseDir, normalizedPath);
                if (relativePath.StartsWith(".."))
                {
                    configPath = normalizedPath;
                }
                else
                {
                    configPath = relativePath;
                }
            }
            catch
            {
                configPath = normalizedPath;
            }
            
            ConfigManager.SetValue("Database", "Path", configPath);
            ConfigManager.ClearCache();
            logger.LogInfo($"已保存数据库路径配置: {configPath}", "WebViewBridge");
            
            return JsonConvert.SerializeObject(new { 
                success = true,
                message = "数据库路径已更新，请重启程序以应用更改",
                newPath = normalizedPath,
                configPath = configPath
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError("SetDatabasePath() 执行失败", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }
    
    /// <summary>
    /// 测试数据库连接（详细诊断）
    /// </summary>
    public string TestDatabaseConnection()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("TestDatabaseConnection() 开始执行", "WebViewBridge");
        
        try
        {
            var dbPath = DatabaseConnectionHelper.GetNormalizedDatabasePath();
            var connectionString = DatabaseConnectionHelper.BuildConnectionString();
            var dbDirectory = Path.GetDirectoryName(dbPath);
            
            var diagnostics = new
            {
                databasePath = dbPath,
                connectionString = connectionString,
                directory = dbDirectory ?? "",
                directoryExists = !string.IsNullOrEmpty(dbDirectory) && Directory.Exists(dbDirectory),
                fileExists = File.Exists(dbPath),
                currentUser = Environment.UserName,
                currentDirectory = Environment.CurrentDirectory,
                baseDirectory = AppDomain.CurrentDomain.BaseDirectory,
                tests = new List<object>()
            };
            
            var testResults = new List<object>();
            
            // 测试1: 目录存在性
            try
            {
                if (string.IsNullOrEmpty(dbDirectory))
                {
                    testResults.Add(new { test = "目录路径", status = "失败", message = "无法确定目录路径" });
                }
                else if (Directory.Exists(dbDirectory))
                {
                    testResults.Add(new { test = "目录存在", status = "通过", message = $"目录存在: {dbDirectory}" });
                }
                else
                {
                    testResults.Add(new { test = "目录存在", status = "失败", message = $"目录不存在: {dbDirectory}" });
                    try
                    {
                        Directory.CreateDirectory(dbDirectory);
                        testResults.Add(new { test = "创建目录", status = "通过", message = "目录已创建" });
                    }
                    catch (Exception ex)
                    {
                        testResults.Add(new { test = "创建目录", status = "失败", message = $"无法创建目录: {ex.Message}" });
                    }
                }
            }
            catch (Exception ex)
            {
                testResults.Add(new { test = "目录检查", status = "错误", message = ex.Message });
            }
            
            // 测试2: 目录写入权限
            if (!string.IsNullOrEmpty(dbDirectory) && Directory.Exists(dbDirectory))
            {
                try
                {
                    var testFile = Path.Combine(dbDirectory, ".write_test_" + Guid.NewGuid().ToString("N")[..8]);
                    File.WriteAllText(testFile, "test");
                    File.Delete(testFile);
                    testResults.Add(new { test = "目录写入权限", status = "通过", message = "目录有写入权限" });
                }
                catch (UnauthorizedAccessException ex)
                {
                    testResults.Add(new { test = "目录写入权限", status = "失败", message = $"拒绝访问 (0x80070005): {ex.Message}" });
                }
                catch (Exception ex)
                {
                    testResults.Add(new { test = "目录写入权限", status = "失败", message = ex.Message });
                }
            }
            
            // 测试3: 文件权限（如果文件存在）
            if (File.Exists(dbPath))
            {
                try
                {
                    var fileInfo = new FileInfo(dbPath);
                    testResults.Add(new { 
                        test = "文件信息", 
                        status = "通过", 
                        message = $"大小: {fileInfo.Length} 字节, 只读: {fileInfo.IsReadOnly}" 
                    });
                    
                    if (fileInfo.IsReadOnly)
                    {
                        try
                        {
                            fileInfo.IsReadOnly = false;
                            testResults.Add(new { test = "取消只读", status = "通过", message = "已取消只读属性" });
                        }
                        catch (Exception ex)
                        {
                            testResults.Add(new { test = "取消只读", status = "失败", message = ex.Message });
                        }
                    }
                }
                catch (Exception ex)
                {
                    testResults.Add(new { test = "文件信息", status = "失败", message = ex.Message });
                }
                
                // 测试文件读取权限
                try
                {
                    using (var stream = File.Open(dbPath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                    {
                        testResults.Add(new { test = "文件读取权限", status = "通过", message = "文件可以读取" });
                    }
                }
                catch (UnauthorizedAccessException ex)
                {
                    testResults.Add(new { test = "文件读取权限", status = "失败", message = $"拒绝访问 (0x80070005): {ex.Message}" });
                }
                catch (Exception ex)
                {
                    testResults.Add(new { test = "文件读取权限", status = "失败", message = ex.Message });
                }
                
                // 测试文件写入权限
                try
                {
                    using (var stream = File.Open(dbPath, FileMode.Open, FileAccess.ReadWrite, FileShare.ReadWrite))
                    {
                        testResults.Add(new { test = "文件写入权限", status = "通过", message = "文件可以写入" });
                    }
                }
                catch (UnauthorizedAccessException ex)
                {
                    testResults.Add(new { test = "文件写入权限", status = "失败", message = $"拒绝访问 (0x80070005): {ex.Message}" });
                }
                catch (Exception ex)
                {
                    testResults.Add(new { test = "文件写入权限", status = "失败", message = ex.Message });
                }
            }
            
            // 测试4: SQLite 连接测试
            try
            {
                using (var connection = new Microsoft.Data.Sqlite.SqliteConnection(connectionString))
                {
                    connection.Open();
                    testResults.Add(new { test = "SQLite 连接", status = "通过", message = "可以打开 SQLite 连接" });
                    
                    // 测试 PRAGMA
                    using (var command = connection.CreateCommand())
                    {
                        command.CommandText = "PRAGMA journal_mode;";
                        var journalMode = command.ExecuteScalar()?.ToString();
                        testResults.Add(new { test = "PRAGMA journal_mode", status = "通过", message = $"当前模式: {journalMode}" });
                    }
                    
                    connection.Close();
                }
            }
            catch (UnauthorizedAccessException ex)
            {
                testResults.Add(new { test = "SQLite 连接", status = "失败", message = $"拒绝访问 (0x80070005): {ex.Message}" });
            }
            catch (Exception ex)
            {
                testResults.Add(new { test = "SQLite 连接", status = "失败", message = $"{ex.GetType().Name}: {ex.Message}" });
            }
            
            // 测试5: EF Core 连接测试
            if (_context != null)
            {
                try
                {
                    var canConnect = _context.Database.CanConnect();
                    testResults.Add(new { test = "EF Core 连接", status = canConnect ? "通过" : "失败", message = canConnect ? "可以连接" : "无法连接" });
                }
                catch (Exception ex)
                {
                    testResults.Add(new { test = "EF Core 连接", status = "失败", message = $"{ex.GetType().Name}: {ex.Message}" });
                }
            }
            
            // 检查 SQLite 相关文件
            var journalPath = dbPath + "-journal";
            var walPath = dbPath + "-wal";
            var shmPath = dbPath + "-shm";
            
            var sqliteFiles = new List<object>();
            if (File.Exists(journalPath))
            {
                sqliteFiles.Add(new { file = "journal", path = journalPath, exists = true });
            }
            if (File.Exists(walPath))
            {
                sqliteFiles.Add(new { file = "wal", path = walPath, exists = true });
            }
            if (File.Exists(shmPath))
            {
                sqliteFiles.Add(new { file = "shm", path = shmPath, exists = true });
            }
            
            var result = new
            {
                success = testResults.All(t => ((dynamic)t).status == "通过"),
                databasePath = dbPath,
                connectionString = connectionString,
                directory = dbDirectory ?? "",
                directoryExists = !string.IsNullOrEmpty(dbDirectory) && Directory.Exists(dbDirectory),
                fileExists = File.Exists(dbPath),
                tests = testResults,
                sqliteFiles = sqliteFiles,
                recommendations = GetRecommendations(testResults, dbPath, dbDirectory)
            };
            
            logger.LogInfo($"TestDatabaseConnection() 完成，成功: {result.success}", "WebViewBridge");
            
            return JsonConvert.SerializeObject(result, Formatting.Indented, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var logger1 = FileLogger.Instance;
            logger1.LogError("TestDatabaseConnection() 执行失败", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { 
                success = false,
                error = ex.Message,
                errorType = ex.GetType().Name,
                stackTrace = ex.StackTrace
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }
    
    /// <summary>
    /// 根据测试结果生成建议
    /// </summary>
    private List<string> GetRecommendations(List<object> testResults, string dbPath, string? dbDirectory)
    {
        var recommendations = new List<string>();
        
        foreach (dynamic test in testResults)
        {
            if (test.status == "失败")
            {
                var testName = test.test.ToString();
                var message = test.message.ToString();
                
                if (testName.Contains("目录") && message.Contains("拒绝访问"))
                {
                    recommendations.Add($"目录权限问题: {dbDirectory}");
                    recommendations.Add("解决方案: 1) 以管理员身份运行程序 2) 检查文件夹权限 3) 将数据库路径配置到用户文档目录");
                }
                else if (testName.Contains("文件") && message.Contains("拒绝访问"))
                {
                    recommendations.Add($"文件权限问题: {dbPath}");
                    recommendations.Add("解决方案: 1) 检查文件属性，取消只读 2) 以管理员身份运行程序 3) 检查文件权限");
                }
                else if (testName.Contains("SQLite") && message.Contains("拒绝访问"))
                {
                    recommendations.Add("SQLite 连接权限问题");
                    recommendations.Add("解决方案: 1) 检查数据库文件及其目录权限 2) 删除 journal/wal/shm 文件 3) 重启程序");
                }
            }
        }
        
        if (recommendations.Count == 0)
        {
            recommendations.Add("所有测试通过，数据库连接正常");
        }
        
        return recommendations;
    }
    
    public string GetAppInfo()
    {
        try
        {
            var assembly = System.Reflection.Assembly.GetExecutingAssembly();
            var version = assembly.GetName().Version;
            
            string versionString;
            if (version != null)
            {
                if (version.Revision == -1)
                {
                    versionString = $"{version.Major}.{version.Minor}.{version.Build}";
                }
                else
                {
                    versionString = $"{version.Major}.{version.Minor}.{version.Build}.{version.Revision}";
                }
            }
            else
            {
                versionString = "未知";
            }
            
            var fileInfo = new FileInfo(assembly.Location);
            var buildTime = fileInfo.LastWriteTime;
            
            var result = new
            {
                version = versionString,
                buildTime = buildTime.ToString("yyyy-MM-dd HH:mm:ss"),
                buildTimeTimestamp = buildTime.Ticks,
                assemblyName = assembly.GetName().Name,
                assemblyLocation = assembly.Location,
                frameworkVersion = Environment.Version.ToString(),
                targetFramework = System.Runtime.InteropServices.RuntimeInformation.FrameworkDescription,
                osVersion = Environment.OSVersion.ToString(),
                osArchitecture = System.Runtime.InteropServices.RuntimeInformation.OSArchitecture.ToString(),
                machineName = Environment.MachineName,
                userName = Environment.UserName,
                appName = "RDTrackingSystem",
                appType = "C# WinForms + WebView2"
            };
            
            return JsonConvert.SerializeObject(result, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var logger = FileLogger.Instance;
            logger.LogError("GetAppInfo() 执行失败", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { 
                error = ex.Message,
                version = "未知",
                buildTime = "未知",
                appName = "RDTrackingSystem",
                appType = "C# WinForms + WebView2"
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 备份 API ==========
    public string CreateBackup(string? backupNameJson = null)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateBackup() 开始执行", "WebViewBridge");
        
        try
        {
            string? backupName = null;
            
            // 处理参数：可能是null、JSON字符串或普通字符串
            if (!string.IsNullOrEmpty(backupNameJson))
            {
                // 尝试解析为JSON对象
                if (backupNameJson.TrimStart().StartsWith("{"))
                {
                    try
                    {
                        var data = JsonConvert.DeserializeObject<dynamic>(backupNameJson);
                        if (data != null)
                        {
                            backupName = data.backupName?.ToString();
                        }
                    }
                    catch
                    {
                        // 如果解析失败，忽略
                    }
                }
                else
                {
                    // 如果不是JSON格式，直接使用字符串作为备份名称
                    backupName = backupNameJson;
                }
            }

            var dbPath = DatabaseConstants.GetDatabasePath();
            var backupPath = DatabaseBackupService.CreateBackup(dbPath, backupName, null);

            if (string.IsNullOrEmpty(backupPath))
            {
                return JsonConvert.SerializeObject(new { error = "备份创建失败" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            logger.LogInfo($"备份创建成功: {backupPath}", "WebViewBridge");
            return JsonConvert.SerializeObject(new
            {
                success = true,
                backupPath = backupPath,
                message = "备份创建成功"
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"创建备份失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetBackupList()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetBackupList() 开始执行", "WebViewBridge");
        
        try
        {
            var backups = DatabaseBackupService.GetBackupList(null);
            var result = backups.Select(b => new
            {
                filePath = b.FilePath,
                fileName = b.FileName,
                fileSize = b.FileSize,
                fileSizeFormatted = b.FileSizeFormatted,
                createdAt = b.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                description = b.Description ?? string.Empty
            }).ToList();

            logger.LogInfo($"获取备份列表成功，共 {result.Count} 个备份", "WebViewBridge");
            return JsonConvert.SerializeObject(result, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取备份列表失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string RestoreBackup(string backupPath)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"RestoreBackup() 开始执行，备份路径: {backupPath}", "WebViewBridge");
        
        try
        {
            if (string.IsNullOrEmpty(backupPath))
            {
                return JsonConvert.SerializeObject(new { error = "备份路径不能为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var dbPath = DatabaseConstants.GetDatabasePath();
            var success = DatabaseBackupService.RestoreBackup(backupPath, dbPath, null);

            if (success)
            {
                logger.LogInfo("备份恢复成功", "WebViewBridge");
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    message = "数据库恢复成功，请重启程序以应用更改"
                }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            else
            {
                return JsonConvert.SerializeObject(new { error = "数据库恢复失败" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"恢复备份失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteBackup(string backupPath)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteBackup() 开始执行，备份路径: {backupPath}", "WebViewBridge");
        
        try
        {
            if (string.IsNullOrEmpty(backupPath))
            {
                return JsonConvert.SerializeObject(new { error = "备份路径不能为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var success = DatabaseBackupService.DeleteBackup(backupPath, null);
            
            return JsonConvert.SerializeObject(new
            {
                success = success,
                message = success ? "备份已删除" : "删除失败"
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"删除备份失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string ExportDatabaseToLocation()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("ExportDatabaseToLocation() 开始执行", "WebViewBridge");
        
        try
        {
            var dbPath = DatabaseConstants.GetDatabasePath();
            
            if (!File.Exists(dbPath))
            {
                return JsonConvert.SerializeObject(new { error = "数据库文件不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 使用 SaveFileDialog 让用户选择保存位置
            using (var saveDialog = new SaveFileDialog())
            {
                saveDialog.Filter = "数据库文件 (*.db)|*.db|压缩文件 (*.zip)|*.zip|所有文件 (*.*)|*.*";
                saveDialog.FilterIndex = 2; // 默认选择 ZIP
                saveDialog.FileName = $"rdtracking_backup_{DateTime.Now:yyyyMMdd_HHmmss}.zip";
                saveDialog.Title = "导出数据库到位置";

                if (saveDialog.ShowDialog() == DialogResult.OK)
                {
                    var exportPath = saveDialog.FileName;
                    logger.LogInfo($"用户选择导出路径: {exportPath}", "WebViewBridge");

                    // 如果选择的是 ZIP 文件，创建压缩备份
                    if (exportPath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    {
                        var backupPath = DatabaseBackupService.CreateBackup(dbPath, Path.GetFileNameWithoutExtension(exportPath), null);
                        if (!string.IsNullOrEmpty(backupPath))
                        {
                            // 复制到用户选择的位置
                            File.Copy(backupPath, exportPath, true);
                            logger.LogInfo($"数据库已导出到: {exportPath}", "WebViewBridge");
                            
                            return JsonConvert.SerializeObject(new
                            {
                                success = true,
                                message = $"数据库已成功导出到: {exportPath}",
                                exportPath = exportPath
                            }, new JsonSerializerSettings
                            {
                                ContractResolver = new CamelCasePropertyNamesContractResolver()
                            });
                        }
                        else
                        {
                            return JsonConvert.SerializeObject(new { error = "创建备份失败" }, new JsonSerializerSettings
                            {
                                ContractResolver = new CamelCasePropertyNamesContractResolver()
                            });
                        }
                    }
                    else
                    {
                        // 直接复制数据库文件
                        File.Copy(dbPath, exportPath, true);
                        
                        // 同时复制 WAL 和 SHM 文件（如果存在）
                        var walPath = dbPath + "-wal";
                        var shmPath = dbPath + "-shm";
                        if (File.Exists(walPath))
                        {
                            File.Copy(walPath, exportPath + "-wal", true);
                        }
                        if (File.Exists(shmPath))
                        {
                            File.Copy(shmPath, exportPath + "-shm", true);
                        }
                        
                        logger.LogInfo($"数据库已导出到: {exportPath}", "WebViewBridge");
                        
                        return JsonConvert.SerializeObject(new
                        {
                            success = true,
                            message = $"数据库已成功导出到: {exportPath}",
                            exportPath = exportPath
                        }, new JsonSerializerSettings
                        {
                            ContractResolver = new CamelCasePropertyNamesContractResolver()
                        });
                    }
                }
                else
                {
                    // 用户取消了对话框
                    return JsonConvert.SerializeObject(new { error = "用户取消了导出操作" }, new JsonSerializerSettings
                    {
                        ContractResolver = new CamelCasePropertyNamesContractResolver()
                    });
                }
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"导出数据库失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string ImportDatabaseFromFile(string fileName, string fileDataBase64)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"ImportDatabaseFromFile() 开始执行，文件名: {fileName}", "WebViewBridge");
        
        try
        {
            if (string.IsNullOrEmpty(fileName) || string.IsNullOrEmpty(fileDataBase64))
            {
                return JsonConvert.SerializeObject(new { error = "文件名和文件数据不能为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var dbPath = DatabaseConstants.GetDatabasePath();

            // 解析 base64 数据
            string base64Data = fileDataBase64;
            if (base64Data.Contains(","))
            {
                var parts = base64Data.Split(',');
                if (parts.Length > 1)
                {
                    base64Data = parts[1];
                }
            }

            if (string.IsNullOrEmpty(base64Data))
            {
                return JsonConvert.SerializeObject(new { error = "文件数据无效" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            byte[] fileBytes = Convert.FromBase64String(base64Data);

            // 创建临时文件
            var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
            Directory.CreateDirectory(tempDir);
            var tempFilePath = Path.Combine(tempDir, fileName);

            File.WriteAllBytes(tempFilePath, fileBytes);

            // 使用备份服务恢复
            var success = DatabaseBackupService.RestoreBackup(tempFilePath, dbPath, null);

            // 清理临时文件
            try
            {
                if (Directory.Exists(tempDir))
                {
                    Directory.Delete(tempDir, true);
                }
            }
            catch
            {
                // 忽略清理错误
            }

            if (success)
            {
                logger.LogInfo("数据库导入成功", "WebViewBridge");
                return JsonConvert.SerializeObject(new
                {
                    success = true,
                    message = "数据库导入成功，请重启程序以应用更改"
                }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            else
            {
                return JsonConvert.SerializeObject(new { error = "数据库导入失败" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
        }
        catch (Exception ex)
        {
            logger.LogError($"导入数据库失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 项目文件夹管理 API ==========
    
    /// <summary>
    /// 获取项目根目录路径
    /// </summary>
    public string GetProjectsRootPath()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetProjectsRootPath() 开始执行", "WebViewBridge");
        
        try
        {
            var rootPath = ProjectFolderService.GetProjectsRootPath();
            logger.LogInfo($"项目根目录: {rootPath}", "WebViewBridge");
            
            return JsonConvert.SerializeObject(new
            {
                success = true,
                rootPath = rootPath
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取项目根目录失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }
    
    /// <summary>
    /// 设置项目根目录路径
    /// </summary>
    public string SetProjectsRootPath(string pathJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("SetProjectsRootPath() 开始执行", "WebViewBridge");
        
        try
        {
            string? path = null;
            if (!string.IsNullOrEmpty(pathJson))
            {
                try
                {
                    var data = JsonConvert.DeserializeObject<dynamic>(pathJson);
                    path = data?.path?.ToString() ?? pathJson;
                }
                catch
                {
                    path = pathJson;
                }
            }
            
            if (string.IsNullOrWhiteSpace(path))
            {
                return JsonConvert.SerializeObject(new { error = "路径不能为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            
            ProjectFolderService.SetProjectsRootPath(path);
            logger.LogInfo($"项目根目录已设置为: {path}", "WebViewBridge");
            
            return JsonConvert.SerializeObject(new
            {
                success = true,
                message = "项目根目录设置成功",
                rootPath = path
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"设置项目根目录失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }
    
    /// <summary>
    /// 打开项目文件夹
    /// </summary>
    // ========== 经验教训库 API ==========
    
    public string GetLessonLearned()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetLessonLearned() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库架构是最新的
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var lessons = _context.LessonLearned.AsNoTracking().ToList();
            logger.LogInfo($"查询完成，找到 {lessons.Count} 条经验教训", "WebViewBridge");

            var resultList = lessons.Select(l => new LessonLearnedDto
            {
                Id = l.Id ?? string.Empty,
                TagType = l.TagType ?? string.Empty,
                ProjectId = l.ProjectId,
                TaskId = l.TaskId,
                TimelineEventId = l.TimelineEventId,
                Background = l.Background ?? string.Empty,
                RootCause = l.RootCause ?? string.Empty,
                IfRedo = l.IfRedo ?? string.Empty,
                HasReuseValue = l.HasReuseValue,
                RelatedProjectName = l.RelatedProjectName,
                RelatedTaskName = l.RelatedTaskName,
                CreatedBy = l.CreatedBy,
                CreatedAt = l.CreatedAt,
                UpdatedAt = l.UpdatedAt
            }).ToList();

            return JsonConvert.SerializeObject(resultList, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取经验教训列表失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateLessonLearned(string lessonDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateLessonLearned() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库架构是最新的
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var lessonData = JsonConvert.DeserializeObject<dynamic>(lessonDataJson);
            if (lessonData == null)
            {
                return JsonConvert.SerializeObject(new { error = "经验教训数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var lesson = new LessonLearned
            {
                Id = lessonData.id?.ToString() ?? Guid.NewGuid().ToString(),
                TagType = lessonData.tagType?.ToString() ?? string.Empty,
                ProjectId = lessonData.projectId?.ToString(),
                TaskId = lessonData.taskId?.ToString(),
                TimelineEventId = lessonData.timelineEventId?.ToString(),
                Background = lessonData.background?.ToString() ?? string.Empty,
                RootCause = lessonData.rootCause?.ToString() ?? string.Empty,
                IfRedo = lessonData.ifRedo?.ToString() ?? string.Empty,
                HasReuseValue = lessonData.hasReuseValue != null && (bool)lessonData.hasReuseValue,
                RelatedProjectName = lessonData.relatedProjectName?.ToString(),
                RelatedTaskName = lessonData.relatedTaskName?.ToString(),
                CreatedBy = lessonData.createdBy?.ToString(),
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.LessonLearned.Add(lesson);
            
            // 如果关联了任务或时间线事件，更新它们的标签和经验教训ID
            if (!string.IsNullOrEmpty(lesson.TaskId))
            {
                var task = _context.Tasks.FirstOrDefault(t => t.Id == lesson.TaskId);
                if (task != null)
                {
                    task.TagType = lesson.TagType;
                    task.LessonLearnedId = lesson.Id;
                }
            }
            
            if (!string.IsNullOrEmpty(lesson.TimelineEventId))
            {
                var timelineEvent = _context.TimelineEvents.FirstOrDefault(te => te.Id == lesson.TimelineEventId);
                if (timelineEvent != null)
                {
                    timelineEvent.TagType = lesson.TagType;
                    timelineEvent.LessonLearnedId = lesson.Id;
                }
            }
            
            _context.SaveChanges();
            logger.LogInfo($"经验教训创建成功，ID: {lesson.Id}", "WebViewBridge");
            
            return JsonConvert.SerializeObject(new { id = lesson.Id, message = "经验教训创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"创建经验教训失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string UpdateLessonLearned(string id, string lessonDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"UpdateLessonLearned() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var lesson = _context.LessonLearned.FirstOrDefault(l => l.Id == id);
            if (lesson == null)
            {
                return JsonConvert.SerializeObject(new { error = $"经验教训不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var lessonData = JsonConvert.DeserializeObject<dynamic>(lessonDataJson);
            if (lessonData == null)
            {
                return JsonConvert.SerializeObject(new { error = "经验教训数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            lesson.Background = lessonData.background?.ToString() ?? lesson.Background;
            lesson.RootCause = lessonData.rootCause?.ToString() ?? lesson.RootCause;
            lesson.IfRedo = lessonData.ifRedo?.ToString() ?? lesson.IfRedo;
            lesson.HasReuseValue = lessonData.hasReuseValue != null ? (bool)lessonData.hasReuseValue : lesson.HasReuseValue;
            lesson.UpdatedAt = DateTime.Now;

            _context.SaveChanges();
            logger.LogInfo($"经验教训更新成功，ID: {id}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { message = "经验教训更新成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"更新经验教训失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteLessonLearned(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteLessonLearned() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var lesson = _context.LessonLearned.FirstOrDefault(l => l.Id == id);
            if (lesson == null)
            {
                return JsonConvert.SerializeObject(new { error = $"经验教训不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 清除关联的任务和时间线事件的标签和经验教训ID
            if (!string.IsNullOrEmpty(lesson.TaskId))
            {
                var task = _context.Tasks.FirstOrDefault(t => t.Id == lesson.TaskId);
                if (task != null)
                {
                    task.TagType = null;
                    task.LessonLearnedId = null;
                }
            }
            
            if (!string.IsNullOrEmpty(lesson.TimelineEventId))
            {
                var timelineEvent = _context.TimelineEvents.FirstOrDefault(te => te.Id == lesson.TimelineEventId);
                if (timelineEvent != null)
                {
                    timelineEvent.TagType = null;
                    timelineEvent.LessonLearnedId = null;
                }
            }

            _context.LessonLearned.Remove(lesson);
            _context.SaveChanges();
            logger.LogInfo($"经验教训删除成功，ID: {id}", "WebViewBridge");

            return JsonConvert.SerializeObject(new { message = "经验教训删除成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"删除经验教训失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string OpenProjectFolder(string projectPathJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("OpenProjectFolder() 开始执行", "WebViewBridge");
        
        try
        {
            string? projectPath = null;
            if (!string.IsNullOrEmpty(projectPathJson))
            {
                try
                {
                    var data = JsonConvert.DeserializeObject<dynamic>(projectPathJson);
                    projectPath = data?.projectPath?.ToString() ?? projectPathJson;
                }
                catch
                {
                    projectPath = projectPathJson;
                }
            }
            
            if (string.IsNullOrWhiteSpace(projectPath))
            {
                return JsonConvert.SerializeObject(new { error = "项目路径不能为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }
            
            var success = ProjectFolderService.OpenProjectFolder(projectPath, logger);
            
            return JsonConvert.SerializeObject(new
            {
                success = success,
                message = success ? "文件夹已打开" : "打开文件夹失败"
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"打开项目文件夹失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }
    
    // ========== 风险管理 API ==========
    
    public string GetProjectRisks(string projectId)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetProjectRisks() 开始执行，项目ID: {projectId}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            DatabaseSchemaMigrator.MigrateSchema();

            var risks = _context.Risks
                .Where(r => r.ProjectId == projectId)
                .OrderByDescending(r => r.RiskLevel)
                .ThenByDescending(r => r.IdentifiedDate)
                .ToList();

            var result = risks.Select(r =>
            {
                var responses = _context.RiskResponses
                    .Where(rr => rr.RiskId == r.Id)
                    .Select(rr => new RiskResponseDto
                    {
                        Id = rr.Id,
                        RiskId = rr.RiskId,
                        Strategy = rr.Strategy ?? "mitigate",
                        ActionPlan = rr.ActionPlan ?? string.Empty,
                        Responsible = rr.Responsible,
                        Status = rr.Status ?? "planned",
                        DueDate = rr.DueDate,
                        Notes = rr.Notes,
                        CreatedAt = rr.CreatedAt,
                        UpdatedAt = rr.UpdatedAt
                    }).ToList();

                return new RiskDto
                {
                    Id = r.Id,
                    ProjectId = r.ProjectId,
                    Description = r.Description ?? string.Empty,
                    Category = r.Category,
                    Probability = r.Probability,
                    Impact = r.Impact,
                    RiskLevel = r.RiskLevel,
                    Status = r.Status ?? "identified",
                    Owner = r.Owner,
                    RootCause = r.RootCause,
                    Trigger = r.Trigger,
                    Notes = r.Notes,
                    IdentifiedDate = r.IdentifiedDate,
                    ExpectedOccurrenceDate = r.ExpectedOccurrenceDate,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt,
                    Responses = responses
                };
            }).ToList();

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取项目风险列表失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetProjectRiskValue(string projectId)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetProjectRiskValue() 开始执行，项目ID: {projectId}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            DatabaseSchemaMigrator.MigrateSchema();

            int riskValue = RiskCalculator.CalculateProjectRiskValue(_context, projectId);
            string riskColor = RiskCalculator.GetRiskColor(riskValue);
            string riskLevelText = RiskCalculator.GetRiskLevelText(riskValue);

            return JsonConvert.SerializeObject(new
            {
                riskValue = riskValue,
                riskColor = riskColor,
                riskLevelText = riskLevelText
            }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取项目风险值失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateRisk(string riskDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateRisk() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            DatabaseSchemaMigrator.MigrateSchema();

            var riskData = JsonConvert.DeserializeObject<dynamic>(riskDataJson);
            if (riskData == null)
            {
                return JsonConvert.SerializeObject(new { error = "风险数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            int probability = riskData.probability != null ? (int)riskData.probability : 1;
            int impact = riskData.impact != null ? (int)riskData.impact : 1;
            int riskLevel = probability * impact;

            var risk = new Risk
            {
                Id = riskData.id?.ToString() ?? Guid.NewGuid().ToString(),
                ProjectId = riskData.projectId?.ToString() ?? string.Empty,
                Description = riskData.description?.ToString() ?? string.Empty,
                Category = riskData.category?.ToString(),
                Probability = probability,
                Impact = impact,
                RiskLevel = riskLevel,
                Status = riskData.status?.ToString() ?? "identified",
                Owner = riskData.owner?.ToString(),
                RootCause = riskData.rootCause?.ToString(),
                Trigger = riskData.trigger?.ToString(),
                Notes = riskData.notes?.ToString(),
                IdentifiedDate = riskData.identifiedDate != null 
                    ? DateTime.Parse(riskData.identifiedDate.ToString()) 
                    : DateTime.Now,
                ExpectedOccurrenceDate = riskData.expectedOccurrenceDate != null
                    ? DateTime.Parse(riskData.expectedOccurrenceDate.ToString())
                    : null,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Risks.Add(risk);
            _context.SaveChanges();

            logger.LogInfo($"风险创建成功，ID: {risk.Id}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { id = risk.Id, message = "风险创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"创建风险失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string UpdateRisk(string id, string riskDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"UpdateRisk() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var risk = _context.Risks.FirstOrDefault(r => r.Id == id);
            if (risk == null)
            {
                return JsonConvert.SerializeObject(new { error = $"风险不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var riskData = JsonConvert.DeserializeObject<dynamic>(riskDataJson);
            if (riskData == null)
            {
                return JsonConvert.SerializeObject(new { error = "风险数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            if (riskData.description != null)
                risk.Description = riskData.description.ToString();
            if (riskData.category != null)
                risk.Category = riskData.category.ToString();
            if (riskData.probability != null)
                risk.Probability = (int)riskData.probability;
            if (riskData.impact != null)
                risk.Impact = (int)riskData.impact;
            
            risk.RiskLevel = risk.Probability * risk.Impact;
            
            if (riskData.status != null)
                risk.Status = riskData.status.ToString();
            if (riskData.owner != null)
                risk.Owner = riskData.owner.ToString();
            if (riskData.rootCause != null)
                risk.RootCause = riskData.rootCause.ToString();
            if (riskData.trigger != null)
                risk.Trigger = riskData.trigger.ToString();
            if (riskData.notes != null)
                risk.Notes = riskData.notes.ToString();
            if (riskData.expectedOccurrenceDate != null)
                risk.ExpectedOccurrenceDate = DateTime.Parse(riskData.expectedOccurrenceDate.ToString());

            risk.UpdatedAt = DateTime.Now;
            _context.SaveChanges();

            logger.LogInfo($"风险更新成功，ID: {id}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { message = "风险更新成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"更新风险失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteRisk(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteRisk() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var risk = _context.Risks.FirstOrDefault(r => r.Id == id);
            if (risk == null)
            {
                return JsonConvert.SerializeObject(new { error = $"风险不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            _context.Risks.Remove(risk);
            _context.SaveChanges();

            logger.LogInfo($"风险删除成功，ID: {id}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { message = "风险删除成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"删除风险失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateRiskResponse(string riskId, string responseDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"CreateRiskResponse() 开始执行，风险ID: {riskId}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            DatabaseSchemaMigrator.MigrateSchema();

            var risk = _context.Risks.FirstOrDefault(r => r.Id == riskId);
            if (risk == null)
            {
                return JsonConvert.SerializeObject(new { error = "风险不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var responseData = JsonConvert.DeserializeObject<dynamic>(responseDataJson);
            if (responseData == null)
            {
                return JsonConvert.SerializeObject(new { error = "应对措施数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var response = new RiskResponse
            {
                Id = responseData.id?.ToString() ?? Guid.NewGuid().ToString(),
                RiskId = riskId,
                Strategy = responseData.strategy?.ToString() ?? "mitigate",
                ActionPlan = responseData.actionPlan?.ToString() ?? string.Empty,
                Responsible = responseData.responsible?.ToString(),
                Status = responseData.status?.ToString() ?? "planned",
                DueDate = responseData.dueDate?.ToString(),
                Notes = responseData.notes?.ToString(),
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.RiskResponses.Add(response);
            _context.SaveChanges();

            logger.LogInfo($"应对措施创建成功，ID: {response.Id}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { id = response.Id, message = "应对措施创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"创建应对措施失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string UpdateRiskResponse(string id, string responseDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"UpdateRiskResponse() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var response = _context.RiskResponses.FirstOrDefault(rr => rr.Id == id);
            if (response == null)
            {
                return JsonConvert.SerializeObject(new { error = $"应对措施不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var responseData = JsonConvert.DeserializeObject<dynamic>(responseDataJson);
            if (responseData == null)
            {
                return JsonConvert.SerializeObject(new { error = "应对措施数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            if (responseData.strategy != null)
                response.Strategy = responseData.strategy.ToString();
            if (responseData.actionPlan != null)
                response.ActionPlan = responseData.actionPlan.ToString();
            if (responseData.responsible != null)
                response.Responsible = responseData.responsible.ToString();
            if (responseData.status != null)
                response.Status = responseData.status.ToString();
            if (responseData.dueDate != null)
                response.DueDate = responseData.dueDate.ToString();
            if (responseData.notes != null)
                response.Notes = responseData.notes.ToString();

            response.UpdatedAt = DateTime.Now;
            _context.SaveChanges();

            logger.LogInfo($"应对措施更新成功，ID: {id}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { message = "应对措施更新成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"更新应对措施失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteRiskResponse(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteRiskResponse() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var response = _context.RiskResponses.FirstOrDefault(rr => rr.Id == id);
            if (response == null)
            {
                return JsonConvert.SerializeObject(new { error = $"应对措施不存在: {id}" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            _context.RiskResponses.Remove(response);
            _context.SaveChanges();

            logger.LogInfo($"应对措施删除成功，ID: {id}", "WebViewBridge");
            return JsonConvert.SerializeObject(new { message = "应对措施删除成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            var errorMsg = $"删除应对措施失败: {ex.Message}";
            logger.LogError(errorMsg, ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = errorMsg }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 资产 API ==========
    public string GetAssets()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetAssets() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var assets = _context.Assets
                .Include(a => a.Versions)
                .Include(a => a.ProjectRelations)
                .ToList();

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

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取资产列表失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetAsset(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetAsset() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var asset = _context.Assets
                .Include(a => a.Versions.OrderByDescending(v => v.VersionDate))
                .Include(a => a.ProjectRelations)
                .ThenInclude(apr => apr.Project)
                .FirstOrDefault(a => a.Id == id);

            if (asset == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
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

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取资产详情失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateAsset(string assetDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateAsset() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 确保数据库架构是最新的（创建缺失的表）
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}", "WebViewBridge");
            }

            var assetData = JsonConvert.DeserializeObject<dynamic>(assetDataJson);
            if (assetData == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            string? ownerId = assetData.ownerId?.ToString();
            var user = !string.IsNullOrEmpty(ownerId) ? _context.Users.FirstOrDefault(u => u.Id == ownerId) : null;

            var asset = new Asset
            {
                Id = assetData.id?.ToString() ?? Guid.NewGuid().ToString(),
                Name = assetData.name?.ToString() ?? string.Empty,
                Type = assetData.type?.ToString() ?? string.Empty,
                Maturity = assetData.maturity?.ToString() ?? "试验",
                OwnerId = assetData.ownerId?.ToString(),
                OwnerName = user?.Name,
                Description = assetData.description?.ToString(),
                Tags = assetData.tags != null ? JsonConvert.SerializeObject(assetData.tags) : null,
                ReuseCount = 0,
                RelatedProjectIds = null,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.Assets.Add(asset);
            _context.SaveChanges();

            return JsonConvert.SerializeObject(new { id = asset.Id, message = "资产创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"创建资产失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string UpdateAsset(string id, string assetDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"UpdateAsset() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var asset = _context.Assets.Find(id);
            if (asset == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var assetData = JsonConvert.DeserializeObject<dynamic>(assetDataJson);
            if (assetData == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            string? ownerId = assetData.ownerId?.ToString();
            var user = !string.IsNullOrEmpty(ownerId) ? _context.Users.FirstOrDefault(u => u.Id == ownerId) : null;

            asset.Name = assetData.name?.ToString() ?? asset.Name;
            asset.Type = assetData.type?.ToString() ?? asset.Type;
            asset.Maturity = assetData.maturity?.ToString() ?? asset.Maturity;
            asset.OwnerId = assetData.ownerId?.ToString();
            asset.OwnerName = user?.Name;
            asset.Description = assetData.description?.ToString();
            asset.Tags = assetData.tags != null ? JsonConvert.SerializeObject(assetData.tags) : asset.Tags;
            asset.UpdatedAt = DateTime.Now;

            _context.SaveChanges();

            return JsonConvert.SerializeObject(new { message = "资产更新成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"更新资产失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string DeleteAsset(string id)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"DeleteAsset() 开始执行，ID: {id}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var asset = _context.Assets.Find(id);
            if (asset == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            _context.Assets.Remove(asset);
            _context.SaveChanges();

            return JsonConvert.SerializeObject(new { message = "资产已删除" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"删除资产失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateAssetVersion(string assetId, string versionDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"CreateAssetVersion() 开始执行，AssetID: {assetId}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var asset = _context.Assets.Find(assetId);
            if (asset == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var versionData = JsonConvert.DeserializeObject<dynamic>(versionDataJson);
            if (versionData == null)
            {
                return JsonConvert.SerializeObject(new { error = "版本数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 解析版本日期
            DateTime versionDate = DateTime.Now;
            DateTime parsedDate = DateTime.Now;
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
            _context.SaveChanges();

            return JsonConvert.SerializeObject(new { id = version.Id, message = "资产版本创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"创建资产版本失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateAssetProjectRelation(string relationDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateAssetProjectRelation() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var relationData = JsonConvert.DeserializeObject<dynamic>(relationDataJson);
            if (relationData == null)
            {
                return JsonConvert.SerializeObject(new { error = "关系数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            string assetId = relationData.assetId?.ToString() ?? string.Empty;
            string projectId = relationData.projectId?.ToString() ?? string.Empty;
            string relationType = relationData.relationType?.ToString() ?? "used";

            if (string.IsNullOrEmpty(assetId) || string.IsNullOrEmpty(projectId))
            {
                return JsonConvert.SerializeObject(new { error = "资产ID和项目ID不能为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var asset = _context.Assets.Find(assetId);
            if (asset == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var project = _context.Projects.Find(projectId);
            if (project == null)
            {
                return JsonConvert.SerializeObject(new { error = "项目不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 检查是否已存在相同关系
            var existingRelation = _context.AssetProjectRelations
                .FirstOrDefault(apr => apr.AssetId == assetId && apr.ProjectId == projectId && apr.RelationType == relationType);

            if (existingRelation != null)
            {
                existingRelation.Version = relationData.version?.ToString();
                existingRelation.Notes = relationData.notes?.ToString();
                _context.SaveChanges();
                return JsonConvert.SerializeObject(new { id = existingRelation.Id, message = "项目关系更新成功" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
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
            asset.ReuseCount = _context.AssetProjectRelations
                .Where(apr => apr.AssetId == assetId && apr.RelationType == "used")
                .Count();

            var relatedProjectIds = _context.AssetProjectRelations
                .Where(apr => apr.AssetId == assetId)
                .Select(apr => apr.ProjectId)
                .Distinct()
                .ToList();
            asset.RelatedProjectIds = JsonConvert.SerializeObject(relatedProjectIds);

            _context.SaveChanges();

            return JsonConvert.SerializeObject(new { id = relation.Id, message = "项目关系创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"创建项目关系失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetAssetsByProject(string projectId)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetAssetsByProject() 开始执行，ProjectID: {projectId}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var relations = _context.AssetProjectRelations
                .Where(apr => apr.ProjectId == projectId)
                .Include(apr => apr.Asset)
                .ToList();

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

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取项目资产失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetAssetHealth(string assetId)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetAssetHealth() 开始执行，AssetID: {assetId}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var asset = _context.Assets
                .Include(a => a.Versions)
                .Include(a => a.ProjectRelations)
                .FirstOrDefault(a => a.Id == assetId);

            if (asset == null)
            {
                return JsonConvert.SerializeObject(new { error = "资产不存在" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            // 计算健康度指标
            var totalProjects = _context.Projects.Count();
            var reuseRate = totalProjects > 0 ? (double)asset.ReuseCount / totalProjects : 0.0;

            var latestVersion = asset.Versions.OrderByDescending(v => v.VersionDate).FirstOrDefault();
            var defectDensity = latestVersion?.DefectDensity ?? 0.0;

            var monthsSinceCreation = Math.Max(1, (DateTime.Now - asset.CreatedAt).TotalDays / 30);
            var changeFrequency = asset.Versions.Count / monthsSinceCreation;

            var regressionCost = latestVersion?.RegressionCost ?? 0.0;
            var maintenanceBurden = latestVersion?.MaintenanceBurden ?? 0.0;

            var reuseScore = Math.Min(100, reuseRate * 100 * 10);
            var defectScore = Math.Max(0, 100 - defectDensity * 10);
            var changeScore = changeFrequency > 0 && changeFrequency < 5 ? 100 : Math.Max(0, 100 - (changeFrequency - 5) * 10);
            var regressionScore = Math.Max(0, 100 - regressionCost);
            var maintenanceScore = Math.Max(0, 100 - maintenanceBurden);

            var healthScore = reuseScore * 0.3 + defectScore * 0.25 + changeScore * 0.15 + regressionScore * 0.15 + maintenanceScore * 0.15;

            var result = new
            {
                reuseRate = Math.Round(reuseRate, 4),
                defectDensity = Math.Round(defectDensity, 2),
                changeFrequency = Math.Round(changeFrequency, 2),
                regressionCost = Math.Round(regressionCost, 2),
                maintenanceBurden = Math.Round(maintenanceBurden, 2),
                healthScore = Math.Round(healthScore, 2)
            };

            // 保存健康度快照
            var snapshot = new AssetHealthMetrics
            {
                Id = Guid.NewGuid().ToString(),
                AssetId = assetId,
                ReuseRate = result.reuseRate,
                DefectDensity = result.defectDensity,
                ChangeFrequency = result.changeFrequency,
                RegressionCost = result.regressionCost,
                MaintenanceBurden = result.maintenanceBurden,
                HealthScore = result.healthScore,
                CalculatedAt = DateTime.Now,
                CreatedAt = DateTime.Now
            };

            _context.AssetHealthMetrics.Add(snapshot);
            _context.SaveChanges();

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取资产健康度失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetAssetHealthHistory(string assetId, string daysJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetAssetHealthHistory() 开始执行，AssetID: {assetId}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var daysData = JsonConvert.DeserializeObject<dynamic>(daysJson);
            int days = daysData?.days != null ? Convert.ToInt32(daysData.days) : 30;
            DateTime cutoffDate = DateTime.Now.AddDays(-days);

            // 确保 assetId 是明确的字符串类型，避免在 LINQ 中使用 dynamic
            string assetIdValue = assetId ?? string.Empty;

            var history = _context.AssetHealthMetrics
                .Where(ahm => ahm.AssetId == assetIdValue && ahm.CalculatedAt >= cutoffDate)
                .OrderByDescending(ahm => ahm.CalculatedAt)
                .ToList();

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

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取资产健康度历史失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetAssetHealthDashboard()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetAssetHealthDashboard() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var assets = _context.Assets
                .Include(a => a.Versions)
                .Include(a => a.ProjectRelations)
                .ToList();

            var totalProjects = _context.Projects.Count();

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
                    var reuseRate = totalProjects > 0 ? (double)a.ReuseCount / totalProjects : 0.0;
                    var latestVersion = a.Versions.OrderByDescending(v => v.VersionDate).FirstOrDefault();
                    var defectDensity = latestVersion?.DefectDensity ?? 0.0;
                    var monthsSinceCreation = Math.Max(1, (DateTime.Now - a.CreatedAt).TotalDays / 30);
                    var changeFrequency = a.Versions.Count / monthsSinceCreation;

                    var reuseScore = Math.Min(100, reuseRate * 100 * 10);
                    var defectScore = Math.Max(0, 100 - defectDensity * 10);
                    var changeScore = changeFrequency > 0 && changeFrequency < 5 ? 100 : Math.Max(0, 100 - (changeFrequency - 5) * 10);
                    var regressionScore = latestVersion?.RegressionCost != null ? Math.Max(0, 100 - latestVersion.RegressionCost.Value) : 100;
                    var maintenanceScore = latestVersion?.MaintenanceBurden != null ? Math.Max(0, 100 - latestVersion.MaintenanceBurden.Value) : 100;

                    var healthScore = reuseScore * 0.3 + defectScore * 0.25 + changeScore * 0.15 + regressionScore * 0.15 + maintenanceScore * 0.15;

                    return new
                    {
                        id = a.Id,
                        name = a.Name,
                        type = a.Type,
                        maturity = a.Maturity,
                        healthScore = Math.Round(healthScore, 2),
                        reuseRate = Math.Round(reuseRate, 4),
                        defectDensity = Math.Round(defectDensity, 2),
                        changeFrequency = Math.Round(changeFrequency, 2)
                    };
                }).OrderByDescending(a => a.healthScore).ToList()
            };

            return JsonConvert.SerializeObject(dashboardData, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取健康度仪表盘失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    // ========== 名言 API ==========
    public string GetQuotes()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetQuotes() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var quotes = _context.ManagementQuotes.ToList();
            var result = quotes.Select(q => new
            {
                id = q.Id,
                quote = q.Quote,
                category = q.Category,
                tags = q.Tags,
                displayCount = q.DisplayCount,
                createdAt = q.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                updatedAt = q.UpdatedAt.ToString("yyyy-MM-dd HH:mm:ss")
            }).ToList();

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取名言列表失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetRandomQuote()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("GetRandomQuote() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var quotes = _context.ManagementQuotes.ToList();
            if (quotes.Count == 0)
            {
                return JsonConvert.SerializeObject(new { error = "没有可用的名言" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var random = new System.Random();
            var quote = quotes[random.Next(quotes.Count)];

            // 更新显示次数
            quote.DisplayCount++;
            quote.UpdatedAt = DateTime.Now;
            _context.SaveChanges();

            var result = new
            {
                id = quote.Id,
                quote = quote.Quote,
                category = quote.Category,
                tags = quote.Tags,
                displayCount = quote.DisplayCount
            };

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取随机名言失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string GetRandomQuotes(string countStr)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo($"GetRandomQuotes() 开始执行，数量: {countStr}", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            int count = int.TryParse(countStr, out var parsedCount) ? parsedCount : 10;
            var quotes = _context.ManagementQuotes.ToList();
            if (quotes.Count == 0)
            {
                return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var random = new System.Random();
            var selectedQuotes = quotes.OrderBy(x => random.Next()).Take(Math.Min(count, quotes.Count)).ToList();

            // 更新显示次数
            foreach (var quote in selectedQuotes)
            {
                quote.DisplayCount++;
                quote.UpdatedAt = DateTime.Now;
            }
            _context.SaveChanges();

            var result = selectedQuotes.Select(q => new
            {
                id = q.Id,
                quote = q.Quote,
                category = q.Category,
                tags = q.Tags,
                displayCount = q.DisplayCount
            }).ToList();

            return JsonConvert.SerializeObject(result, Formatting.None, new JsonSerializerSettings
            {
                NullValueHandling = NullValueHandling.Ignore,
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"获取随机名言失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new List<object>(), new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateQuote(string quoteDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateQuote() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var quoteData = JsonConvert.DeserializeObject<dynamic>(quoteDataJson);
            if (quoteData == null)
            {
                return JsonConvert.SerializeObject(new { error = "名言数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var quote = new ManagementQuote
            {
                Id = quoteData.id?.ToString() ?? Guid.NewGuid().ToString(),
                Quote = quoteData.quote?.ToString() ?? string.Empty,
                Category = quoteData.category?.ToString(),
                Tags = quoteData.tags?.ToString(),
                DisplayCount = 0,
                CreatedAt = DateTime.Now,
                UpdatedAt = DateTime.Now
            };

            _context.ManagementQuotes.Add(quote);
            _context.SaveChanges();

            return JsonConvert.SerializeObject(new { id = quote.Id, message = "名言创建成功" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"创建名言失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }

    public string CreateQuotesBatch(string batchDataJson)
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("CreateQuotesBatch() 开始执行", "WebViewBridge");
        
        try
        {
            if (_context == null)
            {
                return JsonConvert.SerializeObject(new { error = "数据库上下文为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var batchData = JsonConvert.DeserializeObject<dynamic>(batchDataJson);
            if (batchData == null || batchData.quotes == null)
            {
                return JsonConvert.SerializeObject(new { error = "名言数据为空" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var quotesList = batchData.quotes as Newtonsoft.Json.Linq.JArray;
            if (quotesList == null)
            {
                return JsonConvert.SerializeObject(new { error = "名言数据格式错误" }, new JsonSerializerSettings
                {
                    ContractResolver = new CamelCasePropertyNamesContractResolver()
                });
            }

            var quotes = new List<ManagementQuote>();
            foreach (var item in quotesList)
            {
                var quote = new ManagementQuote
                {
                    Id = Guid.NewGuid().ToString(),
                    Quote = item["quote"]?.ToString() ?? string.Empty,
                    Category = item["category"]?.ToString(),
                    Tags = item["tags"]?.ToString(),
                    DisplayCount = 0,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };
                quotes.Add(quote);
            }

            _context.ManagementQuotes.AddRange(quotes);
            _context.SaveChanges();

            return JsonConvert.SerializeObject(new { message = $"成功创建 {quotes.Count} 条名言" }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
        catch (Exception ex)
        {
            logger.LogError($"批量创建名言失败: {ex.Message}", ex, "WebViewBridge");
            return JsonConvert.SerializeObject(new { error = ex.Message }, new JsonSerializerSettings
            {
                ContractResolver = new CamelCasePropertyNamesContractResolver()
            });
        }
    }
}
