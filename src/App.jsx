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
import ProductManagement from '@/pages/ProductManagement';
import ProductStructure from '@/pages/ProductStructure';
import ProductCatalog from '@/pages/ProductCatalog';
import ProductEdit from '@/pages/ProductEdit';
import ProductVersions from '@/pages/ProductVersions';
import ProductAnalytics from '@/pages/ProductAnalytics';
import CostManagement from '@/pages/CostManagement';
import CostEdit from '@/pages/CostEdit';
import CostDetail from '@/pages/CostDetail';
import CostAnalysis from '@/pages/CostAnalysis';
import Quotes from '@/pages/Quotes';
import DataManagement from '@/pages/DataManagement';
import TestData from '@/pages/TestData';
import Reports from '@/pages/Reports';
import Sidebar from '@/components/Sidebar';
import ManagementPhilosophy from '@/components/ManagementPhilosophy';
import { useDataInitializer } from '@/hooks/useDataInitializer';
import ErrorBoundary from '@/components/ErrorBoundary';
import { I18nProvider, useI18n } from '@/i18n/I18nContext';

function AppContent() {
  useDataInitializer();
  const { t } = useI18n();

  return (
    <>
      <Helmet>
        <title>{t('dashboard.title')} - AssetFlow</title>
        <meta name="description" content="A beautiful and efficient asset flow management system that clearly displays project progress in dashboard and timeline formats." />
        <meta property="og:title" content={`${t('dashboard.title')} - AssetFlow`} />
        <meta property="og:description" content="A beautiful and efficient asset flow management system that clearly displays project progress in dashboard and timeline formats." />
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
                                <Route path="/products" element={<ProductManagement />} />
                                <Route path="/products/structure" element={<ProductStructure />} />
                                <Route path="/products/catalog" element={<ProductCatalog />} />
                                <Route path="/products/edit/:id" element={<ProductEdit />} />
                                <Route path="/products/versions" element={<ProductVersions />} />
                                <Route path="/products/analytics" element={<ProductAnalytics />} />
                                <Route path="/cost-management" element={<CostManagement />} />
                                <Route path="/cost-management/new" element={<CostEdit />} />
                                <Route path="/cost-management/:id/analysis" element={<CostAnalysis />} />
                                <Route path="/cost-management/:id/edit" element={<CostEdit />} />
                                <Route path="/cost-management/:id" element={<CostDetail />} />
                                <Route path="/quotes" element={<Quotes />} />
                                <Route path="/reports" element={<Reports />} />
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

function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}

export default App;