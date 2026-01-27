using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;
using RDTrackingSystem.Data;
using RDTrackingSystem.Models;

namespace RDTrackingSystem.Services;

/// <summary>
/// 相关方服务 - 自动保存相关方信息
/// </summary>
public static class StakeholderService
{
    /// <summary>
    /// 保存相关方（如果不存在则创建）
    /// </summary>
    public static async System.Threading.Tasks.Task SaveStakeholderAsync(ApplicationDbContext context, string name, string type = "stakeholder")
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            return;
        }

        try
        {
            // 检查是否已存在
            var existing = await context.Stakeholders
                .FirstOrDefaultAsync(s => s.Name == name && s.Type == type);

            if (existing == null)
            {
                // 创建新的相关方
                var stakeholder = new Stakeholder
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = name.Trim(),
                    Type = type,
                    CreatedAt = DateTime.Now,
                    UpdatedAt = DateTime.Now
                };

                context.Stakeholders.Add(stakeholder);
                await context.SaveChangesAsync();
            }
            else
            {
                // 更新最后更新时间
                existing.UpdatedAt = DateTime.Now;
                await context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            // 记录错误但不抛出异常，避免影响主流程
            var logger = FileLogger.Instance;
            logger.LogWarning($"保存相关方失败: {name}, 错误: {ex.Message}", "StakeholderService");
        }
    }
}
