import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { useToast } from '@/components/ui/use-toast';
import {
  ArrowLeft, Plus, Edit, Trash2, Save, X, Package, Layers, Zap, Wrench,
  Archive, User, MapPin, Briefcase, ChevronRight, ChevronDown, Tag, Calendar, GitCompare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productsApi, assetsApi, usersApi, tasksApi } from '@/lib/api';

const ProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState(new Set());
  const [expandedSubModules, setExpandedSubModules] = useState(new Set());
  const [expandedFunctions, setExpandedFunctions] = useState(new Set());
  
  // 版本相关状态
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showVersionCompare, setShowVersionCompare] = useState(false);
  const [compareVersion1, setCompareVersion1] = useState(null);
  const [compareVersion2, setCompareVersion2] = useState(null);
  
  // 模态框状态
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showSubModuleModal, setShowSubModuleModal] = useState(false);
  const [showFunctionModal, setShowFunctionModal] = useState(false);
  const [showRelationModal, setShowRelationModal] = useState(false);
  
  // 编辑状态
  const [editingModule, setEditingModule] = useState(null);
  const [editingSubModule, setEditingSubModule] = useState(null);
  const [editingFunction, setEditingFunction] = useState(null);
  const [currentFunctionForRelation, setCurrentFunctionForRelation] = useState(null);
  const [relationType, setRelationType] = useState('asset'); // asset, engineer, customer, task
  
  // 选项数据
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [tasks, setTasks] = useState([]);

  const moduleTypes = {
    structure: { name: t('productManagement.structure'), icon: Package, color: 'text-blue-400' },
    electronic: { name: t('productManagement.electronics'), icon: Zap, color: 'text-yellow-400' },
    software: { name: t('productManagement.software'), icon: Layers, color: 'text-green-400' },
    other: { name: t('productManagement.other'), icon: Wrench, color: 'text-gray-400' }
  };

  useEffect(() => {
    loadProduct();
    loadOptions();
  }, [id]);

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getById(id);
      console.log('[ProductEdit] 加载的产品数据:', data);
      console.log('[ProductEdit] currentVersion:', data?.currentVersion);
      setProduct(data);
      // 默认展开所有模块
      if (data?.modules) {
        setExpandedModules(new Set(data.modules.map(m => m.id)));
      }
    } catch (error) {
      console.error('加载产品失败:', error);
      toast({ title: t('common.error'), description: t('productManagement.loadFailed'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadOptions = async () => {
    try {
      const [assetsData, usersData, tasksData] = await Promise.all([
        assetsApi.getAll().catch(() => []),
        usersApi.getAll().catch(() => []),
        tasksApi.getAll().catch(() => [])
      ]);
      setAssets(assetsData || []);
      setUsers(usersData || []);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('加载选项数据失败:', error);
    }
  };

  const toggleExpand = (set, itemId) => {
    const newSet = new Set(set);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
    } else {
      newSet.add(itemId);
    }
    return newSet;
  };

  // 模块管理
  const handleCreateModule = () => {
    setEditingModule(null);
    setShowModuleModal(true);
  };

  const handleEditModule = (module) => {
    setEditingModule(module);
    setShowModuleModal(true);
  };

  const handleSaveModule = async (moduleData) => {
    try {
      if (editingModule) {
        await productsApi.updateModule(editingModule.id, moduleData);
        toast({ title: t('common.success'), description: t('common.updateSuccess') });
      } else {
        await productsApi.createModule(id, moduleData);
        toast({ title: t('common.success'), description: t('common.createSuccess') });
      }
      setShowModuleModal(false);
      setEditingModule(null);
      loadProduct();
    } catch (error) {
      console.error('保存模块失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.updateFailed'), variant: "destructive" });
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await productsApi.deleteModule(moduleId);
      toast({ title: t('common.success'), description: t('common.deleteSuccess') });
      loadProduct();
    } catch (error) {
      console.error('删除模块失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.deleteFailed'), variant: "destructive" });
    }
  };

  // 子模块管理
  const handleCreateSubModule = (moduleId) => {
    setEditingSubModule(null);
    setShowSubModuleModal(true);
    setEditingModule({ id: moduleId });
  };

  const handleEditSubModule = (subModule) => {
    setEditingSubModule(subModule);
    setShowSubModuleModal(true);
  };

  const handleSaveSubModule = async (subModuleData) => {
    try {
      let moduleId;
      if (editingSubModule) {
        // 查找包含此子模块的模块
        const parentModule = product.modules.find(m => 
          m.subModules && m.subModules.some(sm => sm.id === editingSubModule.id)
        );
        moduleId = parentModule?.id;
        if (!moduleId) {
          throw new Error('无法找到父模块');
        }
        await productsApi.updateSubModule(editingSubModule.id, subModuleData);
        toast({ title: t('common.success'), description: t('common.updateSuccess') });
      } else {
        moduleId = editingModule?.id;
        if (!moduleId) {
          throw new Error('模块ID不能为空');
        }
        await productsApi.createSubModule(moduleId, subModuleData);
        toast({ title: t('common.success'), description: t('common.createSuccess') });
      }
      setShowSubModuleModal(false);
      setEditingSubModule(null);
      setEditingModule(null);
      loadProduct();
    } catch (error) {
      console.error('保存子模块失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.updateFailed'), variant: "destructive" });
    }
  };

  const handleDeleteSubModule = async (subModuleId) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await productsApi.deleteSubModule(subModuleId);
      toast({ title: t('common.success'), description: t('common.deleteSuccess') });
      loadProduct();
    } catch (error) {
      console.error('删除子模块失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.deleteFailed'), variant: "destructive" });
    }
  };

  // 功能管理
  const handleCreateFunction = (subModuleId) => {
    setEditingFunction(null);
    setShowFunctionModal(true);
    setEditingSubModule({ id: subModuleId });
  };

  const handleEditFunction = (functionItem) => {
    setEditingFunction(functionItem);
    setShowFunctionModal(true);
  };

  const handleSaveFunction = async (functionData) => {
    try {
      let subModuleId;
      if (editingFunction) {
        // 查找包含此功能的子模块
        const parentSubModule = product.modules
          .flatMap(m => m.subModules || [])
          .find(sm => sm.functions && sm.functions.some(f => f.id === editingFunction.id));
        subModuleId = parentSubModule?.id || editingFunction.subModuleId;
        if (!subModuleId) {
          throw new Error('无法找到父子模块');
        }
        await productsApi.updateFunction(editingFunction.id, functionData);
        toast({ title: t('common.success'), description: t('common.updateSuccess') });
      } else {
        subModuleId = editingSubModule?.id;
        if (!subModuleId) {
          throw new Error('子模块ID不能为空');
        }
        await productsApi.createFunction(subModuleId, functionData);
        toast({ title: t('common.success'), description: t('common.createSuccess') });
      }
      setShowFunctionModal(false);
      setEditingFunction(null);
      setEditingSubModule(null);
      loadProduct();
    } catch (error) {
      console.error('保存功能失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.updateFailed'), variant: "destructive" });
    }
  };

  const handleDeleteFunction = async (functionId) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      await productsApi.deleteFunction(functionId);
      toast({ title: t('common.success'), description: t('common.deleteSuccess') });
      loadProduct();
    } catch (error) {
      console.error('删除功能失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.deleteFailed'), variant: "destructive" });
    }
  };

  // 关联管理
  const handleAddRelation = (functionItem, type) => {
    setCurrentFunctionForRelation(functionItem);
    setRelationType(type);
    setShowRelationModal(true);
  };

  const handleSaveRelation = async (relationData) => {
    try {
      const functionId = currentFunctionForRelation.id;
      let result;
      
      switch (relationType) {
        case 'asset':
          result = await productsApi.addFunctionAsset(functionId, relationData);
          break;
        case 'engineer':
          result = await productsApi.addFunctionEngineer(functionId, relationData);
          break;
        case 'customer':
          result = await productsApi.addFunctionCustomer(functionId, relationData);
          break;
        case 'task':
          result = await productsApi.addFunctionTask(functionId, relationData);
          break;
      }
      
      toast({ title: t('common.success'), description: t('common.createSuccess') });
      setShowRelationModal(false);
      setCurrentFunctionForRelation(null);
      loadProduct();
    } catch (error) {
      console.error('添加关联失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.createFailed'), variant: "destructive" });
    }
  };

  const handleRemoveRelation = async (functionId, relationId, type) => {
    if (!window.confirm(t('common.confirmDelete'))) return;
    try {
      switch (type) {
        case 'asset':
          await productsApi.removeFunctionAsset(functionId, relationId);
          break;
        case 'engineer':
          await productsApi.removeFunctionEngineer(functionId, relationId);
          break;
        case 'customer':
          await productsApi.removeFunctionCustomer(functionId, relationId);
          break;
        case 'task':
          await productsApi.removeFunctionTask(functionId, relationId);
          break;
      }
      toast({ title: t('common.success'), description: t('common.deleteSuccess') });
      loadProduct();
    } catch (error) {
      console.error('删除关联失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.deleteFailed'), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">{t('common.loading')}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-400">{t('productManagement.noProducts')}</p>
      </div>
    );
  }

  // 调试信息
  console.log('[ProductEdit] 渲染时 product 对象:', product);
  console.log('[ProductEdit] 渲染时 currentVersion:', product?.currentVersion);

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/products/catalog')}
              className="border-gray-600 hover:bg-gray-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Package className="w-8 h-8 mr-3 text-indigo-400" />
                {product.name}
              </h1>
              <p className="text-gray-400">{product.code} - {product.description || t('productManagement.productStructure')}</p>
            </div>
          </div>
          <Button onClick={handleCreateModule}>
            <Plus className="w-4 h-4 mr-2" />
            {t('productManagement.addModule')}
          </Button>
        </div>

        {/* 产品基本信息 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 mb-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <span className="text-sm text-gray-400">{t('productManagement.productCode')}:</span>
              <p className="text-white">{product.code}</p>
            </div>
            <div>
              <span className="text-sm text-gray-400">{t('productManagement.currentVersion')}:</span>
              <p className="text-white" data-testid="product-current-version">
                {product?.currentVersion || '-'}
              </p>
            </div>
            <div>
              <span className="text-sm text-gray-400">{t('productManagement.status')}:</span>
              <p className="text-white">{product.status}</p>
            </div>
          </div>
          
          {/* 版本列表 */}
          {product.versions && product.versions.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  产品版本列表 ({product.versions.length})
                </h3>
                {product.versions.length >= 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVersionCompare(true)}
                    className="border-gray-600 hover:bg-gray-700 text-white"
                  >
                    <GitCompare className="w-4 h-4 mr-2" />
                    版本对比
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {product.versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedVersion?.id === version.id
                        ? 'bg-indigo-600/20 border-indigo-500'
                        : 'bg-gray-700/30 border-gray-600 hover:border-gray-500'
                    }`}
                    onClick={() => setSelectedVersion(selectedVersion?.id === version.id ? null : version)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Tag className={`w-4 h-4 ${
                          version.status === 'stable' ? 'text-green-400' :
                          version.status === 'beta' ? 'text-yellow-400' :
                          'text-gray-400'
                        }`} />
                        <span className="font-semibold text-white">{version.version}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        version.status === 'stable' ? 'bg-green-500/20 text-green-400' :
                        version.status === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {version.status || 'draft'}
                      </span>
                    </div>
                    {version.description && (
                      <p className="text-xs text-gray-400 mb-2 line-clamp-2">{version.description}</p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {version.releaseDate && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>{version.releaseDate}</span>
                        </div>
                      )}
                      <span className="text-gray-600">·</span>
                      <span>{new Date(version.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
              {selectedVersion && (
                <div className="mt-3 p-3 bg-indigo-600/10 border border-indigo-500/30 rounded-lg">
                  <p className="text-sm text-indigo-300">
                    已选择版本: <span className="font-semibold">{selectedVersion.version}</span>
                    {selectedVersion.description && ` - ${selectedVersion.description}`}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    注意：当前版本结构快照功能尚未实现，显示的是当前产品结构
                  </p>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* 模块列表 */}
        {product.modules && product.modules.length > 0 ? (
          <div className="space-y-4">
            {product.modules.map((module) => {
              const ModuleIcon = moduleTypes[module.type]?.icon || Package;
              const isExpanded = expandedModules.has(module.id);
              
              return (
                <motion.div
                  key={module.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gray-800/50 rounded-lg border border-gray-700"
                >
                  {/* 模块头部 */}
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => setExpandedModules(toggleExpand(expandedModules, module.id))}
                        className="p-1 hover:bg-gray-700 rounded"
                      >
                        {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                      </button>
                      <ModuleIcon className={`w-5 h-5 ${moduleTypes[module.type]?.color || 'text-gray-400'}`} />
                      <div>
                        <h3 className="font-semibold text-white">{module.name}</h3>
                        <p className="text-sm text-gray-400">{moduleTypes[module.type]?.name || module.type}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEditModule(module)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteModule(module.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleCreateSubModule(module.id)}>
                        <Plus className="w-4 h-4 mr-1" />
                        {t('productManagement.addSubModule')}
                      </Button>
                    </div>
                  </div>

                  {/* 子模块列表 */}
                  {isExpanded && module.subModules && module.subModules.length > 0 && (
                    <div className="pl-12 pr-4 pb-4 space-y-3">
                      {module.subModules.map((subModule) => {
                        const isSubExpanded = expandedSubModules.has(subModule.id);
                        
                        return (
                          <motion.div
                            key={subModule.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="bg-gray-700/30 rounded-lg border border-gray-600"
                          >
                            {/* 子模块头部 */}
                            <div className="p-3 flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  onClick={() => setExpandedSubModules(toggleExpand(expandedSubModules, subModule.id))}
                                  className="p-1 hover:bg-gray-600 rounded"
                                >
                                  {isSubExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                                <Layers className="w-4 h-4 text-purple-400" />
                                <div>
                                  <h4 className="font-medium text-white">{subModule.name}</h4>
                                  {subModule.description && (
                                    <p className="text-xs text-gray-400">{subModule.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => handleEditSubModule(subModule)}>
                                  <Edit className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteSubModule(subModule.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleCreateFunction(subModule.id)}>
                                  <Plus className="w-3 h-3 mr-1" />
                                  {t('productManagement.addFunction')}
                                </Button>
                              </div>
                            </div>

                            {/* 功能列表 */}
                            {isSubExpanded && subModule.functions && subModule.functions.length > 0 && (
                              <div className="pl-8 pr-3 pb-3 space-y-2">
                                {subModule.functions.map((func) => {
                                  const isFuncExpanded = expandedFunctions.has(func.id);
                                  
                                  return (
                                    <motion.div
                                      key={func.id}
                                      initial={{ opacity: 0, x: -20 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      className="bg-gray-600/30 rounded-lg border border-gray-500 p-3"
                                    >
                                      {/* 功能头部 */}
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2 flex-1">
                                          <button
                                            onClick={() => setExpandedFunctions(toggleExpand(expandedFunctions, func.id))}
                                            className="p-1 hover:bg-gray-500 rounded"
                                          >
                                            {isFuncExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                          </button>
                                          <Briefcase className="w-3 h-3 text-indigo-400" />
                                          <span className="text-sm font-medium text-white">{func.name}</span>
                                        </div>
                                        <div className="flex gap-1">
                                          <Button variant="ghost" size="sm" onClick={() => handleEditFunction(func)}>
                                            <Edit className="w-3 h-3" />
                                          </Button>
                                          <Button variant="ghost" size="sm" onClick={() => handleDeleteFunction(func.id)}>
                                            <Trash2 className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </div>

                                      {/* 功能关联 */}
                                      {isFuncExpanded && (
                                        <div className="pl-5 space-y-2 mt-2">
                                          {/* 关联资产 */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Archive className="w-3 h-3 text-indigo-400" />
                                              <span className="text-xs text-gray-400">{t('productManagement.relatedAssets')}:</span>
                                              {func.assets && func.assets.length > 0 ? (
                                                <div className="flex gap-1 flex-wrap">
                                                  {func.assets.map((asset, idx) => (
                                                    <span key={idx} className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded">
                                                      {asset.assetId} {asset.assetVersion && `(${asset.assetVersion})`}
                                                      <button
                                                        onClick={() => handleRemoveRelation(func.id, asset.id, 'asset')}
                                                        className="ml-1 hover:text-red-400"
                                                      >
                                                        <X className="w-3 h-3 inline" />
                                                      </button>
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-xs text-gray-500">-</span>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleAddRelation(func, 'asset')}
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>

                                          {/* 关联工程师 */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <User className="w-3 h-3 text-green-400" />
                                              <span className="text-xs text-gray-400">{t('productManagement.responsibleEngineers')}:</span>
                                              {func.engineers && func.engineers.length > 0 ? (
                                                <div className="flex gap-1 flex-wrap">
                                                  {func.engineers.map((eng, idx) => (
                                                    <span key={idx} className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">
                                                      {eng.engineerId}
                                                      <button
                                                        onClick={() => handleRemoveRelation(func.id, eng.id, 'engineer')}
                                                        className="ml-1 hover:text-red-400"
                                                      >
                                                        <X className="w-3 h-3 inline" />
                                                      </button>
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-xs text-gray-500">-</span>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleAddRelation(func, 'engineer')}
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>

                                          {/* 关联客户 */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <MapPin className="w-3 h-3 text-yellow-400" />
                                              <span className="text-xs text-gray-400">{t('productManagement.customerGroups')}:</span>
                                              {func.customers && func.customers.length > 0 ? (
                                                <div className="flex gap-1 flex-wrap">
                                                  {func.customers.map((customer, idx) => (
                                                    <span key={idx} className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">
                                                      {customer.customerName} {customer.region && `(${customer.region})`}
                                                      <button
                                                        onClick={() => handleRemoveRelation(func.id, customer.id, 'customer')}
                                                        className="ml-1 hover:text-red-400"
                                                      >
                                                        <X className="w-3 h-3 inline" />
                                                      </button>
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-xs text-gray-500">-</span>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleAddRelation(func, 'customer')}
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>

                                          {/* 关联任务 */}
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <Briefcase className="w-3 h-3 text-blue-400" />
                                              <span className="text-xs text-gray-400">{t('productManagement.relatedTasks')}:</span>
                                              {func.tasks && func.tasks.length > 0 ? (
                                                <div className="flex gap-1 flex-wrap">
                                                  {func.tasks.map((task, idx) => (
                                                    <span key={idx} className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                                                      {task.taskId}
                                                      <button
                                                        onClick={() => handleRemoveRelation(func.id, task.id, 'task')}
                                                        className="ml-1 hover:text-red-400"
                                                      >
                                                        <X className="w-3 h-3 inline" />
                                                      </button>
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : (
                                                <span className="text-xs text-gray-500">-</span>
                                              )}
                                            </div>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => handleAddRelation(func, 'task')}
                                            >
                                              <Plus className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </motion.div>
                                  );
                                })}
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p>{t('productManagement.noModules')}</p>
            <Button onClick={handleCreateModule} className="mt-4">
              <Plus className="w-4 h-4 mr-2" />
              {t('productManagement.addModule')}
            </Button>
          </div>
        )}

        {/* 模块创建/编辑模态框 */}
        {showModuleModal && (
          <ModuleModal
            isOpen={showModuleModal}
            onClose={() => {
              setShowModuleModal(false);
              setEditingModule(null);
            }}
            onSubmit={handleSaveModule}
            editingModule={editingModule}
            moduleTypes={moduleTypes}
          />
        )}

        {/* 子模块创建/编辑模态框 */}
        {showSubModuleModal && (
          <SubModuleModal
            isOpen={showSubModuleModal}
            onClose={() => {
              setShowSubModuleModal(false);
              setEditingSubModule(null);
              setEditingModule(null);
            }}
            onSubmit={handleSaveSubModule}
            editingSubModule={editingSubModule}
          />
        )}

        {/* 功能创建/编辑模态框 */}
        {showFunctionModal && (
          <FunctionModal
            isOpen={showFunctionModal}
            onClose={() => {
              setShowFunctionModal(false);
              setEditingFunction(null);
              setEditingSubModule(null);
            }}
            onSubmit={handleSaveFunction}
            editingFunction={editingFunction}
          />
        )}

        {/* 关联创建模态框 */}
        {showRelationModal && currentFunctionForRelation && (
          <RelationModal
            isOpen={showRelationModal}
            onClose={() => {
              setShowRelationModal(false);
              setCurrentFunctionForRelation(null);
            }}
            onSubmit={handleSaveRelation}
            relationType={relationType}
            assets={assets}
            users={users}
            tasks={tasks}
          />
        )}

        {/* 版本对比模态框 */}
        {showVersionCompare && (
          <VersionCompareModal
            isOpen={showVersionCompare}
            onClose={() => {
              setShowVersionCompare(false);
              setCompareVersion1(null);
              setCompareVersion2(null);
            }}
            versions={product.versions || []}
            productStructure={product}
            onSelectVersion1={(version) => setCompareVersion1(version)}
            onSelectVersion2={(version) => setCompareVersion2(version)}
            compareVersion1={compareVersion1}
            compareVersion2={compareVersion2}
          />
        )}
      </div>
    </div>
  );
};

// 模块模态框
const ModuleModal = ({ isOpen, onClose, onSubmit, editingModule, moduleTypes }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    type: 'other',
    description: ''
  });

  useEffect(() => {
    if (editingModule) {
      setFormData({
        name: editingModule.name || '',
        type: editingModule.type || 'other',
        description: editingModule.description || ''
      });
    } else {
      setFormData({ name: '', type: 'other', description: '' });
    }
  }, [editingModule, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    onSubmit(formData);
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
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">
              {editingModule ? t('common.edit') : t('productManagement.addModule')}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.moduleName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.moduleType')} *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                {Object.entries(moduleTypes).map(([key, value]) => (
                  <option key={key} value={key}>{value.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// 子模块模态框
const SubModuleModal = ({ isOpen, onClose, onSubmit, editingSubModule }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (editingSubModule) {
      setFormData({
        name: editingSubModule.name || '',
        description: editingSubModule.description || ''
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [editingSubModule, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    onSubmit(formData);
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
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">
              {editingSubModule ? t('common.edit') : t('productManagement.addSubModule')}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.subModuleName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// 功能模态框
const FunctionModal = ({ isOpen, onClose, onSubmit, editingFunction }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    if (editingFunction) {
      setFormData({
        name: editingFunction.name || '',
        description: editingFunction.description || ''
      });
    } else {
      setFormData({ name: '', description: '' });
    }
  }, [editingFunction, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    onSubmit(formData);
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
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">
              {editingFunction ? t('common.edit') : t('productManagement.addFunction')}
            </h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.functionName')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.description')}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows="3"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// 关联模态框
const RelationModal = ({ isOpen, onClose, onSubmit, relationType, assets, users, tasks }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    assetId: '',
    assetVersion: '',
    engineerId: '',
    customerName: '',
    region: '',
    taskId: ''
  });

  useEffect(() => {
    setFormData({
      assetId: '',
      assetVersion: '',
      engineerId: '',
      customerName: '',
      region: '',
      taskId: ''
    });
  }, [relationType, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    let data = {};
    switch (relationType) {
      case 'asset':
        if (!formData.assetId) return;
        data = { assetId: formData.assetId, assetVersion: formData.assetVersion };
        break;
      case 'engineer':
        if (!formData.engineerId) return;
        data = { engineerId: formData.engineerId };
        break;
      case 'customer':
        if (!formData.customerName) return;
        data = { customerName: formData.customerName, region: formData.region };
        break;
      case 'task':
        if (!formData.taskId) return;
        data = { taskId: formData.taskId };
        break;
    }
    onSubmit(data);
  };

  if (!isOpen) return null;

  const getTitle = () => {
    switch (relationType) {
      case 'asset': return t('productManagement.addAsset');
      case 'engineer': return t('productManagement.addEngineer');
      case 'customer': return t('productManagement.addCustomer');
      case 'task': return t('productManagement.addTask');
      default: return t('common.add');
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h2 className="text-xl font-bold text-white">{getTitle()}</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700">
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {relationType === 'asset' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('productManagement.asset')} *
                  </label>
                  <select
                    value={formData.assetId}
                    onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">{t('common.select')}</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>{asset.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('productManagement.assetVersion')}
                  </label>
                  <input
                    type="text"
                    value={formData.assetVersion}
                    onChange={(e) => setFormData({ ...formData, assetVersion: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                    placeholder="例如: v1.0.0"
                  />
                </div>
              </>
            )}
            
            {relationType === 'engineer' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('productManagement.engineer')} *
                </label>
                <select
                  value={formData.engineerId}
                  onChange={(e) => setFormData({ ...formData, engineerId: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {relationType === 'customer' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('productManagement.customerName')} *
                  </label>
                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    {t('productManagement.region')}
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                    placeholder={t('productManagement.regionPlaceholder')}
                  />
                </div>
              </>
            )}
            
            {relationType === 'task' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  {t('productManagement.task')} *
                </label>
                <select
                  value={formData.taskId}
                  onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                  required
                >
                  <option value="">{t('common.select')}</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>{task.name || task.id}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="ghost" onClick={onClose}>
                {t('common.cancel')}
              </Button>
              <Button type="submit">
                {t('common.save')}
              </Button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// 版本对比模态框组件
const VersionCompareModal = ({ 
  isOpen, 
  onClose, 
  versions, 
  productStructure,
  onSelectVersion1,
  onSelectVersion2,
  compareVersion1,
  compareVersion2
}) => {
  const { t } = useI18n();

  if (!isOpen) return null;

  // 计算结构差异（目前只显示当前结构，因为历史版本没有快照）
  const getStructureStats = (structure) => {
    if (!structure) return { modules: 0, subModules: 0, functions: 0 };
    const modules = structure.modules || [];
    const subModules = modules.flatMap(m => m.subModules || []);
    const functions = subModules.flatMap(sm => sm.functions || []);
    return {
      modules: modules.length,
      subModules: subModules.length,
      functions: functions.length
    };
  };

  const currentStats = getStructureStats(productStructure);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.9 }}
          className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gray-800 z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <GitCompare className="w-5 h-5 text-indigo-400" />
              版本对比
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>

          <div className="p-6">
            {/* 版本选择 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择版本 1
                </label>
                <select
                  value={compareVersion1?.id || ''}
                  onChange={(e) => {
                    const version = versions.find(v => v.id === e.target.value);
                    onSelectVersion1(version || null);
                  }}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">选择版本...</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.version} ({v.status}) - {v.releaseDate || '未发布'}
                    </option>
                  ))}
                </select>
                {compareVersion1 && (
                  <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-white font-semibold">{compareVersion1.version}</p>
                    {compareVersion1.description && (
                      <p className="text-xs text-gray-400 mt-1">{compareVersion1.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {compareVersion1.releaseDate && `发布日期: ${compareVersion1.releaseDate}`}
                      {compareVersion1.releaseDate && ' · '}
                      创建时间: {new Date(compareVersion1.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  选择版本 2
                </label>
                <select
                  value={compareVersion2?.id || ''}
                  onChange={(e) => {
                    const version = versions.find(v => v.id === e.target.value);
                    onSelectVersion2(version || null);
                  }}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">选择版本...</option>
                  {versions.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.version} ({v.status}) - {v.releaseDate || '未发布'}
                    </option>
                  ))}
                </select>
                {compareVersion2 && (
                  <div className="mt-2 p-3 bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-white font-semibold">{compareVersion2.version}</p>
                    {compareVersion2.description && (
                      <p className="text-xs text-gray-400 mt-1">{compareVersion2.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      {compareVersion2.releaseDate && `发布日期: ${compareVersion2.releaseDate}`}
                      {compareVersion2.releaseDate && ' · '}
                      创建时间: {new Date(compareVersion2.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 对比结果 */}
            {compareVersion1 && compareVersion2 && (
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-sm text-yellow-300">
                    ⚠️ 注意：版本结构快照功能尚未实现。当前显示的是产品当前结构，无法显示历史版本的结构差异。
                  </p>
                </div>

                {/* 版本信息对比 */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">版本信息对比</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">{compareVersion1.version}</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-400">状态:</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            compareVersion1.status === 'stable' ? 'bg-green-500/20 text-green-400' :
                            compareVersion1.status === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {compareVersion1.status}
                          </span>
                        </div>
                        {compareVersion1.description && (
                          <div>
                            <span className="text-gray-400">描述:</span>
                            <p className="text-white mt-1">{compareVersion1.description}</p>
                          </div>
                        )}
                        {compareVersion1.releaseDate && (
                          <div>
                            <span className="text-gray-400">发布日期:</span>
                            <span className="text-white ml-2">{compareVersion1.releaseDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-2">{compareVersion2.version}</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-gray-400">状态:</span>
                          <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                            compareVersion2.status === 'stable' ? 'bg-green-500/20 text-green-400' :
                            compareVersion2.status === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {compareVersion2.status}
                          </span>
                        </div>
                        {compareVersion2.description && (
                          <div>
                            <span className="text-gray-400">描述:</span>
                            <p className="text-white mt-1">{compareVersion2.description}</p>
                          </div>
                        )}
                        {compareVersion2.releaseDate && (
                          <div>
                            <span className="text-gray-400">发布日期:</span>
                            <span className="text-white ml-2">{compareVersion2.releaseDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 当前结构统计（占位，待实现版本结构快照） */}
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-4">当前产品结构统计</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-600/30 rounded-lg">
                      <p className="text-2xl font-bold text-white">{currentStats.modules}</p>
                      <p className="text-sm text-gray-400 mt-1">模块</p>
                    </div>
                    <div className="text-center p-4 bg-gray-600/30 rounded-lg">
                      <p className="text-2xl font-bold text-white">{currentStats.subModules}</p>
                      <p className="text-sm text-gray-400 mt-1">子模块</p>
                    </div>
                    <div className="text-center p-4 bg-gray-600/30 rounded-lg">
                      <p className="text-2xl font-bold text-white">{currentStats.functions}</p>
                      <p className="text-sm text-gray-400 mt-1">功能</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4 text-center">
                    * 版本结构快照功能开发中，将支持查看历史版本的结构差异
                  </p>
                </div>
              </div>
            )}

            {(!compareVersion1 || !compareVersion2) && (
              <div className="text-center py-12 text-gray-500">
                <GitCompare className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                <p>请选择两个版本进行对比</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProductEdit;
