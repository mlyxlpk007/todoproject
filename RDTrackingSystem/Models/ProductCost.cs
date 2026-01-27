using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace RDTrackingSystem.Models;

/// <summary>
/// 产品成本主表 - 关联产品、项目、版本等
/// </summary>
[Table("ProductCosts")]
public class ProductCost
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(50)]
    public string ProductId { get; set; } = string.Empty; // 关联产品ID
    
    [MaxLength(50)]
    public string? ProductVersionId { get; set; } // 关联产品版本ID（可选）
    
    [MaxLength(50)]
    public string? ProjectId { get; set; } // 关联项目ID（可选）
    
    [MaxLength(100)]
    public string? Specification { get; set; } // 规格型号
    
    [MaxLength(50)]
    public string Status { get; set; } = "draft"; // 状态：draft(草稿), active(生效), archived(归档)
    
    [Column(TypeName = "TEXT")]
    public string? Notes { get; set; } // 备注说明
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("ProductId")]
    public virtual Product? Product { get; set; }
    
    [ForeignKey("ProductVersionId")]
    public virtual ProductVersion? ProductVersion { get; set; }
    
    public virtual ICollection<BomItem> BomItems { get; set; } = new List<BomItem>();
    public virtual ICollection<LaborCost> LaborCosts { get; set; } = new List<LaborCost>();
    public virtual ICollection<ManufacturingCost> ManufacturingCosts { get; set; } = new List<ManufacturingCost>();
}

/// <summary>
/// BOM物料清单项
/// </summary>
[Table("BomItems")]
public class BomItem
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(50)]
    public string ProductCostId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string MaterialName { get; set; } = string.Empty; // 物料名称
    
    [MaxLength(100)]
    public string? MaterialCode { get; set; } // 物料编码
    
    [MaxLength(50)]
    public string? MaterialType { get; set; } // 物料类型：电子元件、结构件、软件、其他
    
    [MaxLength(50)]
    public string? Unit { get; set; } = "pcs"; // 单位：pcs, kg, m等
    
    [Column(TypeName = "REAL")]
    public decimal Quantity { get; set; } = 1; // 数量
    
    [Column(TypeName = "REAL")]
    public decimal UnitPrice { get; set; } = 0; // 单价
    
    [Column(TypeName = "REAL")]
    public decimal TotalPrice { get; set; } = 0; // 总价 = Quantity * UnitPrice
    
    [MaxLength(100)]
    public string? Supplier { get; set; } // 供应商
    
    [MaxLength(50)]
    public string? Category { get; set; } // 分类：主要物料、辅助物料、包装材料等
    
    [Column(TypeName = "TEXT")]
    public string? Notes { get; set; } // 备注
    
    public int OrderIndex { get; set; } = 0; // 排序索引
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("ProductCostId")]
    public virtual ProductCost? ProductCost { get; set; }
}

/// <summary>
/// 研发人力成本
/// </summary>
[Table("LaborCosts")]
public class LaborCost
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(50)]
    public string ProductCostId { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? TaskId { get; set; } // 关联任务ID（可选）
    
    [MaxLength(50)]
    public string? ProjectId { get; set; } // 关联项目ID（可选）
    
    [MaxLength(50)]
    public string? AssetId { get; set; } // 关联资产ID（可选）
    
    [MaxLength(100)]
    public string? EngineerId { get; set; } // 工程师ID
    
    [MaxLength(200)]
    public string? EngineerName { get; set; } // 工程师姓名（冗余字段）
    
    [MaxLength(200)]
    public string? WorkDescription { get; set; } // 工作描述
    
    [MaxLength(50)]
    public string? Role { get; set; } // 角色：研发、测试、设计等
    
    [Column(TypeName = "REAL")]
    public decimal Hours { get; set; } = 0; // 工时（小时）
    
    [Column(TypeName = "REAL")]
    public decimal HourlyRate { get; set; } = 0; // 时薪
    
    [Column(TypeName = "REAL")]
    public decimal TotalCost { get; set; } = 0; // 总成本 = Hours * HourlyRate
    
    [MaxLength(50)]
    public string? WorkDate { get; set; } // 工作日期（YYYY-MM-DD格式）
    
    [Column(TypeName = "TEXT")]
    public string? Notes { get; set; } // 备注
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("ProductCostId")]
    public virtual ProductCost? ProductCost { get; set; }
}

/// <summary>
/// 制造成本
/// </summary>
[Table("ManufacturingCosts")]
public class ManufacturingCost
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(50)]
    public string ProductCostId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(200)]
    public string CostName { get; set; } = string.Empty; // 成本名称
    
    [MaxLength(50)]
    public string? CostType { get; set; } // 成本类型：加工费、组装费、测试费、包装费、运输费等
    
    [MaxLength(50)]
    public string? Unit { get; set; } = "pcs"; // 单位
    
    [Column(TypeName = "REAL")]
    public decimal Quantity { get; set; } = 1; // 数量
    
    [Column(TypeName = "REAL")]
    public decimal UnitCost { get; set; } = 0; // 单位成本
    
    [Column(TypeName = "REAL")]
    public decimal TotalCost { get; set; } = 0; // 总成本 = Quantity * UnitCost
    
    [Column(TypeName = "REAL")]
    public decimal Coefficient { get; set; } = 1.0m; // 系数（通常用于基于物料成本计算制造成本）
    
    [MaxLength(100)]
    public string? Supplier { get; set; } // 供应商/加工厂
    
    [Column(TypeName = "TEXT")]
    public string? Notes { get; set; } // 备注
    
    public int OrderIndex { get; set; } = 0; // 排序索引
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("ProductCostId")]
    public virtual ProductCost? ProductCost { get; set; }
}

/// <summary>
/// 产品售价配置
/// </summary>
[Table("ProductPricing")]
public class ProductPricing
{
    [Key]
    public string Id { get; set; } = Guid.NewGuid().ToString();
    
    [Required]
    [MaxLength(50)]
    public string ProductCostId { get; set; } = string.Empty; // 关联产品成本ID
    
    [Column(TypeName = "REAL")]
    public decimal SellingPrice { get; set; } = 0; // 售价
    
    [Column(TypeName = "REAL")]
    public decimal? MinPrice { get; set; } // 最低售价
    
    [Column(TypeName = "REAL")]
    public decimal? MaxPrice { get; set; } // 最高售价
    
    [Column(TypeName = "REAL")]
    public decimal? ProfitMargin { get; set; } // 利润率（百分比）
    
    [MaxLength(50)]
    public string? Currency { get; set; } = "CNY"; // 货币单位
    
    [MaxLength(50)]
    public string? Market { get; set; } // 市场：国内、海外等
    
    [Column(TypeName = "TEXT")]
    public string? Notes { get; set; } // 备注
    
    public DateTime EffectiveDate { get; set; } = DateTime.Now; // 生效日期
    
    public DateTime? ExpiryDate { get; set; } // 失效日期
    
    public DateTime CreatedAt { get; set; } = DateTime.Now;
    
    public DateTime UpdatedAt { get; set; } = DateTime.Now;
    
    // 导航属性
    [ForeignKey("ProductCostId")]
    public virtual ProductCost? ProductCost { get; set; }
}
