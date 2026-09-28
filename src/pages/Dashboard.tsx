import React, { useEffect, useState } from 'react';
import { 
  Satellite, 
  Search, 
  Activity, 
  ClipboardCheck, 
  MapPin, 
  Database, 
  TrendingUp, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Layers,
  Calendar,
  Compass
} from 'lucide-react';
import { getScenes, getChangeCandidates, getHealth } from '../services/api';
import { Scene, ChangeCandidate, HealthResponse } from '../types';
import MapView from '../components/MapView';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [scenesData, candidatesData, healthData] = await Promise.all([
          getScenes(),
          getChangeCandidates(),
          getHealth()
        ]);
        setScenes(scenesData);
        setCandidates(candidatesData);
        setHealth(healthData);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const pendingReviews = candidates.filter(c => c.status === 'pending');
  const confirmedChanges = candidates.filter(c => c.status === 'confirmed');

  const mapMarkers = scenes.map(s => ({
    latitude: s.latitude,
    longitude: s.longitude,
    title: s.scene_name,
    description: `${s.sensor} • Cloud: ${s.cloud_percentage}% • ${s.source}`
  }));

  const getChangeBadgeColor = (type: string) => {
    switch (type) {
      case 'construction': return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'urban_expansion': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'vegetation': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'water': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      default: return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-800 text-[11px] font-semibold font-mono uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>SIH 2026 • Satellite Change Detection Suite</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Satellite Scene Retrieval & Change Intelligence
            </h1>
            <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
              Real-time multi-temporal Earth Observation analysis powered by ESA Copernicus Sentinel-2 live catalog discovery, semantic vector retrieval, and automated change verification.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {onNavigate && (
              <button 
                onClick={() => onNavigate('sentinel2-search')}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Compass className="w-4 h-4" />
                <span>Live Sentinel-2 Discovery</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Catalog Scenes</span>
            <div className="p-1.5 bg-slate-100 text-slate-700 rounded">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-slate-900">{loading ? '...' : scenes.length}</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Multi-sensor optical scenes</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Change Candidates</span>
            <div className="p-1.5 bg-purple-50 text-purple-700 rounded">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-slate-900">{loading ? '...' : candidates.length}</div>
            <p className="text-[11px] text-purple-700 mt-0.5 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3" />
              <span>{confirmedChanges.length} confirmed detections</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
            <div className="p-1.5 bg-amber-50 text-amber-700 rounded">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-slate-900">{loading ? '...' : pendingReviews.length}</div>
            <p className="text-[11px] text-amber-700 mt-0.5 flex items-center gap-1 font-medium">
              <AlertTriangle className="w-3 h-3" />
              <span>Action required by analyst</span>
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">CDSE Connector</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded">
              <Satellite className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-xl font-bold font-mono text-emerald-700">Connected</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Copernicus OData API Ready</p>
          </div>
        </div>
      </div>

      {/* Grid: Map & Recent Candidates */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Geographic Coverage Map */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Monitored Indian Regions</h2>
              <p className="text-[11px] text-slate-500">Spatial coverage of ingested satellite scenes and analysis points</p>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-mono">
              <span className="w-2 h-2 rounded-full bg-teal-800 inline-block"></span>
              <span>10 AOI Targets</span>
            </div>
          </div>
          <div className="h-80 w-full rounded-lg overflow-hidden border border-slate-300 shadow-xs">
            <MapView center={[77.2090, 20.5937]} zoom={4} markers={mapMarkers} />
          </div>
        </div>

        {/* Change Candidates Feed */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Latest Change Detections</h2>
              <p className="text-[11px] text-slate-500">Bi-temporal feature alerts</p>
            </div>
            {onNavigate && (
              <button 
                onClick={() => onNavigate('review-queue')}
                className="text-xs text-teal-800 hover:text-teal-900 font-medium flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto max-h-80 pr-1">
            {candidates.slice(0, 5).map((candidate) => (
              <div 
                key={candidate.id} 
                className="p-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-slate-300 transition-all flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getChangeBadgeColor(candidate.change_type)}`}>
                      {candidate.change_type.replace('_', ' ')}
                    </span>
                    <span className="text-xs font-bold font-mono text-slate-800">
                      {(candidate.confidence * 100).toFixed(0)}% conf.
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-2">
                    <span className="flex items-center gap-1 font-mono">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {candidate.latitude.toFixed(2)}, {candidate.longitude.toFixed(2)}
                    </span>
                    <span>•</span>
                    <span className="capitalize text-slate-500">{candidate.status}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-500 block">
                    {new Date(candidate.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capabilities Quick Launch */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">Core Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            onClick={() => onNavigate?.('sentinel2-search')}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-teal-700 rounded-lg cursor-pointer transition-all hover:bg-slate-100 group"
          >
            <div className="p-2 bg-teal-100 text-teal-800 rounded w-fit">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mt-2.5 group-hover:text-teal-800 transition-colors">
              Sentinel-2 Discovery
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Search real-time ESA Copernicus satellite data with AOI bounding boxes and instant cloud filters.
            </p>
          </div>

          <div 
            onClick={() => onNavigate?.('semantic-search')}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-teal-700 rounded-lg cursor-pointer transition-all hover:bg-slate-100 group"
          >
            <div className="p-2 bg-teal-100 text-teal-800 rounded w-fit">
              <Search className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mt-2.5 group-hover:text-teal-800 transition-colors">
              Semantic Search
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Natural language queries like "urban construction near river" to locate relevant satellite tiles.
            </p>
          </div>

          <div 
            onClick={() => onNavigate?.('change-analysis')}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-teal-700 rounded-lg cursor-pointer transition-all hover:bg-slate-100 group"
          >
            <div className="p-2 bg-purple-100 text-purple-800 rounded w-fit">
              <Activity className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mt-2.5 group-hover:text-purple-800 transition-colors">
              Change Analysis
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Bi-temporal pair comparison to isolate pixel shifts, ground changes, and infrastructure growth.
            </p>
          </div>

          <div 
            onClick={() => onNavigate?.('review-queue')}
            className="p-4 bg-slate-50 border border-slate-200 hover:border-teal-700 rounded-lg cursor-pointer transition-all hover:bg-slate-100 group"
          >
            <div className="p-2 bg-amber-100 text-amber-800 rounded w-fit">
              <ClipboardCheck className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-semibold text-slate-900 mt-2.5 group-hover:text-amber-800 transition-colors">
              Analyst Review Queue
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Review flagged changes, log ground truth annotations, and confirm or reject detection candidates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
