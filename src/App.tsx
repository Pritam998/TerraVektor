import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import Dashboard from './pages/Dashboard';
import SemanticSearch from './pages/SemanticSearch';
import ImageSearch from './pages/ImageSearch';
import ChangeAnalysis from './pages/ChangeAnalysis';
import SimilarLocations from './pages/SimilarLocations';
import ReviewQueue from './pages/ReviewQueue';
import DataManagement from './pages/DataManagement';
import SystemStatus from './pages/SystemStatus';
import Sentinel2Search from './pages/Sentinel2Search';
import { getHealth, isExplicitDemoModeActive, setExplicitDemoMode } from './services/api';
import { HealthResponse } from './types';

type PageType = 'dashboard' | 'sentinel2-search' | 'semantic-search' | 'image-search' | 'change-analysis' | 'similar-locations' | 'review-queue' | 'data' | 'status';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('sentinel2-search');
  const [healthStatus, setHealthStatus] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(isExplicitDemoModeActive());

  useEffect(() => {
    checkHealth();
  }, [isDemoMode]);

  const toggleDemoMode = () => {
    const next = !isDemoMode;
    setIsDemoMode(next);
    setExplicitDemoMode(next);
  };

  const checkHealth = async () => {
    try {
      const health = await getHealth();
      setHealthStatus(health);
    } catch (error) {
      console.error('Health check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={(page) => setCurrentPage(page as PageType)} />;
      case 'sentinel2-search':
        return <Sentinel2Search />;
      case 'semantic-search':
        return <SemanticSearch />;
      case 'image-search':
        return <ImageSearch />;
      case 'change-analysis':
        return <ChangeAnalysis />;
      case 'similar-locations':
        return <SimilarLocations />;
      case 'review-queue':
        return <ReviewQueue />;
      case 'data':
        return <DataManagement />;
      case 'status':
        return <SystemStatus healthStatus={healthStatus} />;
      default:
        return <Sentinel2Search />;
    }
  };

  const isUpstreamDown = !healthStatus?.cdse_connected || healthStatus?.data_mode === 'upstream_unavailable';

  return (
    <div className="flex h-screen bg-ui-darker">
      <Sidebar 
        currentPage={currentPage} 
        onPageChange={(page) => setCurrentPage(page as PageType)}
        healthStatus={healthStatus}
      />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="glass-effect border-b border-ui-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-satellite-500 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">Satellite Change Analysis</h1>
                <p className="text-xs text-slate-400">SIH 2026 - Problem Statement 26227</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {healthStatus && (
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${
                    healthStatus.status === 'healthy' && !isUpstreamDown ? 'bg-green-500' : 'bg-red-500'
                  }`} />
                  <span className="text-xs text-slate-300">
                    {healthStatus.status === 'healthy' && !isUpstreamDown ? 'System Online' : 'Copernicus Degraded'}
                  </span>
                </div>
              )}

              {/* Data Mode Indicator */}
              {isDemoMode || healthStatus?.data_mode === 'demo_data' ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  <span>DEMO DATA</span>
                </div>
              ) : isUpstreamDown ? (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span>UPSTREAM UNAVAILABLE</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>LIVE SENTINEL-2</span>
                </div>
              )}

              {/* Development Mode Toggle */}
              <button
                onClick={toggleDemoMode}
                title={isDemoMode ? 'Switch back to Live Sentinel-2 queries' : 'Explicitly enable Development Demo Mode'}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  isDemoMode 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                }`}
              >
                {isDemoMode ? 'Exit Demo Mode' : 'Demo Mode'}
              </button>
            </div>
          </div>
        </header>
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto">
            {renderPage()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
