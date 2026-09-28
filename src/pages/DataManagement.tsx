import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Plus, 
  Search, 
  FileText, 
  History, 
  Calendar, 
  MapPin, 
  Layers, 
  Cloud, 
  Check, 
  Loader2,
  X
} from 'lucide-react';
import { getScenes, ingestScene, getSceneProvenance } from '../services/api';
import { Scene, ProvenanceData } from '../types';

export const DataManagement: React.FC = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [selectedProvenance, setSelectedProvenance] = useState<ProvenanceData | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // New Scene Form State
  const [newSceneName, setNewSceneName] = useState('');
  const [newSensor, setNewSensor] = useState('Sentinel-2');
  const [newLat, setNewLat] = useState('18.5204');
  const [newLon, setNewLon] = useState('73.8567');
  const [newCloud, setNewCloud] = useState('5.0');
  const [newSource, setNewSource] = useState('Copernicus CDSE');

  const loadScenes = async () => {
    setIsLoading(true);
    try {
      const data = await getScenes();
      setScenes(data);
    } catch (err) {
      console.error('Failed to load scenes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const handleIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsIngesting(true);
    try {
      await ingestScene({
        scene_name: newSceneName || `Scene_${Date.now()}`,
        sensor: newSensor,
        latitude: parseFloat(newLat),
        longitude: parseFloat(newLon),
        cloud_percentage: parseFloat(newCloud),
        source: newSource,
        acquisition_date: new Date().toISOString()
      });
      setShowIngestModal(false);
      setNewSceneName('');
      loadScenes();
    } catch (err) {
      console.error('Failed to ingest scene:', err);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleViewProvenance = async (sceneId: number) => {
    try {
      const prov = await getSceneProvenance(sceneId);
      setSelectedProvenance(prov);
    } catch (err) {
      console.error('Failed to fetch provenance:', err);
    }
  };

  const filteredScenes = scenes.filter(s => 
    s.scene_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.sensor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.source.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono">
            <Database className="w-3.5 h-3.5" />
            <span>Catalog Ingestion & Provenance Records</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Scene Registry & Provenance</h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Audit catalog scenes, review data lineage pipelines, and manually ingest new satellite datasets.
          </p>
        </div>

        <button
          onClick={() => setShowIngestModal(true)}
          className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center space-x-1.5 self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ingest New Scene</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center bg-white border border-slate-300 rounded-lg px-3 py-2 max-w-md shadow-xs">
        <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
        <input 
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by scene title, sensor platform, or agency..."
          className="bg-transparent border-none text-xs text-slate-800 placeholder-slate-400 focus:outline-none w-full"
        />
      </div>

      {/* Scenes Catalog Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Scene Identifier</th>
                <th className="px-4 py-3">Sensor</th>
                <th className="px-4 py-3">Acquisition Date</th>
                <th className="px-4 py-3">Coordinates</th>
                <th className="px-4 py-3">Cloud Cover</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3 text-right">Lineage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-800 mx-auto mb-2" />
                    <span>Loading scene registry...</span>
                  </td>
                </tr>
              ) : filteredScenes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No scenes found matching search criteria.
                  </td>
                </tr>
              ) : (
                filteredScenes.map((scene) => (
                  <tr key={scene.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-900 font-mono">
                      {scene.scene_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {scene.sensor}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {new Date(scene.acquisition_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {scene.latitude.toFixed(4)}, {scene.longitude.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {scene.cloud_percentage}%
                    </td>
                    <td className="px-4 py-3">
                      {scene.source}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleViewProvenance(scene.id)}
                        className="text-xs text-teal-800 hover:text-teal-900 font-semibold inline-flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Audit Trail</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ingest Modal */}
      {showIngestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-lg w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Ingest New Satellite Scene</h3>
              <button 
                onClick={() => setShowIngestModal(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleIngest} className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Scene Name / Product Tag</label>
                <input 
                  type="text" 
                  value={newSceneName}
                  onChange={(e) => setNewSceneName(e.target.value)}
                  placeholder="e.g. Pune_Urban_West_2026"
                  className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Sensor</label>
                  <select 
                    value={newSensor}
                    onChange={(e) => setNewSensor(e.target.value)}
                    aria-label="Sensor"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700"
                  >
                    <option value="Sentinel-2">Sentinel-2 (MSI)</option>
                    <option value="Landsat-8">Landsat-8 (OLI)</option>
                    <option value="Landsat-9">Landsat-9</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Source Agency</label>
                  <input 
                    type="text" 
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    placeholder="ESA / Copernicus CDSE"
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Latitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newLat}
                    onChange={(e) => setNewLat(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Longitude</label>
                  <input 
                    type="number" 
                    step="any"
                    value={newLon}
                    onChange={(e) => setNewLon(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Cloud %</label>
                  <input 
                    type="number" 
                    value={newCloud}
                    onChange={(e) => setNewCloud(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded p-2 text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowIngestModal(false)}
                  className="px-3 py-1.5 rounded bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isIngesting}
                  className="px-4 py-1.5 rounded bg-teal-800 text-white text-xs font-semibold hover:bg-teal-900 disabled:opacity-50 flex items-center gap-1.5 shadow-xs"
                >
                  {isIngesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Register Scene</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Provenance Audit Modal */}
      {selectedProvenance && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-300 rounded-lg max-w-xl w-full p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Data Provenance & Audit Log</h3>
                <span className="text-xs text-slate-500 font-mono">{selectedProvenance.scene_name}</span>
              </div>
              <button 
                onClick={() => setSelectedProvenance(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {selectedProvenance.processing_logs?.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-800 uppercase tracking-wider font-mono">
                      {log.operation}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700 font-mono break-all bg-white p-2 rounded border border-slate-200">
                    Model: {log.model_version} • Parameters: {log.parameters}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataManagement;
