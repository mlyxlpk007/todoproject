import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Clock, TrendingUp, AlertTriangle, Code, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { assetsApi } from '@/lib/api';

const AssetEvolution = () => {
  const { toast } = useToast();
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetDetails, setAssetDetails] = useState(null);

  useEffect(() => {
    loadAssets();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      loadAssetDetails(selectedAsset);
    }
  }, [selectedAsset]);

  const loadAssets = async () => {
    try {
      const data = await assetsApi.getAll();
      setAssets(data);
    } catch (error) {
      console.error('加载资产失败:', error);
      toast({ title: "加载资产失败", variant: "destructive" });
    }
  };

  const loadAssetDetails = async (assetId) => {
    try {
      const data = await assetsApi.getById(assetId);
      setAssetDetails(data);
    } catch (error) {
      console.error('加载资产详情失败:', error);
      toast({ title: "加载资产详情失败", variant: "destructive" });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">资产演进视图</h1>
          <p className="text-gray-400">版本演进、改动原因、质量变化、技术债记录</p>
        </div>

        {/* 资产选择 */}
        <div className="mb-6 bg-gray-800/50 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">选择资产</label>
          <select
            value={selectedAsset || ''}
            onChange={(e) => setSelectedAsset(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">请选择资产</option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.type})
              </option>
            ))}
          </select>
        </div>

        {assetDetails ? (
          <div className="space-y-6">
            {/* 资产基本信息 */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4">{assetDetails.name}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-gray-500">类型</p>
                  <p className="text-sm text-white">{assetDetails.type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">成熟度</p>
                  <p className="text-sm text-white">{assetDetails.maturity}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">责任人</p>
                  <p className="text-sm text-white">{assetDetails.ownerName || '未分配'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">复用次数</p>
                  <p className="text-sm text-white">{assetDetails.reuseCount}</p>
                </div>
              </div>
            </div>

            {/* 版本演进时间线 */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-indigo-400" />
                版本演进时间线
              </h2>
              {assetDetails.versions && assetDetails.versions.length > 0 ? (
                <div className="relative">
                  {/* 时间线 */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-600"></div>
                  <div className="space-y-6">
                    {assetDetails.versions.map((version, index) => (
                      <motion.div
                        key={version.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="relative pl-12"
                      >
                        {/* 时间线节点 */}
                        <div className="absolute left-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center border-4 border-gray-800">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>

                        {/* 版本卡片 */}
                        <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="text-lg font-semibold text-white flex items-center">
                                <Code className="w-4 h-4 mr-2 text-indigo-400" />
                                {version.version}
                              </h3>
                              <p className="text-xs text-gray-400 mt-1">
                                {version.versionDate} {version.changedBy && `· ${version.changedBy}`}
                              </p>
                            </div>
                            {version.qualityScore !== null && (
                              <div className="text-right">
                                <p className="text-xs text-gray-500">质量评分</p>
                                <p className={`text-lg font-bold ${
                                  version.qualityScore >= 80 ? 'text-green-400' :
                                  version.qualityScore >= 60 ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {version.qualityScore.toFixed(1)}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* 改动原因 */}
                          {version.changeReason && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-1">改动原因</p>
                              <p className="text-sm text-gray-300">{version.changeReason}</p>
                            </div>
                          )}

                          {/* 质量变化 */}
                          {version.qualityChanges && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-1 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                质量变化
                              </p>
                              <p className="text-sm text-gray-300">{version.qualityChanges}</p>
                            </div>
                          )}

                          {/* 技术债记录 */}
                          {version.technicalDebt && (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-1 flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1 text-yellow-400" />
                                技术债记录
                              </p>
                              <p className="text-sm text-yellow-300">{version.technicalDebt}</p>
                            </div>
                          )}

                          {/* 指标 */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-600">
                            {version.defectDensity !== null && (
                              <div>
                                <p className="text-xs text-gray-500">缺陷密度</p>
                                <p className="text-sm text-white">{version.defectDensity.toFixed(2)}</p>
                              </div>
                            )}
                            {version.changeFrequency !== null && (
                              <div>
                                <p className="text-xs text-gray-500">变更频率</p>
                                <p className="text-sm text-white">{version.changeFrequency.toFixed(2)}</p>
                              </div>
                            )}
                            {version.regressionCost !== null && (
                              <div>
                                <p className="text-xs text-gray-500">回归成本</p>
                                <p className="text-sm text-white">{version.regressionCost.toFixed(2)}h</p>
                              </div>
                            )}
                            {version.maintenanceBurden !== null && (
                              <div>
                                <p className="text-xs text-gray-500">维护负担</p>
                                <p className="text-sm text-white">{version.maintenanceBurden.toFixed(2)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Clock className="w-16 h-16 mx-auto mb-4 text-gray-600" />
                  <p>暂无版本记录</p>
                </div>
              )}
            </div>

            {/* 关联项目 */}
            {assetDetails.projectRelations && assetDetails.projectRelations.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-white mb-4">关联项目</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {assetDetails.projectRelations.map(relation => (
                    <div key={relation.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{relation.projectName}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          relation.relationType === 'used' ? 'bg-blue-500/20 text-blue-300' :
                          relation.relationType === 'modified' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-green-500/20 text-green-300'
                        }`}>
                          {relation.relationType === 'used' ? '使用' :
                           relation.relationType === 'modified' ? '修改' : '新增'}
                        </span>
                      </div>
                      {relation.version && (
                        <p className="text-sm text-gray-400">版本: {relation.version}</p>
                      )}
                      {relation.notes && (
                        <p className="text-sm text-gray-500 mt-2">{relation.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-800/50 rounded-lg p-12 text-center">
            <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">请选择一个资产查看演进历史</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetEvolution;
