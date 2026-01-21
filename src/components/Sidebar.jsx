import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { Package, LayoutGrid, Folder, Users as UsersIcon, User, Settings, BarChart2, Bell, Database, ListChecks, BookOpen, Archive, Sparkles } from 'lucide-react';
import NotificationCenter from './NotificationCenter';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [appInfo, setAppInfo] = useState({ version: '加载中...', buildTime: '加载中...' });
  
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
              version: info.version || '未知',
              buildTime: info.buildTime || '未知',
              appName: info.appName || 'RDTrackingSystem',
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
            setAppInfo({ version: '未知', buildTime: '未知' });
          }
        } else {
          console.warn('[Sidebar] 无法访问原生桥接，版本信息将显示为未知');
          setAppInfo({ version: '未知', buildTime: '未知' });
        }
      } catch (error) {
        console.error('[Sidebar] 加载 C# 后端版本信息失败:', error);
        setAppInfo({ version: '未知', buildTime: '未知' });
      }
    };
    
    loadAppInfo();
  }, []);

  const showToast = () => {
    toast({
      title: '🚧 功能尚未实现',
      description: '别担心！您可以在下一次提示中请求它！🚀',
    });
  };

  const navItems = [
    { icon: LayoutGrid, label: '仪表盘', path: '/' },
    { icon: Folder, label: '项目', path: '/projects' },
    { icon: ListChecks, label: '任务', path: '/tasks' },
    { icon: UsersIcon, label: '人力', path: '/human-resources' },
    { icon: User, label: '用户', path: '/users' },
    { icon: BookOpen, label: '经验教训库', path: '/lesson-learned' },
    { icon: Archive, label: '资产管理', path: '/assets' },
    { icon: Sparkles, label: '管理泡泡', path: '/quotes' },
    { icon: Database, label: '数据管理', path: '/data-management' },
    { icon: Settings, label: '数据测试', path: '/test-data' },
  ];

  const reportItems = [
    { icon: BarChart2, label: '报告', action: showToast },
    { icon: Bell, label: '通知', action: () => setIsNotificationOpen(true) },
    { icon: Settings, label: '设置', action: showToast },
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
        <h1 className="text-xl font-bold text-white">研发跟踪</h1>
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
            <li key={item.label} onClick={item.action}
              className="flex items-center gap-3 px-4 py-2.5 rounded-lg mb-2 cursor-pointer transition-colors hover:bg-gray-800">
              <item.icon size={20} />
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        
        {/* 版本信息 - 显示 C# 后端程序的版本和编译时间 */}
        <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500">
          <div className="px-4 py-2">
            <div className="font-medium text-gray-400 mb-1">后端版本信息</div>
            <div className="space-y-1">
              <div>版本: <span className="text-gray-300">{appInfo.version}</span></div>
              <div>编译时间: <span className="text-gray-300">{appInfo.buildTime}</span></div>
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
    </aside>
  );
};

export default Sidebar;