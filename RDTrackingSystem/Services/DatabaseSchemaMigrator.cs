using Microsoft.Data.Sqlite;
using RDTrackingSystem.Data;

namespace RDTrackingSystem.Services;

/// <summary>
/// 数据库架构迁移服务
/// 自动检测并添加缺失的字段，确保数据库结构与模型一致
/// </summary>
public static class DatabaseSchemaMigrator
{
    /// <summary>
    /// 迁移数据库架构，确保所有表都存在且包含所有必需的字段
    /// </summary>
    public static void MigrateSchema()
    {
        var logger = FileLogger.Instance;
        logger.LogInfo("开始数据库架构迁移...", "DatabaseSchemaMigrator");
        
        try
        {
            var dbPath = DatabaseConnectionHelper.GetNormalizedDatabasePath();
            
            if (!File.Exists(dbPath))
            {
                logger.LogInfo("数据库文件不存在，将使用 EF Core EnsureCreated 创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var connectionString = DatabaseConnectionHelper.BuildConnectionString();
            
            using (var connection = new SqliteConnection(connectionString))
            {
                connection.Open();
                
                // 启用外键约束
                var pragmaCommand = connection.CreateCommand();
                pragmaCommand.CommandText = "PRAGMA foreign_keys = ON;";
                pragmaCommand.ExecuteNonQuery();
                
                // 迁移 Users 表
                MigrateUsersTable(connection, logger);
                
                // 迁移 Projects 表
                MigrateProjectsTable(connection, logger);
                
                // 迁移 Tasks 表
                MigrateTasksTable(connection, logger);
                
                // 迁移 TimelineEvents 表
                MigrateTimelineEventsTable(connection, logger);
                
                // 创建 LessonLearned 表（如果不存在）
                CreateLessonLearnedTableIfNotExists(connection, logger);
                
                // 创建 Risks 和 RiskResponses 表（如果不存在）
                CreateRisksTableIfNotExists(connection, logger);
                CreateRiskResponsesTableIfNotExists(connection, logger);
                
                // 创建资产相关表（如果不存在）
                CreateAssetsTableIfNotExists(connection, logger);
                CreateAssetVersionsTableIfNotExists(connection, logger);
                CreateAssetProjectRelationsTableIfNotExists(connection, logger);
                CreateAssetHealthMetricsTableIfNotExists(connection, logger);
                
                // 创建名言表（如果不存在）
                CreateManagementQuotesTableIfNotExists(connection, logger);
                
                // 创建产品相关表（如果不存在）
                CreateProductsTableIfNotExists(connection, logger);
                CreateProductModulesTableIfNotExists(connection, logger);
                CreateProductSubModulesTableIfNotExists(connection, logger);
                CreateProductFunctionsTableIfNotExists(connection, logger);
                CreateProductFunctionAssetsTableIfNotExists(connection, logger);
                CreateProductFunctionEngineersTableIfNotExists(connection, logger);
                CreateProductFunctionCustomersTableIfNotExists(connection, logger);
                CreateProductFunctionTasksTableIfNotExists(connection, logger);
                CreateProductVersionsTableIfNotExists(connection, logger);
                
                // 创建成本管理相关表（如果不存在）
                CreateProductCostsTableIfNotExists(connection, logger);
                CreateBomItemsTableIfNotExists(connection, logger);
                CreateLaborCostsTableIfNotExists(connection, logger);
                CreateManufacturingCostsTableIfNotExists(connection, logger);
                CreateProductPricingsTableIfNotExists(connection, logger);
                
                // 创建相关方表（如果不存在）
                CreateStakeholdersTableIfNotExists(connection, logger);
                
                logger.LogInfo("数据库架构迁移完成", "DatabaseSchemaMigrator");
            }
        }
        catch (Exception)
        {
          
        }
    }
    
    /// <summary>
    /// 迁移 Users 表
    /// </summary>
    private static void MigrateUsersTable(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            // 检查表是否存在
            if (!TableExists(connection, "Users"))
            {
                logger.LogInfo("Users 表不存在，将使用 EF Core 创建", "DatabaseSchemaMigrator");
                return;
            }
            
            // 检查并添加缺失的字段
            AddColumnIfNotExists(connection, "Users", "SkillTags", "TEXT", logger);
            AddColumnIfNotExists(connection, "Users", "MaxConcurrentTasks", "INTEGER DEFAULT 5", logger);
            AddColumnIfNotExists(connection, "Users", "AvailabilityRate", "REAL DEFAULT 1.0", logger);
            AddColumnIfNotExists(connection, "Users", "LeavePercentage", "REAL DEFAULT 0.0", logger);
            AddColumnIfNotExists(connection, "Users", "MeetingPercentage", "REAL DEFAULT 0.1", logger);
            AddColumnIfNotExists(connection, "Users", "SupportWorkPercentage", "REAL DEFAULT 0.1", logger);
            
            logger.LogInfo("Users 表迁移完成", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"迁移 Users 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
            throw;
        }
    }
    
    /// <summary>
    /// 迁移 Projects 表
    /// </summary>
    private static void MigrateProjectsTable(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            // 检查表是否存在
            if (!TableExists(connection, "Projects"))
            {
                logger.LogInfo("Projects 表不存在，将使用 EF Core 创建", "DatabaseSchemaMigrator");
                return;
            }
            
            // 检查并添加缺失的字段
            AddColumnIfNotExists(connection, "Projects", "LocalPath", "TEXT", logger);
            
            logger.LogInfo("Projects 表迁移完成", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"迁移 Projects 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
            throw;
        }
    }
    
    /// <summary>
    /// 迁移 Tasks 表
    /// </summary>
    private static void MigrateTasksTable(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            // 检查表是否存在
            if (!TableExists(connection, "Tasks"))
            {
                logger.LogInfo("Tasks 表不存在，将使用 EF Core 创建", "DatabaseSchemaMigrator");
                return;
            }
            
            // 检查并添加缺失的字段
            // SQLite 的 DEFAULT 值语法：对于字符串，使用单引号；对于数字，直接写数字
            AddColumnIfNotExists(connection, "Tasks", "TaskType", "TEXT DEFAULT 'project'", logger);
            AddColumnIfNotExists(connection, "Tasks", "TagType", "TEXT", logger);
            AddColumnIfNotExists(connection, "Tasks", "LessonLearnedId", "TEXT", logger);
            
            logger.LogInfo("Tasks 表迁移完成", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"迁移 Tasks 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
            // 不重新抛出异常，允许程序继续运行
        }
    }
    
    /// <summary>
    /// 检查表是否存在
    /// </summary>
    private static bool TableExists(SqliteConnection connection, string tableName)
    {
        var command = connection.CreateCommand();
        command.CommandText = @"
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name=@tableName;
        ";
        command.Parameters.AddWithValue("@tableName", tableName);
        
        var result = command.ExecuteScalar();
        return result != null && result.ToString() == tableName;
    }
    
    /// <summary>
    /// 检查列是否存在
    /// </summary>
    private static bool ColumnExists(SqliteConnection connection, string tableName, string columnName)
    {
        try
        {
            var command = connection.CreateCommand();
            command.CommandText = $"PRAGMA table_info({tableName});";
            
            using (var reader = command.ExecuteReader())
            {
                while (reader.Read())
                {
                    var name = reader.GetString(1); // name 列在索引 1
                    if (name.Equals(columnName, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }
            
            return false;
        }
        catch
        {
            return false;
        }
    }
    
    /// <summary>
    /// 如果列不存在则添加列
    /// </summary>
    private static void AddColumnIfNotExists(SqliteConnection connection, string tableName, string columnName, string columnDefinition, FileLogger logger)
    {
        if (ColumnExists(connection, tableName, columnName))
        {
            logger.LogInfo($"列 {tableName}.{columnName} 已存在，跳过", "DatabaseSchemaMigrator");
            return;
        }
        
        try
        {
            var command = connection.CreateCommand();
            // 使用方括号或引号包裹表名和列名，避免关键字冲突
            // SQLite 的 ALTER TABLE ADD COLUMN 语法
            command.CommandText = $"ALTER TABLE [{tableName}] ADD COLUMN [{columnName}] {columnDefinition};";
            logger.LogInfo($"执行 SQL: {command.CommandText}", "DatabaseSchemaMigrator");
            command.ExecuteNonQuery();
            
            logger.LogInfo($"已添加列 {tableName}.{columnName}", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"添加列 {tableName}.{columnName} 失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
            // 不重新抛出异常，允许程序继续运行
            // 如果字段已存在或其他原因导致失败，不影响程序运行
        }
    }
    
    /// <summary>
    /// 迁移 TimelineEvents 表
    /// </summary>
    private static void MigrateTimelineEventsTable(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (!TableExists(connection, "TimelineEvents"))
            {
                logger.LogInfo("TimelineEvents 表不存在，将使用 EF Core 创建", "DatabaseSchemaMigrator");
                return;
            }
            
            AddColumnIfNotExists(connection, "TimelineEvents", "TagType", "TEXT", logger);
            AddColumnIfNotExists(connection, "TimelineEvents", "LessonLearnedId", "TEXT", logger);
            
            logger.LogInfo("TimelineEvents 表迁移完成", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"迁移 TimelineEvents 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 LessonLearned 表（如果不存在）
    /// </summary>
    private static void CreateLessonLearnedTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "LessonLearned"))
            {
                logger.LogInfo("LessonLearned 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [LessonLearned] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [TagType] TEXT NOT NULL,
                    [ProjectId] TEXT,
                    [TaskId] TEXT,
                    [TimelineEventId] TEXT,
                    [Background] TEXT NOT NULL,
                    [RootCause] TEXT NOT NULL,
                    [IfRedo] TEXT NOT NULL,
                    [HasReuseValue] INTEGER NOT NULL DEFAULT 0,
                    [RelatedProjectName] TEXT,
                    [RelatedTaskName] TEXT,
                    [CreatedBy] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now'))
                );
                
                CREATE INDEX IF NOT EXISTS [IX_LessonLearned_TagType] ON [LessonLearned]([TagType]);
                CREATE INDEX IF NOT EXISTS [IX_LessonLearned_ProjectId] ON [LessonLearned]([ProjectId]);
                CREATE INDEX IF NOT EXISTS [IX_LessonLearned_TaskId] ON [LessonLearned]([TaskId]);
                CREATE INDEX IF NOT EXISTS [IX_LessonLearned_HasReuseValue] ON [LessonLearned]([HasReuseValue]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("LessonLearned 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 LessonLearned 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 Risks 表（如果不存在）
    /// </summary>
    private static void CreateRisksTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "Risks"))
            {
                logger.LogInfo("Risks 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [Risks] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProjectId] TEXT NOT NULL,
                    [Description] TEXT NOT NULL,
                    [Category] TEXT,
                    [Probability] INTEGER NOT NULL DEFAULT 1,
                    [Impact] INTEGER NOT NULL DEFAULT 1,
                    [RiskLevel] INTEGER NOT NULL DEFAULT 1,
                    [Status] TEXT NOT NULL DEFAULT 'identified',
                    [Owner] TEXT,
                    [RootCause] TEXT,
                    [Trigger] TEXT,
                    [Notes] TEXT,
                    [IdentifiedDate] TEXT NOT NULL DEFAULT (datetime('now')),
                    [ExpectedOccurrenceDate] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProjectId]) REFERENCES [Projects]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_Risks_ProjectId] ON [Risks]([ProjectId]);
                CREATE INDEX IF NOT EXISTS [IX_Risks_Status] ON [Risks]([Status]);
                CREATE INDEX IF NOT EXISTS [IX_Risks_RiskLevel] ON [Risks]([RiskLevel]);
                CREATE INDEX IF NOT EXISTS [IX_Risks_ProjectId_Status] ON [Risks]([ProjectId], [Status]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("Risks 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 Risks 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 RiskResponses 表（如果不存在）
    /// </summary>
    private static void CreateRiskResponsesTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "RiskResponses"))
            {
                logger.LogInfo("RiskResponses 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [RiskResponses] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [RiskId] TEXT NOT NULL,
                    [Strategy] TEXT NOT NULL DEFAULT 'mitigate',
                    [ActionPlan] TEXT NOT NULL,
                    [Responsible] TEXT,
                    [Status] TEXT DEFAULT 'planned',
                    [DueDate] TEXT,
                    [Notes] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([RiskId]) REFERENCES [Risks]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_RiskResponses_RiskId] ON [RiskResponses]([RiskId]);
                CREATE INDEX IF NOT EXISTS [IX_RiskResponses_Status] ON [RiskResponses]([Status]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("RiskResponses 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 RiskResponses 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 Assets 表（如果不存在）
    /// </summary>
    private static void CreateAssetsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "Assets"))
            {
                logger.LogInfo("Assets 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [Assets] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [Name] TEXT NOT NULL,
                    [Type] TEXT NOT NULL,
                    [Maturity] TEXT NOT NULL DEFAULT '试验',
                    [OwnerId] TEXT,
                    [OwnerName] TEXT,
                    [Description] TEXT,
                    [Tags] TEXT,
                    [ReuseCount] INTEGER NOT NULL DEFAULT 0,
                    [RelatedProjectIds] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now'))
                );
                
                CREATE INDEX IF NOT EXISTS [IX_Assets_Type] ON [Assets]([Type]);
                CREATE INDEX IF NOT EXISTS [IX_Assets_Maturity] ON [Assets]([Maturity]);
                CREATE INDEX IF NOT EXISTS [IX_Assets_OwnerId] ON [Assets]([OwnerId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("Assets 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 Assets 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 AssetVersions 表（如果不存在）
    /// </summary>
    private static void CreateAssetVersionsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "AssetVersions"))
            {
                logger.LogInfo("AssetVersions 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [AssetVersions] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [AssetId] TEXT NOT NULL,
                    [Version] TEXT NOT NULL,
                    [ChangeReason] TEXT,
                    [QualityChanges] TEXT,
                    [TechnicalDebt] TEXT,
                    [ChangedBy] TEXT,
                    [QualityScore] REAL,
                    [DefectDensity] REAL,
                    [ChangeFrequency] REAL,
                    [RegressionCost] REAL,
                    [MaintenanceBurden] REAL,
                    [VersionDate] TEXT NOT NULL DEFAULT (datetime('now')),
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([AssetId]) REFERENCES [Assets]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_AssetVersions_AssetId] ON [AssetVersions]([AssetId]);
                CREATE INDEX IF NOT EXISTS [IX_AssetVersions_VersionDate] ON [AssetVersions]([VersionDate]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("AssetVersions 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 AssetVersions 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 AssetProjectRelations 表（如果不存在）
    /// </summary>
    private static void CreateAssetProjectRelationsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "AssetProjectRelations"))
            {
                logger.LogInfo("AssetProjectRelations 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [AssetProjectRelations] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [AssetId] TEXT NOT NULL,
                    [ProjectId] TEXT NOT NULL,
                    [RelationType] TEXT NOT NULL,
                    [Version] TEXT,
                    [Notes] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([AssetId]) REFERENCES [Assets]([Id]) ON DELETE CASCADE,
                    FOREIGN KEY([ProjectId]) REFERENCES [Projects]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_AssetProjectRelations_AssetId] ON [AssetProjectRelations]([AssetId]);
                CREATE INDEX IF NOT EXISTS [IX_AssetProjectRelations_ProjectId] ON [AssetProjectRelations]([ProjectId]);
                CREATE INDEX IF NOT EXISTS [IX_AssetProjectRelations_RelationType] ON [AssetProjectRelations]([RelationType]);
                CREATE INDEX IF NOT EXISTS [IX_AssetProjectRelations_AssetId_ProjectId] ON [AssetProjectRelations]([AssetId], [ProjectId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("AssetProjectRelations 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 AssetProjectRelations 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 AssetHealthMetrics 表（如果不存在）
    /// </summary>
    private static void CreateAssetHealthMetricsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "AssetHealthMetrics"))
            {
                logger.LogInfo("AssetHealthMetrics 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [AssetHealthMetrics] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [AssetId] TEXT NOT NULL,
                    [ReuseRate] REAL NOT NULL DEFAULT 0.0,
                    [DefectDensity] REAL NOT NULL DEFAULT 0.0,
                    [ChangeFrequency] REAL NOT NULL DEFAULT 0.0,
                    [RegressionCost] REAL NOT NULL DEFAULT 0.0,
                    [MaintenanceBurden] REAL NOT NULL DEFAULT 0.0,
                    [HealthScore] REAL NOT NULL DEFAULT 0.0,
                    [CalculatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([AssetId]) REFERENCES [Assets]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_AssetHealthMetrics_AssetId] ON [AssetHealthMetrics]([AssetId]);
                CREATE INDEX IF NOT EXISTS [IX_AssetHealthMetrics_CalculatedAt] ON [AssetHealthMetrics]([CalculatedAt]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("AssetHealthMetrics 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 AssetHealthMetrics 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    /// <summary>
    /// 创建 ManagementQuotes 表（如果不存在）
    /// </summary>
    private static void CreateManagementQuotesTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ManagementQuotes"))
            {
                logger.LogInfo("ManagementQuotes 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ManagementQuotes] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [Quote] TEXT NOT NULL,
                    [Category] TEXT,
                    [Tags] TEXT,
                    [DisplayCount] INTEGER NOT NULL DEFAULT 0,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now'))
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ManagementQuotes_Category] ON [ManagementQuotes]([Category]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ManagementQuotes 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ManagementQuotes 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "Products"))
            {
                logger.LogInfo("Products 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [Products] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [Name] TEXT NOT NULL,
                    [Code] TEXT NOT NULL,
                    [Description] TEXT,
                    [CurrentVersion] TEXT,
                    [Status] TEXT NOT NULL DEFAULT 'active',
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now'))
                );
                
                CREATE UNIQUE INDEX IF NOT EXISTS [IX_Products_Code] ON [Products]([Code]);
                CREATE INDEX IF NOT EXISTS [IX_Products_Status] ON [Products]([Status]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("Products 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 Products 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductModulesTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductModules"))
            {
                logger.LogInfo("ProductModules 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductModules] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProductId] TEXT NOT NULL,
                    [Name] TEXT NOT NULL,
                    [Type] TEXT NOT NULL,
                    [Description] TEXT,
                    [OrderIndex] INTEGER NOT NULL DEFAULT 0,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProductId]) REFERENCES [Products]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductModules_ProductId] ON [ProductModules]([ProductId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductModules_Type] ON [ProductModules]([Type]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductModules 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductModules 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductSubModulesTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductSubModules"))
            {
                logger.LogInfo("ProductSubModules 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductSubModules] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ModuleId] TEXT NOT NULL,
                    [Name] TEXT NOT NULL,
                    [Description] TEXT,
                    [OrderIndex] INTEGER NOT NULL DEFAULT 0,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ModuleId]) REFERENCES [ProductModules]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductSubModules_ModuleId] ON [ProductSubModules]([ModuleId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductSubModules 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductSubModules 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductFunctionsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductFunctions"))
            {
                logger.LogInfo("ProductFunctions 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductFunctions] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [SubModuleId] TEXT NOT NULL,
                    [Name] TEXT NOT NULL,
                    [Description] TEXT,
                    [OrderIndex] INTEGER NOT NULL DEFAULT 0,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([SubModuleId]) REFERENCES [ProductSubModules]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctions_SubModuleId] ON [ProductFunctions]([SubModuleId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductFunctions 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductFunctions 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductFunctionAssetsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductFunctionAssets"))
            {
                logger.LogInfo("ProductFunctionAssets 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductFunctionAssets] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [FunctionId] TEXT NOT NULL,
                    [AssetId] TEXT NOT NULL,
                    [AssetVersion] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([FunctionId]) REFERENCES [ProductFunctions]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctionAssets_FunctionId] ON [ProductFunctionAssets]([FunctionId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctionAssets_AssetId] ON [ProductFunctionAssets]([AssetId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductFunctionAssets 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductFunctionAssets 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductFunctionEngineersTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductFunctionEngineers"))
            {
                logger.LogInfo("ProductFunctionEngineers 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductFunctionEngineers] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [FunctionId] TEXT NOT NULL,
                    [EngineerId] TEXT NOT NULL,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([FunctionId]) REFERENCES [ProductFunctions]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctionEngineers_FunctionId] ON [ProductFunctionEngineers]([FunctionId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctionEngineers_EngineerId] ON [ProductFunctionEngineers]([EngineerId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductFunctionEngineers 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductFunctionEngineers 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductFunctionCustomersTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductFunctionCustomers"))
            {
                logger.LogInfo("ProductFunctionCustomers 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductFunctionCustomers] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [FunctionId] TEXT NOT NULL,
                    [CustomerName] TEXT NOT NULL,
                    [Region] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([FunctionId]) REFERENCES [ProductFunctions]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctionCustomers_FunctionId] ON [ProductFunctionCustomers]([FunctionId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductFunctionCustomers 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductFunctionCustomers 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductFunctionTasksTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductFunctionTasks"))
            {
                logger.LogInfo("ProductFunctionTasks 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductFunctionTasks] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [FunctionId] TEXT NOT NULL,
                    [TaskId] TEXT NOT NULL,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([FunctionId]) REFERENCES [ProductFunctions]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctionTasks_FunctionId] ON [ProductFunctionTasks]([FunctionId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductFunctionTasks_TaskId] ON [ProductFunctionTasks]([TaskId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductFunctionTasks 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductFunctionTasks 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductVersionsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductVersions"))
            {
                logger.LogInfo("ProductVersions 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductVersions] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProductId] TEXT NOT NULL,
                    [Version] TEXT NOT NULL,
                    [Description] TEXT,
                    [Status] TEXT NOT NULL DEFAULT 'draft',
                    [ReleaseDate] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProductId]) REFERENCES [Products]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductVersions_ProductId] ON [ProductVersions]([ProductId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductVersions_Status] ON [ProductVersions]([Status]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductVersions 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductVersions 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductCostsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductCosts"))
            {
                logger.LogInfo("ProductCosts 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductCosts] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProductId] TEXT NOT NULL,
                    [ProductVersionId] TEXT,
                    [ProjectId] TEXT,
                    [Specification] TEXT,
                    [Status] TEXT NOT NULL DEFAULT 'draft',
                    [Notes] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProductId]) REFERENCES [Products]([Id]) ON DELETE CASCADE,
                    FOREIGN KEY([ProductVersionId]) REFERENCES [ProductVersions]([Id]) ON DELETE SET NULL
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductCosts_ProductId] ON [ProductCosts]([ProductId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductCosts_ProductVersionId] ON [ProductCosts]([ProductVersionId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductCosts_ProjectId] ON [ProductCosts]([ProjectId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductCosts_Status] ON [ProductCosts]([Status]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductCosts 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductCosts 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateBomItemsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "BomItems"))
            {
                logger.LogInfo("BomItems 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [BomItems] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProductCostId] TEXT NOT NULL,
                    [MaterialName] TEXT NOT NULL,
                    [MaterialCode] TEXT,
                    [MaterialType] TEXT,
                    [Unit] TEXT NOT NULL DEFAULT 'pcs',
                    [Quantity] REAL NOT NULL DEFAULT 1,
                    [UnitPrice] REAL NOT NULL DEFAULT 0,
                    [TotalPrice] REAL NOT NULL DEFAULT 0,
                    [Supplier] TEXT,
                    [Category] TEXT,
                    [Notes] TEXT,
                    [OrderIndex] INTEGER NOT NULL DEFAULT 0,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProductCostId]) REFERENCES [ProductCosts]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_BomItems_ProductCostId] ON [BomItems]([ProductCostId]);
                CREATE INDEX IF NOT EXISTS [IX_BomItems_MaterialType] ON [BomItems]([MaterialType]);
                CREATE INDEX IF NOT EXISTS [IX_BomItems_Category] ON [BomItems]([Category]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("BomItems 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 BomItems 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateLaborCostsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "LaborCosts"))
            {
                logger.LogInfo("LaborCosts 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [LaborCosts] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProductCostId] TEXT NOT NULL,
                    [TaskId] TEXT,
                    [ProjectId] TEXT,
                    [AssetId] TEXT,
                    [EngineerId] TEXT,
                    [EngineerName] TEXT,
                    [WorkDescription] TEXT,
                    [Role] TEXT,
                    [Hours] REAL NOT NULL DEFAULT 0,
                    [HourlyRate] REAL NOT NULL DEFAULT 0,
                    [TotalCost] REAL NOT NULL DEFAULT 0,
                    [WorkDate] TEXT,
                    [Notes] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProductCostId]) REFERENCES [ProductCosts]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_LaborCosts_ProductCostId] ON [LaborCosts]([ProductCostId]);
                CREATE INDEX IF NOT EXISTS [IX_LaborCosts_TaskId] ON [LaborCosts]([TaskId]);
                CREATE INDEX IF NOT EXISTS [IX_LaborCosts_ProjectId] ON [LaborCosts]([ProjectId]);
                CREATE INDEX IF NOT EXISTS [IX_LaborCosts_AssetId] ON [LaborCosts]([AssetId]);
                CREATE INDEX IF NOT EXISTS [IX_LaborCosts_EngineerId] ON [LaborCosts]([EngineerId]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("LaborCosts 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 LaborCosts 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateManufacturingCostsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ManufacturingCosts"))
            {
                logger.LogInfo("ManufacturingCosts 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ManufacturingCosts] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProductCostId] TEXT NOT NULL,
                    [CostName] TEXT NOT NULL,
                    [CostType] TEXT,
                    [Unit] TEXT NOT NULL DEFAULT 'pcs',
                    [Quantity] REAL NOT NULL DEFAULT 1,
                    [UnitCost] REAL NOT NULL DEFAULT 0,
                    [TotalCost] REAL NOT NULL DEFAULT 0,
                    [Coefficient] REAL NOT NULL DEFAULT 1.0,
                    [Supplier] TEXT,
                    [Notes] TEXT,
                    [OrderIndex] INTEGER NOT NULL DEFAULT 0,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProductCostId]) REFERENCES [ProductCosts]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ManufacturingCosts_ProductCostId] ON [ManufacturingCosts]([ProductCostId]);
                CREATE INDEX IF NOT EXISTS [IX_ManufacturingCosts_CostType] ON [ManufacturingCosts]([CostType]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ManufacturingCosts 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ManufacturingCosts 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateProductPricingsTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "ProductPricing"))
            {
                logger.LogInfo("ProductPricing 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [ProductPricing] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [ProductCostId] TEXT NOT NULL,
                    [SellingPrice] REAL NOT NULL DEFAULT 0,
                    [MinPrice] REAL,
                    [MaxPrice] REAL,
                    [ProfitMargin] REAL,
                    [Currency] TEXT NOT NULL DEFAULT 'CNY',
                    [Market] TEXT,
                    [Notes] TEXT,
                    [EffectiveDate] TEXT NOT NULL DEFAULT (datetime('now')),
                    [ExpiryDate] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    FOREIGN KEY([ProductCostId]) REFERENCES [ProductCosts]([Id]) ON DELETE CASCADE
                );
                
                CREATE INDEX IF NOT EXISTS [IX_ProductPricings_ProductCostId] ON [ProductPricing]([ProductCostId]);
                CREATE INDEX IF NOT EXISTS [IX_ProductPricings_Market] ON [ProductPricing]([Market]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("ProductPricing 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 ProductPricing 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
    
    private static void CreateStakeholdersTableIfNotExists(SqliteConnection connection, FileLogger logger)
    {
        try
        {
            if (TableExists(connection, "Stakeholders"))
            {
                logger.LogInfo("Stakeholders 表已存在，跳过创建", "DatabaseSchemaMigrator");
                return;
            }
            
            var command = connection.CreateCommand();
            command.CommandText = @"
                CREATE TABLE IF NOT EXISTS [Stakeholders] (
                    [Id] TEXT NOT NULL PRIMARY KEY,
                    [Name] TEXT NOT NULL,
                    [Type] TEXT NOT NULL DEFAULT 'stakeholder',
                    [Email] TEXT,
                    [Phone] TEXT,
                    [Company] TEXT,
                    [Notes] TEXT,
                    [CreatedAt] TEXT NOT NULL DEFAULT (datetime('now')),
                    [UpdatedAt] TEXT NOT NULL DEFAULT (datetime('now'))
                );
                
                CREATE INDEX IF NOT EXISTS [IX_Stakeholders_Name] ON [Stakeholders]([Name]);
                CREATE INDEX IF NOT EXISTS [IX_Stakeholders_Type] ON [Stakeholders]([Type]);
            ";
            
            command.ExecuteNonQuery();
            logger.LogInfo("Stakeholders 表创建成功", "DatabaseSchemaMigrator");
        }
        catch (Exception ex)
        {
            logger.LogError($"创建 Stakeholders 表失败: {ex.Message}", ex, "DatabaseSchemaMigrator");
        }
    }
}
