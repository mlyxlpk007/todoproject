using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RDTrackingSystem.Models;

/// <summary>
/// 管理名言模型
/// </summary>
[Table("ManagementQuotes")]
public class ManagementQuote
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [Column(TypeName = "TEXT")]
    public string Quote { get; set; } = string.Empty; // 名言内容
    
    [MaxLength(100)]
    public string? Category { get; set; } // 分类，如：交付与质量闭环、研发管理目标等
    
    [MaxLength(200)]
    public string? Tags { get; set; } // JSON格式存储标签数组
    
    public int DisplayCount { get; set; } = 0; // 显示次数
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
}
