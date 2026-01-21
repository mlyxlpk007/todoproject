using Microsoft.EntityFrameworkCore;
using RDTrackingSystem.Data;
using RDTrackingSystem.Services;

namespace RDTrackingSystem;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        
        // 初始化日志系统
        var logger = FileLogger.Instance;
        logger.LogInfo("========================================", "Program");
        logger.LogInfo("程序启动", "Program");
        logger.LogInfo($"程序版本: {System.Reflection.Assembly.GetExecutingAssembly().GetName().Version}", "Program");
        logger.LogInfo($"运行目录: {AppDomain.CurrentDomain.BaseDirectory}", "Program");
        logger.LogInfo($"日志文件: {FileLogger.GetLogFilePath()}", "Program");
        
        // 清理旧日志（保留7天）
        FileLogger.CleanupOldLogs(7);
        
        try
        {
            // 初始化配置管理器（会创建默认配置文件如果不存在）
            logger.LogInfo("初始化配置管理器...", "Program");
            var _ = ConfigManager.GetDatabasePath(); // 触发配置加载
            logger.LogInfo("配置管理器初始化完成", "Program");
            
            // 使用统一的数据库连接辅助类
            var dbPath = DatabaseConnectionHelper.GetNormalizedDatabasePath();
            logger.LogInfo($"数据库路径: {dbPath}", "Program");
            
            // 确保数据库目录存在
            try
            {
                DatabaseConnectionHelper.EnsureDatabaseDirectory();
                logger.LogInfo("数据库目录检查完成", "Program");
            }
            catch (Exception dirEx)
            {
                var errorMsg = $"无法创建数据库目录: {dirEx.Message}\n\n" +
                              $"数据库路径: {dbPath}\n\n" +
                              "解决方案:\n" +
                              "1. 检查父目录权限\n" +
                              "2. 以管理员身份运行程序\n" +
                              "3. 在数据管理页面配置新的数据库路径";
                logger.LogError(errorMsg, dirEx, "Program");
                MessageBox.Show(errorMsg, "数据库错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            
            // 简化的数据库初始化 - 让 EF Core 处理所有细节
            logger.LogInfo("开始初始化数据库...", "Program");
            
            try
            {
                using (var context = new ApplicationDbContext())
                {
                    // 简单直接：让 EnsureCreated 处理一切（创建数据库和表）
                    var created = context.Database.EnsureCreated();
                    logger.LogInfo($"数据库初始化完成，创建了新数据库: {created}", "Program");
                    
                    // 验证数据库文件是否创建
                    if (!File.Exists(dbPath))
                    {
                        throw new InvalidOperationException(
                            $"数据库文件创建失败：文件不存在\n\n" +
                            $"目标路径: {dbPath}\n" +
                            $"目录是否存在: {Directory.Exists(Path.GetDirectoryName(dbPath))}");
                    }
                    
                    // 迁移数据库架构（添加缺失的字段）
                    logger.LogInfo("开始数据库架构迁移...", "Program");
                    DatabaseSchemaMigrator.MigrateSchema();
                    logger.LogInfo("数据库架构迁移完成", "Program");
                    
                    // 填充初始数据
                    DatabaseSeeder.SeedIfEmpty(context);
                    logger.LogInfo("数据库种子数据填充完成", "Program");
                    
                    // 初始化管理名言数据
                    QuotesSeeder.SeedQuotesIfEmpty(context);
                    logger.LogInfo("管理名言数据初始化完成", "Program");
                }
            }
            catch (Exception ex)
            {
                var errorMsg = $"数据库初始化失败: {ex.Message}\n\n" +
                              $"数据库路径: {dbPath}\n\n" +
                              "可能的原因:\n" +
                              "1. 数据库文件或目录权限不足\n" +
                              "2. 文件被设置为只读\n" +
                              "3. 程序没有足够的权限写入该位置\n" +
                              "4. 数据库文件被其他程序锁定\n\n" +
                              "解决方案:\n" +
                              "1. 检查文件属性，确保不是只读\n" +
                              "2. 以管理员身份运行程序\n" +
                              "3. 检查文件夹权限，确保有写入权限\n" +
                              "4. 关闭可能正在使用数据库的其他程序\n" +
                              "5. 在数据管理页面配置新的数据库路径";
                
                logger.LogError(errorMsg, ex, "Program");
                MessageBox.Show(errorMsg, "数据库错误", MessageBoxButtons.OK, MessageBoxIcon.Error);
                return;
            }
            
            // 始终启动 API 服务器以提供静态文件服务
            // 这样可以避免 file:// 协议的路径和 CORS 问题
            // 同时支持直接通信模式（通过 WebViewBridge）和 HTTP API 模式
            var apiServer = new ApiServer();
            try
            {
                apiServer.Start();
                System.Threading.Thread.Sleep(1000);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    $"API 服务器启动失败: {ex.Message}\n\n堆栈跟踪:\n{ex.StackTrace}",
                    "服务器错误",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return;
            }
            
            // 运行 WinForms 应用
            Application.Run(new MainForm(apiServer));
            
            // 停止 API 服务器（如果使用）
            apiServer?.Stop();
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                $"程序启动失败: {ex.Message}\n\n堆栈跟踪:\n{ex.StackTrace}",
                "严重错误",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }
}
