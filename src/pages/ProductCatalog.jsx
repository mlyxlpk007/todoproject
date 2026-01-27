import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, Package, Eye, X, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productsApi } from '@/lib/api';

const ProductCatalog = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isProductModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getAll();
      console.log('[ProductCatalog] 加载的产品数据:', data);
      console.log('[ProductCatalog] 第一个产品的 currentVersion:', data?.[0]?.currentVersion);
      setProducts(data || []);
    } catch (error) {
      console.error('加载产品失败:', error);
      toast({ title: t('common.error'), description: t('productManagement.loadFailed'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setProductModalOpen(true);
  };

  const handleEditProduct = (product) => {
    navigate(`/products/edit/${product.id}`);
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, productData);
        toast({ title: t('common.success'), description: t('common.updateSuccess') });
      } else {
        await productsApi.create(productData);
        toast({ title: t('common.success'), description: t('common.createSuccess') });
      }
      setProductModalOpen(false);
      setEditingProduct(null);
      loadProducts();
    } catch (error) {
      console.error('保存产品失败:', error);
      toast({ 
        title: t('common.error'), 
        description: error.message || (editingProduct ? t('common.updateFailed') : t('common.createFailed')), 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(t('common.confirmDelete'))) {
      return;
    }
    try {
      await productsApi.delete(product.id);
      toast({ title: t('common.success'), description: t('common.deleteSuccess') });
      loadProducts();
    } catch (error) {
      console.error('删除产品失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.deleteFailed'), variant: "destructive" });
    }
  };

  const filteredProducts = products.filter(product =>
    product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/products')}
              className="border-gray-600 hover:bg-gray-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <Package className="w-8 h-8 mr-3 text-indigo-400" />
                {t('productManagement.productCatalog')}
              </h1>
              <p className="text-gray-400">{t('productManagement.productCatalogDesc')}</p>
            </div>
          </div>
          <Button onClick={handleCreateProduct}>
            <Plus className="w-4 h-4 mr-2" />
            {t('productManagement.createProduct')}
          </Button>
        </div>

        {/* 搜索栏 */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('productManagement.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-700 focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* 产品列表 */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t('common.loading')}</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p>{t('productManagement.noProducts')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-indigo-500 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-semibold text-white">{product.name}</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditProduct(product)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteProduct(product)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2 text-sm text-gray-400">
                  <p><span className="text-gray-500">{t('productManagement.productCode')}:</span> {product.code || '-'}</p>
                  <p><span className="text-gray-500">{t('productManagement.currentVersion')}:</span> {product.currentVersion || '-'}</p>
                  <p><span className="text-gray-500">{t('productManagement.status')}:</span> {product.status || '-'}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 产品创建/编辑模态框 */}
      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => {
            setProductModalOpen(false);
            setEditingProduct(null);
          }}
          onSubmit={handleSaveProduct}
          editingProduct={editingProduct}
        />
      )}
    </div>
  );
};

// 产品模态框组件
const ProductModal = ({ isOpen, onClose, onSubmit, editingProduct }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    currentVersion: '',
    status: 'active',
  });

  useEffect(() => {
    if (editingProduct) {
      setFormData({
        name: editingProduct.name || '',
        code: editingProduct.code || '',
        description: editingProduct.description || '',
        currentVersion: editingProduct.currentVersion || '',
        status: editingProduct.status || 'active',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        description: '',
        currentVersion: '',
        status: 'active',
      });
    }
  }, [editingProduct, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      return;
    }
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
              {editingProduct ? t('common.edit') : t('productManagement.createProduct')}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <X size={20} className="text-gray-400" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.productName')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.productCode')} *
              </label>
              <input
                type="text"
                name="code"
                value={formData.code}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.description')}
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.currentVersion')}
              </label>
              <input
                type="text"
                name="currentVersion"
                value={formData.currentVersion}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="例如: v1.0.0"
              />
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                {t('productManagement.status')}
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="active">{t('productManagement.active')}</option>
                <option value="archived">{t('productManagement.archived')}</option>
                <option value="deprecated">{t('productManagement.deprecated')}</option>
              </select>
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

export default ProductCatalog;
