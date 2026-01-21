import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Package, TrendingUp, Activity, Database, ArrowRight, Filter, List, Clock, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { projectsApi, assetsApi } from '@/lib/api';

const AssetManagement = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectAssets, setProjectAssets] = useState([]);
  const [viewMode, setViewMode] = useState('increments'); // increments（资产增量）或 status（资产状态）

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      loadProjectAssets(selectedProject.id);
    }
  }, [selectedProject]);

  const loadProjects = async () => {
    try {
      const data = await projectsApi.getAll();
      setProjects(data);
    } catch (error) {
      console.error('加载项目失败:', error);
      toast({ title: "加载项目失败", variant: "destructive" });
    }
  };

  const loadProjectAssets = async (projectId) => {
    try {
      const assets = await assetsApi.getByProject(projectId);
      setProjectAssets(assets);
    } catch (error) {
      console.error('加载项目资产失败:', error);
      toast({ title: "加载项目资产失败", variant: "destructive" });
    }
  };

  const getRelationTypeLabel = (type) => {
    const labels = {
      'used': '使用',
      'modified': '修改',
      'created': '新增'
    };
    return labels[type] || type;
  };

  const getRelationTypeColor = (type) => {
    const colors = {
      'used': 'bg-blue-500/20 text-blue-300',
      'modified': 'bg-yellow-500/20 text-yellow-300',
      'created': 'bg-green-500/20 text-green-300'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-300';
  };

  // 按关系类型分组资产
  const groupedAssets = {
    used: projectAssets.filter(a => a.relationType === 'used'),
    modified: projectAssets.filter(a => a.relationType === 'modified'),
    created: projectAssets.filter(a => a.relationType === 'created')
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">资产管理</h1>
          <p className="text-gray-400">项目 → 资产增量 → 资产状态</p>
        </div>

        {/* 子页面导航 */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            onClick={() => navigate('/assets/register')}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 h-auto p-4 flex flex-col items-start"
          >
            <List className="w-6 h-6 mb-2 text-indigo-400" />
            <span className="font-semibold text-white">资产台账</span>
            <span className="text-xs text-gray-400 mt-1">资产名称、类型、成熟度、责任人、复用次数、关联项目</span>
          </Button>
          <Button
            onClick={() => navigate('/assets/evolution')}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 h-auto p-4 flex flex-col items-start"
          >
            <Clock className="w-6 h-6 mb-2 text-indigo-400" />
            <span className="font-semibold text-white">资产演进视图</span>
            <span className="text-xs text-gray-400 mt-1">版本演进、改动原因、质量变化、技术债记录</span>
          </Button>
          <Button
            onClick={() => navigate('/assets/health')}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 h-auto p-4 flex flex-col items-start"
          >
            <BarChart3 className="w-6 h-6 mb-2 text-indigo-400" />
            <span className="font-semibold text-white">资产健康度仪表盘</span>
            <span className="text-xs text-gray-400 mt-1">复用率、缺陷密度、变更频率、回归成本、维护负担</span>
          </Button>
        </div>

        {/* 项目选择 */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">选择项目</label>
          <select
            value={selectedProject?.id || ''}
            onChange={(e) => {
              const project = projects.find(p => p.id === e.target.value);
              setSelectedProject(project || null);
            }}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">请选择项目</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.projectName} ({project.orderNumber})
              </option>
            ))}
          </select>
        </div>

        {/* 视图切换 */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={viewMode === 'increments' ? 'default' : 'outline'}
            onClick={() => setViewMode('increments')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            资产增量视图
          </Button>
          <Button
            variant={viewMode === 'status' ? 'default' : 'outline'}
            onClick={() => setViewMode('status')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Activity className="w-4 h-4 mr-2" />
            资产状态视图
          </Button>
        </div>

        {selectedProject ? (
          viewMode === 'increments' ? (
            /* 资产增量视图 */
            <div className="space-y-6">
              {/* 使用的资产 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Package className="w-5 h-5 mr-2 text-blue-400" />
                    使用的资产 ({groupedAssets.used.length})
                  </h2>
                </div>
                {groupedAssets.used.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedAssets.used.map(asset => (
                      <div key={asset.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{asset.assetName}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${getRelationTypeColor(asset.relationType)}`}>
                            {getRelationTypeLabel(asset.relationType)}
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
                  <p className="text-gray-500 text-center py-8">暂无使用的资产</p>
                )}
              </motion.div>

              {/* 修改的资产 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-yellow-400" />
                    修改升级的资产 ({groupedAssets.modified.length})
                  </h2>
                </div>
                {groupedAssets.modified.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedAssets.modified.map(asset => (
                      <div key={asset.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{asset.assetName}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${getRelationTypeColor(asset.relationType)}`}>
                            {getRelationTypeLabel(asset.relationType)}
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
                  <p className="text-gray-500 text-center py-8">暂无修改的资产</p>
                )}
              </motion.div>

              {/* 新增的资产 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-white flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-green-400" />
                    新增的资产 ({groupedAssets.created.length})
                  </h2>
                </div>
                {groupedAssets.created.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedAssets.created.map(asset => (
                      <div key={asset.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-white">{asset.assetName}</h3>
                          <span className={`px-2 py-1 rounded text-xs ${getRelationTypeColor(asset.relationType)}`}>
                            {getRelationTypeLabel(asset.relationType)}
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
                  <p className="text-gray-500 text-center py-8">暂无新增的资产</p>
                )}
              </motion.div>
            </div>
          ) : (
            /* 资产状态视图 */
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2 text-indigo-400" />
                资产状态概览
              </h2>
              {projectAssets.length > 0 ? (
                <div className="space-y-4">
                  {projectAssets.map(asset => (
                    <div key={asset.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{asset.assetName}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${getRelationTypeColor(asset.relationType)}`}>
                          {getRelationTypeLabel(asset.relationType)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500">类型</p>
                          <p className="text-sm text-white">{asset.assetType}</p>
                        </div>
                        {asset.version && (
                          <div>
                            <p className="text-xs text-gray-500">版本</p>
                            <p className="text-sm text-white">{asset.version}</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-gray-500">关联时间</p>
                          <p className="text-sm text-white">{asset.createdAt}</p>
                        </div>
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/assets/${asset.assetId}`)}
                            className="text-indigo-400 hover:text-indigo-300"
                          >
                            查看详情 <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">该项目暂无资产</p>
              )}
            </div>
          )
        ) : (
          <div className="bg-gray-800/50 rounded-lg p-12 text-center">
            <Database className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">请选择一个项目查看资产信息</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetManagement;
