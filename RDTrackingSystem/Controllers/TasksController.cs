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
public class TasksController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<TasksController> _logger;

    public TasksController(ApplicationDbContext context, ILogger<TasksController> logger)
    {
        _context = context;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetTasks()
    {
        Console.WriteLine($"[TasksController] GetTasks() 开始执行 - {DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}");
        try
        {
            if (_context == null)
            {
                var errorMsg = "数据库上下文为空";
                Console.WriteLine($"[TasksController] GetTasks() 错误: {errorMsg}");
                _logger.LogError(errorMsg);
                return Ok(new List<object>());
            }

            Console.WriteLine($"[TasksController] GetTasks() 检查数据库连接状态...");
            var canConnect = await _context.Database.CanConnectAsync();
            Console.WriteLine($"[TasksController] GetTasks() 数据库连接状态: {canConnect}");

            if (!canConnect)
            {
                var errorMsg = "无法连接到数据库";
                Console.WriteLine($"[TasksController] GetTasks() 错误: {errorMsg}");
                _logger.LogError(errorMsg);
                return Ok(new List<object>());
            }

            Console.WriteLine($"[TasksController] GetTasks() 开始查询数据库...");
            
            // 尝试使用 EF Core 查询，如果失败则使用原始 SQL（兼容旧数据库）
            List<object> result;
            try
            {
                var tasks = await _context.Tasks.ToListAsync();
                Console.WriteLine($"[TasksController] GetTasks() 查询完成，找到 {tasks.Count} 个任务");

                result = tasks.Select(t => new
                {
                    id = t.Id ?? string.Empty,
                    name = t.Name ?? string.Empty,
                    projectId = t.ProjectId ?? string.Empty,
                    assignedTo = string.IsNullOrEmpty(t.AssignedToJson) 
                        ? new List<string>() 
                        : JsonConvert.DeserializeObject<List<string>>(t.AssignedToJson) ?? new List<string>(),
                    startDate = t.StartDate ?? string.Empty,
                    endDate = t.EndDate ?? string.Empty,
                    requirements = t.Requirements ?? string.Empty,
                    stakeholder = t.Stakeholder ?? string.Empty,
                    priority = t.Priority ?? "medium",
                    status = t.Status ?? "pending",
                    taskType = t.TaskType ?? "project",
                    completedDate = t.CompletedDate ?? string.Empty,
                    completionNotes = t.CompletionNotes ?? string.Empty,
                    completedBy = t.CompletedBy ?? string.Empty
                }).Cast<object>().ToList();
            }
            catch (Exception efEx)
            {
                Console.WriteLine($"[TasksController] GetTasks() EF Core 查询失败，尝试使用原始 SQL: {efEx.Message}");
                // 使用原始 SQL 查询作为回退方案
                result = await GetTasksUsingRawSql();
            }

            Console.WriteLine($"[TasksController] GetTasks() 成功，返回 {result.Count} 个任务");
            _logger.LogInformation("GetTasks() 成功，返回 {Count} 个任务", result.Count);
            return Ok(result);
        }
        catch (Exception ex)
        {
            var errorMsg = $"获取任务列表失败: {ex.Message}";
            Console.WriteLine($"[TasksController] GetTasks() 异常: {errorMsg}");
            Console.WriteLine($"[TasksController] GetTasks() 堆栈跟踪: {ex.StackTrace}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"[TasksController] GetTasks() 内部异常: {ex.InnerException.Message}");
                Console.WriteLine($"[TasksController] GetTasks() 内部异常堆栈: {ex.InnerException.StackTrace}");
            }
            _logger.LogError(ex, "获取任务列表失败: {Message}\n堆栈跟踪: {StackTrace}", ex.Message, ex.StackTrace);
            // 返回空数组而不是错误，确保前端能正常处理
            return Ok(new List<object>());
        }
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetTask(string id)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null)
        {
            return NotFound();
        }

        return Ok(new
        {
            id = task.Id,
            name = task.Name,
            projectId = task.ProjectId,
            assignedTo = string.IsNullOrEmpty(task.AssignedToJson) 
                ? new List<string>() 
                : JsonConvert.DeserializeObject<List<string>>(task.AssignedToJson) ?? new List<string>(),
            startDate = task.StartDate,
            endDate = task.EndDate,
            requirements = task.Requirements ?? string.Empty,
            stakeholder = task.Stakeholder ?? string.Empty,
            priority = task.Priority ?? "medium",
            status = task.Status ?? "pending",
            taskType = task.TaskType ?? "project",
            completedDate = task.CompletedDate ?? string.Empty,
            completionNotes = task.CompletionNotes ?? string.Empty,
            completedBy = task.CompletedBy ?? string.Empty
        });
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateTask([FromBody] dynamic taskData)
    {
        try
        {
            // 确保数据库架构是最新的（添加缺失的字段）
            try
            {
                DatabaseSchemaMigrator.MigrateSchema();
            }
            catch (Exception migrateEx)
            {
                _logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}");
            }
            
            // 先确保数据库架构是最新的
            try
            {
                // 强制刷新数据库上下文，确保架构同步
                await _context.Database.ExecuteSqlRawAsync("SELECT 1");
            }
            catch { }
            
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
                await _context.SaveChangesAsync();
            }
            catch (Microsoft.Data.Sqlite.SqliteException sqlEx) when (sqlEx.Message.Contains("no such column") || sqlEx.Message.Contains("unknown column"))
            {
                // 如果是因为缺少字段，再次尝试迁移
                _logger.LogWarning($"保存任务时发现字段缺失，尝试迁移: {sqlEx.Message}");
                DatabaseSchemaMigrator.MigrateSchema();
                
                // 重新创建上下文并重试
                _context.Entry(task).State = Microsoft.EntityFrameworkCore.EntityState.Detached;
                _context.Tasks.Add(task);
                await _context.SaveChangesAsync();
            }

            // 自动保存相关方（利益方）
            if (!string.IsNullOrWhiteSpace(task.Stakeholder))
            {
                await StakeholderService.SaveStakeholderAsync(_context, task.Stakeholder, "stakeholder");
            }

            return Ok(new { id = task.Id, message = "任务创建成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "创建任务失败");
            return StatusCode(500, new { message = "创建任务失败", error = ex.Message });
        }
    }

    [HttpPut("{id}")]
    public async Task<ActionResult> UpdateTask(string id, [FromBody] dynamic taskData)
    {
        // 确保数据库架构是最新的（添加缺失的字段）
        try
        {
            DatabaseSchemaMigrator.MigrateSchema();
        }
        catch (Exception migrateEx)
        {
            _logger.LogWarning($"架构迁移失败，继续执行: {migrateEx.Message}");
        }
        
        var task = await _context.Tasks.FindAsync(id);
        if (task == null)
        {
            return NotFound();
        }

        try
        {
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

            await _context.SaveChangesAsync();
            
            // 自动保存相关方（利益方）
            if (!string.IsNullOrWhiteSpace(task.Stakeholder))
            {
                await StakeholderService.SaveStakeholderAsync(_context, task.Stakeholder, "stakeholder");
            }
            
            return Ok(new { message = "任务更新成功" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "更新任务失败");
            return StatusCode(500, new { message = "更新任务失败", error = ex.Message });
        }
    }

    [HttpDelete("{id}")]
    public async Task<ActionResult> DeleteTask(string id)
    {
        var task = await _context.Tasks.FindAsync(id);
        if (task == null)
        {
            return NotFound();
        }

        _context.Tasks.Remove(task);
        await _context.SaveChangesAsync();
        return Ok(new { message = "任务已删除" });
    }

    // 使用原始 SQL 查询作为回退方案（兼容旧数据库）
    private async Task<List<object>> GetTasksUsingRawSql()
    {
        var result = new List<object>();
        try
        {
            // 检查新列是否存在
            var checkSql = "SELECT COUNT(*) FROM pragma_table_info('Tasks') WHERE name = 'Requirements'";
            var hasNewColumns = false;
            using (var checkCommand = _context.Database.GetDbConnection().CreateCommand())
            {
                checkCommand.CommandText = checkSql;
                if (_context.Database.GetDbConnection().State != System.Data.ConnectionState.Open)
                {
                    await _context.Database.OpenConnectionAsync();
                }
                var count = await checkCommand.ExecuteScalarAsync();
                hasNewColumns = Convert.ToInt32(count) > 0;
            }

            var sql = hasNewColumns
                ? @"
                    SELECT 
                        Id, Name, COALESCE(ProjectId, '') as ProjectId,
                        COALESCE(AssignedToJson, '[]') as AssignedToJson,
                        COALESCE(StartDate, '') as StartDate,
                        COALESCE(EndDate, '') as EndDate,
                        COALESCE(Requirements, '') as Requirements,
                        COALESCE(Stakeholder, '') as Stakeholder,
                        COALESCE(Priority, 'medium') as Priority,
                        COALESCE(Status, 'pending') as Status,
                        COALESCE(TaskType, 'project') as TaskType,
                        COALESCE(CompletedDate, '') as CompletedDate,
                        COALESCE(CompletionNotes, '') as CompletionNotes,
                        COALESCE(CompletedBy, '') as CompletedBy
                    FROM Tasks
                "
                : @"
                    SELECT 
                        Id, Name, COALESCE(ProjectId, '') as ProjectId,
                        COALESCE(AssignedToJson, '[]') as AssignedToJson,
                        COALESCE(StartDate, '') as StartDate,
                        COALESCE(EndDate, '') as EndDate,
                        '' as Requirements, '' as Stakeholder,
                        'medium' as Priority, 'pending' as Status,
                        'project' as TaskType,
                        '' as CompletedDate, '' as CompletionNotes, '' as CompletedBy
                    FROM Tasks
                ";

            using (var command = _context.Database.GetDbConnection().CreateCommand())
            {
                command.CommandText = sql;
                using (var reader = await command.ExecuteReaderAsync())
                {
                    while (await reader.ReadAsync())
                    {
                        result.Add(new
                        {
                            id = reader["Id"]?.ToString() ?? string.Empty,
                            name = reader["Name"]?.ToString() ?? string.Empty,
                            projectId = reader["ProjectId"]?.ToString() ?? string.Empty,
                            assignedTo = ParseJsonArray(reader["AssignedToJson"]?.ToString() ?? "[]"),
                            startDate = reader["StartDate"]?.ToString() ?? string.Empty,
                            endDate = reader["EndDate"]?.ToString() ?? string.Empty,
                            requirements = reader["Requirements"]?.ToString() ?? string.Empty,
                            stakeholder = reader["Stakeholder"]?.ToString() ?? string.Empty,
                            priority = reader["Priority"]?.ToString() ?? "medium",
                            status = reader["Status"]?.ToString() ?? "pending",
                            taskType = reader["TaskType"]?.ToString() ?? "project",
                            completedDate = reader["CompletedDate"]?.ToString() ?? string.Empty,
                            completionNotes = reader["CompletionNotes"]?.ToString() ?? string.Empty,
                            completedBy = reader["CompletedBy"]?.ToString() ?? string.Empty
                        });
                    }
                }
            }
            await _context.Database.CloseConnectionAsync();
            Console.WriteLine($"[TasksController] GetTasksUsingRawSql() 成功，返回 {result.Count} 个任务");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[TasksController] GetTasksUsingRawSql() 失败: {ex.Message}");
            _logger.LogError(ex, "使用原始 SQL 查询任务失败");
        }
        return result;
    }

    private List<string> ParseJsonArray(string json)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(json) || json == "[]")
                return new List<string>();
            return JsonConvert.DeserializeObject<List<string>>(json) ?? new List<string>();
        }
        catch
        {
            return new List<string>();
        }
    }
}
