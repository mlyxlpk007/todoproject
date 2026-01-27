import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { DollarSign, Plus, Edit, Trash2, Eye, TrendingUp, Package, Users, Factory, BarChart3, PieChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const CostManagement = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [costs, setCosts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState('');

  useEffect(() => {
    loadCosts();
    loadProducts();
  }, [selectedProductId]);

  const loadProducts = async () => {
    try {
      const response = await api.get('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('加载产品列表失败:', error);
    }
  };

  const loadCosts = async () => {
    try {
      setLoading(true);
      const url = selectedProductId 
        ? `/api/costmanagement?productId=${selectedProductId}`
        : '/api/costmanagement';
      const response = await api.get(url);
      if (response.ok) {
        const data = await response.json();
        setCosts(data);
      } else {
        toast({
          title: t('common.error'),
          description: t('costManagement.loadFailed'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('加载成本列表失败:', error);
      toast({
        title: t('common.error'),
        description: t('costManagement.loadFailed'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('common.confirmDelete'))) return;
    
    try {
      const response = await api.delete(`/api/costmanagement/${id}`);
      if (response.ok) {
        toast({
          title: t('common.success'),
          description: t('common.deleteSuccess')
        });
        loadCosts();
      } else {
        toast({
          title: t('common.error'),
          description: t('common.deleteFailed'),
          variant: 'destructive'
        });
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

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-indigo-400" />
              {t('costManagement.title')}
            </h1>
            <p className="text-gray-400">{t('costManagement.description')}</p>
          </div>
          <Button
            onClick={() => navigate('/cost-management/new')}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('costManagement.createCost')}
          </Button>
        </div>

        {/* 筛选器 */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-4">
            <label className="text-gray-300">{t('costManagement.filterByProduct')}:</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">{t('common.all')}</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <Button
              onClick={loadCosts}
              variant="outline"
              className="border-gray-600"
            >
              {t('common.refresh')}
            </Button>
          </div>
        </div>

        {/* 成本列表 */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">{t('common.loading')}</p>
          </div>
        ) : costs.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/50 rounded-lg border border-gray-700">
            <DollarSign className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400 mb-4">{t('costManagement.noCosts')}</p>
            <Button
              onClick={() => navigate('/cost-management/new')}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('costManagement.createCost')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {costs.map((cost, index) => (
              <motion.div
                key={cost.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 hover:border-indigo-500 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-white">{cost.productName || t('costManagement.unknownProduct')}</h3>
                      {cost.productVersion && (
                        <span className="px-2 py-1 bg-indigo-600/20 text-indigo-300 rounded text-sm">
                          {cost.productVersion}
                        </span>
                      )}
                      {cost.specification && (
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-sm">
                          {cost.specification}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded text-sm ${
                        cost.status === 'active' ? 'bg-green-600/20 text-green-300' :
                        cost.status === 'draft' ? 'bg-yellow-600/20 text-yellow-300' :
                        'bg-gray-600/20 text-gray-300'
                      }`}>
                        {t(`costManagement.status.${cost.status}`)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                      <div className="flex items-center gap-2">
                        <Package className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-sm text-gray-400">{t('costManagement.bomCost')}</p>
                          <p className="text-lg font-semibold text-white">{formatCurrency(cost.bomTotal)}</p>
                          <p className="text-xs text-gray-500">{cost.bomItemCount} {t('costManagement.items')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm text-gray-400">{t('costManagement.laborCost')}</p>
                          <p className="text-lg font-semibold text-white">{formatCurrency(cost.laborTotal)}</p>
                          <p className="text-xs text-gray-500">{cost.laborCostCount} {t('costManagement.records')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Factory className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-sm text-gray-400">{t('costManagement.manufacturingCost')}</p>
                          <p className="text-lg font-semibold text-white">{formatCurrency(cost.manufacturingTotal)}</p>
                          <p className="text-xs text-gray-500">{cost.manufacturingCostCount} {t('costManagement.items')}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-indigo-400" />
                        <div>
                          <p className="text-sm text-gray-400">{t('costManagement.totalCost')}</p>
                          <p className="text-xl font-bold text-indigo-400">{formatCurrency(cost.totalCost)}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{t('costManagement.updatedAt')}: {cost.updatedAt}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      onClick={() => navigate(`/cost-management/${cost.id}/analysis`)}
                      variant="outline"
                      size="sm"
                      className="border-gray-600"
                    >
                      <BarChart3 className="w-4 h-4 mr-1" />
                      {t('costManagement.analysis')}
                    </Button>
                    <Button
                      onClick={() => navigate(`/cost-management/${cost.id}`)}
                      variant="outline"
                      size="sm"
                      className="border-gray-600"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {t('common.view')}
                    </Button>
                    <Button
                      onClick={() => navigate(`/cost-management/${cost.id}/edit`)}
                      variant="outline"
                      size="sm"
                      className="border-gray-600"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      onClick={() => handleDelete(cost.id)}
                      variant="outline"
                      size="sm"
                      className="border-red-600 text-red-400 hover:bg-red-600/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CostManagement;
