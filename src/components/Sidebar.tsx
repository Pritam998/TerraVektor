import React from 'react';
import { 
  Search, 
  Image as ImageIcon, 
  Activity, 
  MapPin, 
  ClipboardCheck, 
  Database, 
  Settings,
  Satellite,
  Compass
} from 'lucide-react';
import { HealthResponse } from '../types';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  healthStatus: HealthResponse | null;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onPageChange, healthStatus }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Satellite },
    { id: 'sentinel2-search', label: 'Sentinel-2 Discovery', icon: Compass },
    { id: 'semantic-search', label: 'Semantic Search', icon: Search },
    { id: 'image-search', label: 'Image Search', icon: ImageIcon },
    { id: 'change-analysis', label: 'Change Analysis', icon: Activity },
    { id: 'similar-locations', label: 'Similar Locations', icon: MapPin },
    { id: 'review-queue', label: 'Review Queue', icon: ClipboardCheck },
    { id: 'data', label: 'Data / Scenes', icon: Database },
    { id: 'status', label: 'System Status', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 bg-teal-800 rounded flex items-center justify-center shadow-xs">
            <Satellite className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">Earth Observation</h2>
            <p className="text-[11px] font-mono text-slate-500">TerraVektor v1.0</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded text-left transition-colors text-xs ${
                isActive
                  ? 'bg-teal-50 text-teal-900 font-semibold border-l-2 border-teal-800 shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-teal-800' : 'text-slate-500'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-200 bg-slate-50">
        <div className="rounded p-2.5 bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider">Subsystem Health</span>
            <div className={`w-2 h-2 rounded-full ${healthStatus?.status === 'healthy' ? 'bg-emerald-600' : 'bg-red-500'}`} />
          </div>
          <div className="text-[11px] text-slate-600 font-medium">
            {healthStatus?.status === 'healthy' ? 'Operational' : 'Degraded'}
          </div>
          {healthStatus && (
            <div className="mt-1 text-[10px] text-slate-500 font-mono">
              Services: {Object.keys(healthStatus.services).length} active &bull; CDSE: {healthStatus.cdse_connected ? 'OK' : 'FAIL'}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
