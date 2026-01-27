import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { ArrowLeft, Edit, Plus, Trash2, Package, Users, Factory, DollarSign, BarChart3, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const CostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [cost, setCost] = useState(null);

  useEffect(() => {
    loadCost();
  }, [id]);

  const loadCost = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/costmanagement/${id}`);
      if (response.ok) {
        const data = await response.json();
        setCost(data);
      } else {
        toast({
          title: t('common.error'),
          description: t('costManagement.loadFailed'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('加载成本详情失败:', error);
      toast({
        title: t('common.error'),
        description: t('costManagement.loadFailed'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBomItem = async (itemId) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    try {
      const response = await api.delete(`/api/costmanagement/bom-items/${itemId}`);
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('common.deleteSuccess')
        });
        // 重新加载成本数据
        await loadCost();
      } else {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast({
        title: t('common.error'),
        description: error.message || t('common.deleteFailed'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteLaborCost = async (laborId) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    try {
      const response = await api.delete(`/api/costmanagement/labor-costs/${laborId}`);
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('common.deleteSuccess')
        });
        loadCost();
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast({
        title: t('common.error'),
        description: t('common.deleteFailed'),
        variant: 'destructive'
      });
    }
  };

  const handleDeleteManufacturingCost = async (manufacturingId) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    try {
      const response = await api.delete(`/api/costmanagement/manufacturing-costs/${manufacturingId}`);
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('common.deleteSuccess')
        });
        loadCost();
      }
    } catch (error) {
      console.error('删除失败:', error);
      toast({
        title: t('common.error'),
        description: t('common.deleteFailed'),
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

  if (loading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-400">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!cost) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-400">{t('costManagement.noCosts')}</p>
        </div>
      </div>
    );
  }

  const bomTotal = cost.bomItems?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;
  const laborTotal = cost.laborCosts?.reduce((sum, item) => sum + (item.totalCost || 0), 0) || 0;
  const manufacturingTotal = cost.manufacturingCosts?.reduce((sum, item) => sum + (item.totalCost || 0), 0) || 0;
  const totalCost = bomTotal + laborTotal + manufacturingTotal;

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
                {cost.productName || t('costManagement.unknownProduct')}
              </h1>
              <p className="text-gray-400">
                {cost.productCode} {cost.productVersion && `- ${cost.productVersion}`} {cost.specification && `- ${cost.specification}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate(`/cost-management/${id}/analysis`)}
              variant="outline"
              className="border-gray-600"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {t('costManagement.analysis')}
            </Button>
            <Button
              onClick={() => navigate(`/cost-management/${id}/edit`)}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              {t('common.edit')}
            </Button>
          </div>
        </div>

        {/* 成本总览 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-6 border border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-200 mb-2">{t('costManagement.bomCost')}</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(bomTotal)}</p>
                <p className="text-xs text-blue-200 mt-1">{cost.bomItems?.length || 0} {t('costManagement.items')}</p>
              </div>
              <Package className="w-12 h-12 text-blue-200 opacity-50" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-6 border border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-200 mb-2">{t('costManagement.laborCost')}</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(laborTotal)}</p>
                <p className="text-xs text-green-200 mt-1">{cost.laborCosts?.length || 0} {t('costManagement.records')}</p>
              </div>
              <Users className="w-12 h-12 text-green-200 opacity-50" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-lg p-6 border border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-200 mb-2">{t('costManagement.manufacturingCost')}</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(manufacturingTotal)}</p>
                <p className="text-xs text-purple-200 mt-1">{cost.manufacturingCosts?.length || 0} {t('costManagement.items')}</p>
              </div>
              <Factory className="w-12 h-12 text-purple-200 opacity-50" />
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-lg p-6 border border-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-indigo-200 mb-2">{t('costManagement.totalCost')}</p>
                <p className="text-3xl font-bold text-white">{formatCurrency(totalCost)}</p>
              </div>
              <TrendingUp className="w-12 h-12 text-indigo-200 opacity-50" />
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
              onClick={() => navigate(`/cost-management/${id}/edit`)}
              variant="outline"
              size="sm"
              className="border-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('costManagement.addBomItem')}
            </Button>
          </div>
          
          {!cost.bomItems || cost.bomItems.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无BOM物料</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.materialName')}</th>
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.materialCode')}</th>
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.materialType')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.quantity')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.unitPrice')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.totalPrice')}</th>
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.supplier')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('common.delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.bomItems.map((item) => (
                    <tr key={item.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-white">{item.materialName}</td>
                      <td className="py-3 px-4 text-gray-400">{item.materialCode || '-'}</td>
                      <td className="py-3 px-4 text-gray-400">{item.materialType || '-'}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 px-4 text-right text-blue-400 font-semibold">{formatCurrency(item.totalPrice)}</td>
                      <td className="py-3 px-4 text-gray-400">{item.supplier || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => handleDeleteBomItem(item.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 人力成本 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-400" />
              {t('costManagement.laborCosts')}
            </h2>
            <Button
              onClick={() => navigate(`/cost-management/${id}/edit`)}
              variant="outline"
              size="sm"
              className="border-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('costManagement.addLaborCost')}
            </Button>
          </div>
          
          {!cost.laborCosts || cost.laborCosts.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无人力成本记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.engineerName')}</th>
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.role')}</th>
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.workDescription')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.hours')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.hourlyRate')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.totalCost')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('common.delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.laborCosts.map((labor) => (
                    <tr key={labor.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-white">{labor.engineerName || '-'}</td>
                      <td className="py-3 px-4 text-gray-400">{labor.role || '-'}</td>
                      <td className="py-3 px-4 text-gray-400">{labor.workDescription || '-'}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{labor.hours}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(labor.hourlyRate)}</td>
                      <td className="py-3 px-4 text-right text-green-400 font-semibold">{formatCurrency(labor.totalCost)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => handleDeleteLaborCost(labor.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 制造成本 */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Factory className="w-5 h-5 mr-2 text-purple-400" />
              {t('costManagement.manufacturingCosts')}
            </h2>
            <Button
              onClick={() => navigate(`/cost-management/${id}/edit`)}
              variant="outline"
              size="sm"
              className="border-gray-600"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('costManagement.addManufacturingCost')}
            </Button>
          </div>
          
          {!cost.manufacturingCosts || cost.manufacturingCosts.length === 0 ? (
            <p className="text-gray-400 text-center py-4">暂无制造成本记录</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.costName')}</th>
                    <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.costType')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.quantity')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.unitCost')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.coefficient')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.totalCost')}</th>
                    <th className="text-right py-3 px-4 text-gray-300">{t('common.delete')}</th>
                  </tr>
                </thead>
                <tbody>
                  {cost.manufacturingCosts.map((manufacturing) => (
                    <tr key={manufacturing.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-white">{manufacturing.costName}</td>
                      <td className="py-3 px-4 text-gray-400">{manufacturing.costType || '-'}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{manufacturing.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(manufacturing.unitCost)}</td>
                      <td className="py-3 px-4 text-right text-gray-300">{manufacturing.coefficient}</td>
                      <td className="py-3 px-4 text-right text-purple-400 font-semibold">{formatCurrency(manufacturing.totalCost)}</td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          onClick={() => handleDeleteManufacturingCost(manufacturing.id)}
                          variant="outline"
                          size="sm"
                          className="border-red-600 text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CostDetail;
