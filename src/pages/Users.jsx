import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Search, Bell, Trash2, Edit, X, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api';

const roles = ['总工程师', '结构工程师', '软件工程师', '系统工程师', '电子工程师', '嵌入式工程师', '方案工程师', '线材包装', '其他'];

const UsersPage = () => {
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // 延迟加载，确保桥接对象已注入
        const timer = setTimeout(() => {
        loadUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    const loadUsers = async () => {
        const logPrefix = '[Users页面 loadUsers]';
        try {
            console.log(`${logPrefix} ========== 开始加载用户数据 ==========`);
            
            // 直接测试桥接对象
            const bridge = window.chrome?.webview?.hostObjects?.nativeBridge;
            console.log(`${logPrefix} 桥接对象:`, bridge);
            console.log(`${logPrefix} 桥接对象类型:`, typeof bridge);
            console.log(`${logPrefix} 桥接对象方法:`, bridge ? Object.keys(bridge) : 'N/A');
            
            if (bridge && typeof bridge.GetUsers === 'function') {
                console.log(`${logPrefix} 直接调用桥接对象 GetUsers()...`);
                try {
                    const directResult = await bridge.GetUsers();
                    console.log(`${logPrefix} 直接调用结果:`, directResult);
                    console.log(`${logPrefix} 直接调用结果类型:`, typeof directResult);
                    console.log(`${logPrefix} 直接调用结果是否为Promise:`, directResult instanceof Promise);
                    
                    // 处理返回结果
                    let parsedData = null;
                    if (typeof directResult === 'string') {
                        try {
                            parsedData = JSON.parse(directResult);
                            console.log(`${logPrefix} JSON解析成功:`, parsedData);
                        } catch (parseError) {
                            console.error(`${logPrefix} JSON解析失败:`, parseError);
                            console.error(`${logPrefix} 原始字符串:`, directResult.substring(0, 200));
                        }
                    } else if (Array.isArray(directResult)) {
                        parsedData = directResult;
                        console.log(`${logPrefix} 直接返回数组`);
                    } else if (directResult && typeof directResult === 'object') {
                        // 可能是已经解析的对象
                        parsedData = directResult;
                        console.log(`${logPrefix} 直接返回对象`);
                    }
                    
                    if (parsedData && Array.isArray(parsedData)) {
                        console.log(`${logPrefix} ✅ 直接调用成功，设置 ${parsedData.length} 个用户`);
                        console.log(`${logPrefix} 第一个用户:`, parsedData[0]);
                        setUsers(parsedData);
                        return;
                    } else {
                        console.warn(`${logPrefix} ⚠️ 解析后的数据不是数组:`, parsedData);
                    }
                } catch (directError) {
                    console.error(`${logPrefix} ❌ 直接调用失败:`, directError);
                    console.error(`${logPrefix} 错误堆栈:`, directError.stack);
                }
            } else {
                console.warn(`${logPrefix} ⚠️ 桥接对象不可用或GetUsers方法不存在`);
            }
            
            console.log(`${logPrefix} 回退到使用 usersApi.getAll()...`);
            const data = await usersApi.getAll();
            
            console.log(`${logPrefix} usersApi.getAll() 返回:`, {
                type: typeof data,
                isArray: Array.isArray(data),
                length: data?.length || 0,
                data: data,
                sample: data?.slice(0, 2) // 显示前2个用户作为样本
            });
            
            // 确保数据是数组
            const validUsers = Array.isArray(data) ? data : [];
            
            console.log(`${logPrefix} 设置用户数据: ${validUsers.length} 个用户`);
            if (validUsers.length > 0) {
                console.log(`${logPrefix} 第一个用户:`, validUsers[0]);
                console.log(`${logPrefix} 第一个用户的所有键:`, Object.keys(validUsers[0]));
                console.log(`${logPrefix} 第一个用户完整数据:`, JSON.stringify(validUsers[0], null, 2));
            } else {
                console.warn(`${logPrefix} ⚠️ 用户数组为空！`);
                console.warn(`${logPrefix} 原始数据:`, data);
                console.warn(`${logPrefix} 原始数据类型:`, typeof data);
                console.warn(`${logPrefix} 原始数据是否为数组:`, Array.isArray(data));
            }
            
            console.log(`${logPrefix} 准备调用setUsers()，用户数量: ${validUsers.length}`);
            if (validUsers.length > 0) {
                console.log(`${logPrefix} 用户数据示例:`, validUsers[0]);
            }
            setUsers(validUsers);
            console.log(`${logPrefix} ✅ setUsers() 已调用，设置 ${validUsers.length} 个用户`);
            
            console.log(`${logPrefix} ========== 用户数据加载完成 ==========`);
        } catch (error) {
            console.error(`${logPrefix} ========== 加载用户失败 ==========`);
            console.error(`${logPrefix} 错误:`, error);
            console.error(`${logPrefix} 错误消息:`, error.message);
            console.error(`${logPrefix} 错误堆栈:`, error.stack);
            toast({ 
                title: "加载用户失败", 
                description: error.message || "请检查控制台获取详细信息",
                variant: "destructive" 
            });
        }
    };

    const handleSaveUser = async (formData) => {
        try {
            if (editingUser) {
                const result = await usersApi.update(editingUser.id, formData);
                if (result && result.error) {
                    throw new Error(result.error);
                }
                toast({ title: "用户更新成功" });
            } else {
                const newUser = { ...formData, avatar: `https://i.pravatar.cc/150?img=${Date.now() % 70}` };
                const result = await usersApi.create(newUser);
                if (result && result.error) {
                    throw new Error(result.error);
                }
                toast({ title: "用户添加成功" });
            }
            await loadUsers();
            setModalOpen(false);
            setEditingUser(null);
        } catch (error) {
            console.error('保存用户失败:', error);
            const errorMessage = error.message || error.toString() || "保存用户失败";
            toast({ 
                title: "保存用户失败", 
                description: errorMessage,
                variant: "destructive",
                duration: 10000 // 错误提示显示10秒，让用户有时间阅读
            });
        }
    };

    const handleDeleteUser = async (id) => {
        try {
            await usersApi.delete(id);
            toast({ title: "用户已删除" });
            await loadUsers();
        } catch (error) {
            console.error('删除用户失败:', error);
            const errorMessage = error.message || error.toString() || "删除用户失败";
            toast({ 
                title: "删除用户失败", 
                description: errorMessage,
                variant: "destructive",
                duration: 10000
            });
        }
    };

    // 安全地过滤用户列表
    const filteredUsers = React.useMemo(() => {
        if (!users || users.length === 0) {
            return [];
        }
        
        if (!searchTerm || searchTerm.trim() === '') {
            return users;
        }
        
        const searchLower = (searchTerm || '').toLowerCase();
        
        return users.filter(user => {
            if (!user) return false;
            
            // 兼容 camelCase 和 PascalCase
            const userName = ((user.name || user.Name || '') + '').toLowerCase();
            const userEmail = ((user.email || user.Email || '') + '').toLowerCase();
            const userRole = ((user.role || user.Role || '') + '').toLowerCase();
            
            return userName.includes(searchLower) || 
                   userEmail.includes(searchLower) || 
                   userRole.includes(searchLower);
        });
    }, [users, searchTerm]);
    
    const showToast = () => {
        toast({
          title: '🚧 功能尚未实现',
          description: '别担心！您可以在下一次提示中请求它！🚀',
        });
      };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">用户与角色管理</h2>
                <div className="flex items-center gap-4">
                   <button onClick={showToast} className="p-2 rounded-full hover:bg-gray-800"><Bell size={20} /></button>
                   <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white">YH</div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* 调试信息面板 */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="glass-effect rounded-xl p-4 mb-4 text-xs font-mono">
                        <div className="text-yellow-400 font-bold mb-2">🔍 调试信息</div>
                        <div>用户数量: {users.length}</div>
                        <div>过滤后用户数量: {filteredUsers.length}</div>
                        <div>搜索关键词: {searchTerm || '(空)'}</div>
                        {users.length > 0 && (
                            <div className="mt-2">
                                <div>第一个用户 ID: {users[0]?.id || users[0]?.Id || 'N/A'}</div>
                                <div>第一个用户名称: {users[0]?.name || users[0]?.Name || 'N/A'}</div>
                                <div>第一个用户邮箱: {users[0]?.email || users[0]?.Email || 'N/A'}</div>
                                <div>第一个用户角色: {users[0]?.role || users[0]?.Role || 'N/A'}</div>
                                <div>第一个用户所有键: {Object.keys(users[0] || {}).join(', ')}</div>
                                <div className="mt-2">第一个用户完整数据:</div>
                                <pre className="text-xs overflow-auto max-h-32 bg-black/50 p-2 rounded">
                                    {JSON.stringify(users[0], null, 2)}
                                </pre>
                            </div>
                        )}
                        {users.length === 0 && (
                            <div className="text-red-400 mt-2">⚠️ 用户数组为空！</div>
                        )}
                    </div>
                )}
                
                <div className="flex justify-between items-center">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                        <input
                            type="text"
                            placeholder="搜索用户..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <Button onClick={() => { setEditingUser(null); setModalOpen(true); }}>
                        <Plus className="mr-2 h-4 w-4" /> 添加用户
                    </Button>
                </div>

                <div className="glass-effect rounded-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white/5">
                            <tr>
                                <th className="px-6 py-3 font-medium">姓名</th>
                                <th className="px-6 py-3 font-medium">邮箱</th>
                                <th className="px-6 py-3 font-medium">角色</th>
                                <th className="px-6 py-3 font-medium text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => {
                                // 兼容 camelCase 和 PascalCase
                                const userId = user.id || user.Id || '';
                                const userName = user.name || user.Name || '';
                                const userEmail = user.email || user.Email || '';
                                const userRole = user.role || user.Role || '';
                                
                                return (
                                <tr key={userId} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 flex items-center">
                                        <img className="w-8 h-8 rounded-full mr-3" alt={userName} src={user.avatar || user.Avatar || "https://images.unsplash.com/photo-1642888621621-ff7d83f3fdcf"} />
                                        <span>{userName}</span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">{userEmail}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-300">
                                            {userRole}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={showToast}>
                                            <Lock className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingUser(user); setModalOpen(true); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteUser(userId)}>
                                            <Trash2 className="h-4 w-4 text-red-500/80" />
                                        </Button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {filteredUsers.length === 0 && <p className="text-center py-8 text-gray-500">找不到用户</p>}
                </div>
            </div>
            {isModalOpen && <UserModal isOpen={isModalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSaveUser} editingUser={editingUser} />}
        </div>
    );
};

const UserModal = ({ isOpen, onClose, onSubmit, editingUser }) => {
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        role: '',
        skillTags: '',
        maxConcurrentTasks: 5,
        availabilityRate: 1.0,
        leavePercentage: 0.0,
        meetingPercentage: 0.1,
        supportWorkPercentage: 0.1
    });

    useEffect(() => {
        if (editingUser) {
            // 解析技能标签
            let skillTagsStr = '';
            try {
                if (editingUser.skillTags) {
                    const tags = typeof editingUser.skillTags === 'string' 
                        ? JSON.parse(editingUser.skillTags) 
                        : editingUser.skillTags;
                    skillTagsStr = Array.isArray(tags) ? tags.join(', ') : editingUser.skillTags;
                }
            } catch (e) {
                skillTagsStr = editingUser.skillTags || '';
            }
            
            setFormData({ 
                name: editingUser.name || editingUser.Name || '', 
                email: editingUser.email || editingUser.Email || '', 
                role: editingUser.role || editingUser.Role || roles[0],
                skillTags: skillTagsStr,
                maxConcurrentTasks: editingUser.maxConcurrentTasks || 5,
                availabilityRate: editingUser.availabilityRate !== undefined ? editingUser.availabilityRate : 1.0,
                leavePercentage: editingUser.leavePercentage !== undefined ? editingUser.leavePercentage : 0.0,
                meetingPercentage: editingUser.meetingPercentage !== undefined ? editingUser.meetingPercentage : 0.1,
                supportWorkPercentage: editingUser.supportWorkPercentage !== undefined ? editingUser.supportWorkPercentage : 0.1
            });
        } else {
            setFormData({ 
                name: '', 
                email: '', 
                role: roles[0],
                skillTags: '',
                maxConcurrentTasks: 5,
                availabilityRate: 1.0,
                leavePercentage: 0.0,
                meetingPercentage: 0.1,
                supportWorkPercentage: 0.1
            });
        }
    }, [editingUser]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({ 
            ...formData, 
            [name]: name.includes('Percentage') || name === 'availabilityRate' 
                ? parseFloat(value) || 0 
                : name === 'maxConcurrentTasks'
                ? parseInt(value) || 5
                : value 
        });
    };
    
    const handleSubmit = (e) => { 
        e.preventDefault(); 
        // 处理技能标签：将逗号分隔的字符串转换为JSON数组
        const submitData = { ...formData };
        if (submitData.skillTags) {
            const tags = submitData.skillTags.split(',').map(t => t.trim()).filter(t => t);
            submitData.skillTags = JSON.stringify(tags);
        } else {
            submitData.skillTags = JSON.stringify([]);
        }
        // 计算可用率：100% - 其他三项占比
        const otherTotal = submitData.leavePercentage + submitData.meetingPercentage + submitData.supportWorkPercentage;
        submitData.availabilityRate = Math.max(0, 1.0 - otherTotal);
        onSubmit(submitData); 
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">{editingUser ? '编辑用户' : '添加新用户'}</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-400" /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div className="form-group">
                            <label>姓名</label>
                            <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label>邮箱</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="form-input" required />
                        </div>
                        <div className="form-group">
                            <label>角色</label>
                            <select name="role" value={formData.role} onChange={handleChange} className="form-select">
                                {roles.map(role => <option key={role} value={role}>{role}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>技能标签（领域）</label>
                            <input 
                                type="text" 
                                name="skillTags" 
                                value={formData.skillTags} 
                                onChange={handleChange} 
                                className="form-input" 
                                placeholder="用逗号分隔，例如：硬件设计, 嵌入式开发, PCB设计"
                            />
                            <p className="text-xs text-gray-500 mt-1">输入多个技能标签，用逗号分隔</p>
                        </div>
                        <div className="form-group">
                            <label>并行任务上限</label>
                            <input 
                                type="number" 
                                name="maxConcurrentTasks" 
                                value={formData.maxConcurrentTasks} 
                                onChange={handleChange} 
                                className="form-input" 
                                min="1" 
                                max="20"
                            />
                        </div>
                        <div className="space-y-2">
                            <p className="text-sm font-medium text-gray-300">时间占比 (%) - 可用率自动计算</p>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="form-group">
                                    <label className="text-xs">请假占比</label>
                                    <input 
                                        type="number" 
                                        name="leavePercentage" 
                                        value={(formData.leavePercentage * 100).toFixed(1)} 
                                        onChange={(e) => {
                                            const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) / 100;
                                            setFormData({ ...formData, leavePercentage: val });
                                        }}
                                        className="form-input" 
                                        min="0" 
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-xs">会议占比</label>
                                    <input 
                                        type="number" 
                                        name="meetingPercentage" 
                                        value={(formData.meetingPercentage * 100).toFixed(1)} 
                                        onChange={(e) => {
                                            const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) / 100;
                                            setFormData({ ...formData, meetingPercentage: val });
                                        }}
                                        className="form-input" 
                                        min="0" 
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="text-xs">支撑性工作占比</label>
                                    <input 
                                        type="number" 
                                        name="supportWorkPercentage" 
                                        value={(formData.supportWorkPercentage * 100).toFixed(1)} 
                                        onChange={(e) => {
                                            const val = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) / 100;
                                            setFormData({ ...formData, supportWorkPercentage: val });
                                        }}
                                        className="form-input" 
                                        min="0" 
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                            </div>
                            {/* 显示可用率（自动计算） */}
                            {(() => {
                                const otherTotal = (formData.leavePercentage + formData.meetingPercentage + formData.supportWorkPercentage) * 100;
                                const availabilityRate = Math.max(0, 100 - otherTotal);
                                return (
                                    <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                                        <span className="text-sm text-gray-400">可用率（自动计算）</span>
                                        <span className={`text-sm font-semibold ${availabilityRate >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {availabilityRate.toFixed(1)}%
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                         <div className="form-group">
                            <label>密码</label>
                            <input type="password" name="password" placeholder={editingUser ? "留空以保持不变" : "设置初始密码"} className="form-input" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
                            <Button type="submit">保存</Button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UsersPage;