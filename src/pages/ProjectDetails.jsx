import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Save, X, Trash2, Calendar, User, Package, Paperclip, FileText, Tag, AlertTriangle, Archive, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { projectsApi, risksApi, assetsApi } from '@/lib/api';
import TagModal from '@/components/TagModal';
import AssetRelationModal from '@/components/AssetRelationModal';

const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ stageId: '', date: '', description: '', attachment: null });
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [riskValue, setRiskValue] = useState(0);
  const [projectAssets, setProjectAssets] = useState([]);
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  const mainStages = [
    { id: 'requirements', name: '客户需求', color: 'bg-blue-500', group: '需求与立项' },
    { id: 'project_initiation', name: '项目立项', color: 'bg-sky-500', group: '需求与立项' },
    { id: 'structural_design', name: '结构设计', color: 'bg-purple-500', group: '研发设计' },
    { id: 'electronic_design', name: '电子设计', color: 'bg-pink-500', group: '研发设计' },
    { id: 'system_design', name: '系统设计', color: 'bg-red-500', group: '研发设计' },
    { id: 'software_design', name: '软件设计', color: 'bg-orange-500', group: '研发设计' },
    { id: 'production', name: '生产制造', color: 'bg-yellow-500', group: '生产与交付' },
    { id: 'debugging', name: '调试老化', color: 'bg-green-500', group: '生产与交付' },
    { id: 'shipping', name: '出货售后', color: 'bg-teal-500', group: '生产与交付' },
    { id: 'maintenance', name: '维护运行', color: 'bg-cyan-500', group: '维护' },
  ];

  const fixedHorizontalStages = [
    { id: 'requirements_call', name: '需求调用', stageIds: ['requirements'] },
    { id: 'project_initiation', name: '项目立项', stageIds: ['project_initiation'] },
    { id: 'rd_design', name: '研发设计', stageIds: ['structural_design', 'electronic_design', 'system_design', 'software_design'] },
    { id: 'production_manufacturing', name: '生产制造', stageIds: ['production', 'debugging'] },
    { id: 'on_site_installation', name: '现场安装', stageIds: ['shipping'] },
    { id: 'maintenance_operation', name: '维护运行', stageIds: ['maintenance'] },
  ];

  useEffect(() => {
    loadProject();
    loadRiskValue();
    loadProjectAssets();
  }, [id, navigate]);

  const loadRiskValue = async () => {
    try {
      const riskData = await risksApi.getRiskValue(id);
      setRiskValue(riskData.riskValue || 0);
    } catch (error) {
      console.error('加载风险值失败:', error);
    }
  };

  const loadProjectAssets = async () => {
    try {
      const assets = await assetsApi.getByProject(id);
      setProjectAssets(assets);
    } catch (error) {
      console.error('加载项目资产失败:', error);
    }
  };

  const loadProject = async () => {
    try {
      const currentProject = await projectsApi.getById(id);
      console.log('[ProjectDetails] 加载的项目数据:', currentProject);
      console.log('[ProjectDetails] timeline 数据:', currentProject?.timeline);
      console.log('[ProjectDetails] timeline 类型:', typeof currentProject?.timeline, '是否为数组:', Array.isArray(currentProject?.timeline));
      if (currentProject?.timeline) {
        console.log('[ProjectDetails] timeline 长度:', currentProject.timeline.length);
        currentProject.timeline.forEach((stageTimeline, index) => {
          console.log(`[ProjectDetails] timeline[${index}]:`, stageTimeline);
          console.log(`[ProjectDetails] timeline[${index}].events:`, stageTimeline?.events);
        });
      }
      setProject(currentProject);
    } catch (error) {
      console.error('加载项目失败:', error);
      toast({ title: "加载项目失败", variant: "destructive" });
      navigate('/');
    }
  };

  const loadAllProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('加载项目列表失败:', error);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.stageId || !newEvent.date || !newEvent.description) {
      toast({ title: "请填写所有事件信息", variant: "destructive" });
      return;
    }

    try {
      const currentTimeline = project.timeline || [];
      const newTimeline = [...currentTimeline];
      let stageTimeline = newTimeline.find(st => st.stageId === newEvent.stageId);
      
      if (!stageTimeline) {
        stageTimeline = { stageId: newEvent.stageId, date: newEvent.date, events: [] };
        newTimeline.push(stageTimeline);
      }

      stageTimeline.events.push({
        id: `evt-${Date.now()}`,
        date: newEvent.date,
        description: newEvent.description,
        attachment: newEvent.attachment ? { name: newEvent.attachment.name, type: newEvent.attachment.type } : null,
      });
      
      stageTimeline.events.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const newCurrentStageId = newEvent.stageId;
      
      console.log('[ProjectDetails] 准备保存 timeline:', newTimeline);
      console.log('[ProjectDetails] 保存的数据:', {
        ...project,
        timeline: newTimeline,
        currentStageId: newCurrentStageId
      });
      
      const updateResult = await projectsApi.update(id, {
        ...project,
        timeline: newTimeline,
        currentStageId: newCurrentStageId
      });
      
      console.log('[ProjectDetails] 保存结果:', updateResult);

      console.log('[ProjectDetails] 保存完成，等待 500ms 后重新加载项目...');
      // 等待一小段时间，确保数据库保存完成
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProject();
      console.log('[ProjectDetails] 重新加载完成');
      setIsAddingEvent(false);
      setNewEvent({ stageId: '', date: '', description: '', attachment: null });
      toast({ title: "事件添加成功！" });
    } catch (error) {
      console.error('添加事件失败:', error);
      toast({ title: "添加事件失败", variant: "destructive" });
    }
  };

  const handleDeleteEvent = async (stageId, eventId) => {
    try {
      const newTimeline = project.timeline.map(st => {
        if (st.stageId === stageId) {
          return { ...st, events: st.events.filter(e => e.id !== eventId) };
        }
        return st;
      });

      await projectsApi.update(id, {
        ...project,
        timeline: newTimeline
      });

      await loadProject();
      toast({ title: "事件已删除" });
    } catch (error) {
      console.error('删除事件失败:', error);
      toast({ title: "删除事件失败", variant: "destructive" });
    }
  };

  const handleTagSubmit = async (tagType, lessonId) => {
    if (!selectedEvent) return;

    try {
      const newTimeline = project.timeline.map(st => {
        if (st.stageId === selectedEvent.stageId) {
          return {
            ...st,
            events: st.events.map(e => {
              if (e.id === selectedEvent.id) {
                return { ...e, tagType, lessonLearnedId: lessonId };
              }
              return e;
            })
          };
        }
        return st;
      });

      await projectsApi.update(id, {
        ...project,
        timeline: newTimeline
      });

      await loadProject();
      setIsTagModalOpen(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('保存标签失败:', error);
      toast({ title: "保存标签失败", variant: "destructive" });
    }
  };

  const showToast = () => {
    toast({
      title: '🚧 功能尚未实现',
      description: '别担心！您可以在下一次提示中请求它！🚀',
    });
  };

  if (!project) {
    return <div className="flex items-center justify-center h-screen text-white">加载中...</div>;
  }

  // 将所有事件按时间顺序排列
  const sortedTimelineEvents = [];
  console.log('[ProjectDetails] 渲染时 project.timeline:', project?.timeline);
  if (project?.timeline && Array.isArray(project.timeline)) {
    project.timeline.forEach((timelineData, index) => {
      console.log(`[ProjectDetails] 处理 timeline[${index}]:`, timelineData);
      const stage = mainStages.find(s => s.id === timelineData.stageId);
      console.log(`[ProjectDetails] 找到的 stage:`, stage);
      if (stage && timelineData.events && Array.isArray(timelineData.events)) {
        console.log(`[ProjectDetails] timeline[${index}].events 数量:`, timelineData.events.length);
        timelineData.events.forEach((event, eventIndex) => {
          console.log(`[ProjectDetails] 添加事件[${eventIndex}]:`, event);
          sortedTimelineEvents.push({
            ...event,
            stageId: timelineData.stageId,
            stageName: stage.name,
            stageColor: stage.color,
            stageGroup: stage.group
          });
        });
      } else {
        console.warn(`[ProjectDetails] timeline[${index}] 无效:`, { stage, events: timelineData.events });
      }
    });
  } else {
    console.warn('[ProjectDetails] project.timeline 不存在或不是数组:', project?.timeline);
  }
  
  console.log('[ProjectDetails] sortedTimelineEvents 总数:', sortedTimelineEvents.length);
  
  // 按日期排序（从早到晚）
  sortedTimelineEvents.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA - dateB;
  });

  const currentHorizontalStageIndex = fixedHorizontalStages.findIndex(hs => hs.stageIds.includes(project.currentStageId));

  return (
    <div className="flex-1 flex flex-col bg-gray-900 text-gray-300 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Button onClick={() => navigate('/')} variant="ghost" className="mb-6 text-gray-300 hover:bg-gray-800">
          <ArrowLeft className="mr-2 h-4 w-4" /> 返回仪表盘
        </Button>
        <div className="glass-effect p-6 rounded-xl mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
            {project.projectName}
          </h1>
          <p className="text-white/70">{project.orderNumber}</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-white/80">
            <span><User className="inline mr-2 h-4 w-4 text-blue-300" />销售: {project.salesName}</span>
            <span><Package className="inline mr-2 h-4 w-4 text-green-300" />数量: {project.deviceQuantity}</span>
            <span><Calendar className="inline mr-2 h-4 w-4 text-purple-300" />预计完成: {project.estimatedCompletion}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${
                  riskValue >= 70 ? 'bg-red-500' :
                  riskValue >= 40 ? 'bg-yellow-500' :
                  riskValue >= 20 ? 'bg-orange-500' : 'bg-green-500'
                }`}></div>
                <span className={`text-lg font-bold ${
                  riskValue >= 70 ? 'text-red-400' :
                  riskValue >= 40 ? 'text-yellow-400' :
                  riskValue >= 20 ? 'text-orange-400' : 'text-green-400'
                }`}>
                  风险值: {riskValue}
                </span>
              </div>
              <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/project/${id}/risks`)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <AlertTriangle className="mr-2 h-4 w-4" /> 风险管理
              </Button>
                <Button
                  onClick={() => setIsAssetModalOpen(true)}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Archive className="mr-2 h-4 w-4" /> 关联资产
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 项目资产管理区域 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-effect p-6 rounded-xl mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Archive className="w-5 h-5 mr-2 text-indigo-400" />
            项目资产 ({projectAssets.length})
          </h2>
        </div>
        
        {projectAssets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectAssets.map(asset => (
              <div key={asset.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600 hover:border-indigo-500 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-white">{asset.assetName}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    asset.relationType === 'used' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50' :
                    asset.relationType === 'modified' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50' :
                    'bg-green-500/20 text-green-300 border border-green-500/50'
                  }`}>
                    {asset.relationType === 'used' ? '使用' :
                     asset.relationType === 'modified' ? '修改' : '新增'}
                  </span>
                </div>
                <p className="text-sm text-gray-400 mb-2">类型: {asset.assetType}</p>
                {asset.version && (
                  <p className="text-sm text-gray-400 mb-2">版本: {asset.version}</p>
                )}
                {asset.notes && (
                  <p className="text-sm text-gray-500 mt-2">{asset.notes}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Archive className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p>该项目暂无关联资产</p>
            <p className="text-sm text-gray-600 mt-2">点击右上角"关联资产"按钮添加资产</p>
          </div>
        )}
      </motion.div>

      <div className="sticky top-0 bg-gray-900/80 backdrop-blur-lg py-4 z-10 mb-8">
        <div className="w-full px-4">
          <div className="flex items-center relative">
            <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-700" />
            <div className="absolute top-1/2 left-0 h-0.5 bg-indigo-500" style={{ width: `${(currentHorizontalStageIndex / (fixedHorizontalStages.length - 1)) * 100}%` }} />
            {fixedHorizontalStages.map((stage, index) => (
              <div key={stage.id} className="relative flex-1 flex justify-center">
                <div className={`w-4 h-4 rounded-full transition-colors duration-300 ${index <= currentHorizontalStageIndex ? 'bg-indigo-500' : 'bg-gray-600'}`} />
                <span className={`absolute top-6 text-xs text-center w-24 transition-colors duration-300 ${index <= currentHorizontalStageIndex ? 'text-white' : 'text-gray-500'}`}>{stage.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end mb-6">
        <Button onClick={() => { setIsAddingEvent(true); setNewEvent({ stageId: project.currentStageId, date: new Date().toISOString().split('T')[0], description: '', attachment: null }) }}>
          <Plus className="mr-2 h-4 w-4" /> 添加时间节点
        </Button>
      </div>

      {isAddingEvent && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="glass-effect p-4 rounded-xl mb-6">
          <h3 className="font-bold mb-4 text-lg">添加新事件</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <select value={newEvent.stageId} onChange={e => setNewEvent({...newEvent, stageId: e.target.value})} className="form-select">
              <option value="">选择阶段</option>
              {mainStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="form-input" />
            <input type="text" placeholder="事件描述" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} className="form-input md:col-span-2 lg:col-span-1" />
            <div className="md:col-span-2 lg:col-span-3">
              <Button variant="outline" onClick={showToast} className="w-full">
                <Paperclip className="mr-2 h-4 w-4" /> {newEvent.attachment ? newEvent.attachment.name : '上传附件'}
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="ghost" onClick={() => setIsAddingEvent(false)}><X className="mr-2 h-4 w-4" />取消</Button>
            <Button onClick={handleAddEvent}><Save className="mr-2 h-4 w-4" />保存</Button>
          </div>
        </motion.div>
      )}

      <div className="relative pl-4">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />
        {sortedTimelineEvents.length === 0 ? (
          <div className="pl-8 py-8 text-center text-gray-400">
            <p>暂无时间线事件，点击"添加时间节点"开始记录项目进展</p>
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-gray-500">
                <p>调试信息:</p>
                <p>project.timeline: {JSON.stringify(project?.timeline)}</p>
                <p>sortedTimelineEvents.length: {sortedTimelineEvents.length}</p>
              </div>
            )}
          </div>
        ) : (
          sortedTimelineEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-8 mb-6"
            >
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-gray-900 ${event.stageColor}`} />
              <div className="ml-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">{event.description}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${event.stageColor} text-white`}>
                        {event.stageName}
                      </span>
                      <span className="text-xs text-gray-400">{event.date}</span>
                      {event.tagType && (
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${
                          event.tagType === 'rework' ? 'bg-red-500/20 text-red-400 border-red-500/50' :
                          event.tagType === 'delay' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' :
                          event.tagType === 'defect' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                          'bg-blue-500/20 text-blue-400 border-blue-500/50'
                        }`}>
                          {event.tagType === 'rework' ? '返工' :
                           event.tagType === 'delay' ? '延期' :
                           event.tagType === 'defect' ? '缺陷回流' : '临时变更'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                  {event.attachment ? (
                    <button onClick={showToast} className="flex items-center text-xs text-blue-400 hover:underline">
                      <FileText className="mr-1 h-3 w-3" />
                      {event.attachment.name}
                    </button>
                    ) : null}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedEvent(event);
                        setIsTagModalOpen(true);
                      }}
                      className="h-7 text-xs"
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {event.tagType ? '编辑标签' : '添加标签'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsAssetModalOpen(true);
                      }}
                      className="h-7 text-xs"
                    >
                      <Link2 className="h-3 w-3 mr-1" />
                      关联资产
                    </Button>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeleteEvent(event.stageId, event.id)}>
                    <Trash2 className="h-4 w-4 text-red-500/70 hover:text-red-500" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
      </div>

      {/* 标签模态框 */}
      {isTagModalOpen && selectedEvent && (
        <TagModal
          isOpen={isTagModalOpen}
          onClose={() => {
            setIsTagModalOpen(false);
            setSelectedEvent(null);
          }}
          onSubmit={handleTagSubmit}
          entityType="timeline"
          entityId={selectedEvent.id}
          entityName={selectedEvent.description}
          projectId={project.id}
          projectName={project.projectName}
          currentTag={selectedEvent.tagType}
          currentLessonId={selectedEvent.lessonLearnedId}
        />
      )}

      {/* 资产关联模态框 */}
      {isAssetModalOpen && (
        <AssetRelationModal
          isOpen={isAssetModalOpen}
          onClose={() => setIsAssetModalOpen(false)}
          projectId={id}
          defaultRelationType="used"
          onSuccess={() => {
            loadProjectAssets();
          }}
        />
      )}
    </div>
  );
};

export default ProjectDetails;