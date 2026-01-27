using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using RDTrackingSystem.Data;
using RDTrackingSystem.Models;
using RDTrackingSystem.Services;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace RDTrackingSystem.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ReportsController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ReportsController> _logger;

    public ReportsController(ApplicationDbContext context, ILogger<ReportsController> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// 根据人名（相关方/工程师）查询报告
    /// 显示该人在时间段内占用的工程师工时、关联的项目和任务
    /// </summary>
    [HttpPost("person-report")]
    public async Task<ActionResult<object>> GetPersonReport([FromBody] dynamic reportData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();

            string personName = reportData.personName?.ToString() ?? string.Empty;
            string startDate = reportData.startDate?.ToString() ?? string.Empty;
            string endDate = reportData.endDate?.ToString() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(personName))
            {
                return BadRequest(new { error = "人名不能为空" });
            }

            // 解析日期
            DateTime? start = null;
            DateTime? end = null;
            if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var sd))
            {
                start = sd;
            }
            if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var ed))
            {
                end = ed.AddDays(1); // 包含结束日期当天
            }

            var result = new
            {
                personName = personName,
                startDate = startDate,
                endDate = endDate,
                engineerHours = new List<object>(),
                relatedProjects = new List<object>(),
                relatedTasks = new List<object>()
            };

            // 1. 查询作为相关方的任务
            var stakeholderTasks = await _context.Tasks
                .Where(t => t.Stakeholder != null && t.Stakeholder.Contains(personName))
                .ToListAsync();

            // 2. 查询作为工程师的任务
            var engineerTasks = await _context.Tasks
                .Where(t => t.AssignedToJson != null && t.AssignedToJson.Contains(personName))
                .ToListAsync();

            // 3. 查询作为相关方的项目（通过 SalesName）
            var stakeholderProjects = await _context.Projects
                .Where(p => p.SalesName != null && p.SalesName.Contains(personName))
                .ToListAsync();

            // 合并所有相关任务
            var allRelatedTasks = stakeholderTasks
                .Concat(engineerTasks)
                .Distinct()
                .ToList();

            // 过滤时间范围
            if (start.HasValue || end.HasValue)
            {
                allRelatedTasks = allRelatedTasks.Where(t =>
                {
                    bool inRange = true;
                    if (start.HasValue && !string.IsNullOrEmpty(t.StartDate))
                    {
                        if (DateTime.TryParse(t.StartDate, out var taskStart))
                        {
                            inRange = inRange && taskStart >= start.Value;
                        }
                    }
                    if (end.HasValue && !string.IsNullOrEmpty(t.EndDate))
                    {
                        if (DateTime.TryParse(t.EndDate, out var taskEnd))
                        {
                            inRange = inRange && taskEnd <= end.Value;
                        }
                    }
                    return inRange;
                }).ToList();

                stakeholderProjects = stakeholderProjects.Where(p =>
                {
                    bool inRange = true;
                    if (start.HasValue)
                    {
                        inRange = inRange && p.CreatedAt >= start.Value;
                    }
                    if (end.HasValue)
                    {
                        inRange = inRange && p.CreatedAt <= end.Value;
                    }
                    return inRange;
                }).ToList();
            }

            // 获取所有相关任务的项目ID
            var relatedProjectIds = allRelatedTasks
                .Where(t => !string.IsNullOrEmpty(t.ProjectId))
                .Select(t => t.ProjectId)
                .Distinct()
                .ToList();

            // 获取所有相关项目
            var allRelatedProjects = await _context.Projects
                .Where(p => relatedProjectIds.Contains(p.Id) || stakeholderProjects.Select(sp => sp.Id).Contains(p.Id))
                .ToListAsync();

            // 计算工程师工时（从 LaborCost 表）
            var allTaskIds = allRelatedTasks.Select(t => t.Id).ToList();
            var stakeholderProjectIds = stakeholderProjects.Select(sp => sp.Id).ToList();
            var allProjectIds = relatedProjectIds.Concat(stakeholderProjectIds).Distinct().ToList();
            
            // 先获取所有相关的工时记录
            var laborCostsAll = await _context.LaborCosts
                .Where(lc => 
                    (allTaskIds.Contains(lc.TaskId) || 
                     (lc.ProjectId != null && allProjectIds.Contains(lc.ProjectId)))
                )
                .ToListAsync();

            // 在内存中应用时间过滤
            var laborCosts = laborCostsAll.Where(lc =>
            {
                if (string.IsNullOrEmpty(lc.WorkDate)) return false;
                if (DateTime.TryParse(lc.WorkDate, out var workDate))
                {
                    bool inRange = true;
                    if (start.HasValue) inRange = inRange && workDate >= start.Value;
                    if (end.HasValue) inRange = inRange && workDate <= end.Value;
                    return inRange;
                }
                return false;
            }).ToList();

            // 从关联任务中提取所有负责人（AssignedTo）
            var allAssignedEngineers = new List<string>();
            foreach (var task in allRelatedTasks)
            {
                if (!string.IsNullOrEmpty(task.AssignedToJson))
                {
                    try
                    {
                        var assignedTo = JsonConvert.DeserializeObject<List<string>>(task.AssignedToJson) ?? new List<string>();
                        allAssignedEngineers.AddRange(assignedTo);
                    }
                    catch
                    {
                        // 忽略解析错误
                    }
                }
            }
            var uniqueEngineerIds = allAssignedEngineers.Distinct().ToList();

            // 获取工程师信息
            var engineers = await _context.Users
                .Where(u => uniqueEngineerIds.Contains(u.Id))
                .ToListAsync();

            // 按工程师统计工时和任务数
            var engineerHoursDict = uniqueEngineerIds.Select(engId =>
            {
                var engineer = engineers.FirstOrDefault(e => e.Id == engId);
                var engineerName = engineer?.Name ?? engId;
                
                // 统计该工程师负责的任务
                var assignedTasks = allRelatedTasks.Where(t =>
                {
                    if (string.IsNullOrEmpty(t.AssignedToJson)) return false;
                    try
                    {
                        var assignedTo = JsonConvert.DeserializeObject<List<string>>(t.AssignedToJson) ?? new List<string>();
                        return assignedTo.Contains(engId);
                    }
                    catch
                    {
                        return false;
                    }
                }).ToList();

                // 计算该工程师的总工时（从任务的开始和结束时间计算）
                double totalHours = 0;
                foreach (var task in assignedTasks)
                {
                    if (!string.IsNullOrEmpty(task.StartDate) && !string.IsNullOrEmpty(task.EndDate))
                    {
                        if (DateTime.TryParse(task.StartDate, out var startDate) && 
                            DateTime.TryParse(task.EndDate, out var endDate))
                        {
                            // 计算时间差（小时）
                            var timeSpan = endDate - startDate;
                            totalHours += timeSpan.TotalHours;
                            
                            // 如果时间差为0或负数，至少算1小时
                            if (totalHours <= 0)
                            {
                                totalHours += 1;
                            }
                        }
                    }
                    else if (!string.IsNullOrEmpty(task.StartDate))
                    {
                        // 如果只有开始时间，算1小时
                        totalHours += 1;
                    }
                }
                
                // 如果 LaborCost 表中有数据，优先使用 LaborCost 的工时
                var engineerLaborCosts = laborCosts.Where(lc => lc.EngineerId == engId).ToList();
                var laborCostHours = engineerLaborCosts.Sum(lc => (double)lc.Hours);
                if (laborCostHours > 0)
                {
                    totalHours = laborCostHours;
                }
                
                // 统计该工程师负责的任务涉及的项目
                var projectIds = assignedTasks
                    .Where(t => !string.IsNullOrEmpty(t.ProjectId))
                    .Select(t => t.ProjectId)
                    .Distinct()
                    .ToList();

                return new
                {
                    engineerId = engId,
                    engineerName = engineerName,
                    totalHours = totalHours,
                    taskCount = assignedTasks.Count,
                    projectCount = projectIds.Count
                };
            })
            .OrderByDescending(x => x.totalHours)
            .ThenByDescending(x => x.taskCount)
            .ToList();

            // 构建结果
            var relatedProjectsList = allRelatedProjects.Select(p => new
            {
                id = p.Id,
                orderNumber = p.OrderNumber,
                projectName = p.ProjectName,
                salesName = p.SalesName,
                createdAt = p.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss"),
                taskCount = allRelatedTasks.Count(t => t.ProjectId == p.Id)
            }).ToList<object>();

            var relatedTasksList = allRelatedTasks.Select(t =>
            {
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

                return new
                {
                    id = t.Id,
                    name = t.Name,
                    projectId = t.ProjectId,
                    projectName = allRelatedProjects.FirstOrDefault(p => p.Id == t.ProjectId)?.ProjectName,
                    stakeholder = t.Stakeholder,
                    assignedTo = assignedTo,
                    startDate = t.StartDate,
                    endDate = t.EndDate,
                    status = t.Status,
                    taskType = t.TaskType,
                    priority = t.Priority
                };
            }).ToList<object>();

            result = new
            {
                personName = personName,
                startDate = startDate,
                endDate = endDate,
                engineerHours = engineerHoursDict.Cast<object>().ToList(),
                relatedProjects = relatedProjectsList,
                relatedTasks = relatedTasksList
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取人员报告失败");
            return StatusCode(500, new { error = $"获取人员报告失败: {ex.Message}" });
        }
    }

    /// <summary>
    /// 根据工程师查询报告
    /// 显示该工程师在时间段内完成的任务和项目、关联的相关方
    /// </summary>
    [HttpPost("engineer-report")]
    public async Task<ActionResult<object>> GetEngineerReport([FromBody] dynamic reportData)
    {
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();

            string engineerId = reportData.engineerId?.ToString() ?? string.Empty;
            string startDate = reportData.startDate?.ToString() ?? string.Empty;
            string endDate = reportData.endDate?.ToString() ?? string.Empty;

            if (string.IsNullOrWhiteSpace(engineerId))
            {
                return BadRequest(new { error = "工程师ID不能为空" });
            }

            // 获取工程师信息
            var engineer = await _context.Users.FindAsync(engineerId);
            if (engineer == null)
            {
                return NotFound(new { error = "工程师不存在" });
            }

            // 解析日期
            DateTime? start = null;
            DateTime? end = null;
            if (!string.IsNullOrWhiteSpace(startDate) && DateTime.TryParse(startDate, out var sd))
            {
                start = sd;
            }
            if (!string.IsNullOrWhiteSpace(endDate) && DateTime.TryParse(endDate, out var ed))
            {
                end = ed.AddDays(1); // 包含结束日期当天
            }

            // 查询分配给该工程师的任务
            var allTasks = await _context.Tasks.ToListAsync();
            var engineerTasks = allTasks.Where(t =>
            {
                if (string.IsNullOrEmpty(t.AssignedToJson)) return false;
                try
                {
                    var assignedTo = JsonConvert.DeserializeObject<List<string>>(t.AssignedToJson) ?? new List<string>();
                    return assignedTo.Contains(engineerId);
                }
                catch
                {
                    return false;
                }
            }).ToList();

            // 过滤时间范围
            if (start.HasValue || end.HasValue)
            {
                engineerTasks = engineerTasks.Where(t =>
                {
                    bool inRange = true;
                    if (start.HasValue && !string.IsNullOrEmpty(t.StartDate))
                    {
                        if (DateTime.TryParse(t.StartDate, out var taskStart))
                        {
                            inRange = inRange && taskStart >= start.Value;
                        }
                    }
                    if (end.HasValue && !string.IsNullOrEmpty(t.EndDate))
                    {
                        if (DateTime.TryParse(t.EndDate, out var taskEnd))
                        {
                            inRange = inRange && taskEnd <= end.Value;
                        }
                    }
                    return inRange;
                }).ToList();
            }

            // 获取相关项目
            var projectIds = engineerTasks
                .Where(t => !string.IsNullOrEmpty(t.ProjectId))
                .Select(t => t.ProjectId)
                .Distinct()
                .ToList();

            var relatedProjects = await _context.Projects
                .Where(p => projectIds.Contains(p.Id))
                .ToListAsync();

            // 查询该工程师的工时记录
            var laborCostsAll = await _context.LaborCosts
                .Where(lc => lc.EngineerId == engineerId)
                .ToListAsync();

            // 在内存中应用时间过滤
            var laborCosts = laborCostsAll.Where(lc =>
            {
                if (string.IsNullOrEmpty(lc.WorkDate)) return false;
                if (DateTime.TryParse(lc.WorkDate, out var workDate))
                {
                    bool inRange = true;
                    if (start.HasValue) inRange = inRange && workDate >= start.Value;
                    if (end.HasValue) inRange = inRange && workDate <= end.Value;
                    return inRange;
                }
                return false;
            }).ToList();

            // 计算总工时（从任务的开始和结束时间计算）
            double totalHours = 0;
            foreach (var task in engineerTasks)
            {
                if (!string.IsNullOrEmpty(task.StartDate) && !string.IsNullOrEmpty(task.EndDate))
                {
                    if (DateTime.TryParse(task.StartDate, out var taskStartDate) && 
                        DateTime.TryParse(task.EndDate, out var taskEndDate))
                    {
                        // 计算时间差（小时）
                        var timeSpan = taskEndDate - taskStartDate;
                        totalHours += timeSpan.TotalHours;
                        
                        // 如果时间差为0或负数，至少算1小时
                        if (timeSpan.TotalHours <= 0)
                        {
                            totalHours += 1;
                        }
                    }
                }
                else if (!string.IsNullOrEmpty(task.StartDate))
                {
                    // 如果只有开始时间，算1小时
                    totalHours += 1;
                }
            }
            
            // 如果 LaborCost 表中有数据，优先使用 LaborCost 的工时
            var laborCostHours = laborCosts.Sum(lc => (double)lc.Hours);
            if (laborCostHours > 0)
            {
                totalHours = laborCostHours;
            }

            // 查询该工程师在这段时间内创建的资产（通过 OwnerId 或 CreatedAt 时间范围）
            var engineerAssets = await _context.Assets
                .Where(a => 
                    (a.OwnerId == engineerId || a.OwnerName == engineer.Name) &&
                    (!start.HasValue || a.CreatedAt >= start.Value) &&
                    (!end.HasValue || a.CreatedAt <= end.Value)
                )
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();

            // 统计相关方（从任务的 Stakeholder 和项目的 SalesName）
            var stakeholders = engineerTasks
                .Where(t => !string.IsNullOrEmpty(t.Stakeholder))
                .Select(t => t.Stakeholder)
                .Distinct()
                .ToList();

            var projectStakeholders = relatedProjects
                .Where(p => !string.IsNullOrEmpty(p.SalesName))
                .Select(p => p.SalesName)
                .Distinct()
                .ToList();

            var allStakeholders = stakeholders
                .Concat(projectStakeholders)
                .Distinct()
                .ToList();

            // 按项目分组统计任务（工时从任务时间计算）
            var projectTaskStats = engineerTasks
                .Where(t => !string.IsNullOrEmpty(t.ProjectId))
                .GroupBy(t => t.ProjectId)
                .Select(g =>
                {
                    var projectTasks = g.ToList();
                    double projectHours = 0;
                    foreach (var task in projectTasks)
                    {
                        if (!string.IsNullOrEmpty(task.StartDate) && !string.IsNullOrEmpty(task.EndDate))
                        {
                            if (DateTime.TryParse(task.StartDate, out var taskStartDate) && 
                                DateTime.TryParse(task.EndDate, out var taskEndDate))
                            {
                                var timeSpan = taskEndDate - taskStartDate;
                                projectHours += timeSpan.TotalHours > 0 ? timeSpan.TotalHours : 1;
                            }
                        }
                        else if (!string.IsNullOrEmpty(task.StartDate))
                        {
                            projectHours += 1;
                        }
                    }
                    
                    // 如果 LaborCost 表中有数据，优先使用
                    var projectLaborHours = laborCosts
                        .Where(lc => lc.ProjectId == g.Key)
                        .Sum(lc => (double)lc.Hours);
                    if (projectLaborHours > 0)
                    {
                        projectHours = projectLaborHours;
                    }
                    
                    return new
                    {
                        projectId = g.Key,
                        projectName = relatedProjects.FirstOrDefault(p => p.Id == g.Key)?.ProjectName,
                        taskCount = projectTasks.Count,
                        completedTaskCount = projectTasks.Count(t => t.Status == "completed"),
                        totalHours = projectHours
                    };
                })
                .ToList();

            // 构建结果
            var result = new
            {
                engineerId = engineer.Id,
                engineerName = engineer.Name,
                startDate = startDate,
                endDate = endDate,
                totalTasks = engineerTasks.Count,
                completedTasks = engineerTasks.Count(t => t.Status == "completed"),
                totalProjects = relatedProjects.Count,
                totalHours = totalHours,
                totalAssets = engineerAssets.Count,
                stakeholders = allStakeholders,
                tasks = engineerTasks.Select(t =>
                {
                    // 计算任务工时（从开始和结束时间）
                    double taskHours = 0;
                    if (!string.IsNullOrEmpty(t.StartDate) && !string.IsNullOrEmpty(t.EndDate))
                    {
                        if (DateTime.TryParse(t.StartDate, out var taskStartDate) && 
                            DateTime.TryParse(t.EndDate, out var taskEndDate))
                        {
                            var timeSpan = taskEndDate - taskStartDate;
                            taskHours = timeSpan.TotalHours > 0 ? timeSpan.TotalHours : 1;
                        }
                    }
                    else if (!string.IsNullOrEmpty(t.StartDate))
                    {
                        taskHours = 1;
                    }
                    
                    // 如果 LaborCost 表中有数据，优先使用
                    var taskLaborHours = laborCosts
                        .Where(lc => lc.TaskId == t.Id)
                        .Sum(lc => (double)lc.Hours);
                    if (taskLaborHours > 0)
                    {
                        taskHours = taskLaborHours;
                    }
                    
                    return new
                    {
                        id = t.Id,
                        name = t.Name,
                        projectId = t.ProjectId,
                        projectName = relatedProjects.FirstOrDefault(p => p.Id == t.ProjectId)?.ProjectName,
                        stakeholder = t.Stakeholder,
                        startDate = t.StartDate,
                        endDate = t.EndDate,
                        status = t.Status,
                        taskType = t.TaskType,
                        priority = t.Priority,
                        completedDate = t.CompletedDate,
                        hours = taskHours
                    };
                }).ToList(),
                assets = engineerAssets.Select(a => new
                {
                    id = a.Id,
                    name = a.Name,
                    type = a.Type,
                    maturity = a.Maturity,
                    ownerName = a.OwnerName,
                    description = a.Description,
                    reuseCount = a.ReuseCount,
                    createdAt = a.CreatedAt.ToString("yyyy-MM-dd HH:mm:ss")
                }).ToList(),
                projects = projectTaskStats,
                laborCosts = laborCosts.Select(lc => new
                {
                    id = lc.Id,
                    taskId = lc.TaskId,
                    projectId = lc.ProjectId,
                    workDate = lc.WorkDate,
                    hours = (double)lc.Hours,
                    workDescription = lc.WorkDescription
                }).ToList()
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "获取工程师报告失败");
            return StatusCode(500, new { error = $"获取工程师报告失败: {ex.Message}" });
        }
    }
}
