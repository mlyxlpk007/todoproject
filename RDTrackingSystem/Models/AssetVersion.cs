using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RDTrackingSystem.Models;

/// <summary>
/// 资产版本模型 - 记录资产版本演进
/// </summary>
[Table("AssetVersions")]
public class AssetVersion
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(100)]
    public string AssetId { get; set; } = string.Empty; // 关联资产ID
    
    [Required]
    [MaxLength(50)]
    public string Version { get; set; } = string.Empty; // 版本号，如：v1.0.0
    
    [Column(TypeName = "TEXT")]
    public string? ChangeReason { get; set; } // 改动原因
    
    [Column(TypeName = "TEXT")]
    public string? QualityChanges { get; set; } // 质量变化描述
    
    [Column(TypeName = "TEXT")]
    public string? TechnicalDebt { get; set; } // 技术债记录
    
    [MaxLength(100)]
    public string? ChangedBy { get; set; } // 修改人
    
    [Column(TypeName = "REAL")]
    public double? QualityScore { get; set; } // 质量评分（0-100）
    
    [Column(TypeName = "REAL")]
    public double? DefectDensity { get; set; } // 缺陷密度（每千行代码的缺陷数）
    
    [Column(TypeName = "REAL")]
    public double? ChangeFrequency { get; set; } // 变更频率（每月变更次数）
    
    [Column(TypeName = "REAL")]
    public double? RegressionCost { get; set; } // 回归成本（小时）
    
    [Column(TypeName = "REAL")]
    public double? MaintenanceBurden { get; set; } // 维护负担（0-100）
    
    public DateTime VersionDate { get; set; } = DateTime.Now; // 版本日期
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("AssetId")]
    public virtual Asset? Asset { get; set; }
}
