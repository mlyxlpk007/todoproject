import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { ArrowLeft, Save, Plus, Trash2, Package, Users, Factory, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api, productsApi } from '@/lib/api';

const CostEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const isNew = id === 'new';
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState([]);
  const [productVersions, setProductVersions] = useState([]);
  const [formData, setFormData] = useState({
    productId: '',
    productVersionId: '',
    projectId: '',
    specification: '',
    status: 'draft',
    notes: '',
  });
  
  const [bomItems, setBomItems] = useState([]);
  const [laborCosts, setLaborCosts] = useState([]);
  const [manufacturingCosts, setManufacturingCosts] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [existingCosts, setExistingCosts] = useState([]); // 已有成本记录列表
  const [showDuplicateModal, setShowDuplicateModal] = useState(false); // 显示复制对话框
  const [selectedSourceCostId, setSelectedSourceCostId] = useState(''); // 选择的源成本ID

  useEffect(() => {
    loadProducts();
    if (!isNew && id && id !== 'new') {
      loadCost();
    } else {
      setLoading(false);
      // 如果是新建模式，加载已有成本记录（用于复制）
      loadExistingCosts();
    }
  }, [id]);

  useEffect(() => {
    // 当产品ID改变时，加载产品版本
    if (formData.productId) {
      loadProductVersions(formData.productId);
    } else {
      setProductVersions([]);
    }
  }, [formData.productId]);

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data || []);
    } catch (error) {
      console.error('加载产品列表失败:', error);
      toast({
        title: t('common.error'),
        description: '加载产品列表失败',
        variant: 'destructive'
      });
    }
  };

  const loadProductVersions = async (productId) => {
    try {
      const product = await productsApi.getById(productId);
      setProductVersions(product?.versions || []);
    } catch (error) {
      console.error('加载产品版本失败:', error);
      setProductVersions([]);
    }
  };

  const loadExistingCosts = async () => {
    try {
      const response = await api.get('/api/costmanagement');
      if (response.ok) {
        const data = await response.json();
        setExistingCosts(data || []);
      }
    } catch (error) {
      console.error('加载已有成本记录失败:', error);
    }
  };

  const handleDuplicateFromExisting = async () => {
    if (!selectedSourceCostId) {
      toast({
        title: t('common.error'),
        description: t('costManagement.selectCostToDuplicate'),
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      // 加载源成本记录
      const response = await api.get(`/api/costmanagement/${selectedSourceCostId}`);
      if (!response.ok) {
        throw new Error('加载源成本记录失败');
      }
      
      const sourceData = await response.json();
      
      // 设置表单数据（如果用户已选择产品，保持用户的选择；否则使用源成本的产品）
      const targetProductId = formData.productId || sourceData.productId;
      
      setFormData({
        productId: targetProductId,
        productVersionId: '', // 新建时版本可以为空，用户需要选择新版本
        projectId: sourceData.projectId || '',
        specification: sourceData.specification || '',
        status: 'draft',
        notes: sourceData.notes || '',
      });
      
      // 加载产品版本列表
      if (targetProductId) {
        await loadProductVersions(targetProductId);
      }
      
      // 复制子项数据到前端状态（等用户保存主记录后再保存子项）
      // 注意：这里只是加载到前端，实际保存时会通过API保存
      setBomItems(sourceData.bomItems || []);
      setLaborCosts(sourceData.laborCosts || []);
      setManufacturingCosts(sourceData.manufacturingCosts || []);
      setPricing(sourceData.pricing);
      
      setShowDuplicateModal(false);
      setSelectedSourceCostId('');
      
      toast({
        title: t('common.success'),
        description: t('costManagement.duplicateSuccess')
      });
    } catch (error) {
      console.error('复制成本记录失败:', error);
      toast({
        title: t('common.error'),
        description: error.message || '复制成本记录失败',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCost = async () => {
    // 如果是新建模式，不加载
    if (isNew || !id || id === 'new') {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      const response = await api.get(`/api/costmanagement/${id}`);
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        // 如果是 404，说明成本不存在，这是正常的（新建时）
        if (response.status === 404) {
          console.log('成本不存在，这是新建模式');
          setLoading(false);
          return;
        }
        
        const errorMsg = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('加载失败响应:', response.status, data);
        toast({
          title: t('common.error'),
          description: errorMsg || t('costManagement.loadFailed'),
          variant: 'destructive'
        });
        return;
      }
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      // 先设置 productId，这会触发 useEffect 加载版本列表
      const productId = data.productId || '';
      const productVersionId = data.productVersionId || '';
      
      // 如果有产品ID，先加载产品版本列表
      if (productId) {
        await loadProductVersions(productId);
      }
      
      // 然后设置表单数据（包括版本ID）
      setFormData({
        productId: productId,
        productVersionId: productVersionId,
        projectId: data.projectId || '',
        specification: data.specification || '',
        status: data.status || 'draft',
        notes: data.notes || '',
      });
      setBomItems(data.bomItems || []);
      setLaborCosts(data.laborCosts || []);
      setManufacturingCosts(data.manufacturingCosts || []);
      setPricing(data.pricing);
    } catch (error) {
      console.error('加载成本失败:', error);
      // 如果是新建模式，不显示错误
      if (!isNew && id && id !== 'new') {
        toast({
          title: t('common.error'),
          description: error.message || t('costManagement.loadFailed'),
          variant: 'destructive'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // 验证必填字段
      if (!formData.productId) {
        toast({
          title: t('common.error'),
          description: '请选择产品',
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }
      
      // 如果是更新模式（已保存过的成本），版本不能为空
      const isUpdate = !isNew && id && id !== 'new' && String(id) !== 'undefined';
      if (isUpdate && !formData.productVersionId) {
        toast({
          title: t('common.error'),
          description: t('costManagement.versionRequired'),
          variant: 'destructive'
        });
        setSaving(false);
        return;
      }
      
      // 判断是新建还是更新
      // 如果是新建模式，或者 id 无效，则创建新记录
      const shouldCreate = isNew || !id || id === 'new' || String(id) === 'undefined';
      
      // 保存主成本记录
      let costId = id;
      if (shouldCreate) {
        // 调试：打印要发送的数据
        console.log('准备发送的数据:', formData);
        console.log('productId:', formData.productId);
        console.log('formData 类型:', typeof formData);
        console.log('formData 字符串化:', JSON.stringify(formData));
        
        // 确保发送的数据包含所有字段
        const dataToSend = {
          productId: formData.productId,
          productVersionId: formData.productVersionId || null,
          projectId: formData.projectId || null,
          specification: formData.specification || null,
          status: formData.status || 'draft',
          notes: formData.notes || null,
        };
        
        console.log('实际发送的数据:', dataToSend);
        
        const response = await api.post('/api/costmanagement', dataToSend);
        const result = await response.json().catch(() => ({}));
        
        if (!response.ok) {
          const errorMsg = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
          console.error('创建失败响应:', response.status, result);
          throw new Error(errorMsg);
        }
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        costId = result.id;
        if (!costId) {
          console.error('创建响应:', result);
          throw new Error('创建成功但未返回ID，请刷新页面查看');
        }
        
        // 如果是从已有版本复制的，需要保存子项
        if (bomItems.length > 0 || laborCosts.length > 0 || manufacturingCosts.length > 0) {
          // 保存BOM物料
          for (const item of bomItems) {
            if (item.id && item.id.startsWith('temp-')) {
              // 临时项，需要保存
              const itemToSave = { ...item };
              delete itemToSave.id; // 删除临时ID
              await api.post(`/api/costmanagement/${costId}/bom-items`, itemToSave);
            } else if (item.id && !item.id.startsWith('temp-')) {
              // 已有ID的项，需要复制
              const itemToSave = { ...item };
              delete itemToSave.id; // 删除原ID，让后端生成新ID
              await api.post(`/api/costmanagement/${costId}/bom-items`, itemToSave);
            } else {
              // 没有ID的项，直接保存
              await api.post(`/api/costmanagement/${costId}/bom-items`, item);
            }
          }
          
          // 保存人力成本
          for (const labor of laborCosts) {
            const laborToSave = { ...labor };
            if (laborToSave.id) delete laborToSave.id;
            await api.post(`/api/costmanagement/${costId}/labor-costs`, laborToSave);
          }
          
          // 保存制造成本
          for (const manufacturing of manufacturingCosts) {
            const manufacturingToSave = { ...manufacturing };
            if (manufacturingToSave.id) delete manufacturingToSave.id;
            await api.post(`/api/costmanagement/${costId}/manufacturing-costs`, manufacturingToSave);
          }
        }
        
        toast({
          title: t('common.success'),
          description: result.message || t('common.createSuccess')
        });
      } else {
        // 更新模式：确保 id 有效
        if (!id || id === 'new' || id === 'undefined') {
          throw new Error('无效的成本ID，无法更新');
        }
        
        // 确保发送的数据包含所有字段（包括空字符串）
        const dataToSend = {
          productId: formData.productId,
          productVersionId: formData.productVersionId || null,
          projectId: formData.projectId || null,
          specification: formData.specification || '',
          status: formData.status || 'draft',
          notes: formData.notes || '',
        };
        
        console.log('更新 - 准备发送的数据:', dataToSend);
        console.log('更新 - formData:', formData);
        
        const response = await api.put(`/api/costmanagement/${id}`, dataToSend);
        const result = await response.json().catch(() => ({}));
        
        if (!response.ok) {
          const errorMsg = result.error || result.message || `HTTP ${response.status}: ${response.statusText}`;
          console.error('更新失败响应:', response.status, result);
          throw new Error(errorMsg);
        }
        
        if (result.error) {
          throw new Error(result.error);
        }
        
        costId = id; // 更新模式下，costId 就是当前的 id
        toast({
          title: t('common.success'),
          description: result.message || t('common.updateSuccess')
        });
      }
      
      if (costId && costId !== 'new' && costId !== 'undefined') {
        navigate(`/cost-management/${costId}`);
      } else {
        // 如果ID无效，返回列表页
        console.warn('成本ID无效，返回列表页。costId:', costId);
        navigate('/cost-management');
      }
    } catch (error) {
      console.error('保存失败:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('common.updateFailed'),
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddBomItem = () => {
    setBomItems([...bomItems, {
      id: `temp-${Date.now()}`,
      materialName: '',
      materialCode: '',
      materialType: '',
      unit: 'pcs',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      supplier: '',
      category: '',
      notes: '',
      orderIndex: bomItems.length,
    }]);
  };

  const handleUpdateBomItem = (index, field, value) => {
    const updated = [...bomItems];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'quantity' || field === 'unitPrice') {
      updated[index].totalPrice = (updated[index].quantity || 0) * (updated[index].unitPrice || 0);
    }
    setBomItems(updated);
  };

  const handleRemoveBomItem = async (item, index) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    // 如果是临时项（还未保存），直接从列表中删除
    if (item.id && item.id.startsWith('temp-')) {
      setBomItems(bomItems.filter((_, i) => i !== index));
      return;
    }
    
    // 如果是已保存的项，调用 API 删除
    if (item.id && !item.id.startsWith('temp-')) {
      try {
        const response = await api.delete(`/api/costmanagement/bom-items/${item.id}`);
        if (response.ok) {
          setBomItems(bomItems.filter((_, i) => i !== index));
          toast({
            title: t('common.success'),
            description: t('common.deleteSuccess')
          });
        } else {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || '删除失败');
        }
      } catch (error) {
        console.error('删除BOM物料失败:', error);
        toast({
          title: t('common.error'),
          description: error.message || t('common.deleteFailed'),
          variant: 'destructive'
        });
      }
    } else {
      // 没有ID，直接从前端删除
      setBomItems(bomItems.filter((_, i) => i !== index));
    }
  };

  const handleSaveBomItem = async (item, index) => {
    if (!id || id === 'new') {
      toast({
        title: t('common.warning'),
        description: '请先保存成本记录',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      if (item.id && item.id.startsWith('temp-')) {
        // 新建
        const response = await api.post(`/api/costmanagement/${id}/bom-items`, item);
        if (response.ok) {
          const result = await response.json();
          const updated = [...bomItems];
          updated[index] = { ...item, id: result.id };
          setBomItems(updated);
          toast({
            title: t('common.success'),
            description: 'BOM物料添加成功'
          });
        } else {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || '添加失败');
        }
      } else if (item.id && !item.id.startsWith('temp-')) {
        // 更新已存在的项
        const response = await api.put(`/api/costmanagement/bom-items/${item.id}`, item);
        if (response.ok) {
          // 重新加载成本数据以确保UI显示最新数据
          await loadCost();
          toast({
            title: t('common.success'),
            description: 'BOM物料更新成功'
          });
        } else {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || '更新失败');
        }
      } else {
        // 没有ID，当作新建处理
        const response = await api.post(`/api/costmanagement/${id}/bom-items`, item);
        if (response.ok) {
          const result = await response.json();
          const updated = [...bomItems];
          updated[index] = { ...item, id: result.id };
          setBomItems(updated);
          toast({
            title: t('common.success'),
            description: 'BOM物料添加成功'
          });
        } else {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || '添加失败');
        }
      }
    } catch (error) {
      console.error('保存BOM物料失败:', error);
      toast({
        title: t('common.error'),
        description: error.message || '保存失败',
        variant: 'destructive'
      });
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const selectedProduct = products.find(p => p.id === formData.productId);

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => navigate('/cost-management')}
              variant="outline"
              className="border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <DollarSign className="w-8 h-8 mr-3 text-indigo-400" />
                {isNew ? t('costManagement.createCost') : t('common.edit')}
              </h1>
            </div>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>

        {/* 基本信息 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
          <h2 className="text-xl font-bold text-white mb-4">{t('costManagement.productInfo')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('productManagement.productName')} *
              </label>
              <select
                value={formData.productId}
                onChange={(e) => setFormData({ ...formData, productId: e.target.value, productVersionId: '' })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">{t('common.select')}</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('productManagement.currentVersion')}
                {!isNew && id && id !== 'new' && String(id) !== 'undefined' && (
                  <span className="text-red-400 ml-1">*</span>
                )}
              </label>
              <select
                value={formData.productVersionId}
                onChange={(e) => setFormData({ ...formData, productVersionId: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                disabled={!formData.productId}
                required={!isNew && id && id !== 'new' && String(id) !== 'undefined'}
              >
                <option value="">{t('common.none')}</option>
                {productVersions.map(version => (
                  <option key={version.id} value={version.id}>{version.version}</option>
                ))}
              </select>
              {!isNew && id && id !== 'new' && String(id) !== 'undefined' && !formData.productVersionId && (
                <p className="text-red-400 text-xs mt-1">{t('costManagement.versionRequired')}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('costManagement.specification')}
              </label>
              <input
                type="text"
                value={formData.specification}
                onChange={(e) => setFormData({ ...formData, specification: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="例如: 标准版、高配版等"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('common.status')}
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="draft">{t('costManagement.status.draft')}</option>
                <option value="active">{t('costManagement.status.active')}</option>
                <option value="archived">{t('costManagement.status.archived')}</option>
              </select>
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {t('costManagement.notes')}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows="3"
                placeholder="备注信息..."
              />
            </div>
          </div>
        </div>

        {/* BOM物料清单 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Package className="w-5 h-5 mr-2 text-blue-400" />
              {t('costManagement.bomItems')}
            </h2>
            <Button
              onClick={handleAddBomItem}
              variant="outline"
              size="sm"
              className="border-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('costManagement.addBomItem')}
            </Button>
          </div>
          
          {bomItems.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无BOM物料，点击上方按钮添加</p>
          ) : (
            <div className="space-y-4">
              {bomItems.map((item, index) => (
                <div key={item.id || index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.materialName')} *</label>
                      <input
                        type="text"
                        value={item.materialName || ''}
                        onChange={(e) => handleUpdateBomItem(index, 'materialName', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                        placeholder={t('costManagement.materialName')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.materialCode')}</label>
                      <input
                        type="text"
                        value={item.materialCode || ''}
                        onChange={(e) => handleUpdateBomItem(index, 'materialCode', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                        placeholder={t('costManagement.materialCode')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.materialType')}</label>
                      <select
                        value={item.materialType || ''}
                        onChange={(e) => handleUpdateBomItem(index, 'materialType', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                      >
                        <option value="">{t('common.select')}</option>
                        <option value="电子元件">电子元件</option>
                        <option value="结构件">结构件</option>
                        <option value="软件">软件</option>
                        <option value="包装材料">包装材料</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.unit')}</label>
                      <select
                        value={item.unit || 'pcs'}
                        onChange={(e) => handleUpdateBomItem(index, 'unit', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                      >
                        <option value="pcs">pcs</option>
                        <option value="kg">kg</option>
                        <option value="m">m</option>
                        <option value="m²">m²</option>
                        <option value="m³">m³</option>
                        <option value="L">L</option>
                        <option value="套">套</option>
                        <option value="个">个</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.quantity')}</label>
                      <input
                        type="number"
                        value={item.quantity || 0}
                        onChange={(e) => handleUpdateBomItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.unitPrice')}</label>
                      <input
                        type="number"
                        value={item.unitPrice || 0}
                        onChange={(e) => handleUpdateBomItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.totalPrice')}</label>
                      <div className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm flex items-center">
                        {formatCurrency(item.totalPrice || 0)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.supplier')}</label>
                      <input
                        type="text"
                        value={item.supplier || ''}
                        onChange={(e) => handleUpdateBomItem(index, 'supplier', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                        placeholder={t('costManagement.supplier')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">{t('costManagement.category')}</label>
                      <select
                        value={item.category || ''}
                        onChange={(e) => handleUpdateBomItem(index, 'category', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                      >
                        <option value="">{t('common.select')}</option>
                        <option value="主要物料">主要物料</option>
                        <option value="辅助物料">辅助物料</option>
                        <option value="包装材料">包装材料</option>
                        <option value="其他">其他</option>
                      </select>
                    </div>
                    <div className="md:col-span-3 lg:col-span-4">
                      <label className="block text-xs text-gray-400 mb-1">{t('common.notes')}</label>
                      <input
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => handleUpdateBomItem(index, 'notes', e.target.value)}
                        className="w-full bg-gray-600 text-white px-3 py-1.5 rounded border border-gray-500 text-sm"
                        placeholder={t('common.notes')}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      onClick={() => handleSaveBomItem(item, index)}
                      size="sm"
                      variant="outline"
                      className="border-gray-600"
                      disabled={!id || id === 'new' || !item.materialName}
                    >
                      {t('common.save')}
                    </Button>
                    <Button
                      onClick={() => handleRemoveBomItem(item, index)}
                      size="sm"
                      variant="outline"
                      className="border-red-600 text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 提示信息 */}
        {isNew && (
          <div className="space-y-4 mb-6">
            <div className="bg-yellow-600/20 border border-yellow-600/50 rounded-lg p-4">
              <p className="text-yellow-300 text-sm">
                提示：请先保存成本记录，然后才能添加BOM物料、人力成本和制造成本。
              </p>
            </div>
            
            {/* 基于已有版本创建 */}
            <div className="bg-blue-600/20 border border-blue-600/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-300 text-sm font-medium mb-1">
                    {t('costManagement.duplicateFromExisting')}
                  </p>
                  <p className="text-blue-200 text-xs">
                    {t('costManagement.duplicateFromExistingDesc')}
                  </p>
                </div>
                <Button
                  onClick={() => setShowDuplicateModal(true)}
                  variant="outline"
                  size="sm"
                  className="border-blue-600 text-blue-300 hover:bg-blue-600/20"
                >
                  {t('costManagement.selectExistingVersion')}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 复制对话框 */}
        {showDuplicateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 border border-gray-700">
              <h3 className="text-xl font-bold text-white mb-4">{t('costManagement.selectCostToDuplicate')}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {t('costManagement.existingCostRecords')}
                </label>
                <select
                  value={selectedSourceCostId}
                  onChange={(e) => setSelectedSourceCostId(e.target.value)}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">{t('common.select')}...</option>
                  {existingCosts
                    .filter(cost => cost.productId === formData.productId || !formData.productId)
                    .map(cost => (
                      <option key={cost.id} value={cost.id}>
                        {cost.productName} {cost.productVersion ? `(${cost.productVersion})` : ''} 
                        {cost.specification ? ` - ${cost.specification}` : ''}
                      </option>
                    ))}
                </select>
                {formData.productId && existingCosts.filter(cost => cost.productId === formData.productId).length === 0 && (
                  <p className="text-yellow-400 text-xs mt-2">
                    {t('costManagement.noCostRecordsForProduct')}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-end gap-3">
                <Button
                  onClick={() => {
                    setShowDuplicateModal(false);
                    setSelectedSourceCostId('');
                  }}
                  variant="outline"
                  className="border-gray-600"
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  onClick={handleDuplicateFromExisting}
                  disabled={!selectedSourceCostId}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {t('costManagement.confirmDuplicate')}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CostEdit;
