using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RDTrackingSystem.Models;

/// <summary>
/// 资产模型 - 研发资产（功能/代码/API/PCBA等）
/// </summary>
[Table("Assets")]
public class Asset
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty; // 资产名称
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // 类型：功能/代码/API/PCBA
    
    [Required]
    [MaxLength(50)]
    public string Maturity { get; set; } = "试验"; // 成熟度：试验/稳定/核心
    
    [MaxLength(100)]
    public string? OwnerId { get; set; } // 责任人ID（关联User）
    
    [MaxLength(200)]
    public string? OwnerName { get; set; } // 责任人姓名（冗余字段，便于查询）
    
    [Column(TypeName = "TEXT")]
    public string? Description { get; set; } // 资产描述
    
    [Column(TypeName = "TEXT")]
    public string? Tags { get; set; } // JSON格式存储标签数组
    
    public int ReuseCount { get; set; } = 0; // 复用次数
    
    [Column(TypeName = "TEXT")]
    public string? RelatedProjectIds { get; set; } // JSON格式存储关联项目ID数组
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    public virtual ICollection<AssetVersion> Versions { get; set; } = new List<AssetVersion>();
    public virtual ICollection<AssetProjectRelation> ProjectRelations { get; set; } = new List<AssetProjectRelation>();
}
