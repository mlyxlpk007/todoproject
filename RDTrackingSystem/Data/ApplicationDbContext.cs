using Microsoft.EntityFrameworkCore;
using Microsoft.Data.Sqlite;
using RDTrackingSystem.Models;
using RDTrackingSystem.Services;

namespace RDTrackingSystem.Data;

/// <summary>
/// 简化的数据库上下文 - 使用最简单可靠的 SQLite 配置
/// </summary>
public class ApplicationDbContext : DbContext
{
    public DbSet<User> Users { get; set; } = null!;
    public DbSet<Project> Projects { get; set; } = null!;
    public DbSet<Models.Task> Tasks { get; set; } = null!;
    public DbSet<TimelineEvent> TimelineEvents { get; set; } = null!;
    public DbSet<LessonLearned> LessonLearned { get; set; } = null!;
    public DbSet<Risk> Risks { get; set; } = null!;
    public DbSet<RiskResponse> RiskResponses { get; set; } = null!;
    public DbSet<Asset> Assets { get; set; } = null!;
    public DbSet<AssetVersion> AssetVersions { get; set; } = null!;
    public DbSet<AssetProjectRelation> AssetProjectRelations { get; set; } = null!;
    public DbSet<AssetHealthMetrics> AssetHealthMetrics { get; set; } = null!;
    public DbSet<ManagementQuote> ManagementQuotes { get; set; } = null!;
    public DbSet<Product> Products { get; set; } = null!;
    public DbSet<ProductModule> ProductModules { get; set; } = null!;
    public DbSet<ProductSubModule> ProductSubModules { get; set; } = null!;
    public DbSet<ProductFunction> ProductFunctions { get; set; } = null!;
    public DbSet<ProductFunctionAsset> ProductFunctionAssets { get; set; } = null!;
    public DbSet<ProductFunctionEngineer> ProductFunctionEngineers { get; set; } = null!;
    public DbSet<ProductFunctionCustomer> ProductFunctionCustomers { get; set; } = null!;
    public DbSet<ProductFunctionTask> ProductFunctionTasks { get; set; } = null!;
    public DbSet<ProductVersion> ProductVersions { get; set; } = null!;
    public DbSet<ProductCost> ProductCosts { get; set; } = null!;
    public DbSet<BomItem> BomItems { get; set; } = null!;
    public DbSet<LaborCost> LaborCosts { get; set; } = null!;
    public DbSet<ManufacturingCost> ManufacturingCosts { get; set; } = null!;
    public DbSet<ProductPricing> ProductPricings { get; set; } = null!;
    public DbSet<Stakeholder> Stakeholders { get; set; } = null!;

    // 用于依赖注入的构造函数
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    // 无参构造函数用于直接实例化（如 Program.cs 中）
    public ApplicationDbContext() : base()
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        
        // ========== User 表配置 ==========
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique().HasDatabaseName("IX_Users_Email");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Email).HasMaxLength(200).IsRequired();
        });
        
        // ========== Project 表配置 ==========
        modelBuilder.Entity<Project>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.OrderNumber).IsUnique().HasDatabaseName("IX_Projects_OrderNumber");
            entity.HasIndex(e => e.CurrentStageId).HasDatabaseName("IX_Projects_CurrentStageId");
            entity.HasIndex(e => e.Priority).HasDatabaseName("IX_Projects_Priority");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.OrderNumber).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ProjectName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.LocalPath).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== Task 表配置 ==========
        modelBuilder.Entity<Models.Task>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.ProjectId).HasDatabaseName("IX_Tasks_ProjectId");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_Tasks_Status");
            entity.HasIndex(e => new { e.ProjectId, e.Status }).HasDatabaseName("IX_Tasks_ProjectId_Status");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.AssignedToJson).HasColumnType("TEXT").HasDefaultValue("[]");
            entity.Property(e => e.TaskType).HasMaxLength(50).HasDefaultValue("project");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== TimelineEvent 表配置 ==========
        modelBuilder.Entity<TimelineEvent>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(te => te.Project)
                  .WithMany(p => p.TimelineEvents)
                  .HasForeignKey(te => te.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_TimelineEvents_Projects");
            entity.HasIndex(e => e.ProjectId).HasDatabaseName("IX_TimelineEvents_ProjectId");
            entity.HasIndex(e => new { e.ProjectId, e.StageId }).HasDatabaseName("IX_TimelineEvents_ProjectId_StageId");
            entity.HasIndex(e => e.Date).HasDatabaseName("IX_TimelineEvents_Date");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProjectId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasColumnType("TEXT").IsRequired();
            entity.Property(e => e.TagType).HasMaxLength(50);
            entity.Property(e => e.LessonLearnedId).HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== LessonLearned 表配置 ==========
        modelBuilder.Entity<LessonLearned>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TagType).HasDatabaseName("IX_LessonLearned_TagType");
            entity.HasIndex(e => e.ProjectId).HasDatabaseName("IX_LessonLearned_ProjectId");
            entity.HasIndex(e => e.TaskId).HasDatabaseName("IX_LessonLearned_TaskId");
            entity.HasIndex(e => e.HasReuseValue).HasDatabaseName("IX_LessonLearned_HasReuseValue");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.TagType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Background).HasColumnType("TEXT").IsRequired();
            entity.Property(e => e.RootCause).HasColumnType("TEXT").IsRequired();
            entity.Property(e => e.IfRedo).HasColumnType("TEXT").IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== Risk 表配置 ==========
        modelBuilder.Entity<Risk>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(r => r.Project)
                  .WithMany()
                  .HasForeignKey(r => r.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_Risks_Projects");
            entity.HasIndex(e => e.ProjectId).HasDatabaseName("IX_Risks_ProjectId");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_Risks_Status");
            entity.HasIndex(e => e.RiskLevel).HasDatabaseName("IX_Risks_RiskLevel");
            entity.HasIndex(e => new { e.ProjectId, e.Status }).HasDatabaseName("IX_Risks_ProjectId_Status");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProjectId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Probability).HasDefaultValue(1);
            entity.Property(e => e.Impact).HasDefaultValue(1);
            entity.Property(e => e.RiskLevel).HasDefaultValue(1);
            entity.Property(e => e.Status).HasMaxLength(20).HasDefaultValue("identified");
            entity.Property(e => e.IdentifiedDate).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== RiskResponse 表配置 ==========
        modelBuilder.Entity<RiskResponse>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(rr => rr.Risk)
                  .WithMany()
                  .HasForeignKey(rr => rr.RiskId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_RiskResponses_Risks");
            entity.HasIndex(e => e.RiskId).HasDatabaseName("IX_RiskResponses_RiskId");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_RiskResponses_Status");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.RiskId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Strategy).HasMaxLength(20).HasDefaultValue("mitigate");
            entity.Property(e => e.ActionPlan).HasColumnType("TEXT").IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("planned");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== Asset 表配置 ==========
        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Type).HasDatabaseName("IX_Assets_Type");
            entity.HasIndex(e => e.Maturity).HasDatabaseName("IX_Assets_Maturity");
            entity.HasIndex(e => e.OwnerId).HasDatabaseName("IX_Assets_OwnerId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Type).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Maturity).HasMaxLength(50).HasDefaultValue("试验");
            entity.Property(e => e.ReuseCount).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== AssetVersion 表配置 ==========
        modelBuilder.Entity<AssetVersion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(av => av.Asset)
                  .WithMany(a => a.Versions)
                  .HasForeignKey(av => av.AssetId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_AssetVersions_Assets");
            entity.HasIndex(e => e.AssetId).HasDatabaseName("IX_AssetVersions_AssetId");
            entity.HasIndex(e => e.VersionDate).HasDatabaseName("IX_AssetVersions_VersionDate");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.AssetId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Version).HasMaxLength(50).IsRequired();
            entity.Property(e => e.VersionDate).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== AssetProjectRelation 表配置 ==========
        modelBuilder.Entity<AssetProjectRelation>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(apr => apr.Asset)
                  .WithMany(a => a.ProjectRelations)
                  .HasForeignKey(apr => apr.AssetId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_AssetProjectRelations_Assets");
            entity.HasOne(apr => apr.Project)
                  .WithMany()
                  .HasForeignKey(apr => apr.ProjectId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_AssetProjectRelations_Projects");
            entity.HasIndex(e => e.AssetId).HasDatabaseName("IX_AssetProjectRelations_AssetId");
            entity.HasIndex(e => e.ProjectId).HasDatabaseName("IX_AssetProjectRelations_ProjectId");
            entity.HasIndex(e => e.RelationType).HasDatabaseName("IX_AssetProjectRelations_RelationType");
            entity.HasIndex(e => new { e.AssetId, e.ProjectId }).HasDatabaseName("IX_AssetProjectRelations_AssetId_ProjectId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.AssetId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.ProjectId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.RelationType).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== AssetHealthMetrics 表配置 ==========
        modelBuilder.Entity<AssetHealthMetrics>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(ahm => ahm.Asset)
                  .WithMany()
                  .HasForeignKey(ahm => ahm.AssetId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_AssetHealthMetrics_Assets");
            entity.HasIndex(e => e.AssetId).HasDatabaseName("IX_AssetHealthMetrics_AssetId");
            entity.HasIndex(e => e.CalculatedAt).HasDatabaseName("IX_AssetHealthMetrics_CalculatedAt");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.AssetId).HasMaxLength(100).IsRequired();
            entity.Property(e => e.CalculatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ManagementQuote 表配置 ==========
        modelBuilder.Entity<ManagementQuote>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Category).HasDatabaseName("IX_ManagementQuotes_Category");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Quote).HasColumnType("TEXT").IsRequired();
            entity.Property(e => e.DisplayCount).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== Product 表配置 ==========
        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Code).IsUnique().HasDatabaseName("IX_Products_Code");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_Products_Status");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Code).HasMaxLength(100).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("active");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductModule 表配置 ==========
        modelBuilder.Entity<ProductModule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pm => pm.Product)
                  .WithMany(p => p.Modules)
                  .HasForeignKey(pm => pm.ProductId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductModules_Products");
            entity.HasIndex(e => e.ProductId).HasDatabaseName("IX_ProductModules_ProductId");
            entity.HasIndex(e => e.Type).HasDatabaseName("IX_ProductModules_Type");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Type).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductSubModule 表配置 ==========
        modelBuilder.Entity<ProductSubModule>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(psm => psm.Module)
                  .WithMany(pm => pm.SubModules)
                  .HasForeignKey(psm => psm.ModuleId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductSubModules_ProductModules");
            entity.HasIndex(e => e.ModuleId).HasDatabaseName("IX_ProductSubModules_ModuleId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ModuleId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductFunction 表配置 ==========
        modelBuilder.Entity<ProductFunction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pf => pf.SubModule)
                  .WithMany(psm => psm.Functions)
                  .HasForeignKey(pf => pf.SubModuleId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductFunctions_ProductSubModules");
            entity.HasIndex(e => e.SubModuleId).HasDatabaseName("IX_ProductFunctions_SubModuleId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.SubModuleId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductFunctionAsset 表配置 ==========
        modelBuilder.Entity<ProductFunctionAsset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pfa => pfa.Function)
                  .WithMany(pf => pf.Assets)
                  .HasForeignKey(pfa => pfa.FunctionId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductFunctionAssets_ProductFunctions");
            entity.HasIndex(e => e.FunctionId).HasDatabaseName("IX_ProductFunctionAssets_FunctionId");
            entity.HasIndex(e => e.AssetId).HasDatabaseName("IX_ProductFunctionAssets_AssetId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.FunctionId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.AssetId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductFunctionEngineer 表配置 ==========
        modelBuilder.Entity<ProductFunctionEngineer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pfe => pfe.Function)
                  .WithMany(pf => pf.Engineers)
                  .HasForeignKey(pfe => pfe.FunctionId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductFunctionEngineers_ProductFunctions");
            entity.HasIndex(e => e.FunctionId).HasDatabaseName("IX_ProductFunctionEngineers_FunctionId");
            entity.HasIndex(e => e.EngineerId).HasDatabaseName("IX_ProductFunctionEngineers_EngineerId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.FunctionId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.EngineerId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductFunctionCustomer 表配置 ==========
        modelBuilder.Entity<ProductFunctionCustomer>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pfc => pfc.Function)
                  .WithMany(pf => pf.Customers)
                  .HasForeignKey(pfc => pfc.FunctionId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductFunctionCustomers_ProductFunctions");
            entity.HasIndex(e => e.FunctionId).HasDatabaseName("IX_ProductFunctionCustomers_FunctionId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.FunctionId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CustomerName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductFunctionTask 表配置 ==========
        modelBuilder.Entity<ProductFunctionTask>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pft => pft.Function)
                  .WithMany(pf => pf.Tasks)
                  .HasForeignKey(pft => pft.FunctionId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductFunctionTasks_ProductFunctions");
            entity.HasIndex(e => e.FunctionId).HasDatabaseName("IX_ProductFunctionTasks_FunctionId");
            entity.HasIndex(e => e.TaskId).HasDatabaseName("IX_ProductFunctionTasks_TaskId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.FunctionId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.TaskId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductVersion 表配置 ==========
        modelBuilder.Entity<ProductVersion>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pv => pv.Product)
                  .WithMany(p => p.Versions)
                  .HasForeignKey(pv => pv.ProductId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductVersions_Products");
            entity.HasIndex(e => e.ProductId).HasDatabaseName("IX_ProductVersions_ProductId");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_ProductVersions_Status");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Version).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("draft");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductCost 表配置 ==========
        modelBuilder.Entity<ProductCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pc => pc.Product)
                  .WithMany()
                  .HasForeignKey(pc => pc.ProductId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductCosts_Products");
            entity.HasOne(pc => pc.ProductVersion)
                  .WithMany()
                  .HasForeignKey(pc => pc.ProductVersionId)
                  .OnDelete(DeleteBehavior.SetNull)
                  .HasConstraintName("FK_ProductCosts_ProductVersions");
            entity.HasIndex(e => e.ProductId).HasDatabaseName("IX_ProductCosts_ProductId");
            entity.HasIndex(e => e.ProductVersionId).HasDatabaseName("IX_ProductCosts_ProductVersionId");
            entity.HasIndex(e => e.ProjectId).HasDatabaseName("IX_ProductCosts_ProjectId");
            entity.HasIndex(e => e.Status).HasDatabaseName("IX_ProductCosts_Status");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(50).HasDefaultValue("draft");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== BomItem 表配置 ==========
        modelBuilder.Entity<BomItem>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(bi => bi.ProductCost)
                  .WithMany(pc => pc.BomItems)
                  .HasForeignKey(bi => bi.ProductCostId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_BomItems_ProductCosts");
            entity.HasIndex(e => e.ProductCostId).HasDatabaseName("IX_BomItems_ProductCostId");
            entity.HasIndex(e => e.MaterialType).HasDatabaseName("IX_BomItems_MaterialType");
            entity.HasIndex(e => e.Category).HasDatabaseName("IX_BomItems_Category");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductCostId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.MaterialName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Unit).HasMaxLength(50).HasDefaultValue("pcs");
            entity.Property(e => e.Quantity).HasDefaultValue(1);
            entity.Property(e => e.UnitPrice).HasDefaultValue(0);
            entity.Property(e => e.TotalPrice).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== LaborCost 表配置 ==========
        modelBuilder.Entity<LaborCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(lc => lc.ProductCost)
                  .WithMany(pc => pc.LaborCosts)
                  .HasForeignKey(lc => lc.ProductCostId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_LaborCosts_ProductCosts");
            entity.HasIndex(e => e.ProductCostId).HasDatabaseName("IX_LaborCosts_ProductCostId");
            entity.HasIndex(e => e.TaskId).HasDatabaseName("IX_LaborCosts_TaskId");
            entity.HasIndex(e => e.ProjectId).HasDatabaseName("IX_LaborCosts_ProjectId");
            entity.HasIndex(e => e.AssetId).HasDatabaseName("IX_LaborCosts_AssetId");
            entity.HasIndex(e => e.EngineerId).HasDatabaseName("IX_LaborCosts_EngineerId");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductCostId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Hours).HasDefaultValue(0);
            entity.Property(e => e.HourlyRate).HasDefaultValue(0);
            entity.Property(e => e.TotalCost).HasDefaultValue(0);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ManufacturingCost 表配置 ==========
        modelBuilder.Entity<ManufacturingCost>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(mc => mc.ProductCost)
                  .WithMany(pc => pc.ManufacturingCosts)
                  .HasForeignKey(mc => mc.ProductCostId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ManufacturingCosts_ProductCosts");
            entity.HasIndex(e => e.ProductCostId).HasDatabaseName("IX_ManufacturingCosts_ProductCostId");
            entity.HasIndex(e => e.CostType).HasDatabaseName("IX_ManufacturingCosts_CostType");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductCostId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.CostName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Unit).HasMaxLength(50).HasDefaultValue("pcs");
            entity.Property(e => e.Quantity).HasDefaultValue(1);
            entity.Property(e => e.UnitCost).HasDefaultValue(0);
            entity.Property(e => e.TotalCost).HasDefaultValue(0);
            entity.Property(e => e.Coefficient).HasDefaultValue(1.0m);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== ProductPricing 表配置 ==========
        modelBuilder.Entity<ProductPricing>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasOne(pp => pp.ProductCost)
                  .WithMany()
                  .HasForeignKey(pp => pp.ProductCostId)
                  .OnDelete(DeleteBehavior.Cascade)
                  .HasConstraintName("FK_ProductPricings_ProductCosts");
            entity.HasIndex(e => e.ProductCostId).HasDatabaseName("IX_ProductPricings_ProductCostId");
            entity.HasIndex(e => e.Market).HasDatabaseName("IX_ProductPricings_Market");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.ProductCostId).HasMaxLength(50).IsRequired();
            entity.Property(e => e.SellingPrice).HasDefaultValue(0);
            entity.Property(e => e.Currency).HasMaxLength(50).HasDefaultValue("CNY");
            entity.Property(e => e.EffectiveDate).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
        
        // ========== Stakeholder 表配置 ==========
        modelBuilder.Entity<Stakeholder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Name).HasDatabaseName("IX_Stakeholders_Name");
            entity.HasIndex(e => e.Type).HasDatabaseName("IX_Stakeholders_Type");
            entity.Property(e => e.Id).HasMaxLength(50).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Type).HasMaxLength(50).HasDefaultValue("stakeholder");
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("datetime('now')");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("datetime('now')");
        });
    }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        // 如果已经配置过（通过依赖注入），则不再配置
        if (!optionsBuilder.IsConfigured)
        {
            // 使用统一的连接字符串构建器
            DatabaseConnectionHelper.EnsureDatabaseDirectory();
            var connectionString = DatabaseConnectionHelper.BuildConnectionString();
            
            var logger = FileLogger.Instance;
            logger.LogInfo($"配置数据库连接: {DatabaseConnectionHelper.GetNormalizedDatabasePath()}", "ApplicationDbContext");
            
            optionsBuilder.UseSqlite(connectionString, sqliteOptions =>
            {
                sqliteOptions.CommandTimeout(30);
            });
            
            optionsBuilder.EnableSensitiveDataLogging(false);
            optionsBuilder.EnableServiceProviderCaching();
        }
    }

    /// <summary>
    /// 重写 SaveChanges 以设置 PRAGMA（仅在需要时）
    /// </summary>
    public override int SaveChanges()
    {
        EnsurePragma();
        return base.SaveChanges();
    }

    /// <summary>
    /// 重写 SaveChangesAsync 以设置 PRAGMA（仅在需要时）
    /// </summary>
    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnsurePragma();
        return await base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// 确保 PRAGMA 设置（确保连接已打开并设置PRAGMA）
    /// </summary>
    private void EnsurePragma()
    {
        try
        {
            var connection = Database.GetDbConnection();
            
            // 如果连接未打开，先打开连接
            if (connection.State != System.Data.ConnectionState.Open)
            {
                connection.Open();
            }
            
            // 设置 PRAGMA（使用原始 SQL 命令）
            // DELETE journal mode 避免 WAL 文件权限问题
            Database.ExecuteSqlRaw("PRAGMA journal_mode=DELETE;");
            Database.ExecuteSqlRaw("PRAGMA foreign_keys=ON;");
        }
        catch (Exception ex)
        {
            // 记录但不抛出异常，让 SQLite 使用默认设置
            var logger = FileLogger.Instance;
            logger.LogWarning($"设置 PRAGMA 时出错: {ex.Message}", "ApplicationDbContext");
        }
    }
}
