import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle, BarChart3 } from 'lucide-react';
import { assetHealthApi, assetsApi } from '@/lib/api';

const AssetHealthDashboard = () => {
  const { toast } = useToast();
  const [dashboardData, setDashboardData] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [assetHealth, setAssetHealth] = useState(null);
  const [healthHistory, setHealthHistory] = useState([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      loadAssetHealth(selectedAsset);
    }
  }, [selectedAsset]);

  const loadDashboard = async () => {
    try {
      const data = await assetHealthApi.getDashboard();
      setDashboardData(data);
    } catch (error) {
      console.error('加载仪表盘失败:', error);
      toast({ title: "加载仪表盘失败", variant: "destructive" });
    }
  };

  const loadAssetHealth = async (assetId) => {
    try {
      const [health, history] = await Promise.all([
        assetHealthApi.getHealth(assetId),
        assetHealthApi.getHealthHistory(assetId, 30)
      ]);
      setAssetHealth(health);
      setHealthHistory(history);
    } catch (error) {
      console.error('加载资产健康度失败:', error);
      toast({ title: "加载资产健康度失败", variant: "destructive" });
    }
  };

  const getHealthColor = (score) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBgColor = (score) => {
    if (score >= 80) return 'bg-green-500/20 border-green-500/50';
    if (score >= 60) return 'bg-yellow-500/20 border-yellow-500/50';
    return 'bg-red-500/20 border-red-500/50';
  };

  if (!dashboardData) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">资产健康度仪表盘</h1>
          <p className="text-gray-400">复用率、缺陷密度、变更频率、回归成本、维护负担</p>
        </div>

        {/* 概览统计 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">总资产数</p>
                <p className="text-2xl font-bold text-white">{dashboardData.totalAssets}</p>
              </div>
              <Activity className="w-8 h-8 text-indigo-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">健康资产</p>
                <p className="text-2xl font-bold text-green-400">
                  {dashboardData.assetsHealth.filter(a => a.healthScore >= 80).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">警告资产</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {dashboardData.assetsHealth.filter(a => a.healthScore >= 60 && a.healthScore < 80).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-400" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">风险资产</p>
                <p className="text-2xl font-bold text-red-400">
                  {dashboardData.assetsHealth.filter(a => a.healthScore < 60).length}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </motion.div>
        </div>

        {/* 资产类型和成熟度分布 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">资产类型分布</h2>
            <div className="space-y-3">
              {dashboardData.assetsByType.map((item, index) => (
                <div key={item.type} className="flex items-center justify-between">
                  <span className="text-gray-300">{item.type}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${(item.count / dashboardData.totalAssets) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800/50 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">成熟度分布</h2>
            <div className="space-y-3">
              {dashboardData.assetsByMaturity.map((item, index) => (
                <div key={item.maturity} className="flex items-center justify-between">
                  <span className="text-gray-300">{item.maturity}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          item.maturity === '核心' ? 'bg-green-500' :
                          item.maturity === '稳定' ? 'bg-yellow-500' :
                          'bg-gray-500'
                        }`}
                        style={{ width: `${(item.count / dashboardData.totalAssets) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-white font-medium w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* 资产健康度列表 */}
        <div className="bg-gray-800/50 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">资产健康度排名</h2>
          <div className="space-y-3">
            {dashboardData.assetsHealth.slice(0, 10).map((asset, index) => (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedAsset(asset.id)}
                className={`bg-gray-700/50 rounded-lg p-4 border cursor-pointer transition-all hover:border-indigo-500 ${
                  selectedAsset === asset.id ? 'border-indigo-500' : 'border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 w-8">#{index + 1}</span>
                      <h3 className="font-semibold text-white">{asset.name}</h3>
                      <span className="px-2 py-1 text-xs rounded bg-blue-500/20 text-blue-300">
                        {asset.type}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        asset.maturity === '核心' ? 'bg-green-500/20 text-green-300' :
                        asset.maturity === '稳定' ? 'bg-yellow-500/20 text-yellow-300' :
                        'bg-gray-500/20 text-gray-300'
                      }`}>
                        {asset.maturity}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 mt-2 ml-11">
                      <div>
                        <span className="text-xs text-gray-500">复用率</span>
                        <span className="text-sm text-white ml-2">{(asset.reuseRate * 100).toFixed(1)}%</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">缺陷密度</span>
                        <span className="text-sm text-white ml-2">{asset.defectDensity.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-gray-500">变更频率</span>
                        <span className="text-sm text-white ml-2">{asset.changeFrequency.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">健康度</p>
                    <p className={`text-2xl font-bold ${getHealthColor(asset.healthScore)}`}>
                      {asset.healthScore.toFixed(1)}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 选中资产的详细健康度 */}
        {selectedAsset && assetHealth && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800/50 rounded-lg p-6"
          >
            <h2 className="text-xl font-semibold text-white mb-4">详细健康度指标</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className={`${getHealthBgColor(assetHealth.healthScore)} rounded-lg p-4 border`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">综合健康度</span>
                  <Activity className="w-4 h-4 text-gray-400" />
                </div>
                <p className={`text-3xl font-bold ${getHealthColor(assetHealth.healthScore)}`}>
                  {assetHealth.healthScore.toFixed(1)}
                </p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">复用率</span>
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <p className="text-3xl font-bold text-white">{(assetHealth.reuseRate * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">缺陷密度</span>
                  <AlertCircle className="w-4 h-4 text-red-400" />
                </div>
                <p className="text-3xl font-bold text-white">{assetHealth.defectDensity.toFixed(2)}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">变更频率</span>
                  <BarChart3 className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-3xl font-bold text-white">{assetHealth.changeFrequency.toFixed(2)}</p>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">维护负担</span>
                  <TrendingDown className="w-4 h-4 text-orange-400" />
                </div>
                <p className="text-3xl font-bold text-white">{assetHealth.maintenanceBurden.toFixed(2)}</p>
              </div>
            </div>

            {/* 健康度历史趋势 */}
            {healthHistory.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">健康度趋势（最近30天）</h3>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <div className="flex items-end justify-between h-32 gap-2">
                    {healthHistory.slice(0, 10).reverse().map((point, index) => (
                      <div key={index} className="flex-1 flex flex-col items-center">
                        <div
                          className="w-full bg-indigo-500 rounded-t transition-all hover:bg-indigo-400"
                          style={{ height: `${(point.healthScore / 100) * 100}%` }}
                          title={`${point.calculatedAt}: ${point.healthScore.toFixed(1)}`}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AssetHealthDashboard;
