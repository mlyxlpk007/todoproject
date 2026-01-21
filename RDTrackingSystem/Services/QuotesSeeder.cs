using RDTrackingSystem.Data;
using RDTrackingSystem.Models;

namespace RDTrackingSystem.Services;

/// <summary>
/// 名言数据初始化服务
/// </summary>
public static class QuotesSeeder
{
    /// <summary>
    /// 如果名言表为空，则初始化80条管理名言
    /// </summary>
    public static void SeedQuotesIfEmpty(ApplicationDbContext context)
    {
        var logger = FileLogger.Instance;
        
        try
        {
            var existingCount = context.ManagementQuotes.Count();
            if (existingCount > 0)
            {
                logger.LogInfo($"ManagementQuotes 表已有 {existingCount} 条数据，跳过初始化", "QuotesSeeder");
                return;
            }

            logger.LogInfo("开始初始化管理名言数据...", "QuotesSeeder");

            var quotes = new List<ManagementQuote>
            {
                new ManagementQuote { Quote = "交付与质量闭环[可复用、可维护、可演进]:版本/里程碑管理,缺陷趋势与回归成本,技术债登记与偿还,交付复盘", Category = "交付与质量闭环" },
                new ManagementQuote { Quote = "研发管理目标[确定性]:可预测交付,风险前移,节奏稳定", Category = "研发管理目标" },
                new ManagementQuote { Quote = "项目健康度[系统视角]:范围稳定性,节奏可信度,风险暴露度", Category = "项目健康度" },
                new ManagementQuote { Quote = "任务管理原则[可验证]:完成定义DoD,可交付物明确,验收标准清晰", Category = "任务管理原则" },
                new ManagementQuote { Quote = "资源管理本质[约束]:并行任务限制,WIP控制,非满载运行", Category = "资源管理本质" },
                new ManagementQuote { Quote = "计划不是排期[预测]:基于历史节奏,概率区间而非日期", Category = "计划管理" },
                new ManagementQuote { Quote = "延期根因识别[等待]:评审等待,决策等待,依赖等待", Category = "延期管理" },
                new ManagementQuote { Quote = "需求管理原则[价值]:目标驱动,优先级显性,拒绝隐性需求", Category = "需求管理原则" },
                new ManagementQuote { Quote = "项目失败信号[早期]:任务大量阻塞,变更频繁,责任不清", Category = "项目失败信号" },
                new ManagementQuote { Quote = "团队效率来源[流动]:减少切换,减少等待,减少返工", Category = "团队效率" },
                new ManagementQuote { Quote = "技术债管理[长期主义]:显性登记,定期偿还,不与缺陷混淆", Category = "技术债管理" },
                new ManagementQuote { Quote = "缺陷管理关注点[趋势]:不是数量,而是变化方向", Category = "缺陷管理" },
                new ManagementQuote { Quote = "回归成本控制[工程化]:自动化测试,模块解耦,接口稳定", Category = "回归成本控制" },
                new ManagementQuote { Quote = "复盘的价值[学习]:不找人,找系统", Category = "复盘" },
                new ManagementQuote { Quote = "管理节奏设计[稳定]:固定评审,固定复盘,固定发布", Category = "管理节奏" },
                new ManagementQuote { Quote = "研发指标原则[结果]:度量系统,而非考核个人", Category = "研发指标" },
                new ManagementQuote { Quote = "高效团队特征[透明]:阻塞可见,风险可见,决策可追溯", Category = "高效团队" },
                new ManagementQuote { Quote = "任务拆解底线[可完成]:不超过一个迭代,无模糊边界", Category = "任务拆解" },
                new ManagementQuote { Quote = "决策记录价值[可追溯]:知道为什么这么做", Category = "决策记录" },
                new ManagementQuote { Quote = "管理动作优先级[先暴露]:问题越早出现越便宜", Category = "管理优先级" },
                new ManagementQuote { Quote = "研发资源稀缺性[认知]:不是时间,是注意力", Category = "资源管理" },
                new ManagementQuote { Quote = "项目推进阻力[非技术]:沟通,共识,授权", Category = "项目推进" },
                new ManagementQuote { Quote = "需求变更评估[影响]:对节奏和风险的影响", Category = "需求变更" },
                new ManagementQuote { Quote = "管理软件本质[辅助]:帮人看清系统状态", Category = "管理工具" },
                new ManagementQuote { Quote = "工程质量来源[设计]:而非测试兜底", Category = "工程质量" },
                new ManagementQuote { Quote = "可维护性的前提[边界]:模块职责清晰", Category = "可维护性" },
                new ManagementQuote { Quote = "可复用的前提[抽象]:为变化点设计", Category = "可复用性" },
                new ManagementQuote { Quote = "可演进的前提[节奏]:持续小步演进", Category = "可演进性" },
                new ManagementQuote { Quote = "团队负载判断[危险信号]:长期满载", Category = "团队负载" },
                new ManagementQuote { Quote = "管理成熟标志[提前量]:问题出现前已预警", Category = "管理成熟度" },
                new ManagementQuote { Quote = "项目计划可信度[历史]:用过去预测未来", Category = "项目计划" },
                new ManagementQuote { Quote = "研发管理误区[忙碌]:忙不等于有效", Category = "管理误区" },
                new ManagementQuote { Quote = "阻塞管理原则[第一优先级]:先解阻塞再加人", Category = "阻塞管理" },
                new ManagementQuote { Quote = "人效提升路径[系统优化]:而非压榨个体", Category = "人效提升" },
                new ManagementQuote { Quote = "质量问题根因[流程]:而非态度", Category = "质量问题" },
                new ManagementQuote { Quote = "项目复盘重点[改进点]:下次怎么更早发现", Category = "项目复盘" },
                new ManagementQuote { Quote = "风险管理目标[减不确定性]:不是消灭风险", Category = "风险管理" },
                new ManagementQuote { Quote = "多项目并行风险[切换成本]:显性化", Category = "多项目并行" },
                new ManagementQuote { Quote = "管理透明度价值[信任]:减少解释成本", Category = "管理透明度" },
                new ManagementQuote { Quote = "技术负责人核心任务[护城河]:架构与演进", Category = "技术负责人" },
                new ManagementQuote { Quote = "研发节奏破坏者[临时插单]:必须显性评估", Category = "研发节奏" },
                new ManagementQuote { Quote = "项目延期应对原则[诚实]:越早说越便宜", Category = "项目延期" },
                new ManagementQuote { Quote = "管理会议设计原则[决策]:不是同步信息", Category = "会议管理" },
                new ManagementQuote { Quote = "研发看板价值[流动]:不是展示忙碌", Category = "研发看板" },
                new ManagementQuote { Quote = "成功交付标准[可持续]:不是一次性成功", Category = "成功交付" },
                new ManagementQuote { Quote = "管理复利来源[习惯]:持续正确的小动作", Category = "管理复利" },
                new ManagementQuote { Quote = "项目可控标志[可解释]:为什么慢,慢在哪里", Category = "项目可控性" },
                new ManagementQuote { Quote = "组织学习能力[沉淀]:经验变规则", Category = "组织学习" },
                new ManagementQuote { Quote = "管理者最大风险[盲区]:以为自己知道", Category = "管理者风险" },
                new ManagementQuote { Quote = "好的研发管理结果[安心]:团队不焦虑,交付可预期", Category = "研发管理结果" },
                new ManagementQuote { Quote = "系统思维[全局]:局部最优不等于整体最优", Category = "系统思维" },
                new ManagementQuote { Quote = "约束理论TOC[瓶颈]:系统速度由最慢环节决定", Category = "约束理论" },
                new ManagementQuote { Quote = "复杂系统认知[非线性]:因果关系并不直观", Category = "复杂系统" },
                new ManagementQuote { Quote = "决策质量来源[信息]:延迟决策比错误决策更致命", Category = "决策质量" },
                new ManagementQuote { Quote = "风险评估能力[概率]:不要用确定性语言描述不确定事", Category = "风险评估" },
                new ManagementQuote { Quote = "不确定性管理[缓冲]:缓冲是理性不是浪费", Category = "不确定性管理" },
                new ManagementQuote { Quote = "技术选型原则[演进]:优先可替换性而非完美", Category = "技术选型" },
                new ManagementQuote { Quote = "架构设计目标[变化]:为变化而设计", Category = "架构设计" },
                new ManagementQuote { Quote = "成本认知升级[隐性]:返工成本高于一次做好", Category = "成本认知" },
                new ManagementQuote { Quote = "工程成熟度模型[CMMI本质]:可预测性", Category = "工程成熟度" },
                new ManagementQuote { Quote = "团队动力机制[内驱]:意义感大于压力", Category = "团队动力" },
                new ManagementQuote { Quote = "认知负荷管理[专注]:减少上下文切换", Category = "认知负荷" },
                new ManagementQuote { Quote = "反馈回路设计[快]:反馈越快，系统越稳", Category = "反馈回路" },
                new ManagementQuote { Quote = "学习型组织[沉淀]:经验必须转化为规则", Category = "学习型组织" },
                new ManagementQuote { Quote = "复利思维[长期]:小改进持续放大", Category = "复利思维" },
                new ManagementQuote { Quote = "决策授权原则[边界]:清楚什么能自己定", Category = "决策授权" },
                new ManagementQuote { Quote = "管理角色认知[服务]:为团队清障", Category = "管理角色" },
                new ManagementQuote { Quote = "技术与管理平衡[双轨]:不能只懂其一", Category = "技术与管理" },
                new ManagementQuote { Quote = "信息透明度[信任]:透明降低管理成本", Category = "信息透明" },
                new ManagementQuote { Quote = "会议设计原则[结果]:没有决策的会议是浪费", Category = "会议设计" },
                new ManagementQuote { Quote = "产品意识[上下游]:研发不是孤岛", Category = "产品意识" },
                new ManagementQuote { Quote = "商业敏感度[取舍]:不是所有需求都值得做", Category = "商业敏感度" },
                new ManagementQuote { Quote = "风险沟通能力[真实]:不要粉饰问题", Category = "风险沟通" },
                new ManagementQuote { Quote = "组织结构影响[效率]:结构决定沟通成本", Category = "组织结构" },
                new ManagementQuote { Quote = "规模效应边界[失控]:团队越大，摩擦越多", Category = "规模效应" },
                new ManagementQuote { Quote = "人才培养逻辑[梯队]:不能只有骨干", Category = "人才培养" },
                new ManagementQuote { Quote = "绩效设计原则[导向]:指标塑造行为", Category = "绩效设计" },
                new ManagementQuote { Quote = "冲突管理能力[建设性]:分歧是正常状态", Category = "冲突管理" },
                new ManagementQuote { Quote = "情绪稳定性[管理者底盘]:情绪是放大器", Category = "情绪管理" },
                new ManagementQuote { Quote = "管理者终极价值[确定性]:让不确定变得可控", Category = "管理者价值" }
            };

            context.ManagementQuotes.AddRange(quotes);
            context.SaveChanges();
            
            logger.LogInfo($"成功初始化 {quotes.Count} 条管理名言", "QuotesSeeder");
        }
        catch (Exception ex)
        {
            logger.LogError($"初始化管理名言失败: {ex.Message}", ex, "QuotesSeeder");
        }
    }
}
