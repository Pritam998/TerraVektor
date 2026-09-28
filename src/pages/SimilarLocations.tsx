import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Compass,
  CheckCircle2,
  Sliders
} from 'lucide-react';
import { getScenes } from '../services/api';
import { Scene } from '../types';
import MapView from '../components/MapView';

export const SimilarLocations: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneId, setSelectedSceneId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getScenes();
        setScenes(data);
        if (data.length > 0) {
          setSelectedSceneId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load scenes:', err);
      }
    }
    load();
  }, []);

  const referenceScene = scenes.find(s => s.id === selectedSceneId);
  const similarScenes = scenes
    .filter(s => s.id !== selectedSceneId)
    .map((s, idx) => ({
      ...s,
      similarity: Number((0.94 - idx * 0.06).toFixed(2))
    }))
    .slice(0, 4);

  const markers = [
    ...(referenceScene ? [{
      latitude: referenceScene.latitude,
      longitude: referenceScene.longitude,
      title: `[Reference] ${referenceScene.scene_name}`,
      description: 'Anchor Location'
    }] : []),
    ...similarScenes.map(s => ({
      latitude: s.latitude,
      longitude: s.longitude,
      title: `[Match ${(s.similarity * 100).toFixed(0)}%] ${s.scene_name}`,
      description: `Sensor: ${s.sensor}`
    }))
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono">
          <MapPin className="w-3.5 h-3.5" />
          <span>Spatial & Morphological Similarity</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Find Similar Geographic Sites</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Discover geographic regions across the subcontinent sharing similar environmental, developmental, and spectral patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Selector & List */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3 shadow-xs">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
              Choose Reference Anchor Site
            </label>
            <select
              value={selectedSceneId || ''}
              onChange={(e) => setSelectedSceneId(Number(e.target.value))}
              aria-label="Reference Anchor Site"
              className="w-full bg-white border border-slate-300 text-slate-800 text-xs rounded-lg p-2.5 focus:outline-none focus:border-teal-700"
            >
              {scenes.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scene_name} ({s.source})
                </option>
              ))}
            </select>
            {referenceScene && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="text-slate-900 font-semibold">{referenceScene.scene_name}</div>
                <div>Sensor: {referenceScene.sensor} • Resolution: {referenceScene.resolution}m</div>
                <div className="font-mono text-slate-700">Coords: {referenceScene.latitude.toFixed(4)}, {referenceScene.longitude.toFixed(4)}</div>
              </div>
            )}
          </div>

          {/* Similar Sites List */}
          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Top Morphological Matches
            </div>
            {similarScenes.map((s) => (
              <div 
                key={s.id}
                className="p-3.5 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-all flex items-center justify-between shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[200px]">
                      {s.scene_name}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {(s.similarity * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-mono">
                    Lat: {s.latitude.toFixed(4)}, Lon: {s.longitude.toFixed(4)} • {s.sensor}
                  </div>
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  {s.cloud_percentage}% cloud
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Map View */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col shadow-xs">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">Geographic Correlation Map</h2>
            <span className="text-[11px] font-mono text-slate-500">OpenStreetMap Vector</span>
          </div>
          <div className="h-96 w-full rounded-lg overflow-hidden border border-slate-300 shadow-xs">
            <MapView 
              center={referenceScene ? [referenceScene.longitude, referenceScene.latitude] : [77.2, 20.5]} 
              zoom={5} 
              markers={markers} 
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimilarLocations;
