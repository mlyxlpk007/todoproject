import React from 'react';
import { Helmet } from 'react-helmet';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import Dashboard from '@/pages/Dashboard';
import ProjectDetails from '@/pages/ProjectDetails';
import HumanResources from '@/pages/HumanResources';
import Projects from '@/pages/Projects.jsx';
import Tasks from '@/pages/Tasks.jsx';
import Users from '@/pages/Users.jsx';
import LessonLearned from '@/pages/LessonLearned';
import ProjectRisks from '@/pages/ProjectRisks';
import AssetManagement from '@/pages/AssetManagement';
import AssetRegister from '@/pages/AssetRegister';
import AssetEvolution from '@/pages/AssetEvolution';
import AssetHealthDashboard from '@/pages/AssetHealthDashboard';
import Quotes from '@/pages/Quotes';
import DataManagement from '@/pages/DataManagement';
import TestData from '@/pages/TestData';
import Sidebar from '@/components/Sidebar';
import ManagementPhilosophy from '@/components/ManagementPhilosophy';
import { useDataInitializer } from '@/hooks/useDataInitializer';
import ErrorBoundary from '@/components/ErrorBoundary';

function App() {
  useDataInitializer();

  return (
    <>
      <Helmet>
        <title>研发订单跟踪系统 - 智能仪表盘</title>
        <meta name="description" content="一个美观、高效的研发订单跟踪系统，以仪表盘和时间轴的形式清晰展示项目进度。" />
        <meta property="og:title" content="研发订单跟踪系统 - 智能仪表盘" />
        <meta property="og:description" content="一个美观、高效的研发订单跟踪系统，以仪表盘和时间轴的形式清晰展示项目进度。" />
      </Helmet>
      
      <div className="h-screen bg-gray-900 text-gray-100 overflow-hidden">
        <Router>
            <ErrorBoundary>
                <div className="flex h-full">
                    <Sidebar />
                    <main className="flex-1 flex flex-col overflow-hidden">
                        <ManagementPhilosophy />
                        <ErrorBoundary>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/projects" element={<Projects />} />
                                <Route path="/tasks" element={<Tasks />} />
                                <Route path="/project/:id" element={<ProjectDetails />} />
                                <Route path="/project/:projectId/risks" element={<ProjectRisks />} />
                                <Route path="/human-resources" element={<HumanResources />} />
                                <Route path="/users" element={<Users />} />
                                <Route path="/lesson-learned" element={<LessonLearned />} />
                                <Route path="/assets" element={<AssetManagement />} />
                                <Route path="/assets/register" element={<AssetRegister />} />
                                <Route path="/assets/evolution" element={<AssetEvolution />} />
                                <Route path="/assets/health" element={<AssetHealthDashboard />} />
                                <Route path="/quotes" element={<Quotes />} />
                                <Route path="/data-management" element={<DataManagement />} />
                                <Route path="/test-data" element={<TestData />} />
                            </Routes>
                        </ErrorBoundary>
                    </main>
                </div>
            </ErrorBoundary>
        </Router>
        <Toaster />
      </div>
    </>
  );
}

export default App;