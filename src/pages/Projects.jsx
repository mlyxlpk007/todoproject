import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Upload, Bell, Trash2, Edit, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { projectsApi, risksApi } from '@/lib/api';

const Projects = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [projectRiskValues, setProjectRiskValues] = useState({});
    const [isProjectModalOpen, setProjectModalOpen] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        loadProjects();
    }, []);

    const loadProjects = async () => {
        try {
            const data = await projectsApi.getAll();
            setProjects(data);
            
            // 加载每个项目的风险值
            const riskValues = {};
            for (const project of data) {
                try {
                    const riskData = await risksApi.getRiskValue(project.id);
                    riskValues[project.id] = riskData.riskValue || 0;
                } catch (error) {
                    console.error(`获取项目 ${project.id} 风险值失败:`, error);
                    riskValues[project.id] = 0;
                }
            }
            setProjectRiskValues(riskValues);
        } catch (error) {
            console.error('加载项目失败:', error);
            toast({ title: "加载项目失败", variant: "destructive" });
        }
    };

    const handleProjectSave = async (formData) => {
        try {
            if (editingProject) {
                await projectsApi.update(editingProject.id, formData);
                toast({ title: "项目更新成功" });
            } else {
                const newProject = { ...formData, currentStageId: 'requirements', timeline: [] };
                await projectsApi.create(newProject);
                toast({ title: "项目创建成功" });
            }
            await loadProjects();
            setProjectModalOpen(false);
            setEditingProject(null);
        } catch (error) {
            console.error('保存项目失败:', error);
            const errorMessage = error.message || error.toString() || "保存项目失败";
            toast({ 
                title: "保存项目失败", 
                description: errorMessage,
                variant: "destructive",
                duration: 10000 // 错误提示显示10秒，让用户有时间阅读
            });
        }
    };

    const handleProjectDelete = async (id) => {
        try {
            await projectsApi.delete(id);
            toast({ title: "项目已删除" });
            await loadProjects();
        } catch (error) {
            console.error('删除项目失败:', error);
            const errorMessage = error.message || error.toString() || "删除项目失败";
            toast({ 
                title: "删除项目失败", 
                description: errorMessage,
                variant: "destructive",
                duration: 10000
            });
        }
    };

    const handleFileUpload = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet);

                const newProjects = json.map(row => ({
                    id: `import-${Date.now()}-${Math.random()}`,
                    orderNumber: row['订单编号'] || '',
                    projectName: row['项目名称'] || '',
                    salesName: row['销售名称'] || '',
                    deviceQuantity: row['设备数量'] || 0,
                    currentStageId: 'requirements',
                    timeline: [],
                }));

                // 批量创建项目
                for (const project of newProjects) {
                    try {
                        await projectsApi.create(project);
                    } catch (error) {
                        console.error('导入项目失败:', error);
                    }
                }
                await loadProjects();
                toast({ title: "项目导入成功", description: `成功导入 ${newProjects.length} 个项目。` });
            } catch (error) {
                toast({ title: "文件解析失败", description: "请确保上传的是有效的Excel文件。", variant: "destructive" });
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = null; // Reset file input
    };
    
    const showToast = () => {
        toast({
          title: '🚧 功能尚未实现',
          description: '别担心！您可以在下一次提示中请求它！🚀',
        });
      };

    return (
        <div className="flex-1 flex flex-col bg-gray-900 text-gray-300 overflow-hidden">
            <header className="flex items-center justify-between p-6 border-b border-gray-800 flex-shrink-0">
                <h2 className="text-2xl font-bold text-white">项目管理</h2>
                <div className="flex items-center gap-4">
                   <button onClick={showToast} className="p-2 rounded-full hover:bg-gray-800"><Bell size={20} /></button>
                   <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center font-bold text-white">YH</div>
                </div>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">所有项目</h3>
                        <div className="flex gap-2">
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                            <Button variant="outline" onClick={() => fileInputRef.current.click()}>
                                <Upload className="mr-2 h-4 w-4" /> 批量导入
                            </Button>
                            <Button onClick={() => { setEditingProject(null); setProjectModalOpen(true); }}>
                                <Plus className="mr-2 h-4 w-4" /> 新建项目
                            </Button>
                        </div>
                    </div>
                    <ProjectList projects={projects} projectRiskValues={projectRiskValues} onEdit={(p) => { setEditingProject(p); setProjectModalOpen(true); }} onDelete={handleProjectDelete} onRowClick={(p) => navigate(`/project/${p.id}`)} />
                </div>
            </div>
            {isProjectModalOpen && <ProjectModal isOpen={isProjectModalOpen} onClose={() => setProjectModalOpen(false)} onSubmit={handleProjectSave} editingProject={editingProject} />}
        </div>
    );
};

const ProjectList = ({ projects, projectRiskValues, onEdit, onDelete, onRowClick }) => {
    const getRiskColor = (riskValue) => {
        if (riskValue >= 70) return 'bg-red-500';
        else if (riskValue >= 40) return 'bg-yellow-500';
        else if (riskValue >= 20) return 'bg-orange-500';
        else return 'bg-green-500';
    };

    const getRiskText = (riskValue) => {
        if (riskValue >= 70) return '高风险';
        else if (riskValue >= 40) return '中风险';
        else if (riskValue >= 20) return '中低风险';
        else return '低风险';
    };

    return (
    <div className="glass-effect rounded-xl overflow-hidden">
        <table className="w-full text-sm text-left">
            <thead className="bg-white/5">
                <tr>
                    <th className="px-4 py-3 font-medium">项目名称</th>
                    <th className="px-4 py-3 font-medium">订单编号</th>
                    <th className="px-4 py-3 font-medium">销售</th>
                    <th className="px-4 py-3 font-medium">数量</th>
                        <th className="px-4 py-3 font-medium text-center">风险值</th>
                    <th className="px-4 py-3 font-medium text-center">操作</th>
                </tr>
            </thead>
            <tbody>
                    {projects.map(p => {
                        const riskValue = projectRiskValues[p.id] || 0;
                        return (
                    <tr key={p.id} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" >
                        <td className="px-4 py-3" onClick={() => onRowClick(p)}>{p.projectName}</td>
                        <td className="px-4 py-3 text-gray-400" onClick={() => onRowClick(p)}>{p.orderNumber}</td>
                        <td className="px-4 py-3 text-gray-400" onClick={() => onRowClick(p)}>{p.salesName}</td>
                        <td className="px-4 py-3 text-gray-400" onClick={() => onRowClick(p)}>{p.deviceQuantity}</td>
                                <td className="px-4 py-3 text-center" onClick={() => onRowClick(p)}>
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`w-3 h-3 rounded-full ${getRiskColor(riskValue)}`}></div>
                                        <span className={`font-semibold ${
                                            riskValue >= 70 ? 'text-red-400' :
                                            riskValue >= 40 ? 'text-yellow-400' :
                                            riskValue >= 20 ? 'text-orange-400' : 'text-green-400'
                                        }`}>
                                            {riskValue}
                                        </span>
                                        <span className="text-xs text-gray-500">({getRiskText(riskValue)})</span>
                                    </div>
                                </td>
                        <td className="px-4 py-3 text-center">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(p); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete(p.id); }}>
                                <Trash2 className="h-4 w-4 text-red-500/80" />
                            </Button>
                        </td>
                    </tr>
                        );
                    })}
            </tbody>
        </table>
         {projects.length === 0 && <p className="text-center py-8 text-gray-500">暂无项目</p>}
    </div>
);
};

const ProjectModal = ({ isOpen, onClose, onSubmit, editingProject }) => {
    const [formData, setFormData] = useState({
        projectName: '', orderNumber: '', salesName: '', deviceQuantity: '',
    });

    useEffect(() => {
        if (editingProject) {
            setFormData(editingProject);
        } else {
            setFormData({ projectName: '', orderNumber: '', salesName: '', deviceQuantity: '' });
        }
    }, [editingProject]);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
    const handleSubmit = (e) => { e.preventDefault(); onSubmit(formData); };

    if (!isOpen) return null;

    return (
        <ModalBase title={editingProject ? '编辑项目' : '新建项目'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-group"><label>项目名称</label><input type="text" name="projectName" value={formData.projectName} onChange={handleChange} className="form-input" required /></div>
                <div className="form-group"><label>订单编号</label><input type="text" name="orderNumber" value={formData.orderNumber} onChange={handleChange} className="form-input" /></div>
                <div className="form-group"><label>销售名称</label><input type="text" name="salesName" value={formData.salesName} onChange={handleChange} className="form-input" /></div>
                <div className="form-group"><label>设备数量</label><input type="number" name="deviceQuantity" value={formData.deviceQuantity} onChange={handleChange} className="form-input" /></div>
                <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="ghost" onClick={onClose}>取消</Button>
                    <Button type="submit">保存</Button>
                </div>
            </form>
        </ModalBase>
    );
};

const ModalBase = ({ title, children, onClose }) => {
    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            >
                <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white">{title}</h2>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700 transition-colors"><X size={20} className="text-gray-400" /></button>
                    </div>
                    <div className="p-6">{children}</div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default Projects;