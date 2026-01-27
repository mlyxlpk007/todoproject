import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nContext';
import { ArrowLeft, PieChart, BarChart3, TrendingUp, Package, Users, Factory } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { api } from '@/lib/api';

const CostAnalysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalysis();
  }, [id]);

  const loadAnalysis = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/costmanagement/${id}/analysis`);
      if (response.ok) {
        const data = await response.json();
        setAnalysis(data);
      } else {
        toast({
          title: t('common.error'),
          description: t('costManagement.loadFailed'),
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('加载成本分析失败:', error);
      toast({
        title: t('common.error'),
        description: t('costManagement.loadFailed'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
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

  if (!analysis) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-400">{t('costManagement.noCosts')}</p>
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
              size="sm"
              className="border-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('common.back')}
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
                <BarChart3 className="w-8 h-8 mr-3 text-indigo-400" />
                {t('costManagement.analysis')}
              </h1>
              <p className="text-gray-400">{t('costManagement.costBreakdown')}</p>
            </div>
          </div>
        </div>

        {/* 总成本 */}
        <div className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 border border-indigo-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-200 mb-2">{t('costManagement.totalCost')}</p>
              <p className="text-4xl font-bold text-white">{formatCurrency(analysis.totalCost)}</p>
            </div>
            <TrendingUp className="w-16 h-16 text-indigo-200 opacity-50" />
          </div>
        </div>

        {/* 成本构成 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">{t('costManagement.bomCost')}</h3>
              </div>
              <span className="text-2xl font-bold text-blue-400">{formatCurrency(analysis.costBreakdown.bom.total)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${analysis.costBreakdown.bom.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{formatPercentage(analysis.costBreakdown.bom.percentage)}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-semibold text-white">{t('costManagement.laborCost')}</h3>
              </div>
              <span className="text-2xl font-bold text-green-400">{formatCurrency(analysis.costBreakdown.labor.total)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${analysis.costBreakdown.labor.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{formatPercentage(analysis.costBreakdown.labor.percentage)}</p>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Factory className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-semibold text-white">{t('costManagement.manufacturingCost')}</h3>
              </div>
              <span className="text-2xl font-bold text-purple-400">{formatCurrency(analysis.costBreakdown.manufacturing.total)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{ width: `${analysis.costBreakdown.manufacturing.percentage}%` }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{formatPercentage(analysis.costBreakdown.manufacturing.percentage)}</p>
          </div>
        </div>

        {/* BOM物料分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <PieChart className="w-5 h-5 mr-2 text-blue-400" />
              {t('costManagement.bomAnalysis')} - {t('costManagement.byType')}
            </h3>
            <div className="space-y-3">
              {analysis.bomAnalysis.byType.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white">{item.type}</span>
                      <span className="text-blue-400 font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${(item.total / analysis.bomAnalysis.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.count} {t('costManagement.items')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-green-400" />
              {t('costManagement.bomAnalysis')} - {t('costManagement.byCategory')}
            </h3>
            <div className="space-y-3">
              {analysis.bomAnalysis.byCategory.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white">{item.category}</span>
                      <span className="text-green-400 font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(item.total / analysis.bomAnalysis.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.count} {t('costManagement.items')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 高成本物料（降本空间） */}
        <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-yellow-400" />
            {t('costManagement.highCostMaterials')}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.materialName')}</th>
                  <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.materialCode')}</th>
                  <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.quantity')}</th>
                  <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.unitPrice')}</th>
                  <th className="text-right py-3 px-4 text-gray-300">{t('costManagement.totalPrice')}</th>
                  <th className="text-left py-3 px-4 text-gray-300">{t('costManagement.supplier')}</th>
                </tr>
              </thead>
              <tbody>
                {analysis.bomAnalysis.highCostMaterials.map((material, index) => (
                  <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white">{material.materialName}</td>
                    <td className="py-3 px-4 text-gray-400">{material.materialCode || '-'}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{material.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-300">{formatCurrency(material.unitPrice)}</td>
                    <td className="py-3 px-4 text-right text-yellow-400 font-semibold">{formatCurrency(material.totalPrice)}</td>
                    <td className="py-3 px-4 text-gray-400">{material.supplier || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 人力成本分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-400" />
              {t('costManagement.laborAnalysis')} - {t('costManagement.byEngineer')}
            </h3>
            <div className="space-y-3">
              {analysis.laborAnalysis.byEngineer.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white">{item.engineer}</span>
                      <span className="text-green-400 font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${(item.total / analysis.laborAnalysis.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.hours.toFixed(1)} {t('costManagement.hours')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-400" />
              {t('costManagement.laborAnalysis')} - {t('costManagement.byRole')}
            </h3>
            <div className="space-y-3">
              {analysis.laborAnalysis.byRole.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white">{item.role}</span>
                      <span className="text-purple-400 font-semibold">{formatCurrency(item.total)}</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-purple-500 h-2 rounded-full"
                        style={{ width: `${(item.total / analysis.laborAnalysis.total) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{item.hours.toFixed(1)} {t('costManagement.hours')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysis;
