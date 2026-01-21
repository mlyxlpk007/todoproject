import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Clock, CheckCircle, LayoutGrid, List, Search, Bell, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import OrderModal from '@/components/OrderModal';
import RiskAlerts from '@/components/RiskAlerts';
import TodayTasks from '@/components/TodayTasks';
import ProjectHealth from '@/components/ProjectHealth';
import NotificationCenter from '@/components/NotificationCenter';
import { projectsApi, tasksApi, usersApi } from '@/lib/api';

const Dashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [currentDate, setCurrentDate] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const mainStages = [
    { id: 'requirements', name: '客户需求', color: 'bg-blue-500' },
    { id: 'structural_design', name: '结构设计', color: 'bg-purple-500' },
    { id: 'electronic_design', name: '电子设计', color: 'bg-pink-500' },
    { id: 'system_design', name: '系统设计', color: 'bg-red-500' },
    { id: 'software_design', name: '软件设计', color: 'bg-orange-500' },
    { id: 'production', name: '生产', color: 'bg-yellow-500' },
    { id: 'debugging', name: '调试老化', color: 'bg-green-500' },
    { id: 'shipping', name: '出货售后', color: 'bg-teal-500' },
  ];

  useEffect(() => {
    const date = new Date();
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    setCurrentDate(date.toLocaleDateString('zh-CN', options));
  }, []);

  useEffect(() => {
    console.log('[Dashboard] useEffect 执行，准备加载数据');
    
    // 延迟加载，确保桥接对象已注入
    const timer = setTimeout(() => {
      console.log('[Dashboard] 开始加载数据');
      loadAllData();
    }, 500);
    
    // 每30秒刷新一次数据
    const interval = setInterval(() => {
      console.log('[Dashboard] 定时刷新数据');
      loadAllData();
    }, 30000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const loadAllData = async () => {
    const logPrefix = '[Dashboard loadAllData]';
    try {
      console.log(`${logPrefix} ========== 开始加载所有数据 ==========`);
      
      const [projectsData, tasksData, usersData] = await Promise.all([
        projectsApi.getAll().catch(err => {
          console.error(`${logPrefix} 加载项目失败:`, err);
          return [];
        }),
        tasksApi.getAll().catch(err => {
          console.error(`${logPrefix} 加载任务失败:`, err);
          return [];
        }),
        usersApi.getAll().catch(err => {
          console.error(`${logPrefix} 加载用户失败:`, err);
          return [];
        })
      ]);
      
      console.log(`${logPrefix} 数据加载完成:`, {
        projects: projectsData?.length || 0,
        tasks: tasksData?.length || 0,
        users: usersData?.length || 0
      });
      
      setProjects(projectsData || []);
      setTasks(tasksData || []);
      setUsers(usersData || []);
      calculateNotificationCount(projectsData || [], tasksData || []);
      
      console.log(`${logPrefix} ========== 数据加载完成 ==========`);
    } catch (error) {
      console.error(`${logPrefix} ========== 加载数据失败 ==========`);
      console.error(`${logPrefix} 错误:`, error);
      console.error(`${logPrefix} 错误消息:`, error.message);
      console.error(`${logPrefix} 错误堆栈:`, error.stack);
      toast({ 
        title: "加载数据失败", 
        description: error.message || "请检查控制台获取详细信息",
        variant: "destructive" 
      });
    }
  };

  const calculateNotificationCount = (projectsData, tasksData) => {
    const today = new Date();
    let count = 0;
    
    // 判断日期是否过期（截止日期当天不算过期，只有过了23:59:59才算）
    const isOverdueForNotification = (dateString) => {
      if (!dateString) return false;
      try {
        const deadline = new Date(dateString);
        // 将截止日期设置为当天的23:59:59.999
        deadline.setHours(23, 59, 59, 999);
        return today > deadline;
      } catch (e) {
        return false;
      }
    };

    // 计算过期和即将到期的任务
    tasksData.forEach(task => {
      if (!task.endDate) return;
      const endDate = new Date(task.endDate);
      const daysUntilDue = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 3 || isOverdueForNotification(task.endDate)) count++;
    });
    
    // 计算风险项目
    projectsData.forEach(project => {
      if (!project.estimatedCompletion) return;
      const completionDate = new Date(project.estimatedCompletion);
      const daysUntilCompletion = Math.floor((completionDate - today) / (1000 * 60 * 60 * 24));
      const progress = getProgress(project);
      if ((daysUntilCompletion <= 7 && progress < 80) || (isOverdueForNotification(project.estimatedCompletion) && progress < 100)) {
        count++;
      }
    });
    
    setNotificationCount(count);
  };

  const handleSaveProject = async (projectData) => {
    try {
      if (editingProject) {
        await projectsApi.update(editingProject.id, projectData);
        toast({ title: "项目更新成功！" });
      } else {
        const newProject = {
          ...projectData,
          currentStageId: mainStages[0].id,
          timeline: [{ stageId: mainStages[0].id, date: new Date().toISOString().split('T')[0], events: [] }]
        };
        await projectsApi.create(newProject);
        toast({ title: "项目创建成功！" });
      }
      await loadAllData();
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (error) {
      console.error('保存项目失败:', error);
      toast({ title: "保存项目失败", variant: "destructive" });
    }
  };

  // 先定义 getProgress 函数，因为 getProjectStats 会用到它
  const getProgress = (project) => {
    if (!project || !project.currentStageId) return 0;
    const currentStageIndex = mainStages.findIndex(s => s.id === project.currentStageId);
    if (currentStageIndex === -1) return 0;
    return ((currentStageIndex + 1) / mainStages.length) * 100;
  };

  // 使用 useMemo 优化性能，避免每次渲染都重新计算
  const stats = React.useMemo(() => {
    if (!projects || projects.length === 0) {
      return { total: 0, inProgress: 0, completed: 0, atRisk: 0 };
    }

    const inProgress = projects.filter(p => p && p.currentStageId !== 'shipping').length;
    const completed = projects.length - inProgress;
    
    // 判断日期是否过期（截止日期当天不算过期，只有过了23:59:59才算）
    const isOverdue = (dateString) => {
      if (!dateString) return false;
      try {
        const deadline = new Date(dateString);
        // 将截止日期设置为当天的23:59:59.999
        deadline.setHours(23, 59, 59, 999);
        const now = new Date();
        return now > deadline;
      } catch (e) {
        return false;
      }
    };

    // 计算风险项目数
    const today = new Date();
    const atRisk = projects.filter(p => {
      if (!p || !p.estimatedCompletion) return false;
      try {
      const completionDate = new Date(p.estimatedCompletion);
      const daysUntilCompletion = Math.floor((completionDate - today) / (1000 * 60 * 60 * 24));
      const progress = getProgress(p);
      return (daysUntilCompletion <= 7 && progress < 80) || (isOverdue(p.estimatedCompletion) && progress < 100);
      } catch (e) {
        return false;
      }
    }).length;
    
    return { total: projects.length, inProgress, completed, atRisk };
  }, [projects]);

  const getPriorityClass = (priority) => {
    if (priority === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
    if (priority === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    return 'bg-green-500/20 text-green-400 border-green-500/30';
  };

  const getPriorityText = (priority) => {
    if (priority === 'high') return '高';
    if (priority === 'medium') return '中';
    return '低';
  };
  

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
            <input type="text" placeholder="搜索项目..." className="w-full bg-gray-800 border border-transparent rounded-lg pl-12 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-center gap-6">
            <span className="text-gray-400">{currentDate}</span>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsNotificationOpen(true)} 
                className="relative p-2 rounded-full hover:bg-gray-800 transition-colors"
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white">YH</div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
          >
            <div className="glass-effect p-5 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-lg"><Package className="h-6 w-6 text-blue-400" /></div>
              <div>
                <div className="text-3xl font-bold">{stats.total}</div>
                <div className="text-white/60">总项目数</div>
              </div>
            </div>
            <div className="glass-effect p-5 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-yellow-500/20 rounded-lg"><Clock className="h-6 w-6 text-yellow-400" /></div>
              <div>
                <div className="text-3xl font-bold">{stats.inProgress}</div>
                <div className="text-white/60">进行中</div>
              </div>
            </div>
            <div className="glass-effect p-5 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-green-500/20 rounded-lg"><CheckCircle className="h-6 w-6 text-green-400" /></div>
              <div>
                <div className="text-3xl font-bold">{stats.completed}</div>
                <div className="text-white/60">已完成</div>
              </div>
            </div>
            <div className="glass-effect p-5 rounded-xl flex items-center gap-4">
              <div className="p-3 bg-red-500/20 rounded-lg"><AlertTriangle className="h-6 w-6 text-red-400" /></div>
              <div>
                <div className="text-3xl font-bold">{stats.atRisk}</div>
                <div className="text-white/60">风险项目</div>
              </div>
            </div>
          </motion.div>

          {/* 项目健康度 */}
          <ProjectHealth projects={projects} />

          {/* 风险预警区域 */}
          <RiskAlerts projects={projects} tasks={tasks} users={users} onTaskUpdate={loadAllData} />

          {/* 今日任务和本周任务 */}
          <TodayTasks tasks={tasks} users={users} projects={projects} onTaskUpdate={loadAllData} />

          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-white">最近项目</h2>
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-1 rounded-lg bg-gray-800/50">
                    <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}><LayoutGrid size={20} /></button>
                    <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'hover:bg-gray-700'}`}><List size={20} /></button>
                </div>
                <Button
                    onClick={() => { setEditingProject(null); setIsModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                >
                    <Plus className="mr-2 h-4 w-4" /> 新建项目
                </Button>
            </div>
          </div>

          <AnimatePresence>
            <motion.div
              layout
              className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6" : "flex flex-col gap-4"}
            >
              {projects.slice(0, 6).map((project, index) => {
                const progress = getProgress(project);
                const currentStage = mainStages.find(s => s.id === project.currentStageId);
                return (
                  <motion.div
                    layout
                    key={project.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => navigate(`/project/${project.id}`)}
                    className={`glass-effect rounded-xl p-5 cursor-pointer hover:border-blue-400/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${viewMode === 'list' ? 'flex items-center justify-between' : ''}`}
                  >
                    <div className={viewMode === 'list' ? 'flex-grow' : ''}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-lg text-white">{project.projectName || project.orderNumber}</h3>
                          <p className="text-sm text-white/60">{project.orderNumber}</p>
                        </div>
                        <div className={`text-xs font-bold px-2 py-1 rounded-full border ${getPriorityClass(project.priority)}`}>
                          {getPriorityText(project.priority)}
                        </div>
                      </div>
                      
                      <div className={`flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/80 ${viewMode === 'grid' ? 'mb-4' : 'mb-0'}`}>
                          <span>销售: {project.salesName}</span>
                          <span>数量: {project.deviceQuantity}</span>
                          <span>型号: {project.moduleModel}</span>
                      </div>
                    </div>

                    <div className={viewMode === 'list' ? 'w-1/3 pl-4' : 'w-full mt-4'}>
                      <div className="flex justify-between items-center text-xs text-white/70 mb-1">
                        <span>进度</span>
                        <span>{Math.round(progress)}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2.5">
                        <motion.div
                          className={`h-2.5 rounded-full ${currentStage?.color || 'bg-gray-500'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.5, ease: "easeInOut" }}
                        />
                      </div>
                      <div className="text-xs text-white/70 mt-1 text-right">
                        当前阶段: {currentStage?.name || '未知'}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </div>

      <OrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveProject}
        editingOrder={editingProject}
      />

      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
    </div>
  );
};

export default Dashboard;