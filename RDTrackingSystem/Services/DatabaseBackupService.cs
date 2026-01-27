using Microsoft.Extensions.Logging;
using System.IO.Compression;

namespace RDTrackingSystem.Services;

public static class DatabaseBackupService
{
    private static readonly string BackupDirectory = Path.Combine(
        AppDomain.CurrentDomain.BaseDirectory, "Data", "Backups");

    /// <summary>
    /// 创建数据库备份
    /// </summary>
    /// <param name="dbPath">数据库文件路径</param>
    /// <param name="backupName">备份名称（可选，如果为空则使用时间戳）</param>
    /// <param name="logger">日志记录器</param>
    /// <returns>备份文件路径，如果失败返回 null</returns>
    public static string? CreateBackup(string dbPath, string? backupName = null, ILogger? logger = null)
    {
        try
        {
            if (!File.Exists(dbPath))
            {
                logger?.LogWarning("数据库文件不存在，无法创建备份: {DbPath}", dbPath);
                return null;
            }

            // 确保备份目录存在
            if (!Directory.Exists(BackupDirectory))
            {
                Directory.CreateDirectory(BackupDirectory);
                logger?.LogInformation("创建备份目录: {BackupDirectory}", BackupDirectory);
            }

            // 生成备份文件名
            if (string.IsNullOrWhiteSpace(backupName) || backupName == "null")
            {
                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                backupName = $"rdtracking_backup_{timestamp}";
                logger?.LogInformation("CreateBackup() 自动生成备份名称: {BackupName}", backupName);
            }
            else
            {
                logger?.LogInformation("CreateBackup() 使用提供的备份名称: {BackupName}", backupName);
            }

            // 确保备份名称不为空或 "null"
            if (string.IsNullOrWhiteSpace(backupName) || backupName == "null")
            {
                var timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
                backupName = $"rdtracking_backup_{timestamp}";
                logger?.LogWarning("CreateBackup() 备份名称仍为空或null，重新生成: {BackupName}", backupName);
            }

            var backupPath = Path.Combine(BackupDirectory, $"{backupName}.db");
            var backupZipPath = Path.Combine(BackupDirectory, $"{backupName}.zip");
            
            logger?.LogInformation("CreateBackup() 备份文件路径: {BackupZipPath}", backupZipPath);

            // 如果备份文件已存在，添加序号
            int counter = 1;
            while (File.Exists(backupZipPath))
            {
                backupZipPath = Path.Combine(BackupDirectory, $"{backupName}_{counter}.zip");
                counter++;
            }

            logger?.LogInformation("开始创建数据库备份: {BackupPath}", backupZipPath);

            // 复制数据库文件
            File.Copy(dbPath, backupPath, true);

            // 同时复制 WAL 和 SHM 文件（如果存在）
            var walPath = dbPath + "-wal";
            var shmPath = dbPath + "-shm";
            var backupWalPath = backupPath + "-wal";
            var backupShmPath = backupPath + "-shm";

            if (File.Exists(walPath))
            {
                File.Copy(walPath, backupWalPath, true);
            }
            if (File.Exists(shmPath))
            {
                File.Copy(shmPath, backupShmPath, true);
            }

            // 创建 ZIP 压缩包
            using (var zipArchive = ZipFile.Open(backupZipPath, ZipArchiveMode.Create))
            {
                zipArchive.CreateEntryFromFile(backupPath, Path.GetFileName(backupPath));
                if (File.Exists(backupWalPath))
                {
                    zipArchive.CreateEntryFromFile(backupWalPath, Path.GetFileName(backupWalPath));
                    File.Delete(backupWalPath);
                }
                if (File.Exists(backupShmPath))
                {
                    zipArchive.CreateEntryFromFile(backupShmPath, Path.GetFileName(backupShmPath));
                    File.Delete(backupShmPath);
                }
            }

            // 删除临时文件
            File.Delete(backupPath);

            // 添加备份元数据
            var metadataPath = Path.Combine(BackupDirectory, $"{Path.GetFileNameWithoutExtension(backupZipPath)}.json");
            var metadata = new
            {
                BackupName = Path.GetFileNameWithoutExtension(backupZipPath),
                BackupPath = backupZipPath,
                CreatedAt = DateTime.Now,
                OriginalDbPath = dbPath,
                FileSize = new FileInfo(backupZipPath).Length,
                Description = $"自动备份 - {DateTime.Now:yyyy-MM-dd HH:mm:ss}"
            };
            File.WriteAllText(metadataPath, System.Text.Json.JsonSerializer.Serialize(metadata, new System.Text.Json.JsonSerializerOptions { WriteIndented = true }));

            logger?.LogInformation("数据库备份创建成功: {BackupPath}, 大小: {Size} bytes", backupZipPath, metadata.FileSize);
            return backupZipPath;
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "创建数据库备份失败: {Message}", ex.Message);
            return null;
        }
    }

    /// <summary>
    /// 从备份恢复数据库
    /// </summary>
    /// <param name="backupPath">备份文件路径（.zip 或 .db）</param>
    /// <param name="dbPath">目标数据库文件路径</param>
    /// <param name="logger">日志记录器</param>
    /// <returns>是否成功</returns>
    public static bool RestoreBackup(string backupPath, string dbPath, ILogger? logger = null)
    {
        try
        {
            if (!File.Exists(backupPath))
            {
                logger?.LogError("备份文件不存在: {BackupPath}", backupPath);
                return false;
            }

            logger?.LogInformation("开始恢复数据库备份: {BackupPath} -> {DbPath}", backupPath, dbPath);

            // 确保目标目录存在
            var dbDirectory = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(dbDirectory) && !Directory.Exists(dbDirectory))
            {
                Directory.CreateDirectory(dbDirectory);
            }

            // 如果目标数据库文件存在，先创建备份
            if (File.Exists(dbPath))
            {
                var emergencyBackup = CreateBackup(dbPath, $"emergency_before_restore_{DateTime.Now:yyyyMMdd_HHmmss}", logger);
                logger?.LogInformation("恢复前创建紧急备份: {EmergencyBackup}", emergencyBackup);
            }

            string tempDbPath = dbPath;

            // 如果是 ZIP 文件，先解压
            if (backupPath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                var tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
                Directory.CreateDirectory(tempDir);

                try
                {
                    ZipFile.ExtractToDirectory(backupPath, tempDir);
                    var dbFile = Directory.GetFiles(tempDir, "*.db").FirstOrDefault();
                    if (dbFile == null)
                    {
                        logger?.LogError("备份 ZIP 文件中未找到数据库文件");
                        return false;
                    }
                    tempDbPath = dbFile;
                }
                catch (Exception ex)
                {
                    logger?.LogError(ex, "解压备份文件失败: {Message}", ex.Message);
                    Directory.Delete(tempDir, true);
                    return false;
                }
            }

            // 关闭可能打开的数据库连接
            System.Threading.Thread.Sleep(500);

            // 检查目标文件是否只读
            if (File.Exists(dbPath))
            {
                var fileInfo = new FileInfo(dbPath);
                if (fileInfo.IsReadOnly)
                {
                    logger?.LogWarning("目标数据库文件是只读的，尝试取消只读属性");
                    fileInfo.IsReadOnly = false;
                }
            }

            // 检查目标目录权限
            var targetDir = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrEmpty(targetDir))
            {
                try
                {
                    // 尝试创建测试文件以验证写入权限
                    var testFile = Path.Combine(targetDir, Guid.NewGuid().ToString() + ".test");
                    File.WriteAllText(testFile, "test");
                    File.Delete(testFile);
                }
                catch (UnauthorizedAccessException authEx)
                {
                    logger?.LogError(authEx, "目标目录没有写入权限: {TargetDir}", targetDir);
                    throw new InvalidOperationException(
                        $"目标目录没有写入权限: {targetDir}\n\n" +
                        $"解决方案:\n" +
                        $"1. 检查文件夹权限，确保有写入权限\n" +
                        $"2. 以管理员身份运行程序\n" +
                        $"3. 检查文件是否被设置为只读", authEx);
                }
                catch (Exception ex)
                {
                    logger?.LogWarning(ex, "无法验证目录写入权限: {Message}", ex.Message);
                }
            }

            // 复制备份文件到目标位置（使用重试机制）
            const int maxCopyRetries = 3;
            bool copySuccess = false;
            for (int retry = 0; retry < maxCopyRetries; retry++)
            {
                try
                {
                    File.Copy(tempDbPath, dbPath, true);
                    copySuccess = true;
                    break;
                }
                catch (UnauthorizedAccessException authEx)
                {
                    if (retry < maxCopyRetries - 1)
                    {
                        logger?.LogWarning("复制文件失败（权限问题），等待后重试...");
                        System.Threading.Thread.Sleep(500);
                    }
                    else
                    {
                        logger?.LogError(authEx, "复制数据库文件失败（权限问题）");
                        throw new InvalidOperationException(
                            $"拒绝访问数据库文件: {dbPath}\n\n" +
                            $"可能的原因:\n" +
                            $"1. 文件被设置为只读\n" +
                            $"2. 文件权限不足\n" +
                            $"3. 程序没有足够的权限写入该位置\n\n" +
                            $"解决方案:\n" +
                            $"1. 检查文件属性，确保不是只读\n" +
                            $"2. 以管理员身份运行程序\n" +
                            $"3. 检查文件夹权限，确保有写入权限\n\n" +
                            $"错误: {authEx.Message}", authEx);
                    }
                }
                catch (IOException ioEx)
                {
                    if (retry < maxCopyRetries - 1)
                    {
                        logger?.LogWarning("复制文件失败（IO问题），等待后重试...");
                        System.Threading.Thread.Sleep(500);
                    }
                    else
                    {
                        logger?.LogError(ioEx, "复制数据库文件失败（IO问题）");
                        throw new InvalidOperationException(
                            $"无法复制数据库文件: {ioEx.Message}\n\n" +
                            $"可能的原因:\n" +
                            $"1. 文件正在被其他程序使用\n" +
                            $"2. 磁盘空间不足\n" +
                            $"3. 文件路径无效", ioEx);
                    }
                }
            }

            if (!copySuccess)
            {
                logger?.LogError("复制数据库文件失败，已重试 {MaxRetries} 次", maxCopyRetries);
                return false;
            }

            // 如果备份中有 WAL 和 SHM 文件，也复制
            var walPath = tempDbPath + "-wal";
            var shmPath = tempDbPath + "-shm";
            var targetWalPath = dbPath + "-wal";
            var targetShmPath = dbPath + "-shm";

            if (File.Exists(walPath))
            {
                File.Copy(walPath, targetWalPath, true);
            }
            else if (File.Exists(targetWalPath))
            {
                File.Delete(targetWalPath);
            }

            if (File.Exists(shmPath))
            {
                File.Copy(shmPath, targetShmPath, true);
            }
            else if (File.Exists(targetShmPath))
            {
                File.Delete(targetShmPath);
            }

            // 清理临时文件
            if (backupPath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                var tempDir = Path.GetDirectoryName(tempDbPath);
                if (!string.IsNullOrEmpty(tempDir) && Directory.Exists(tempDir))
                {
                    try
                    {
                        Directory.Delete(tempDir, true);
                    }
                    catch (Exception cleanupEx)
                    {
                        logger?.LogWarning(cleanupEx, "清理临时文件失败: {Message}", cleanupEx.Message);
                    }
                }
            }

            logger?.LogInformation("数据库恢复成功: {DbPath}", dbPath);
            return true;
        }
        catch (UnauthorizedAccessException authEx)
        {
            logger?.LogError(authEx, "恢复数据库备份失败（权限问题）: {Message}", authEx.Message);
            
            // 清理临时文件
            if (backupPath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var tempDir = Path.Combine(Path.GetTempPath(), Path.GetFileNameWithoutExtension(backupPath));
                    if (Directory.Exists(tempDir))
                    {
                        Directory.Delete(tempDir, true);
                    }
                }
                catch
                {
                    // 忽略清理错误
                }
            }
            
            throw new InvalidOperationException(
                $"拒绝访问数据库文件: {dbPath}\n\n" +
                $"可能的原因:\n" +
                $"1. 文件被设置为只读\n" +
                $"2. 文件权限不足\n" +
                $"3. 程序没有足够的权限写入该位置\n\n" +
                $"解决方案:\n" +
                $"1. 检查文件属性，确保不是只读\n" +
                $"2. 以管理员身份运行程序\n" +
                $"3. 检查文件夹权限，确保有写入权限\n\n" +
                $"错误: {authEx.Message}", authEx);
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "恢复数据库备份失败: {Message}", ex.Message);
            
            // 清理临时文件
            if (backupPath.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    var tempDir = Path.Combine(Path.GetTempPath(), Path.GetFileNameWithoutExtension(backupPath));
                    if (Directory.Exists(tempDir))
                    {
                        Directory.Delete(tempDir, true);
                    }
                }
                catch
                {
                    // 忽略清理错误
                }
            }
            
            // 如果是权限相关的错误，提供更详细的错误信息
            if (ex.Message.Contains("拒绝访问") || 
                ex.Message.Contains("Access") || 
                ex.Message.Contains("denied") ||
                ex.InnerException is UnauthorizedAccessException)
            {
                throw new InvalidOperationException(
                    $"拒绝访问数据库文件: {dbPath}\n\n" +
                    $"可能的原因:\n" +
                    $"1. 文件被设置为只读\n" +
                    $"2. 文件权限不足\n" +
                    $"3. 程序没有足够的权限写入该位置\n\n" +
                    $"解决方案:\n" +
                    $"1. 检查文件属性，确保不是只读\n" +
                    $"2. 以管理员身份运行程序\n" +
                    $"3. 检查文件夹权限，确保有写入权限\n\n" +
                    $"错误: {ex.Message}", ex);
            }
            
            return false;
        }
    }

    /// <summary>
    /// 获取所有备份列表
    /// </summary>
    /// <param name="logger">日志记录器</param>
    /// <returns>备份信息列表</returns>
    public static List<BackupInfo> GetBackupList(ILogger? logger = null)
    {
        var backups = new List<BackupInfo>();

        try
        {
            if (!Directory.Exists(BackupDirectory))
            {
                return backups;
            }

            var backupFiles = Directory.GetFiles(BackupDirectory, "*.zip");
            foreach (var backupFile in backupFiles)
            {
                try
                {
                    var metadataPath = Path.Combine(BackupDirectory, $"{Path.GetFileNameWithoutExtension(backupFile)}.json");
                    var fileInfo = new FileInfo(backupFile);
                    
                    var backupInfo = new BackupInfo
                    {
                        FilePath = backupFile,
                        FileName = Path.GetFileName(backupFile),
                        FileSize = fileInfo.Length,
                        CreatedAt = fileInfo.CreationTime
                    };

                    // 读取元数据
                    if (File.Exists(metadataPath))
                    {
                        try
                        {
                            var metadataJson = File.ReadAllText(metadataPath);
                            var metadata = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(metadataJson);
                            if (metadata != null)
                            {
                                // 优先使用元数据中的 BackupName 作为文件名
                                if (metadata.ContainsKey("BackupName"))
                                {
                                    var backupName = metadata["BackupName"]?.ToString();
                                    if (!string.IsNullOrWhiteSpace(backupName))
                                    {
                                        backupInfo.FileName = $"{backupName}.zip";
                                    }
                                }
                                
                                if (metadata.ContainsKey("CreatedAt") && DateTime.TryParse(metadata["CreatedAt"].ToString(), out var createdAt))
                                {
                                    backupInfo.CreatedAt = createdAt;
                                }
                                if (metadata.ContainsKey("Description"))
                                {
                                    backupInfo.Description = metadata["Description"].ToString();
                                }
                            }
                        }
                        catch
                        {
                            // 忽略元数据读取错误
                        }
                    }
                    
                    // 如果文件名是 null.zip 或空，尝试从文件路径提取
                    if (string.IsNullOrWhiteSpace(backupInfo.FileName) || backupInfo.FileName == "null.zip")
                    {
                        var fileNameWithoutExt = Path.GetFileNameWithoutExtension(backupFile);
                        if (!string.IsNullOrWhiteSpace(fileNameWithoutExt) && fileNameWithoutExt != "null")
                        {
                            backupInfo.FileName = $"{fileNameWithoutExt}.zip";
                        }
                        else
                        {
                            // 如果还是 null，使用时间戳生成一个名称
                            var timestamp = fileInfo.CreationTime.ToString("yyyyMMdd_HHmmss");
                            backupInfo.FileName = $"rdtracking_backup_{timestamp}.zip";
                        }
                    }

                    backups.Add(backupInfo);
                }
                catch (Exception ex)
                {
                    logger?.LogWarning(ex, "读取备份信息失败: {BackupFile}", backupFile);
                }
            }

            // 按创建时间降序排序
            backups = backups.OrderByDescending(b => b.CreatedAt).ToList();
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "获取备份列表失败: {Message}", ex.Message);
        }

        return backups;
    }

    /// <summary>
    /// 删除备份文件
    /// </summary>
    /// <param name="backupPath">备份文件路径</param>
    /// <param name="logger">日志记录器</param>
    /// <returns>是否成功</returns>
    public static bool DeleteBackup(string backupPath, ILogger? logger = null)
    {
        try
        {
            if (!File.Exists(backupPath))
            {
                logger?.LogWarning("备份文件不存在: {BackupPath}", backupPath);
                return false;
            }

            File.Delete(backupPath);

            // 同时删除元数据文件
            var metadataPath = Path.Combine(BackupDirectory, $"{Path.GetFileNameWithoutExtension(backupPath)}.json");
            if (File.Exists(metadataPath))
            {
                File.Delete(metadataPath);
            }

            logger?.LogInformation("备份文件已删除: {BackupPath}", backupPath);
            return true;
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "删除备份文件失败: {Message}", ex.Message);
            return false;
        }
    }

    /// <summary>
    /// 清理旧备份（保留最近的 N 个备份）
    /// </summary>
    /// <param name="keepCount">保留的备份数量</param>
    /// <param name="logger">日志记录器</param>
    /// <returns>删除的备份数量</returns>
    public static int CleanupOldBackups(int keepCount = 10, ILogger? logger = null)
    {
        try
        {
            var backups = GetBackupList(logger);
            if (backups.Count <= keepCount)
            {
                return 0;
            }

            var toDelete = backups.Skip(keepCount).ToList();
            int deletedCount = 0;

            foreach (var backup in toDelete)
            {
                if (DeleteBackup(backup.FilePath, logger))
                {
                    deletedCount++;
                }
            }

            logger?.LogInformation("清理旧备份完成，删除了 {Count} 个备份", deletedCount);
            return deletedCount;
        }
        catch (Exception ex)
        {
            logger?.LogError(ex, "清理旧备份失败: {Message}", ex.Message);
            return 0;
        }
    }

    /// <summary>
    /// 备份信息类
    /// </summary>
    public class BackupInfo
    {
        public string FilePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public DateTime CreatedAt { get; set; }
        public string? Description { get; set; }

        public string FileSizeFormatted => FormatFileSize(FileSize);

        private static string FormatFileSize(long bytes)
        {
            string[] sizes = { "B", "KB", "MB", "GB" };
            double len = bytes;
            int order = 0;
            while (len >= 1024 && order < sizes.Length - 1)
            {
                order++;
                len = len / 1024;
            }
            return $"{len:0.##} {sizes[order]}";
        }
    }
}
