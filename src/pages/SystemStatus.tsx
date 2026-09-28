import React, { useState } from 'react';
import { 
  Settings, 
  CheckCircle2, 
  AlertCircle, 
  Server, 
  Database, 
  Cpu, 
  RefreshCw, 
  Satellite, 
  Globe, 
  Clock,
  Layers
} from 'lucide-react';
import { HealthResponse } from '../types';
import { getHealth } from '../services/api';

interface SystemStatusProps {
  healthStatus: HealthResponse | null;
}

export const SystemStatus: React.FC<SystemStatusProps> = ({ healthStatus: initialHealth }) => {
  const [health, setHealth] = useState<HealthResponse | null>(initialHealth);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await getHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to refresh health:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isHealthy = health?.status === 'healthy';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono">
            <Settings className="w-3.5 h-3.5" />
            <span>Infrastructure Health & Services</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">System Diagnostics & Status</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time status monitoring for Earth Observation backend services and external APIs.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded border border-slate-300 transition-colors flex items-center space-x-1.5 self-start shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Check Status Now</span>
        </button>
      </div>

      {/* Global Health Banner */}
      <div className={`p-4 rounded-lg border flex items-center justify-between shadow-xs ${
        isHealthy 
          ? 'bg-emerald-50/60 border-emerald-200' 
          : 'bg-rose-50 border-rose-200'
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`w-9 h-9 rounded flex items-center justify-center ${
            isHealthy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
          }`}>
            {isHealthy ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              {isHealthy ? 'All Satellite Services Operational' : 'Degraded System Performance'}
            </h2>
            <p className="text-xs text-slate-600 font-mono mt-0.5">
              API Version: {health?.version || '1.0.0'} • Database: {health?.database || 'In-Memory State'}
            </p>
          </div>
        </div>

        <div className="text-right hidden sm:block">
          <span className="text-xs font-mono text-slate-500">Host: Node.js Express + Vite</span>
          <div className="text-[11px] text-emerald-800 font-semibold mt-0.5 flex items-center justify-end gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Live Connection</span>
          </div>
        </div>
      </div>

      {/* Subsystem Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* CDSE Connector */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Copernicus CDSE OData</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ONLINE
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-50 text-teal-800 rounded">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">ESA Copernicus API</div>
              <div className="text-[11px] text-slate-500 font-mono">catalogue.dataspace.copernicus.eu</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
            Public catalog query with indexed attribute filtering and bbox intersection.
          </p>
        </div>

        {/* Vector Embedding */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Vector Embeddings</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-100 text-slate-700 rounded">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Semantic Retrieval</div>
              <div className="text-[11px] text-slate-500">Transformer-based spatial encoder</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
            Text-to-imagery cosine similarity matching for natural language exploration.
          </p>
        </div>

        {/* Change Analysis Pipeline */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Change Detection</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              ACTIVE
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-50 text-orange-700 rounded">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Bi-Temporal Engine</div>
              <div className="text-[11px] text-slate-500">Multi-temporal subtraction</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
            Pixel & feature deviation analysis for construction, vegetation, and water shift.
          </p>
        </div>

        {/* Scene Database */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Database Storage</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              HEALTHY
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-100 text-slate-700 rounded">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">In-Memory Store</div>
              <div className="text-[11px] text-slate-500 font-mono">10 Seeded Multi-Sensor Regions</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
            Full provenance tracking, audit logging, and analyst review history.
          </p>
        </div>

        {/* Leaflet & OpenStreetMap */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">GIS Visualizer</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
              READY
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-50 text-teal-800 rounded">
              <Satellite className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Leaflet & MapLibre</div>
              <div className="text-[11px] text-slate-500">Raster Tiles & GeoJSON Footprints</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 pt-2 border-t border-slate-100 leading-relaxed">
            High performance canvas rendering with interactive bounding box AOI drawing.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SystemStatus;
