import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, addMonths, subMonths, getDay, parseISO, isWithinInterval, isWeekend } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { usersApi, tasksApi } from '@/lib/api';

const HumanResources = () => {
    const { toast } = useToast();
    const [engineers, setEngineers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [selectedEngineerId, setSelectedEngineerId] = useState(null);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [hoveredDay, setHoveredDay] = useState(null);
    const [hoveredDayTasks, setHoveredDayTasks] = useState([]);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const [usersData, tasksData] = await Promise.all([
                usersApi.getAll(),
                tasksApi.getAll()
            ]);
            setEngineers(usersData);
            setTasks(tasksData);
        } catch (error) {
            console.error('加载数据失败:', error);
        }
    };

    const showToast = () => {
        toast({
            title: '🚧 功能尚未实现',
            description: '别担心！您可以在下一次提示中请求它！🚀',
        });
    };

    const engineerRoles = engineers.reduce((acc, engineer) => {
        acc[engineer.role] = (acc[engineer.role] || 0) + 1;
        return acc;
    }, {});
    
    const totalEngineers = engineers.length;

    const getTasksForDay = (day) => {
        if (!selectedEngineerId || !day) return [];
    
        return tasks.filter(task => {
            if (!task.assignedTo.includes(selectedEngineerId) || !task.startDate || !task.endDate) {
                return false;
            }
            const start = parseISO(task.startDate);
            const end = parseISO(task.endDate);

            return isWithinInterval(day, { start, end }) && !isWeekend(day);
        });
    };

    const getTaskCountColor = (count) => {
        if (count === 0) return 'bg-white/10';
        if (count < 2) return 'bg-green-500/30';
        if (count < 5) return 'bg-yellow-500/30';
        return 'bg-red-500/30';
    };

    const getPriorityColor = (priority) => {
        const p = (priority || 'medium').toString().toLowerCase();
        if (p === 'high' || p === '高') return 'text-red-400';
        if (p === 'low' || p === '低') return 'text-green-400';
        return 'text-yellow-400';
    };

    const getPriorityLabel = (priority) => {
        const p = (priority || 'medium').toString().toLowerCase();
        if (p === 'high' || p === '高') return '高';
        if (p === 'low' || p === '低') return '低';
        return '中';
    };

    const handleDayHover = (day, dayTasks, event) => {
        if (day && dayTasks.length > 0 && selectedEngineerId) {
            setHoveredDay(day);
            setHoveredDayTasks(dayTasks);
            // 计算弹窗位置，避免超出屏幕
            const x = event.clientX;
            const y = event.clientY;
            const tooltipWidth = 350; // 弹窗最大宽度
            const tooltipHeight = 300; // 弹窗最大高度
            const padding = 10;
            
            let finalX = x + padding;
            let finalY = y + padding;
            
            // 如果右侧空间不足，显示在左侧
            if (x + tooltipWidth + padding > window.innerWidth) {
                finalX = x - tooltipWidth - padding;
            }
            
            // 如果下方空间不足，显示在上方
            if (y + tooltipHeight + padding > window.innerHeight) {
                finalY = y - tooltipHeight - padding;
            }
            
            setTooltipPosition({ x: finalX, y: finalY });
        }
    };

    const handleDayLeave = () => {
        setHoveredDay(null);
        setHoveredDayTasks([]);
    };

    const renderCalendar = (month) => {
        const start = startOfMonth(month);
        const end = endOfMonth(month);
        const days = eachDayOfInterval({ start, end });

        const daysInMonth = [];
        let currentWeek = [];
        const firstDayOfWeek = getDay(start);
        const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        for (let i = 0; i < offset; i++) {
            currentWeek.push(null);
        }

        days.forEach((day) => {
            currentWeek.push(day);
            if (currentWeek.length === 7) {
                daysInMonth.push(currentWeek);
                currentWeek = [];
            }
        });
        if (currentWeek.length > 0) {
            while (currentWeek.length < 7) {
                currentWeek.push(null);
            }
            daysInMonth.push(currentWeek);
        }

        return (
            <div className="flex flex-col">
                <div className="flex justify-between items-center mb-2">
                    <h4 className="text-base font-semibold text-white">{format(month, 'yyyy年 M月', { locale: zhCN })}</h4>
                </div>
                <div className="grid grid-cols-7 text-center text-xs font-medium text-gray-400 mb-1">
                    {['一', '二', '三', '四', '五', '六', '日'].map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 text-xs">
                    {daysInMonth.flat().map((day, index) => {
                        const dayTasks = day ? getTasksForDay(day) : [];
                        const taskCount = dayTasks.length;
                        const isDayWeekend = day ? isWeekend(day) : false;

                        const bgColorClass = isDayWeekend ? 'bg-gray-700/20' : getTaskCountColor(taskCount);

                        return (
                            <div
                                key={index}
                                className={cn(
                                    "p-1 rounded aspect-square flex flex-col items-center justify-center relative",
                                    day ? "bg-gray-800/50 text-gray-200" : "bg-gray-900/30 text-gray-600",
                                    day && isToday(day) && "border border-blue-500",
                                    bgColorClass,
                                    day && taskCount > 0 && selectedEngineerId && !isDayWeekend && "cursor-pointer"
                                )}
                                onMouseEnter={(e) => handleDayHover(day, dayTasks, e)}
                                onMouseMove={(e) => {
                                    if (day && dayTasks.length > 0 && selectedEngineerId) {
                                        const x = e.clientX;
                                        const y = e.clientY;
                                        const tooltipWidth = 350;
                                        const tooltipHeight = 300;
                                        const padding = 10;
                                        
                                        let finalX = x + padding;
                                        let finalY = y + padding;
                                        
                                        if (x + tooltipWidth + padding > window.innerWidth) {
                                            finalX = x - tooltipWidth - padding;
                                        }
                                        
                                        if (y + tooltipHeight + padding > window.innerHeight) {
                                            finalY = y - tooltipHeight - padding;
                                        }
                                        
                                        setTooltipPosition({ x: finalX, y: finalY });
                                    }
                                }}
                                onMouseLeave={handleDayLeave}
                            >
                                {day ? (
                                    <>
                                        <span className={cn("font-semibold", { 'text-gray-500': isDayWeekend })}>{format(day, 'd')}</span>
                                        {selectedEngineerId && taskCount > 0 && !isDayWeekend && (
                                            <span className="text-[10px] mt-0.5">{taskCount}</span>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 flex flex-col bg-gray-900 text-gray-300 overflow-hidden">
            <Helmet>
                <title>人力资源 - 研发订单跟踪系统</title>
                <meta name="description" content="研发团队人力资源概览与任务日历。" />
            </Helmet>

            <header className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">人力资源</h2>
                <div className="flex items-center gap-4">
                    <button onClick={showToast} className="p-2 rounded-full hover:bg-gray-800"><Bell size={20} /></button>
                    <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white">YH</div>
                </div>
            </header>

            <div className="flex-shrink-0 p-6 pb-0">
                <h3 className="text-xl font-bold text-white mb-4">工程师角色概览</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-8">
                    <motion.div
                        className="glass-effect p-4 rounded-xl flex flex-col items-center justify-center text-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <span className="text-4xl font-bold text-blue-400">{totalEngineers}</span>
                        <p className="text-sm text-gray-400 mt-1">工程师总数</p>
                    </motion.div>
                    {Object.entries(engineerRoles).map(([role, count], index) => (
                        <motion.div
                            key={role}
                            className="glass-effect p-4 rounded-xl flex flex-col items-center justify-center text-center"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
                        >
                            <span className="text-4xl font-bold text-purple-400">{count}</span>
                            <p className="text-sm text-gray-400 mt-1">{role}</p>
                        </motion.div>
                    ))}
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden p-6 pt-0">
                <div className="w-1/4 glass-effect p-4 rounded-xl overflow-y-auto mr-4 flex-shrink-0">
                    <h3 className="text-xl font-bold text-white mb-4">工程师清单</h3>
                    <ul className="space-y-2">
                        {engineers.map(engineer => (
                            <li
                                key={engineer.id}
                                className={cn(
                                    "p-3 rounded-lg cursor-pointer transition-colors",
                                    "hover:bg-blue-600/30",
                                    selectedEngineerId === engineer.id ? "bg-blue-600/50 border border-blue-500" : "bg-gray-800/50"
                                )}
                                onClick={() => setSelectedEngineerId(engineer.id)}
                            >
                                <p className="font-semibold text-white">{engineer.name}</p>
                                <p className="text-sm text-gray-400">{engineer.role}</p>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                    {/* 任务日历 - 增加高度 */}
                    <div className="glass-effect p-4 rounded-xl flex flex-col flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">任务日历</h3>
                        <div className="flex space-x-2">
                            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded-full hover:bg-gray-700 transition-colors">
                                <ChevronLeft size={16} />
                            </button>
                            <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-sm rounded-md hover:bg-gray-700 transition-colors">今天</button>
                            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded-full hover:bg-gray-700 transition-colors">
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                    {!selectedEngineerId && (
                        <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
                            请从左侧选择一位工程师查看其任务日历。
                        </div>
                    )}
                    {selectedEngineerId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 overflow-y-auto">
                            {renderCalendar(currentMonth)}
                            {renderCalendar(addMonths(currentMonth, 1))}
                        </div>
                    )}
                    </div>

                    {/* 工程师详细信息区域 */}
                    {selectedEngineerId && (() => {
                        const selectedEngineer = engineers.find(e => e.id === selectedEngineerId);
                        if (!selectedEngineer) return null;
                        
                        // 解析技能标签
                        let skillTags = [];
                        try {
                            if (selectedEngineer.skillTags) {
                                skillTags = typeof selectedEngineer.skillTags === 'string' 
                                    ? JSON.parse(selectedEngineer.skillTags) 
                                    : selectedEngineer.skillTags;
                            }
                        } catch (e) {
                            // 如果不是JSON，尝试按逗号分割
                            if (typeof selectedEngineer.skillTags === 'string') {
                                skillTags = selectedEngineer.skillTags.split(',').map(s => s.trim()).filter(s => s);
                            }
                        }
                        
                        // 计算最近30天的任务统计
                        const thirtyDaysAgo = new Date();
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                        
                        const recentTasks = tasks.filter(task => {
                            if (!task.assignedTo || !Array.isArray(task.assignedTo) || !task.assignedTo.includes(selectedEngineerId)) {
                                return false;
                            }
                            if (!task.startDate || !task.endDate) {
                                return false;
                            }
                            try {
                                const start = parseISO(task.startDate);
                                const end = parseISO(task.endDate);
                                const now = new Date();
                                // 任务在最近30天内或跨越最近30天
                                return (start <= now && end >= thirtyDaysAgo);
                            } catch {
                                return false;
                            }
                        });
                        
                        // 计算任务天数（按任务类型分组）
                        const taskTypeDays = {
                            project: 0,
                            rnd: 0,
                            leave: 0,
                            meeting: 0,
                            support: 0
                        };
                        
                        recentTasks.forEach(task => {
                            const taskType = (task.taskType || 'project').toLowerCase();
                            if (!task.startDate || !task.endDate) return;
                            
                            try {
                                const start = parseISO(task.startDate);
                                const end = parseISO(task.endDate);
                                
                                // 计算任务在最近30天内的实际天数
                                const effectiveStart = start > thirtyDaysAgo ? start : thirtyDaysAgo;
                                const effectiveEnd = end < new Date() ? end : new Date();
                                
                                if (effectiveStart <= effectiveEnd) {
                                    const days = Math.ceil((effectiveEnd - effectiveStart) / (1000 * 60 * 60 * 24)) + 1;
                                    // 只计算工作日
                                    let workDays = 0;
                                    for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
                                        if (!isWeekend(d)) {
                                            workDays++;
                                        }
                                    }
                                    
                                    if (taskTypeDays.hasOwnProperty(taskType)) {
                                        taskTypeDays[taskType] += workDays;
                                    }
                                }
                            } catch (e) {
                                console.error('计算任务天数失败:', e);
                            }
                        });
                        
                        // 计算总工作日
                        const totalWorkDays = Object.values(taskTypeDays).reduce((sum, days) => sum + days, 0);
                        
                        // 计算占比（基于最近30天的实际任务）
                        let leavePercentage = 0;
                        let meetingPercentage = 0;
                        let supportWorkPercentage = 0;
                        let availabilityRate = 0;
                        
                        if (totalWorkDays > 0) {
                            // 最近30天有任务数据，使用动态统计
                            leavePercentage = (taskTypeDays.leave / totalWorkDays) * 100;
                            meetingPercentage = (taskTypeDays.meeting / totalWorkDays) * 100;
                            supportWorkPercentage = (taskTypeDays.support / totalWorkDays) * 100;
                            // 可用率 = 项目任务 + 研发任务
                            const availableDays = taskTypeDays.project + taskTypeDays.rnd;
                            availabilityRate = (availableDays / totalWorkDays) * 100;
                        } else {
                            // 最近30天没有任务数据，使用用户表中的静态值
                            leavePercentage = (selectedEngineer.leavePercentage || 0.0) * 100;
                            meetingPercentage = (selectedEngineer.meetingPercentage || 0.1) * 100;
                            supportWorkPercentage = (selectedEngineer.supportWorkPercentage || 0.1) * 100;
                            availabilityRate = Math.max(0, 100 - leavePercentage - meetingPercentage - supportWorkPercentage);
                        }
                        
                        return (
                            <div className="glass-effect p-4 rounded-xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* 技能和能力 */}
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-sm text-gray-400 mb-2">技能标签（领域）</p>
                                            <div className="flex flex-wrap gap-2">
                                                {skillTags.length > 0 ? (
                                                    skillTags.map((tag, index) => (
                                                        <span
                                                            key={index}
                                                            className="px-3 py-1 bg-indigo-600/30 text-indigo-300 rounded-full text-sm border border-indigo-500/50"
                                                        >
                                                            {tag}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className="text-sm text-gray-500">暂无技能标签</span>
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-400 mb-1">并行任务上限</p>
                                            <p className="text-lg font-semibold text-white">{selectedEngineer.maxConcurrentTasks || 5}</p>
                                        </div>
                                    </div>

                                    {/* 时间占比 - 基于最近30天动态统计 */}
                                    <div className="space-y-2">
                                        <div className="mb-2">
                                            <p className="text-xs text-gray-500 mb-1">
                                                {totalWorkDays > 0 ? '最近30天实际占比' : '预设占比'}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-400">可用率</p>
                                            <span className="text-sm font-semibold text-green-400">
                                                {availabilityRate.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-400">请假占比</p>
                                            <span className="text-sm font-semibold text-yellow-400">
                                                {leavePercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-400">会议占比</p>
                                            <span className="text-sm font-semibold text-blue-400">
                                                {meetingPercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-400">支撑性工作占比</p>
                                            <span className="text-sm font-semibold text-purple-400">
                                                {supportWorkPercentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        {totalWorkDays > 0 && (
                                            <div className="pt-2 mt-2 border-t border-gray-700">
                                                <p className="text-xs text-gray-500">
                                                    统计任务数: {recentTasks.length} | 总工作日: {totalWorkDays}天
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* 任务详情弹窗 */}
            {hoveredDay && hoveredDayTasks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="fixed z-50 pointer-events-none"
                    style={{
                        left: `${tooltipPosition.x}px`,
                        top: `${tooltipPosition.y}px`,
                        transform: 'translate(0, 0)'
                    }}
                >
                    <div className="glass-effect p-4 rounded-xl shadow-2xl border border-gray-700 min-w-[250px] max-w-[350px]">
                        <div className="mb-2">
                            <h4 className="text-sm font-semibold text-white mb-1">
                                {format(hoveredDay, 'yyyy年M月d日', { locale: zhCN })}
                            </h4>
                            <p className="text-xs text-gray-400">{hoveredDayTasks.length} 个任务</p>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                            {hoveredDayTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className="p-2 bg-gray-800/50 rounded-lg border border-gray-700/50"
                                >
                                    <p className="text-sm font-medium text-white mb-1 truncate">
                                        {task.name || '未命名任务'}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400">优先级:</span>
                                        <span className={cn("text-xs font-semibold", getPriorityColor(task.priority))}>
                                            {getPriorityLabel(task.priority)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default HumanResources;