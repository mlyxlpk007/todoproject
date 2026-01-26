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
      // 重置表单
      setSelectedAsset(null);
      setVersion('');
      setNotes('');
      setSearchTerm('');
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
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
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
                  className={`flex-1 ${
                    relationType === 'used' 
                      ? 'bg-blue-600 hover:bg-blue-700' 
                      : ''
                  }`}
                >
                  使用
                </Button>
                <Button
                  variant={relationType === 'modified' ? 'default' : 'outline'}
                  onClick={() => setRelationType('modified')}
                  className={`flex-1 ${
                    relationType === 'modified' 
                      ? 'bg-yellow-600 hover:bg-yellow-700' 
                      : ''
                  }`}
                >
                  修改
                </Button>
                <Button
                  variant={relationType === 'created' ? 'default' : 'outline'}
                  onClick={() => setRelationType('created')}
                  className={`flex-1 ${
                    relationType === 'created' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : ''
                  }`}
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
              {filteredAssets.length > 0 ? (
                filteredAssets.map(asset => (
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
                        {asset.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {asset.description}
                          </p>
                        )}
                      </div>
                      {selectedAsset?.id === asset.id && (
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center ml-2">
                          <div className="w-2 h-2 rounded-full bg-white"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  {searchTerm ? '未找到匹配的资产' : '暂无资产，请先创建资产'}
                </div>
              )}
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
