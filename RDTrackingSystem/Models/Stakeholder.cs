using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RDTrackingSystem.Models;

/// <summary>
/// 相关方模型 - 存储任务利益方和项目销售等
/// </summary>
[Table("Stakeholders")]
public class Stakeholder
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty; // 相关方名称
    
    [MaxLength(50)]
    public string? Type { get; set; } = "stakeholder"; // 类型：stakeholder(利益方), sales(销售), other(其他)
    
    [MaxLength(200)]
    public string? Email { get; set; } // 邮箱
    
    [MaxLength(50)]
    public string? Phone { get; set; } // 电话
    
    [MaxLength(200)]
    public string? Company { get; set; } // 公司
    
    [Column(TypeName = "TEXT")]
    public string? Notes { get; set; } // 备注
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
