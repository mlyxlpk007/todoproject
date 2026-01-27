import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Package, LayoutGrid, Folder, Users as UsersIcon, User, Settings, BarChart2, Bell, Database, ListChecks, BookOpen, Archive, Sparkles, ShoppingBag, DollarSign, FileText } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import SettingsModal from './SettingsModal';
import { useI18n } from '@/i18n/I18nContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appInfo, setAppInfo] = useState({ version: t('common.loading'), buildTime: t('common.loading') });
  
  useEffect(() => {
    const loadAppInfo = async () => {
      try {
        const bridge = window.chrome?.webview?.hostObjects?.nativeBridge;
        if (bridge) {
          console.log('[Sidebar] 正在从 C# 后端获取版本信息...');
          const result = await bridge.GetAppInfo();
          console.log('[Sidebar] C# 后端返回的原始结果:', result);
          
          const info = typeof result === 'string' ? JSON.parse(result) : result;
          console.log('[Sidebar] 解析后的版本信息:', info);
          
          if (info && !info.error) {
            // 显示 C# 后端程序的版本和编译时间
            setAppInfo({
              version: info.version || t('common.unknown'),
              buildTime: info.buildTime || t('common.unknown'),
              appName: info.appName || 'AssetFlow',
              appType: info.appType || 'C# WinForms + WebView2'
            });
            console.log('[Sidebar] 已设置版本信息:', {
              version: info.version,
              buildTime: info.buildTime,
              appName: info.appName,
              appType: info.appType
            });
            } else {
              console.warn('[Sidebar] 版本信息包含错误:', info?.error);
              setAppInfo({ version: t('common.unknown'), buildTime: t('common.unknown') });
            }
          } else {
            console.warn('[Sidebar] 无法访问原生桥接，版本信息将显示为未知');
            setAppInfo({ version: t('common.unknown'), buildTime: t('common.unknown') });
          }
        } catch (error) {
          console.error('[Sidebar] 加载 C# 后端版本信息失败:', error);
          setAppInfo({ version: t('common.unknown'), buildTime: t('common.unknown') });
        }
      };
      
      loadAppInfo();
    }, [t]);

  const showToast = () => {
    toast({
      title: '🚧 ' + t('common.warning'),
      description: t('common.featureNotImplemented'),
    });
  };

  const navItems = [
    { icon: LayoutGrid, label: t('nav.dashboard'), path: '/' },
    { icon: Folder, label: t('nav.projects'), path: '/projects' },
    { icon: ListChecks, label: t('nav.tasks'), path: '/tasks' },
    { icon: ShoppingBag, label: t('nav.productManagement'), path: '/products' },
    { icon: DollarSign, label: t('nav.costManagement'), path: '/cost-management' },
    { icon: Archive, label: t('nav.assetManagement'), path: '/assets' },
    { icon: UsersIcon, label: t('nav.humanResources'), path: '/human-resources' },
    { icon: BookOpen, label: t('nav.lessonLearned'), path: '/lesson-learned' },
    { icon: Sparkles, label: t('nav.managementBubbles'), path: '/quotes' },
    { icon: User, label: t('nav.users'), path: '/users' },
    { icon: Database, label: t('nav.dataManagement'), path: '/data-management' },
    { icon: Settings, label: t('nav.dataTest'), path: '/test-data' },
  ];

  const reportItems = [
    { icon: BarChart2, label: t('nav.reports'), path: '/reports' },
    { icon: Settings, label: t('nav.settings'), action: () => setIsSettingsOpen(true) },
  ];

  const handleNavClick = (item) => {
    if (item.path) {
      navigate(item.path);
    } else if (item.action) {
      item.action();
    }
  };

  return (
    <aside className="w-64 bg-gray-900/70 backdrop-blur-xl border-r border-gray-800 p-6 flex-shrink-0 flex flex-col h-screen">
      <div className="flex items-center gap-3 mb-10">
        <div className="bg-indigo-600 p-2 rounded-lg">
          <Package size={24} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-white">AssetFlow</h1>
      </div>
      
      <nav className="flex-grow">
        <ul>
          {navItems.map(item => (
            <li key={item.label} onClick={() => handleNavClick(item)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-2 cursor-pointer transition-colors ${location.pathname === item.path ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-gray-800'}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </nav>
      <div className="mt-auto">
        <ul>
          {reportItems.map(item => (
            <li key={item.label} onClick={() => handleNavClick(item)}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg mb-2 cursor-pointer transition-colors ${location.pathname === item.path ? 'bg-indigo-600/20 text-indigo-300' : 'hover:bg-gray-800'}`}>
              <item.icon size={20} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        
        {/* 版本信息 - 显示 C# 后端程序的版本和编译时间 */}
        <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500">
          <div className="px-4 py-2">
            <div className="font-medium text-gray-400 mb-1">{language === 'zh-CN' ? '后端版本信息' : 'Backend Version'}</div>
            <div className="space-y-1">
              <div>{language === 'zh-CN' ? '版本' : 'Version'}: <span className="text-gray-300">{appInfo.version}</span></div>
              <div>{language === 'zh-CN' ? '编译时间' : 'Build Time'}: <span className="text-gray-300">{appInfo.buildTime}</span></div>
              {appInfo.appName && (
                <div className="text-gray-600 mt-1">({appInfo.appName})</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <NotificationCenter
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
      />
      
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </aside>
  );
};

export default Sidebar;