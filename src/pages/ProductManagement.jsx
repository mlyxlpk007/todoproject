import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { useToast } from '@/components/ui/use-toast';
import { List, Package, BarChart3, FileText, ShoppingBag, Layers, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productsApi } from '@/lib/api';

const ProductManagement = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalProducts: 0,
    activeVersions: 0,
    relatedProjects: 0,
    recentProducts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [products, analytics] = await Promise.all([
        productsApi.getAll().catch(() => []),
        productsApi.getAnalytics().catch(() => null)
      ]);
      
      setStats({
        totalProducts: products?.length || 0,
        activeVersions: analytics?.activeVersions || 0,
        relatedProjects: analytics?.relatedProjects || 0,
        recentProducts: products?.slice(0, 5) || []
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
      toast({ 
        title: t('common.error'), 
        description: t('productManagement.loadFailed'), 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <ShoppingBag className="w-8 h-8 mr-3 text-indigo-400" />
            {t('productManagement.title')}
          </h1>
          <p className="text-gray-400">{t('productManagement.description')}</p>
        </div>

        {/* 子页面导航 */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button
            onClick={() => navigate('/products/structure')}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 h-auto p-4 flex flex-col items-start"
          >
            <Target className="w-6 h-6 mb-2 text-indigo-400" />
            <span className="font-semibold text-white">{t('productManagement.productStructure')}</span>
            <span className="text-xs text-gray-400 mt-1">{t('productManagement.productStructureDesc')}</span>
          </Button>
          
          <Button
            onClick={() => navigate('/products/catalog')}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 h-auto p-4 flex flex-col items-start"
          >
            <List className="w-6 h-6 mb-2 text-indigo-400" />
            <span className="font-semibold text-white">{t('productManagement.productCatalog')}</span>
            <span className="text-xs text-gray-400 mt-1">{t('productManagement.productCatalogDesc')}</span>
          </Button>
          
          <Button
            onClick={() => navigate('/products/versions')}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 h-auto p-4 flex flex-col items-start"
          >
            <Layers className="w-6 h-6 mb-2 text-indigo-400" />
            <span className="font-semibold text-white">{t('productManagement.versionManagement')}</span>
            <span className="text-xs text-gray-400 mt-1">{t('productManagement.versionManagementDesc')}</span>
          </Button>
          
          <Button
            onClick={() => navigate('/products/analytics')}
            className="bg-gray-800/50 hover:bg-gray-700/50 border border-gray-600 h-auto p-4 flex flex-col items-start"
          >
            <BarChart3 className="w-6 h-6 mb-2 text-indigo-400" />
            <span className="font-semibold text-white">{t('productManagement.productAnalytics')}</span>
            <span className="text-xs text-gray-400 mt-1">{t('productManagement.productAnalyticsDesc')}</span>
          </Button>
        </div>

        {/* 快速统计 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('productManagement.totalProducts')}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {loading ? '...' : stats.totalProducts}
                </p>
              </div>
              <Package className="w-8 h-8 text-indigo-400" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('productManagement.activeVersions')}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {loading ? '...' : stats.activeVersions}
                </p>
              </div>
              <Layers className="w-8 h-8 text-green-400" />
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">{t('productManagement.relatedProjects')}</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {loading ? '...' : stats.relatedProjects}
                </p>
              </div>
              <FileText className="w-8 h-8 text-blue-400" />
            </div>
          </motion.div>
        </div>

        {/* 最近更新 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gray-800/50 rounded-lg p-6 border border-gray-700"
        >
          <h2 className="text-xl font-semibold text-white mb-4">{t('productManagement.recentUpdates')}</h2>
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('common.loading')}</p>
            </div>
          ) : stats.recentProducts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-3 text-gray-600" />
              <p>{t('productManagement.noProducts')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.recentProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/products/edit/${product.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <Package className="w-5 h-5 text-indigo-400" />
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-sm text-gray-400">{product.code} - {product.currentVersion || '-'}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    product.status === 'active' ? 'bg-green-500/20 text-green-400' :
                    product.status === 'archived' ? 'bg-gray-500/20 text-gray-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {product.status || 'active'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProductManagement;
