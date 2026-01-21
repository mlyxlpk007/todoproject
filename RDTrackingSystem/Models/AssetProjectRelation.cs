using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RDTrackingSystem.Models;

/// <summary>
/// 资产项目关系模型 - 记录项目与资产的关系
/// </summary>
[Table("AssetProjectRelations")]
public class AssetProjectRelation
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(100)]
    public string AssetId { get; set; } = string.Empty; // 关联资产ID
    
    [Required]
    [MaxLength(100)]
    public string ProjectId { get; set; } = string.Empty; // 关联项目ID
    
    [Required]
    [MaxLength(50)]
    public string RelationType { get; set; } = string.Empty; // 关系类型：used（使用）/modified（修改）/created（新增）
    
    [MaxLength(100)]
    public string? Version { get; set; } // 使用的版本号
    
    [Column(TypeName = "TEXT")]
    public string? Notes { get; set; } // 备注说明
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("AssetId")]
    public virtual Asset? Asset { get; set; }
    
    [ForeignKey("ProjectId")]
    public virtual Project? Project { get; set; }
}
