import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Search, Filter, Package, User, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assetsApi, projectsApi, usersApi } from '@/lib/api';

const AssetRegister = () => {
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterMaturity, setFilterMaturity] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assetsData, projectsData, usersData] = await Promise.all([
        assetsApi.getAll(),
        projectsApi.getAll(),
        usersApi.getAll()
      ]);
      setAssets(assetsData);
      setProjects(projectsData);
      setUsers(usersData);
    } catch (error) {
      console.error('加载数据失败:', error);
      toast({ title: "加载数据失败", variant: "destructive" });
    }
  };

  const handleSave = async (formData) => {
    try {
      if (editingAsset) {
        await assetsApi.update(editingAsset.id, formData);
        toast({ title: "资产更新成功" });
      } else {
        await assetsApi.create(formData);
        toast({ title: "资产创建成功" });
      }
      setIsModalOpen(false);
      setEditingAsset(null);
      loadData();
    } catch (error) {
      console.error('保存资产失败:', error);
      toast({ title: "保存资产失败", description: error.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个资产吗？')) return;
    try {
      await assetsApi.delete(id);
      toast({ title: "资产删除成功" });
      loadData();
    } catch (error) {
      console.error('删除资产失败:', error);
      toast({ title: "删除资产失败", variant: "destructive" });
    }
  };

  const filteredAssets = assets.filter(asset => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.description && asset.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'all' || asset.type === filterType;
    const matchesMaturity = filterMaturity === 'all' || asset.maturity === filterMaturity;
    return matchesSearch && matchesType && matchesMaturity;
  });

  const assetTypes = ['功能', '代码', 'API', 'PCBA'];
  const maturityLevels = ['试验', '稳定', '核心'];

  const getOwnerName = (ownerId) => {
    const user = users.find(u => u.id === ownerId);
    return user?.name || '未分配';
  };

  const getProjectNames = (projectIds) => {
    if (!projectIds || projectIds.length === 0) return '无';
    return projectIds.slice(0, 3).map(id => {
      const project = projects.find(p => p.id === id);
      return project?.projectName || id;
    }).join(', ') + (projectIds.length > 3 ? '...' : '');
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">资产台账</h1>
            <p className="text-gray-400">资产名称、类型、成熟度、责任人、复用次数、关联项目</p>
          </div>
          <Button
            onClick={() => {
              setEditingAsset(null);
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增资产
          </Button>
        </div>

        {/* 搜索和筛选 */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="搜索资产..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">所有类型</option>
              {assetTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <select
              value={filterMaturity}
              onChange={(e) => setFilterMaturity(e.target.value)}
              className="bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">所有成熟度</option>
              {maturityLevels.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <div className="text-sm text-gray-400 flex items-center">
              共 {filteredAssets.length} 项资产
            </div>
          </div>
        </div>

        {/* 资产列表 */}
        <div className="bg-gray-800/50 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">资产名称</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">类型</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">成熟度</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">责任人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">复用次数</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">关联项目</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredAssets.map((asset) => (
                  <motion.tr
                    key={asset.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-700/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Package className="w-4 h-4 mr-2 text-indigo-400" />
                        <div>
                          <div className="text-sm font-medium text-white">{asset.name}</div>
                          {asset.description && (
                            <div className="text-xs text-gray-400 mt-1">{asset.description.substring(0, 50)}...</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-300">
                        {asset.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded ${
                        asset.maturity === '核心' ? 'bg-green-500/20 text-green-300' :
                        asset.maturity === '稳定' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {asset.maturity}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-300">
                        <User className="w-4 h-4 mr-1" />
                        {getOwnerName(asset.ownerId)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-white font-medium">{asset.reuseCount}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-300">
                        <Link2 className="w-4 h-4 mr-1" />
                        <span className="max-w-xs truncate">{getProjectNames(asset.relatedProjectIds)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingAsset(asset);
                            setIsModalOpen(true);
                          }}
                          className="text-indigo-400 hover:text-indigo-300"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(asset.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredAssets.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              暂无资产数据
            </div>
          )}
        </div>

        {/* 资产编辑模态框 */}
        <AnimatePresence>
          {isModalOpen && (
            <AssetModal
              asset={editingAsset}
              users={users}
              onSave={handleSave}
              onClose={() => {
                setIsModalOpen(false);
                setEditingAsset(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 资产编辑模态框组件
const AssetModal = ({ asset, users, onSave, onClose }) => {
  const [formData, setFormData] = useState({
    name: asset?.name || '',
    type: asset?.type || '功能',
    maturity: asset?.maturity || '试验',
    ownerId: asset?.ownerId || '',
    description: asset?.description || '',
    tags: asset?.tags || []
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        <h2 className="text-2xl font-bold text-white mb-4">
          {asset ? '编辑资产' : '新增资产'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">资产名称 *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">类型 *</label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="功能">功能</option>
                <option value="代码">代码</option>
                <option value="API">API</option>
                <option value="PCBA">PCBA</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">成熟度 *</label>
              <select
                required
                value={formData.maturity}
                onChange={(e) => setFormData({ ...formData, maturity: e.target.value })}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              >
                <option value="试验">试验</option>
                <option value="稳定">稳定</option>
                <option value="核心">核心</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">责任人</label>
            <select
              value={formData.ownerId}
              onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">未分配</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>{user.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
              保存
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

export default AssetRegister;
