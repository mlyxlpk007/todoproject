import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, Clock, CheckCircle, AlertCircle, Calendar, User } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { format, differenceInDays, isPast, isToday, addDays, parseISO } from 'date-fns';
import { projectsApi, tasksApi, usersApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const NotificationCenter = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [projects, tasks, users] = await Promise.all([
        projectsApi.getAll(),
        tasksApi.getAll(),
        usersApi.getAll()
      ]);

      const notifs = [];

      // 判断日期是否过期（截止日期当天不算过期，只有过了23:59:59才算）
      const isOverdue = (dateString) => {
        if (!dateString) return false;
        try {
          const deadline = parseISO(dateString);
          // 将截止日期设置为当天的23:59:59.999
          deadline.setHours(23, 59, 59, 999);
          const now = new Date();
          return now > deadline;
        } catch (e) {
          return false;
        }
      };

      // 1. 检查即将到期的任务（今天、3天内、7天内）
      const today = new Date();
      tasks.forEach(task => {
        if (!task.endDate) return;
        const endDate = parseISO(task.endDate);
        const daysUntilDue = differenceInDays(endDate, today);
        
        if (isOverdue(task.endDate)) {
          // 已过期（过了截止日期的23:59:59）
          const assignedUsers = task.assignedTo.map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
          notifs.push({
            id: `overdue-${task.id}`,
            type: 'error',
            title: '任务已过期',
            message: `${task.name} 已过期 ${Math.abs(daysUntilDue)} 天`,
            projectId: task.projectId,
            taskId: task.id,
            assignedTo: assignedUsers.join(', '),
            date: task.endDate,
            priority: 'high'
          });
        } else if (daysUntilDue === 0) {
          // 今天到期
          const assignedUsers = task.assignedTo.map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
          notifs.push({
            id: `due-today-${task.id}`,
            type: 'warning',
            title: '任务今天到期',
            message: `${task.name} 今天到期`,
            projectId: task.projectId,
            taskId: task.id,
            assignedTo: assignedUsers.join(', '),
            date: task.endDate,
            priority: 'high'
          });
        } else if (daysUntilDue > 0 && daysUntilDue <= 3) {
          // 3天内到期
          const assignedUsers = task.assignedTo.map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
          notifs.push({
            id: `due-soon-${task.id}`,
            type: 'warning',
            title: '任务即将到期',
            message: `${task.name} 将在 ${daysUntilDue} 天后到期`,
            projectId: task.projectId,
            taskId: task.id,
            assignedTo: assignedUsers.join(', '),
            date: task.endDate,
            priority: 'medium'
          });
        }
      });

      // 2. 检查项目延期风险
      projects.forEach(project => {
        if (!project.estimatedCompletion) return;
        const completionDate = parseISO(project.estimatedCompletion);
        const daysUntilCompletion = differenceInDays(completionDate, today);
        const progress = calculateProjectProgress(project);
        
        // 如果项目进度落后且接近交期
        if (daysUntilCompletion <= 7 && progress < 80) {
          notifs.push({
            id: `project-risk-${project.id}`,
            type: 'warning',
            title: '项目延期风险',
            message: `${project.projectName} 将在 ${daysUntilCompletion} 天后到期，当前进度 ${Math.round(progress)}%`,
            projectId: project.id,
            date: project.estimatedCompletion,
            priority: 'high'
          });
        }
        
        // 如果项目已过期（过了截止日期的23:59:59）
        if (isOverdue(project.estimatedCompletion) && progress < 100) {
          notifs.push({
            id: `project-overdue-${project.id}`,
            type: 'error',
            title: '项目已过期',
            message: `${project.projectName} 已过期 ${Math.abs(daysUntilCompletion)} 天，当前进度 ${Math.round(progress)}%`,
            projectId: project.id,
            date: project.estimatedCompletion,
            priority: 'high'
          });
        }
      });

      // 按优先级和日期排序
      notifs.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(a.date) - new Date(b.date);
      });

      setNotifications(notifs);
    } catch (error) {
      console.error('加载通知失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProjectProgress = (project) => {
    const stages = ['requirements', 'structural_design', 'electronic_design', 'system_design', 'software_design', 'production', 'debugging', 'shipping'];
    const currentIndex = stages.findIndex(s => s === project.currentStageId);
    return currentIndex >= 0 ? ((currentIndex + 1) / stages.length) * 100 : 0;
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-5 w-5 text-red-400" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-400" />;
      case 'info': return <Clock className="h-5 w-5 text-blue-400" />;
      default: return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'error': return 'border-red-500/50 bg-red-500/10';
      case 'warning': return 'border-yellow-500/50 bg-yellow-500/10';
      case 'info': return 'border-blue-500/50 bg-blue-500/10';
      default: return 'border-gray-500/50 bg-gray-500/10';
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell className="h-6 w-6 text-indigo-400" />
              通知中心
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors">
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="text-center py-8 text-gray-400">加载中...</div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <p className="text-gray-400">暂无通知</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-4 rounded-lg border",
                      getNotificationColor(notif.type)
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {getNotificationIcon(notif.type)}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-semibold text-white">{notif.title}</h3>
                          <span className="text-xs text-gray-400">
                            {format(parseISO(notif.date), 'MM/dd')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300 mb-2">{notif.message}</p>
                        {notif.assignedTo && (
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <User className="h-3 w-3" />
                            <span>负责人: {notif.assignedTo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-700 text-center text-sm text-gray-400">
            共 {notifications.length} 条通知
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default NotificationCenter;
