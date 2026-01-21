# 资产关联功能集成指南

本指南说明如何在项目详情页面和任务页面添加资产关联功能，让用户可以在这些位置直接关联资产。

## 目录

1. [功能概述](#功能概述)
2. [在项目详情页面添加资产关联](#在项目详情页面添加资产关联)
3. [在任务页面添加资产关联](#在任务页面添加资产关联)
4. [创建资产关联组件](#创建资产关联组件)
5. [API 集成](#api-集成)
6. [使用示例](#使用示例)

## 功能概述

资产关联功能允许用户：
- 在项目详情页面关联资产（使用/修改/新增）
- 在任务详情页面关联资产
- 在时间线事件中关联资产
- 查看项目使用的所有资产
- 查看任务使用的所有资产

## 在项目详情页面添加资产关联

### 1. 修改 ProjectDetails.jsx

在项目详情页面添加资产管理区域：

```jsx
// 在 ProjectDetails.jsx 中添加
import { assetsApi } from '@/lib/api';
import { Archive, Link2 } from 'lucide-react';

// 添加状态
const [projectAssets, setProjectAssets] = useState([]);
const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

// 加载项目资产
const loadProjectAssets = async () => {
  try {
    const assets = await assetsApi.getByProject(id);
    setProjectAssets(assets);
  } catch (error) {
    console.error('加载项目资产失败:', error);
  }
};

// 在 useEffect 中调用
useEffect(() => {
  loadProject();
  loadRiskValue();
  loadProjectAssets(); // 添加这行
}, [id, navigate]);
```

### 2. 在项目详情页面添加资产区域

在项目信息卡片下方添加资产管理区域：

```jsx
{/* 在项目信息卡片后添加 */}
<div className="glass-effect p-6 rounded-xl mb-8">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-xl font-semibold text-white flex items-center">
      <Archive className="w-5 h-5 mr-2 text-indigo-400" />
      项目资产
    </h2>
    <Button
      onClick={() => setIsAssetModalOpen(true)}
      className="bg-indigo-600 hover:bg-indigo-700"
    >
      <Plus className="w-4 h-4 mr-2" />
      关联资产
    </Button>
  </div>
  
  {/* 资产列表 */}
  {projectAssets.length > 0 ? (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {projectAssets.map(asset => (
        <div key={asset.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-white">{asset.assetName}</h3>
            <span className={`px-2 py-1 rounded text-xs ${
              asset.relationType === 'used' ? 'bg-blue-500/20 text-blue-300' :
              asset.relationType === 'modified' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-green-500/20 text-green-300'
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
    <p className="text-gray-500 text-center py-8">该项目暂无关联资产</p>
  )}
</div>
```

### 3. 在时间线事件中添加资产关联按钮

在时间线事件的操作区域添加资产关联按钮：

```jsx
{/* 在事件操作按钮区域添加 */}
<Button
  variant="ghost"
  size="sm"
  onClick={() => {
    // 打开资产关联模态框，关联到当前事件
    setSelectedEvent(event);
    setIsAssetModalOpen(true);
  }}
  className="h-7 text-xs"
>
  <Link2 className="h-3 w-3 mr-1" />
  关联资产
</Button>
```

## 在任务页面添加资产关联

### 1. 修改 Tasks.jsx

在任务详情模态框中添加资产管理：

```jsx
// 在 Tasks.jsx 中添加
import { assetsApi } from '@/lib/api';
import { Archive, Link2 } from 'lucide-react';

// 在 TaskDetailModal 组件中添加
const [taskAssets, setTaskAssets] = useState([]);
const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

// 加载任务资产（通过项目关联）
useEffect(() => {
  if (task?.projectId) {
    loadTaskAssets();
  }
}, [task?.projectId]);

const loadTaskAssets = async () => {
  try {
    const assets = await assetsApi.getByProject(task.projectId);
    // 可以进一步过滤，只显示与当前任务相关的资产
    setTaskAssets(assets);
  } catch (error) {
    console.error('加载任务资产失败:', error);
  }
};
```

### 2. 在任务详情模态框中添加资产区域

```jsx
{/* 在任务详情模态框中，完成任务信息后添加 */}
<div className="space-y-1">
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2 text-sm text-gray-400">
      <Archive className="h-4 w-4" />
      <span>关联资产</span>
    </div>
    <Button
      variant="outline"
      size="sm"
      onClick={() => setIsAssetModalOpen(true)}
    >
      <Link2 className="h-4 w-4 mr-1" />
      关联资产
    </Button>
  </div>
  {taskAssets.length > 0 ? (
    <div className="flex flex-wrap gap-2">
      {taskAssets.map(asset => (
        <span
          key={asset.id}
          className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-sm"
        >
          {asset.assetName}
        </span>
      ))}
    </div>
  ) : (
    <p className="text-gray-500 text-sm">暂无关联资产</p>
  )}
</div>
```

## 创建资产关联组件

创建一个通用的资产关联模态框组件：

### AssetRelationModal.jsx

```jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { assetsApi } from '@/lib/api';

const AssetRelationModal = ({ 
  isOpen, 
  onClose, 
  projectId, 
  defaultRelationType = 'used', // used, modified, created
  onSuccess 
}) => {
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [filteredAssets, setFilteredAssets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [relationType, setRelationType] = useState(defaultRelationType);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAssets();
      setRelationType(defaultRelationType);
    }
  }, [isOpen, defaultRelationType]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = assets.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAssets(filtered);
    } else {
      setFilteredAssets(assets);
    }
  }, [searchTerm, assets]);

  const loadAssets = async () => {
    try {
      const data = await assetsApi.getAll();
      setAssets(data);
      setFilteredAssets(data);
    } catch (error) {
      console.error('加载资产失败:', error);
      toast({ title: "加载资产失败", variant: "destructive" });
    }
  };

  const handleSubmit = async () => {
    if (!selectedAsset) {
      toast({ title: "请选择资产", variant: "destructive" });
      return;
    }

    if (!projectId) {
      toast({ title: "项目ID缺失", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      await assetsApi.createProjectRelation({
        assetId: selectedAsset.id,
        projectId: projectId,
        relationType: relationType,
        version: version || null,
        notes: notes || null
      });

      toast({ title: "资产关联成功" });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
      // 重置表单
      setSelectedAsset(null);
      setVersion('');
      setNotes('');
    } catch (error) {
      console.error('关联资产失败:', error);
      toast({ 
        title: "关联资产失败", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
            <h2 className="text-xl font-bold text-white">关联资产</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* 关系类型选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                关联类型
              </label>
              <div className="flex gap-2">
                <Button
                  variant={relationType === 'used' ? 'default' : 'outline'}
                  onClick={() => setRelationType('used')}
                  className="flex-1"
                >
                  使用
                </Button>
                <Button
                  variant={relationType === 'modified' ? 'default' : 'outline'}
                  onClick={() => setRelationType('modified')}
                  className="flex-1"
                >
                  修改
                </Button>
                <Button
                  variant={relationType === 'created' ? 'default' : 'outline'}
                  onClick={() => setRelationType('created')}
                  className="flex-1"
                >
                  新增
                </Button>
              </div>
            </div>

            {/* 搜索资产 */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                搜索资产
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="输入资产名称或类型..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* 资产列表 */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredAssets.map(asset => (
                <div
                  key={asset.id}
                  onClick={() => setSelectedAsset(asset)}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedAsset?.id === asset.id
                      ? 'border-indigo-500 bg-indigo-500/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-400" />
                        <h3 className="font-semibold text-white">{asset.name}</h3>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        类型: {asset.type} | 成熟度: {asset.maturity}
                      </p>
                    </div>
                    {selectedAsset?.id === asset.id && (
                      <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 版本和备注 */}
            {selectedAsset && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    版本（可选）
                  </label>
                  <input
                    type="text"
                    placeholder="例如: v1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    备注（可选）
                  </label>
                  <textarea
                    placeholder="输入备注信息..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* 操作按钮 */}
            <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
              <Button variant="ghost" onClick={onClose}>
                取消
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedAsset || loading}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? '关联中...' : '确认关联'}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AssetRelationModal;
```

## API 集成

确保 API 已正确配置。资产关联相关的 API 方法：

```javascript
// src/lib/api.js 中已包含
assetsApi.getByProject(projectId)  // 获取项目的所有资产
assetsApi.createProjectRelation(data)  // 创建资产项目关系
```

## 使用示例

### 在项目详情页面使用

```jsx
// 在 ProjectDetails.jsx 中
import AssetRelationModal from '@/components/AssetRelationModal';

// 在组件中添加
{isAssetModalOpen && (
  <AssetRelationModal
    isOpen={isAssetModalOpen}
    onClose={() => setIsAssetModalOpen(false)}
    projectId={id}
    relationType="used" // 或 "modified", "created"
    onSuccess={() => {
      loadProjectAssets(); // 重新加载资产列表
    }}
  />
)}
```

### 在任务页面使用

```jsx
// 在 Tasks.jsx 的 TaskDetailModal 中
import AssetRelationModal from '@/components/AssetRelationModal';

{isAssetModalOpen && task && (
  <AssetRelationModal
    isOpen={isAssetModalOpen}
    onClose={() => setIsAssetModalOpen(false)}
    projectId={task.projectId}
    relationType="used"
    onSuccess={() => {
      loadTaskAssets(); // 重新加载资产列表
    }}
  />
)}
```

## 完整实现步骤

1. **创建 AssetRelationModal 组件**
   - 创建 `src/components/AssetRelationModal.jsx`
   - 复制上面的组件代码

2. **修改 ProjectDetails.jsx**
   - 导入 `assetsApi` 和 `AssetRelationModal`
   - 添加状态管理
   - 添加资产加载函数
   - 在 UI 中添加资产区域和按钮
   - 添加模态框

3. **修改 Tasks.jsx**
   - 在 `TaskDetailModal` 中添加资产相关代码
   - 导入必要的组件和 API
   - 添加资产显示区域

4. **测试功能**
   - 在项目详情页面测试资产关联
   - 在任务详情页面测试资产关联
   - 验证资产列表正确显示

## 注意事项

1. **权限检查**：确保用户有权限关联资产
2. **数据验证**：验证项目ID和资产ID的有效性
3. **错误处理**：妥善处理 API 调用失败的情况
4. **用户体验**：提供清晰的反馈和加载状态
5. **数据同步**：关联后及时刷新相关数据

## 扩展功能建议

1. **批量关联**：支持一次关联多个资产
2. **资产筛选**：按类型、成熟度等筛选资产
3. **快速创建**：在关联时可以直接创建新资产
4. **资产详情**：点击资产查看详细信息
5. **关联历史**：查看资产的关联历史记录

## 相关文件

- `src/pages/ProjectDetails.jsx` - 项目详情页面
- `src/pages/Tasks.jsx` - 任务管理页面
- `src/components/AssetRelationModal.jsx` - 资产关联模态框（需创建）
- `src/lib/api.js` - API 客户端
- `RDTrackingSystem/Controllers/AssetsController.cs` - 后端控制器
