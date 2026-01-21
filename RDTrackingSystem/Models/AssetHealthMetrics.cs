using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RDTrackingSystem.Models;

/// <summary>
/// 资产健康度指标模型 - 记录资产健康度指标快照
/// </summary>
[Table("AssetHealthMetrics")]
public class AssetHealthMetrics
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(100)]
    public string AssetId { get; set; } = string.Empty; // 关联资产ID
    
    [Column(TypeName = "REAL")]
    public double ReuseRate { get; set; } = 0.0; // 复用率（0-1）
    
    [Column(TypeName = "REAL")]
    public double DefectDensity { get; set; } = 0.0; // 缺陷密度（每千行代码的缺陷数）
    
    [Column(TypeName = "REAL")]
    public double ChangeFrequency { get; set; } = 0.0; // 变更频率（每月变更次数）
    
    [Column(TypeName = "REAL")]
    public double RegressionCost { get; set; } = 0.0; // 回归成本（小时）
    
    [Column(TypeName = "REAL")]
    public double MaintenanceBurden { get; set; } = 0.0; // 维护负担（0-100）
    
    [Column(TypeName = "REAL")]
    public double HealthScore { get; set; } = 0.0; // 综合健康度评分（0-100）
    
    public DateTime CalculatedAt { get; set; } = DateTime.Now; // 计算时间
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("AssetId")]
    public virtual Asset? Asset { get; set; }
}
