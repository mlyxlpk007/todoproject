import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { useToast } from '@/components/ui/use-toast';
import { Layers, Plus, Calendar, Tag, ArrowLeft, Edit, Trash2, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productsApi } from '@/lib/api';

const ProductVersions = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [versions, setVersions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);

  useEffect(() => {
    loadVersions();
    loadProducts();
  }, []);

  const loadVersions = async () => {
    try {
      setLoading(true);
      const data = await productsApi.getVersions();
      setVersions(data || []);
    } catch (error) {
      console.error('加载版本失败:', error);
      toast({ title: t('common.error'), description: t('productManagement.loadFailed'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const data = await productsApi.getAll();
      setProducts(data || []);
    } catch (error) {
      console.error('加载产品失败:', error);
    }
  };

  const handleSaveVersion = async (versionData) => {
    try {
      if (editingVersion) {
        await productsApi.updateVersion(editingVersion.id, versionData);
        toast({ title: t('common.success'), description: t('common.updateSuccess') });
      } else {
        await productsApi.createVersion(versionData.productId, versionData);
        toast({ title: t('common.success'), description: t('common.createSuccess') });
      }
      setIsVersionModalOpen(false);
      setEditingVersion(null);
      loadVersions();
    } catch (error) {
      console.error('保存版本失败:', error);
      toast({ 
        title: t('common.error'), 
        description: error.message || (editingVersion ? t('common.updateFailed') : t('common.createFailed')), 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteVersion = async (version) => {
    if (!window.confirm(t('common.confirmDelete'))) {
      return;
    }
    try {
      await productsApi.deleteVersion(version.id);
      toast({ title: t('common.success'), description: t('common.deleteSuccess') });
      loadVersions();
    } catch (error) {
      console.error('删除版本失败:', error);
      toast({ title: t('common.error'), description: error.message || t('common.deleteFailed'), variant: "destructive" });
    }
  };

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
                <Layers className="w-8 h-8 mr-3 text-indigo-400" />
                {t('productManagement.versionManagement')}
              </h1>
              <p className="text-gray-400">{t('productManagement.versionManagementDesc')}</p>
            </div>
          </div>
          <Button onClick={() => { setEditingVersion(null); setIsVersionModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            {t('productManagement.createVersion')}
          </Button>
        </div>

        {/* 版本列表 */}
        {loading ? (
          <div className="text-center py-12 text-gray-500">
            <p>{t('common.loading')}</p>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Layers className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p>{t('productManagement.noVersions')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {versions.map((version) => (
              <motion.div
                key={version.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 hover:border-indigo-500 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Tag className="w-5 h-5 text-indigo-400" />
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-white">{version.version}</h3>
                        {version.productName && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {version.productName} ({version.productCode})
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{version.description || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{version.releaseDate || '-'}</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        version.status === 'stable' ? 'bg-green-500/20 text-green-400' :
                        version.status === 'beta' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {version.status || 'draft'}
                      </span>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditingVersion(version); setIsVersionModalOpen(true); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteVersion(version)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* 版本创建/编辑模态框 */}
      {isVersionModalOpen && (
        <VersionModal
          isOpen={isVersionModalOpen}
          onClose={() => { setIsVersionModalOpen(false); setEditingVersion(null); }}
          onSubmit={handleSaveVersion}
          editingVersion={editingVersion}
          products={products}
        />
      )}
    </div>
  );
};

// 版本模态框组件
const VersionModal = ({ isOpen, onClose, onSubmit, editingVersion, products }) => {
  const { t } = useI18n();
  const [formData, setFormData] = useState({
    productId: '',
    version: '',
    description: '',
    status: 'draft',
    releaseDate: '',
  });

  useEffect(() => {
    if (editingVersion) {
      setFormData({
        productId: editingVersion.productId || '',
        version: editingVersion.version || '',
        description: editingVersion.description || '',
        status: editingVersion.status || 'draft',
        releaseDate: editingVersion.releaseDate || '',
      });
    } else {
      setFormData({
        productId: '',
        version: '',
        description: '',
        status: 'draft',
        releaseDate: '',
      });
    }
  }, [editingVersion, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.productId || !formData.version) {
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
              {editingVersion ? t('common.edit') : t('productManagement.createVersion')}
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
              <select
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                required
                disabled={!!editingVersion}
              >
                <option value="">{t('common.select')}</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                版本号 *
              </label>
              <input
                type="text"
                name="version"
                value={formData.version}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                placeholder="例如: v1.0.0"
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
                状态
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="draft">草稿</option>
                <option value="beta">测试版</option>
                <option value="stable">稳定版</option>
                <option value="deprecated">已弃用</option>
              </select>
            </div>
            <div className="form-group">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                发布日期
              </label>
              <input
                type="date"
                name="releaseDate"
                value={formData.releaseDate}
                onChange={handleChange}
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

export default ProductVersions;
