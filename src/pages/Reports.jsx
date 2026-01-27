import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/i18n/I18nContext';
import { useToast } from '@/components/ui/use-toast';
import { FileText, User, Calendar, Clock, Briefcase, Users, Search, TrendingUp, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { reportsApi, usersApi, stakeholdersApi } from '@/lib/api';

const Reports = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [reportType, setReportType] = useState('person'); // 'person' or 'engineer'
  const [personName, setPersonName] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [personReport, setPersonReport] = useState(null);
  const [engineerReport, setEngineerReport] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [stakeholders, setStakeholders] = useState([]);
  const [allowManualInput, setAllowManualInput] = useState(false);

  useEffect(() => {
    loadEngineers();
    loadStakeholders();
  }, []);

  const loadEngineers = async () => {
    try {
      const data = await usersApi.getAll();
      setEngineers(data || []);
    } catch (error) {
      console.error('加载工程师列表失败:', error);
    }
  };

  const loadStakeholders = async () => {
    try {
      const data = await stakeholdersApi.getAll();
      console.log('[Reports] 加载的相关方数据:', data);
      setStakeholders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('加载相关方列表失败:', error);
      setStakeholders([]);
    }
  };

  const handleSearch = async () => {
    if (reportType === 'person' && !personName.trim()) {
      toast({
        title: t('common.error'),
        description: '请输入人名',
        variant: 'destructive'
      });
      return;
    }

    if (reportType === 'engineer' && !selectedEngineer) {
      toast({
        title: t('common.error'),
        description: '请选择工程师',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLoading(true);
      if (reportType === 'person') {
        const result = await reportsApi.getPersonReport(personName, startDate || null, endDate || null);
        setPersonReport(result);
        setEngineerReport(null);
      } else {
        const result = await reportsApi.getEngineerReport(selectedEngineer, startDate || null, endDate || null);
        setEngineerReport(result);
        setPersonReport(null);
      }
    } catch (error) {
      console.error('获取报告失败:', error);
      toast({
        title: t('common.error'),
        description: error.message || '获取报告失败',
        variant: 'destructive'
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
            <FileText className="w-8 h-8 mr-3 text-indigo-400" />
            工作报告
          </h1>
          <p className="text-gray-400">查询人员工作情况和工程师工作量统计</p>
        </div>

        {/* 查询表单 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-lg p-6 border border-gray-700 mb-6"
        >
          <div className="flex items-center gap-4 mb-4">
            <label className="text-sm font-medium text-gray-300">报告类型:</label>
            <div className="flex gap-2">
              <Button
                variant={reportType === 'person' ? 'default' : 'outline'}
                onClick={() => {
                  setReportType('person');
                  setPersonReport(null);
                  setEngineerReport(null);
                }}
                className={reportType === 'person' ? '' : 'border-gray-600 hover:bg-gray-700 text-white'}
              >
                <User className="w-4 h-4 mr-2" />
                人员报告
              </Button>
              <Button
                variant={reportType === 'engineer' ? 'default' : 'outline'}
                onClick={() => {
                  setReportType('engineer');
                  setPersonReport(null);
                  setEngineerReport(null);
                }}
                className={reportType === 'engineer' ? '' : 'border-gray-600 hover:bg-gray-700 text-white'}
              >
                <Briefcase className="w-4 h-4 mr-2" />
                工程师报告
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {reportType === 'person' ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  相关方姓名
                </label>
                <div className="flex gap-2">
                  {!allowManualInput ? (
                    <>
                      <select
                        value={personName}
                        onChange={(e) => {
                          if (e.target.value === '__manual__') {
                            setAllowManualInput(true);
                            setPersonName('');
                          } else {
                            setPersonName(e.target.value);
                          }
                        }}
                        className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">选择相关方...</option>
                        {Array.isArray(stakeholders) && stakeholders.length > 0 ? (
                          stakeholders.map(sh => (
                            <option key={sh.id} value={sh.name}>
                              {sh.name} ({sh.type === 'sales' ? '销售' : sh.type === 'stakeholder' ? '利益方' : '其他'})
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>暂无相关方数据</option>
                        )}
                        <option value="__manual__">手动输入...</option>
                      </select>
                    </>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        placeholder="输入人员姓名"
                        className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setAllowManualInput(false);
                          setPersonName('');
                        }}
                        className="border-gray-600 hover:bg-gray-700 text-white"
                      >
                        选择
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  选择工程师
                </label>
                <select
                  value={selectedEngineer}
                  onChange={(e) => setSelectedEngineer(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">选择工程师...</option>
                  {engineers.map(eng => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} ({eng.role || '工程师'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                开始日期
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                结束日期
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <Button onClick={handleSearch} disabled={loading} className="w-full md:w-auto">
            <Search className="w-4 h-4 mr-2" />
            {loading ? '查询中...' : '查询报告'}
          </Button>
        </motion.div>

        {/* 人员报告结果 */}
        {personReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 摘要信息 */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-indigo-400" />
                {personReport.personName} 的工作报告
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">关联项目数</p>
                  <p className="text-2xl font-bold text-white">{personReport.relatedProjects?.length || 0}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">关联任务数</p>
                  <p className="text-2xl font-bold text-white">{personReport.relatedTasks?.length || 0}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">占用工程师数</p>
                  <p className="text-2xl font-bold text-white">{personReport.engineerHours?.length || 0}</p>
                </div>
              </div>
            </div>

            {/* 工程师工时统计 */}
            {personReport.engineerHours && personReport.engineerHours.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-yellow-400" />
                  占用的工程师工时
                </h3>
                <div className="space-y-3">
                  {personReport.engineerHours.map((eh, index) => (
                    <div key={index} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-semibold text-white">{eh.engineerName}</p>
                          <p className="text-xs text-gray-400">ID: {eh.engineerId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-yellow-400">{eh.totalHours?.toFixed(2) || 0} 小时</p>
                          <p className="text-xs text-gray-400">
                            {eh.taskCount || 0} 个任务 · {eh.projectCount || 0} 个项目
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 关联项目 */}
            {personReport.relatedProjects && personReport.relatedProjects.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                  关联项目 ({personReport.relatedProjects.length})
                </h3>
                <div className="space-y-3">
                  {personReport.relatedProjects.map((project) => (
                    <div key={project.id} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{project.projectName}</p>
                          <p className="text-sm text-gray-400">{project.orderNumber}</p>
                          {project.salesName && (
                            <p className="text-xs text-gray-500 mt-1">销售: {project.salesName}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-400">{project.taskCount || 0} 个任务</p>
                          <p className="text-xs text-gray-500">{project.createdAt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 关联任务 */}
            {personReport.relatedTasks && personReport.relatedTasks.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-400" />
                  关联任务 ({personReport.relatedTasks.length})
                </h3>
                <div className="space-y-3">
                  {personReport.relatedTasks.map((task) => (
                    <div key={task.id} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{task.name}</p>
                          {task.projectName && (
                            <p className="text-sm text-gray-400 mt-1">项目: {task.projectName}</p>
                          )}
                          {task.stakeholder && (
                            <p className="text-xs text-gray-500 mt-1">相关方: {task.stakeholder}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {task.status === 'completed' ? '已完成' :
                             task.status === 'in_progress' ? '进行中' :
                             task.status === 'cancelled' ? '已取消' : '待处理'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        {task.startDate && <span>开始: {task.startDate}</span>}
                        {task.endDate && <span>结束: {task.endDate}</span>}
                        {task.assignedTo && task.assignedTo.length > 0 && (
                          <span>分配给: {task.assignedTo.join(', ')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 工程师报告结果 */}
        {engineerReport && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* 摘要信息 */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Briefcase className="w-5 h-5 mr-2 text-indigo-400" />
                {engineerReport.engineerName} 的工作报告
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">总任务数</p>
                  <p className="text-2xl font-bold text-white">{engineerReport.totalTasks || 0}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">已完成任务</p>
                  <p className="text-2xl font-bold text-green-400">{engineerReport.completedTasks || 0}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">关联项目数</p>
                  <p className="text-2xl font-bold text-white">{engineerReport.totalProjects || 0}</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">总工时</p>
                  <p className="text-2xl font-bold text-yellow-400">{engineerReport.totalHours?.toFixed(2) || 0} 小时</p>
                </div>
                <div className="bg-gray-700/30 rounded-lg p-4">
                  <p className="text-sm text-gray-400 mb-1">创建资产数</p>
                  <p className="text-2xl font-bold text-purple-400">{engineerReport.totalAssets || 0}</p>
                </div>
              </div>
            </div>

            {/* 关联相关方 */}
            {engineerReport.stakeholders && engineerReport.stakeholders.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 text-purple-400" />
                  关联相关方 ({engineerReport.stakeholders.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {engineerReport.stakeholders.map((stakeholder, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm"
                    >
                      {stakeholder}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 项目统计 */}
            {engineerReport.projects && engineerReport.projects.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2 text-blue-400" />
                  项目统计 ({engineerReport.projects.length})
                </h3>
                <div className="space-y-3">
                  {engineerReport.projects.map((project) => (
                    <div key={project.projectId} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white">{project.projectName}</p>
                          <p className="text-xs text-gray-400 mt-1">项目ID: {project.projectId}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{project.taskCount || 0} 个任务</p>
                          <p className="text-sm text-green-400">{project.completedTaskCount || 0} 已完成</p>
                          <p className="text-xs text-yellow-400 mt-1">{project.totalHours?.toFixed(2) || 0} 小时</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 资产列表 */}
            {engineerReport.assets && engineerReport.assets.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <Archive className="w-5 h-5 mr-2 text-purple-400" />
                  创建的资产 ({engineerReport.assets.length})
                </h3>
                <div className="space-y-3">
                  {engineerReport.assets.map((asset) => (
                    <div key={asset.id} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{asset.name}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              asset.type === '功能' ? 'bg-blue-500/20 text-blue-400' :
                              asset.type === '代码' ? 'bg-green-500/20 text-green-400' :
                              asset.type === 'API' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {asset.type}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              asset.maturity === '核心' ? 'bg-red-500/20 text-red-400' :
                              asset.maturity === '稳定' ? 'bg-green-500/20 text-green-400' :
                              'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {asset.maturity}
                            </span>
                            {asset.reuseCount > 0 && (
                              <span className="text-xs text-gray-400">
                                复用 {asset.reuseCount} 次
                              </span>
                            )}
                          </div>
                          {asset.description && (
                            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{asset.description}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-xs text-gray-500">{asset.createdAt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 任务列表 */}
            {engineerReport.tasks && engineerReport.tasks.length > 0 && (
              <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-400" />
                  任务列表 ({engineerReport.tasks.length})
                </h3>
                <div className="space-y-3">
                  {engineerReport.tasks.map((task) => (
                    <div key={task.id} className="bg-gray-700/30 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-white">{task.name}</p>
                          {task.projectName && (
                            <p className="text-sm text-gray-400 mt-1">项目: {task.projectName}</p>
                          )}
                          {task.stakeholder && (
                            <p className="text-xs text-gray-500 mt-1">相关方: {task.stakeholder}</p>
                          )}
                        </div>
                        <div className="text-right ml-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {task.status === 'completed' ? '已完成' :
                             task.status === 'in_progress' ? '进行中' :
                             task.status === 'cancelled' ? '已取消' : '待处理'}
                          </span>
                          {task.hours > 0 && (
                            <p className="text-xs text-yellow-400 mt-1">{task.hours.toFixed(2)} 小时</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 mt-2">
                        {task.startDate && <span>开始: {task.startDate}</span>}
                        {task.endDate && <span>结束: {task.endDate}</span>}
                        {task.completedDate && (
                          <span className="text-green-400">完成: {task.completedDate}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* 无结果提示 */}
        {!loading && !personReport && !engineerReport && (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
            <p>请选择报告类型并输入查询条件，然后点击"查询报告"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
