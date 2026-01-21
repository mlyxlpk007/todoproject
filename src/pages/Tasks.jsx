import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Bell, Edit, Check, ChevronsUpDown, X, Eye, AlertCircle, User, Calendar, FileText, CheckCircle2, Tag, Archive, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { tasksApi, projectsApi, usersApi, assetsApi } from '@/lib/api';
import { format } from 'date-fns';
import CompleteTaskModal from '@/components/CompleteTaskModal';
import TagModal from '@/components/TagModal';
import AssetRelationModal from '@/components/AssetRelationModal';

const Tasks = () => {
    const { toast } = useToast();
    const [tasks, setTasks] = useState([]);
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [isTaskModalOpen, setTaskModalOpen] = useState(false);
    const [isTaskDetailOpen, setTaskDetailOpen] = useState(false);
    const [isCompleteModalOpen, setCompleteModalOpen] = useState(false);
    const [isTagModalOpen, setIsTagModalOpen] = useState(false);
    const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [viewingTask, setViewingTask] = useState(null);
    const [completingTask, setCompletingTask] = useState(null);
    const [taskAssets, setTaskAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const logPrefix = '[Tasks页面 loadData]';
        try {
            console.log(`${logPrefix} ========== 开始加载数据 ==========`);
            setLoading(true);
            setError(null);
            
            console.log(`${logPrefix} 并行加载任务、项目、用户数据...`);
            const [tasksData, projectsData, usersData] = await Promise.all([
                tasksApi.getAll().catch(err => {
                    console.error(`${logPrefix} 加载任务失败:`, err);
                    return [];
                }),
                projectsApi.getAll().catch(err => {
                    console.error(`${logPrefix} 加载项目失败:`, err);
                    return [];
                }),
                usersApi.getAll().catch(err => {
                    console.error(`${logPrefix} 加载用户失败:`, err);
                    return [];
                })
            ]);
            
            console.log(`${logPrefix} 数据加载完成:`);
            console.log(`  - 任务数据: 类型=${typeof tasksData}, 是否为数组=${Array.isArray(tasksData)}, 长度=${tasksData?.length || 0}`);
            console.log(`  - 项目数据: 类型=${typeof projectsData}, 是否为数组=${Array.isArray(projectsData)}, 长度=${projectsData?.length || 0}`);
            console.log(`  - 用户数据: 类型=${typeof usersData}, 是否为数组=${Array.isArray(usersData)}, 长度=${usersData?.length || 0}`);
            
            // 确保数据是数组，并过滤掉无效的任务
            let validTasks = [];
            try {
                if (Array.isArray(tasksData)) {
                    console.log(`${logPrefix} 开始验证和过滤任务数据，原始数量: ${tasksData.length}`);
                    
                    validTasks = tasksData.map((t, index) => {
                        try {
                            // 确保任务对象有效
                            if (!t || typeof t !== 'object') {
                                console.warn(`${logPrefix} 任务 ${index} 无效: 不是对象`, t);
                                return null;
                            }
                            if (!t.id) {
                                console.warn(`${logPrefix} 任务 ${index} 无效: 缺少 id`, t);
                                return null;
                            }
                            
                            // 确保所有字段都有默认值
                            return {
                                ...t,
                                id: t.id || '',
                                name: t.name || '',
                                projectId: t.projectId || '',
                                assignedTo: Array.isArray(t.assignedTo) ? t.assignedTo : [],
                                startDate: t.startDate || '',
                                endDate: t.endDate || '',
                                requirements: t.requirements || '',
                                stakeholder: t.stakeholder || '',
                                priority: t.priority || 'medium',
                                status: t.status || 'pending',
                                completedDate: t.completedDate || '',
                                completionNotes: t.completionNotes || '',
                                completedBy: t.completedBy || ''
                            };
                        } catch (e) {
                            console.warn(`${logPrefix} 处理任务 ${index} 时出错:`, e, t);
                            return null;
                        }
                    }).filter(t => t !== null);
                    
                    console.log(`${logPrefix} 任务验证完成，有效数量: ${validTasks.length}`);
                    
                    if (validTasks.length > 0) {
                        console.log(`${logPrefix} 第一个有效任务:`, validTasks[0]);
                    }
                } else {
                    console.warn(`${logPrefix} 任务数据不是数组:`, tasksData);
                }
            } catch (e) {
                console.error(`${logPrefix} 处理任务数据时出错:`, e);
                validTasks = [];
            }
            
            console.log(`${logPrefix} 设置状态:`);
            console.log(`  - tasks: ${validTasks.length} 个`);
            console.log(`  - projects: ${Array.isArray(projectsData) ? projectsData.length : 0} 个`);
            console.log(`  - users: ${Array.isArray(usersData) ? usersData.length : 0} 个`);
            
            setTasks(validTasks);
            setProjects(Array.isArray(projectsData) ? projectsData : []);
            setUsers(Array.isArray(usersData) ? usersData : []);
            
            if (validTasks.length === 0 && tasksData?.length > 0) {
                console.warn(`${logPrefix} ⚠️ 警告：有 ${tasksData.length} 个任务数据但验证后为空！`);
                console.warn(`${logPrefix} 原始任务数据:`, tasksData);
            }
            
            console.log(`${logPrefix} ========== 数据加载完成 ==========`);
        } catch (error) {
            console.error(`${logPrefix} ========== 加载数据失败 ==========`);
            console.error(`${logPrefix} 错误:`, error);
            console.error(`${logPrefix} 错误消息:`, error.message);
            console.error(`${logPrefix} 错误堆栈:`, error.stack);
            setError(error.message || '加载数据失败');
            toast({ 
                title: "加载数据失败", 
                description: error.message || "请检查控制台获取详细信息",
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
            console.log(`${logPrefix} 加载状态已设置为 false`);
        }
    };

    const handleTaskSave = async (formData) => {
        try {
            if (editingTask) {
                await tasksApi.update(editingTask.id, formData);
                toast({ title: "任务更新成功" });
            } else {
                await tasksApi.create(formData);
                toast({ title: "任务创建成功" });
            }
            await loadData();
            setTaskModalOpen(false);
            setEditingTask(null);
        } catch (error) {
            console.error('保存任务失败:', error);
            const errorMessage = error.message || error.toString() || "保存任务失败";
            toast({ 
                title: "保存任务失败", 
                description: errorMessage,
                variant: "destructive",
                duration: 10000 // 错误提示显示10秒，让用户有时间阅读
            });
        }
    };

    const handleCompleteTask = async (completionData) => {
        if (!completingTask || !completingTask.id) {
            toast({ title: "错误", description: "任务信息不完整", variant: "destructive" });
            return;
        }
        
        try {
            await tasksApi.update(completingTask.id, {
                ...completingTask,
                ...completionData
            });
            toast({ title: "任务已完成", description: "任务已标记为完成" });
            setCompleteModalOpen(false);
            setCompletingTask(null);
            // 重新加载数据
            await loadData();
        } catch (error) {
            console.error('完成任务失败:', error);
            toast({ 
                title: "完成任务失败", 
                description: error.message || "请检查控制台获取详细信息",
                variant: "destructive" 
            });
        }
    };
    
    const handleTagSubmit = async (tagType, lessonId) => {
        if (!viewingTask || !viewingTask.id) {
            toast({ title: "错误", description: "任务信息不完整", variant: "destructive" });
            return;
        }

        try {
            await tasksApi.update(viewingTask.id, {
                ...viewingTask,
                tagType: tagType || null,
                lessonLearnedId: lessonId || null
            });
            toast({ title: "标签保存成功" });
            setIsTagModalOpen(false);
            // 重新加载数据以更新任务列表
            await loadData();
            // 更新当前查看的任务
            const updatedTasks = await tasksApi.getAll();
            const updatedTask = updatedTasks.find(t => t.id === viewingTask.id);
            if (updatedTask) {
                setViewingTask(updatedTask);
            }
        } catch (error) {
            console.error('保存标签失败:', error);
            toast({ 
                title: "保存标签失败", 
                description: error.message || "请检查控制台获取详细信息",
                variant: "destructive" 
            });
        }
    };
    
    const showToast = () => {
        toast({
          title: '🚧 功能尚未实现',
          description: '别担心！您可以在下一次提示中请求它！🚀',
        });
      };

    if (error) {
        return (
            <div className="flex-1 flex flex-col bg-gray-900 text-gray-300 overflow-hidden">
                <header className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
                    <h2 className="text-2xl font-bold text-white">任务管理</h2>
                </header>
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-red-400 mb-4">加载数据时出错: {error}</p>
                        <Button onClick={loadData}>重试</Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-gray-900 text-gray-300 overflow-hidden">
            <header className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">任务管理</h2>
                <div className="flex items-center gap-4">
                   <button onClick={showToast} className="p-2 rounded-full hover:bg-gray-800"><Bell size={20} /></button>
                   <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white">YH</div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* 调试信息面板 */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="glass-effect rounded-xl p-4 mb-4 text-xs font-mono">
                        <div className="text-yellow-400 font-bold mb-2">🔍 调试信息</div>
                        <div>加载状态: {loading ? '加载中...' : '已完成'}</div>
                        <div>任务数量: {tasks.length}</div>
                        <div>项目数量: {projects.length}</div>
                        <div>用户数量: {users.length}</div>
                        {tasks.length > 0 && (
                            <div className="mt-2">
                                <div>第一个任务 ID: {tasks[0]?.id}</div>
                                <div>第一个任务名称: {tasks[0]?.name}</div>
                            </div>
                        )}
                    </div>
                )}
                
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <p className="text-gray-400">加载中...</p>
                    </div>
                ) : (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-white">所有任务 ({tasks.length})</h3>
                            <Button onClick={() => { setEditingTask(null); setTaskModalOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4" /> 新建任务
                            </Button>
                        </div>
                        {tasks.length === 0 ? (
                            <div className="glass-effect rounded-xl p-8 text-center">
                                <p className="text-gray-400">暂无任务</p>
                                <Button 
                                    onClick={() => { setEditingTask(null); setTaskModalOpen(true); }}
                                    className="mt-4"
                                >
                                    <Plus className="mr-2 h-4 w-4" /> 创建第一个任务
                                </Button>
                            </div>
                        ) : (
                            <TaskList 
                                tasks={tasks} 
                                projects={projects} 
                                users={users} 
                                onEdit={(t) => { setEditingTask(t); setTaskModalOpen(true); }}
                                onView={(t) => { setViewingTask(t); setTaskDetailOpen(true); }}
                                onComplete={(t) => { setCompletingTask(t); setCompleteModalOpen(true); }}
                            />
                        )}
                    </div>
                )}
            </div>
            {isTaskModalOpen && (
                <TaskModal 
                    isOpen={isTaskModalOpen} 
                    onClose={() => {
                        setTaskModalOpen(false);
                        setEditingTask(null);
                    }} 
                    onSubmit={handleTaskSave} 
                    editingTask={editingTask} 
                    projects={projects} 
                    users={users} 
                />
            )}
            {isTaskDetailOpen && viewingTask && (
                <TaskDetailModal 
                    isOpen={isTaskDetailOpen} 
                    onClose={() => {
                        setTaskDetailOpen(false);
                        setViewingTask(null);
                        setTaskAssets([]);
                    }} 
                    task={viewingTask} 
                    projects={projects} 
                    users={users} 
                    taskAssets={taskAssets}
                    onEdit={() => { 
                        setTaskDetailOpen(false);
                        setViewingTask(null);
                        setEditingTask(viewingTask); 
                        setTaskModalOpen(true); 
                    }} 
                    onComplete={() => { 
                        setTaskDetailOpen(false);
                        setViewingTask(null);
                        setCompletingTask(viewingTask); 
                        setCompleteModalOpen(true); 
                    }} 
                    onTag={() => {
                        setIsTagModalOpen(true);
                    }}
                    onAsset={() => {
                        setIsAssetModalOpen(true);
                    }}
                />
            )}
            {isCompleteModalOpen && completingTask && (
                <CompleteTaskModal 
                    isOpen={isCompleteModalOpen} 
                    onClose={() => {
                        setCompleteModalOpen(false);
                        setCompletingTask(null);
                    }} 
                    task={completingTask} 
                    onSubmit={handleCompleteTask} 
                />
            )}
            {isTagModalOpen && viewingTask && (
                <TagModal
                    isOpen={isTagModalOpen}
                    onClose={() => {
                        setIsTagModalOpen(false);
                    }}
                    onSubmit={handleTagSubmit}
                    entityType="task"
                    entityId={viewingTask.id}
                    entityName={viewingTask.name}
                    projectId={viewingTask.projectId}
                    projectName={projects.find(p => p.id === viewingTask.projectId)?.projectName}
                    currentTag={viewingTask.tagType}
                    currentLessonId={viewingTask.lessonLearnedId}
                />
            )}
            {isAssetModalOpen && viewingTask && viewingTask.projectId && (
                <AssetRelationModal
                    isOpen={isAssetModalOpen}
                    onClose={() => setIsAssetModalOpen(false)}
                    projectId={viewingTask.projectId}
                    defaultRelationType="used"
                    onSuccess={() => {
                        // 重新加载任务资产（通过项目）
                        if (viewingTask?.projectId) {
                            loadTaskAssets(viewingTask.projectId);
                        }
                    }}
                />
            )}
        </div>
    );
};

    const loadTaskAssets = async (projectId) => {
        try {
            const assets = await assetsApi.getByProject(projectId);
            setTaskAssets(assets);
        } catch (error) {
            console.error('加载任务资产失败:', error);
        }
    };

// 带资产加载的 TaskDetailModal 包装组件
const TaskDetailModalWithAssets = ({ isOpen, task, onLoadAssets, ...props }) => {
    const [taskAssets, setTaskAssets] = useState([]);

    useEffect(() => {
        if (isOpen && task?.projectId) {
            loadAssets();
        }
    }, [isOpen, task?.projectId]);

    const loadAssets = async () => {
        if (task?.projectId) {
            try {
                const assets = await assetsApi.getByProject(task.projectId);
                setTaskAssets(assets);
            } catch (error) {
                console.error('加载任务资产失败:', error);
            }
        }
    };

    return (
        <TaskDetailModal
            {...props}
            isOpen={isOpen}
            task={task}
            taskAssets={taskAssets}
            onAsset={props.onAsset}
        />
    );
};

const TaskList = ({ tasks, projects, users, onEdit, onView, onComplete }) => {
    // 确保参数有效
    if (!Array.isArray(tasks)) {
        console.error('TaskList: tasks is not an array', tasks);
        return <p className="text-center py-8 text-gray-500">任务数据格式错误</p>;
    }
    if (!Array.isArray(projects)) {
        console.error('TaskList: projects is not an array', projects);
        return <p className="text-center py-8 text-gray-500">项目数据格式错误</p>;
    }
    if (!Array.isArray(users)) {
        console.error('TaskList: users is not an array', users);
        return <p className="text-center py-8 text-gray-500">用户数据格式错误</p>;
    }

    const getPriorityClass = (priority) => {
        try {
            const p = (priority || 'medium').toString().toLowerCase();
            if (p === 'high') return 'bg-red-500/20 text-red-400 border-red-500/30';
            if (p === 'medium') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
            return 'bg-green-500/20 text-green-400 border-green-500/30';
        } catch (e) {
            console.warn('getPriorityClass error:', e, priority);
            return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
        }
    };

    const getPriorityText = (priority) => {
        try {
            const p = (priority || 'medium').toString().toLowerCase();
            if (p === 'high') return '高';
            if (p === 'medium') return '中';
            return '低';
        } catch (e) {
            console.warn('getPriorityText error:', e, priority);
            return '中';
        }
    };

    return (
        <div className="glass-effect rounded-xl overflow-hidden">
            <table className="w-full text-sm text-left">
                <thead className="bg-white/5">
                    <tr>
                        <th className="px-4 py-3 font-medium">任务名称</th>
                        <th className="px-4 py-3 font-medium">所属项目</th>
                        <th className="px-4 py-3 font-medium">利益方</th>
                        <th className="px-4 py-3 font-medium">负责人</th>
                        <th className="px-4 py-3 font-medium">优先级</th>
                        <th className="px-4 py-3 font-medium">开始日期</th>
                        <th className="px-4 py-3 font-medium">结束日期</th>
                        <th className="px-4 py-3 font-medium text-center">操作</th>
                    </tr>
                </thead>
                <tbody>
                    {tasks.map(t => {
                        try {
                            // 确保任务对象存在
                            if (!t || !t.id) return null;
                            
                            const project = projects.find(p => p.id === t.projectId);
                            const assignedUsers = (t.assignedTo || []).map(uid => users.find(u => u.id === uid)?.name).filter(Boolean);
                            const stakeholder = (t.stakeholder || '').toString();
                            const priority = (t.priority || 'medium').toString().toLowerCase();
                            const status = (t.status || 'pending').toString().toLowerCase();
                            const isCompleted = status === 'completed';
                            return (
                            <tr key={t.id} className={`border-b border-white/5 hover:bg-white/5 transition-colors ${isCompleted ? 'opacity-60' : ''}`}>
                                <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-400" />}
                                        <span className={`font-medium ${isCompleted ? 'text-gray-500 line-through' : 'text-white'}`}>
                                            {t.name || '-'}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-gray-400">{project?.projectName || '未关联'}</td>
                                <td className="px-4 py-3 text-gray-400">{stakeholder || '-'}</td>
                                <td className="px-4 py-3 text-gray-400">{assignedUsers.length > 0 ? assignedUsers.join(', ') : '-'}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getPriorityClass(priority)}`}>
                                        {getPriorityText(priority)}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-400">{t.startDate || '-'}</td>
                                <td className="px-4 py-3 text-gray-400">{t.endDate || '-'}</td>
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                    {isCompleted ? (
                                        <span className="text-xs text-green-400 font-semibold">已完成</span>
                                    ) : (
                                        <div className="flex items-center justify-center gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 text-green-400 hover:text-green-300 hover:bg-green-500/20" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onComplete) onComplete(t);
                                                }} 
                                                title="完成任务"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onView) onView(t);
                                                }} 
                                                title="查看详情"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onEdit) onEdit(t);
                                                }} 
                                                title="编辑"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                            );
                        } catch (error) {
                            console.error('渲染任务失败:', error, t);
                            return null;
                        }
                    })}
                </tbody>
            </table>
            {tasks.length === 0 && <p className="text-center py-8 text-gray-500">暂无任务</p>}
        </div>
    );
};

const TaskModal = ({ isOpen, onClose, onSubmit, editingTask, projects, users }) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const [formData, setFormData] = useState({ name: '', projectId: '', assignedTo: [], startDate: today, endDate: today, requirements: '', stakeholder: '', priority: 'medium', taskType: 'project' });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (editingTask) {
            setFormData({
                ...editingTask,
                startDate: editingTask.startDate || today,
                endDate: editingTask.endDate || today,
                taskType: editingTask.taskType || 'project',
            });
        } else {
             setFormData({ name: '', projectId: '', assignedTo: [], startDate: today, endDate: today, requirements: '', stakeholder: '', priority: 'medium', taskType: 'project' });
        }
    }, [editingTask, today]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const updated = { ...prev, [name]: value };
            if (name === 'startDate' && updated.endDate < updated.startDate) {
                updated.endDate = updated.startDate;
            }
            return updated;
        });
    };

    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };
    
    const handleMultiSelect = (userId) => {
        setFormData(prev => ({
            ...prev,
            assignedTo: prev.assignedTo.includes(userId)
                ? prev.assignedTo.filter(id => id !== userId)
                : [...prev.assignedTo, userId]
        }));
    };

    if (!isOpen) return null;
    
    const selectedUsers = formData.assignedTo.map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(', ');

    return (
        <ModalBase title={editingTask ? '编辑任务' : '新建任务'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group"><label>任务名称</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required /></div>
                <div className="form-group"><label>所属项目</label><select name="projectId" value={formData.projectId} onChange={handleChange} className="form-select"><option value="">选择项目</option>{projects.map(p => <option key={p.id} value={p.id}>{p.projectName}</option>)}</select></div>
                <div className="form-group"><label>指派给</label>
                    <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
                                <span className="truncate">{selectedUsers || "选择工程师..."}</span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="搜索工程师..." />
                                <CommandEmpty>没有找到工程师</CommandEmpty>
                                <CommandGroup>
                                    {users.map((user) => (
                                        <CommandItem key={user.id} onSelect={() => handleMultiSelect(user.id)}>
                                            <Check className={cn("mr-2 h-4 w-4", formData.assignedTo.includes(user.id) ? "opacity-100" : "opacity-0")} />
                                            {user.name}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="form-group">
                    <label>任务要求/工作内容</label>
                    <textarea 
                        name="requirements" 
                        value={formData.requirements || ''} 
                        onChange={handleChange} 
                        className="form-input min-h-[100px] resize-y" 
                        placeholder="详细描述任务的工作内容和要求..."
                    />
                </div>
                <div className="form-group">
                    <label>利益方</label>
                    <input 
                        type="text" 
                        name="stakeholder" 
                        value={formData.stakeholder || ''} 
                        onChange={handleChange} 
                        className="form-input" 
                        placeholder="输入利益方名称"
                    />
                </div>
                <div className="form-group">
                    <label>任务类型</label>
                    <select name="taskType" value={formData.taskType || 'project'} onChange={handleChange} className="form-select">
                        <option value="project">项目任务</option>
                        <option value="rnd">研发任务</option>
                        <option value="leave">请假</option>
                        <option value="meeting">开会</option>
                        <option value="support">技术性支持</option>
                    </select>
                </div>
                <div className="form-group">
                    <label>优先级</label>
                    <select name="priority" value={formData.priority || 'medium'} onChange={handleChange} className="form-select">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="form-group"><label>开始日期</label><input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className="form-input" /></div>
                    <div className="form-group"><label>结束日期</label><input type="date" name="endDate" value={formData.endDate} onChange={handleChange} min={formData.startDate} className="form-input" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
                    <Button type="submit">保存</Button>
                </div>
            </form>
        </ModalBase>
    );
};

const TaskDetailModal = ({ isOpen, onClose, task, projects, users, onEdit, onComplete, onTag, onAsset, taskAssets = [] }) => {
    if (!isOpen || !task) return null;

    const project = projects.find(p => p.id === task.projectId);
    const assignedUsers = (task.assignedTo || []).map(uid => users.find(u => u.id === uid)).filter(Boolean);
    const stakeholder = task.stakeholder || '';
    const priority = (task.priority || 'medium').toString().toLowerCase();
    const requirements = task.requirements || '';
    const status = (task.status || 'pending').toString().toLowerCase();
    const isCompleted = status === 'completed';
    const completedDate = task.completedDate || '';
    const completedBy = task.completedBy || '';
    const completionNotes = task.completionNotes || '';
    
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
        <ModalBase title="任务详情" onClose={onClose}>
            <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">{task.name || '-'}</h3>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full border ${getPriorityClass(priority)}`}>
                            {getPriorityText(priority)}优先级
                        </span>
                        {task.tagType && (
                            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                                task.tagType === 'rework' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                                task.tagType === 'delay' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                                task.tagType === 'defect' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                                'bg-blue-500/20 text-blue-400 border-blue-500/50'
                            }`}>
                                {task.tagType === 'rework' ? '返工' :
                                 task.tagType === 'delay' ? '延期' :
                                 task.tagType === 'defect' ? '缺陷回流' : '临时变更'}
                            </span>
                        )}
                        {onTag && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onTag}
                                className="h-7 text-xs"
                            >
                                <Tag className="h-3 w-3 mr-1" />
                                {task.tagType ? '编辑标签' : '添加标签'}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <FileText className="h-4 w-4" />
                            <span>所属项目</span>
                        </div>
                        <p className="text-white">{project?.projectName || '未关联'}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <FileText className="h-4 w-4" />
                            <span>任务类型</span>
                        </div>
                        <p className="text-white">
                            {task.taskType === 'project' ? '项目任务' :
                             task.taskType === 'rnd' ? '研发任务' :
                             task.taskType === 'leave' ? '请假' :
                             task.taskType === 'meeting' ? '开会' :
                             task.taskType === 'support' ? '技术性支持' : task.taskType || '项目任务'}
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <User className="h-4 w-4" />
                            <span>利益方</span>
                        </div>
                        <p className="text-white">{stakeholder || '-'}</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <User className="h-4 w-4" />
                        <span>负责人</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {assignedUsers.length > 0 ? (
                            assignedUsers.map(user => (
                                <span key={user.id} className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm">
                                    {user.name}
                                </span>
                            ))
                        ) : (
                            <span className="text-gray-500">未分配</span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>开始日期</span>
                        </div>
                        <p className="text-white">{task.startDate || '-'}</p>
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>结束日期</span>
                        </div>
                        <p className="text-white">{task.endDate || '-'}</p>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                        <FileText className="h-4 w-4" />
                        <span>任务要求/工作内容</span>
                    </div>
                    <div className="p-4 bg-gray-700/50 rounded-lg min-h-[120px]">
                        {requirements ? (
                            <p className="text-white whitespace-pre-wrap">{requirements}</p>
                        ) : (
                            <p className="text-gray-500 italic">暂无任务要求</p>
                        )}
                    </div>
                </div>

                {/* 关联资产区域 */}
                {task.projectId && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Archive className="h-4 w-4" />
                                <span>关联资产</span>
                            </div>
                            {onAsset && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onAsset}
                                >
                                    <Link2 className="h-4 w-4 mr-1" />
                                    关联资产
                                </Button>
                            )}
                        </div>
                        {taskAssets.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {taskAssets.map(asset => (
                                    <span
                                        key={asset.id}
                                        className={`px-3 py-1 rounded-full text-sm border ${
                                            asset.relationType === 'used' ? 'bg-blue-500/20 text-blue-300 border-blue-500/50' :
                                            asset.relationType === 'modified' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/50' :
                                            'bg-green-500/20 text-green-300 border-green-500/50'
                                        }`}
                                    >
                                        {asset.assetName}
                                        {asset.relationType === 'used' ? ' (使用)' :
                                         asset.relationType === 'modified' ? ' (修改)' : ' (新增)'}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-sm">暂无关联资产</p>
                        )}
                    </div>
                )}

                {isCompleted && (
                    <div className="space-y-1 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                        <div className="flex items-center gap-2 text-sm text-green-400 mb-3">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-semibold">任务已完成</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-400">完成日期:</span>
                                <p className="text-white mt-1">{completedDate || '-'}</p>
                            </div>
                            {completedBy && (
                                <div>
                                    <span className="text-gray-400">完成人:</span>
                                    <p className="text-white mt-1">{completedBy}</p>
                                </div>
                            )}
                        </div>
                        {completionNotes && (
                            <div className="mt-3">
                                <span className="text-gray-400 text-sm">完成说明:</span>
                                <p className="text-white mt-1 whitespace-pre-wrap">{completionNotes}</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
                    <Button type="button" variant="ghost" onClick={onClose}>关闭</Button>
                    {onTag && (
                        <Button onClick={onTag} variant="outline">
                            <Tag className="mr-2 h-4 w-4" /> {task.tagType ? '编辑标签' : '添加标签'}
                        </Button>
                    )}
                    {!isCompleted && onComplete && (
                        <Button onClick={onComplete} className="bg-green-600 hover:bg-green-700">
                            <CheckCircle2 className="mr-2 h-4 w-4" /> 完成任务
                        </Button>
                    )}
                    <Button onClick={onEdit}>
                        <Edit className="mr-2 h-4 w-4" /> 编辑任务
                    </Button>
                </div>
            </div>
        </ModalBase>
    );
};

const ModalBase = ({ title, children, onClose }) => (
    <AnimatePresence>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-xl font-bold text-white">{title}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="p-6">{children}</div>
            </motion.div>
        </motion.div>
    </AnimatePresence>
);

export default Tasks;