import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Cloud, 
  Layers, 
  ArrowRight,
  Loader2,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Database,
  Building2,
  Construction,
  Compass
} from 'lucide-react';
import { semanticRetrieval } from '../services/api';
import { SemanticRetrievalResponse, ParsedQuery, BuiltUpAnalysisResult, ChangeAnalysisResult } from '../types';
import { SatelliteInvestigationMap } from '../components/SatelliteInvestigationMap';
import { format } from 'date-fns';

export const SemanticSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<SemanticRetrievalResponse | null>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sampleQueries = [
    'Find areas around Pune where vegetation decreased between May 2024 and May 2026.',
    'Show vegetation change around Mumbai from January 2024 to January 2026.',
    'Find areas around Bengaluru with vegetation increase between March 2024 and March 2026.',
    'Show new construction around Pune between May 2024 and May 2026.',
    'Find building expansion around Mumbai between January 2024 and January 2026.'
  ];

  const handleSearch = async (searchQuery: string = query) => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    setErrorMessage(null);
    setResult(null);
    
    try {
      const response = await semanticRetrieval({
        query: searchQuery
      });
      setResult(response);
      
      if (!response.success) {
        setErrorMessage(response.message || response.error || 'Search failed');
      }
    } catch (err: any) {
      console.error('Semantic retrieval failed:', err);
      setErrorMessage(err.response?.data?.message || err.message || 'Failed to process query');
    } finally {
      setIsLoading(false);
    }
  };

  const getDataModeBadge = (mode: string) => {
    if (mode === 'live_copernicus' || mode === 'real_sentinel2') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Real
        </span>
      );
    } else if (mode === 'cached') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
          Cached
        </span>
      );
    } else if (mode === 'upstream_unavailable' || mode === 'processing_unavailable') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Unavailable
        </span>
      );
    } else {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Demo
        </span>
      );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Semantic Retrieval</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Natural Language Satellite Query</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Enter natural language queries to find vegetation changes and urban dynamics using real Sentinel-2 imagery and multi-spectral analysis.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'Find areas around Pune where vegetation decreased between May 2024 and May 2026.'"
              className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-700 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-5 py-2.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center justify-center space-x-2 min-w-[120px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Analyze</span>
              </>
            )}
          </button>
        </form>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
          <span className="text-xs text-slate-500 font-medium mr-1">Example queries:</span>
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sample);
                handleSearch(sample);
              }}
              className="text-xs px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded p-4 shadow-xs space-y-1 text-rose-900 text-xs">
          <div className="flex items-center space-x-2 text-rose-800 font-semibold text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Sentinel-2 processing unavailable</span>
          </div>
          <p className="text-xs text-rose-700">
            Live Copernicus data could not be retrieved.
          </p>
          <p className="text-[11px] text-slate-500">
            Try again when the data service is available.
          </p>
          {errorMessage && errorMessage !== 'Sentinel-2 processing unavailable' && errorMessage !== 'Live Copernicus data could not be retrieved.' && (
            <p className="text-[10px] font-mono text-slate-600 pt-1 border-t border-rose-200">
              Details: {errorMessage}
            </p>
          )}
        </div>
      )}

      {/* Results View */}
      {hasSearched && result && (
        <div className="space-y-6">
          {/* Parsed Query Display */}
          {result.parsedQuery && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-teal-800" />
                  Interpreted Query
                </h2>
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">Location</span>
                  <span className="text-xs font-semibold text-slate-900 mt-0.5 block">
                    {result.parsedQuery.location}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">Phenomenon</span>
                  <span className="text-xs font-semibold text-slate-900 mt-0.5 block capitalize">
                    {result.parsedQuery.phenomenon}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">Direction</span>
                  <span className="text-xs font-semibold text-slate-900 mt-0.5 block capitalize">
                    {result.parsedQuery.direction || 'Change'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">Start Date</span>
                  <span className="text-xs font-mono font-semibold text-slate-900 mt-0.5 block">
                    {result.parsedQuery.startDate}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">End Date</span>
                  <span className="text-xs font-mono font-semibold text-slate-900 mt-0.5 block">
                    {result.parsedQuery.endDate}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block">AOI BBox</span>
                  <span className="text-xs font-mono text-slate-700 mt-0.5 block">
                    {result.parsedQuery.aoi ? `[${result.parsedQuery.aoi.map(n => n.toFixed(2)).join(', ')}]` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Selected Imagery */}
          {result.beforeScene && result.afterScene && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before Scene */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Before Scene</h3>
                  {getDataModeBadge(result.beforeScene.data_mode)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Product ID</span>
                    <span className="font-mono text-slate-800 truncate max-w-[200px]">{result.beforeScene.id.slice(0, 20)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Acquisition Date</span>
                    <span className="font-mono text-slate-900 font-medium">{format(new Date(result.beforeScene.acquisition_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tile</span>
                    <span className="font-mono text-slate-900 font-medium">{result.beforeScene.tile_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Cloud Cover</span>
                    <span className="font-mono text-slate-900 font-medium">{result.beforeScene.cloud_cover.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* After Scene */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">After Scene</h3>
                  {getDataModeBadge(result.afterScene.data_mode)}
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Product ID</span>
                    <span className="font-mono text-slate-800 truncate max-w-[200px]">{result.afterScene.id.slice(0, 20)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Acquisition Date</span>
                    <span className="font-mono text-slate-900 font-medium">{format(new Date(result.afterScene.acquisition_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tile</span>
                    <span className="font-mono text-slate-900 font-medium">{result.afterScene.tile_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Cloud Cover</span>
                    <span className="font-mono text-slate-900 font-medium">{result.afterScene.cloud_cover.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Large Before/After Investigation Map Section */}
          {result.beforeScene && result.afterScene && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-teal-800" />
                    <span>Before / After Investigation Workspace</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Drag the comparison slider horizontally (Left = Before Baseline, Right = After Monitoring) over identical Sentinel-2 AOI.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {result.analysis && getDataModeBadge(result.analysis.data_mode)}
                </div>
              </div>

              <SatelliteInvestigationMap
                beforeScene={{
                  id: result.beforeScene.id,
                  name: result.beforeScene.name,
                  acquisition_date: result.beforeScene.acquisition_date,
                  tile_id: result.beforeScene.tile_id,
                  cloud_cover: result.beforeScene.cloud_cover,
                  bbox: result.beforeScene.bbox,
                  data_mode: result.beforeScene.data_mode,
                  preview_url: `/api/sentinel2/preview/${result.beforeScene.id}`
                }}
                afterScene={{
                  id: result.afterScene.id,
                  name: result.afterScene.name,
                  acquisition_date: result.afterScene.acquisition_date,
                  tile_id: result.afterScene.tile_id,
                  cloud_cover: result.afterScene.cloud_cover,
                  bbox: result.afterScene.bbox,
                  data_mode: result.afterScene.data_mode,
                  preview_url: `/api/sentinel2/preview/${result.afterScene.id}`
                }}
                aoiBbox={result.parsedQuery?.aoi || [73.70, 18.40, 74.05, 18.70]}
                analysis={result.analysis}
                selectedCandidateId={selectedCandidateId}
                onSelectCandidate={(id) => setSelectedCandidateId(id)}
              />
            </div>
          )}

          {/* Analysis Results */}
          {result.analysis && (
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
              {('classification' in result.analysis && result.analysis.classification === 'built_up_change') ? (() => {
                const analysis = result.analysis as BuiltUpAnalysisResult;
                return (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                        <Building2 className="w-4 h-4 mr-2 text-teal-800" />
                        Built-up Change Analysis Statistics
                      </h2>
                      <div className="flex items-center space-x-2">
                        {getDataModeBadge(analysis.data_mode)}
                        {analysis.data_mode === 'real_sentinel2' && (
                          <span className="text-[10px] text-emerald-700 font-medium flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified Real Data
                          </span>
                        )}
                      </div>
                    </div>

                    {/* NDBI/NDVI Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Mean ΔNDVI</span>
                        <span className="text-lg font-bold font-mono text-emerald-700">{analysis.metrics.mean_ndvi_change.toFixed(3)}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Mean ΔNDBI</span>
                        <span className="text-lg font-bold font-mono text-amber-700">{analysis.metrics.mean_ndbi_change.toFixed(3)}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Changed Pixels</span>
                        <span className="text-lg font-bold font-mono text-slate-900">{analysis.metrics.changed_pixels.toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Change %</span>
                        <span className="text-lg font-bold font-mono text-slate-900">{(analysis.metrics.change_percentage * 100).toFixed(2)}%</span>
                      </div>
                    </div>

                    {/* Candidate Summary */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-orange-50/60 p-3 rounded border border-orange-200">
                        <span className="text-orange-900 block mb-0.5 text-[11px] font-medium">New Construction</span>
                        <span className="text-xl font-bold font-mono text-orange-700">{analysis.candidate_summary.new_construction_count}</span>
                      </div>
                      <div className="bg-purple-50/60 p-3 rounded border border-purple-200">
                        <span className="text-purple-900 block mb-0.5 text-[11px] font-medium">Building Expansion</span>
                        <span className="text-xl font-bold font-mono text-purple-700">{analysis.candidate_summary.building_expansion_count}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-600 block mb-0.5 text-[11px] font-medium">Total Candidates</span>
                        <span className="text-xl font-bold font-mono text-slate-900">{analysis.candidate_summary.total_candidates}</span>
                      </div>
                    </div>

                    {/* Candidate Regions */}
                    {analysis.candidates && analysis.candidates.length > 0 && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Compass className="w-4 h-4 text-teal-800" />
                            <span>Detected Candidate Regions (Click card to zoom map)</span>
                          </h3>
                          <span className="text-xs text-slate-500 font-mono">{analysis.candidates.length} regions detected</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {analysis.candidates.map((candidate: any, idx: number) => {
                            const isSelected = candidate.id === selectedCandidateId;
                            const isConstruction = candidate.type === 'new_construction_candidate';
                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedCandidateId(candidate.id)}
                                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                                  isSelected
                                    ? isConstruction
                                      ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-400 shadow-xs'
                                      : 'bg-purple-50 border-purple-500 ring-2 ring-purple-400 shadow-xs'
                                    : isConstruction
                                    ? 'bg-white border-orange-200 hover:border-orange-300'
                                    : 'bg-white border-purple-200 hover:border-purple-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-slate-900 flex items-center">
                                    {isConstruction ? (
                                      <><Construction className="w-3.5 h-3.5 mr-1.5 text-orange-600" /> New Construction</>
                                    ) : (
                                      <><Building2 className="w-3.5 h-3.5 mr-1.5 text-purple-600" /> Building Expansion</>
                                    )}
                                  </span>
                                  {isSelected ? (
                                    <span className="text-[10px] font-bold text-orange-800 bg-orange-100 px-1.5 py-0.5 rounded border border-orange-300">
                                      Active on Map
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500 font-mono">{candidate.id}</span>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div>
                                    <span className="text-slate-500">Area:</span>
                                    <span className="text-slate-800 ml-1 font-mono font-medium">{candidate.area_m2.toLocaleString()} m²</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Pixels:</span>
                                    <span className="text-slate-800 ml-1 font-mono font-medium">{candidate.pixel_count}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">ΔNDVI:</span>
                                    <span className="text-emerald-700 ml-1 font-mono font-medium">{candidate.mean_delta_ndvi.toFixed(3)}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">ΔNDBI:</span>
                                    <span className="text-amber-700 ml-1 font-mono font-medium">+{candidate.mean_delta_ndbi.toFixed(3)}</span>
                                  </div>
                                </div>
                                <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px]">
                                  <span className="text-teal-800 font-medium">Click to inspect on map &rarr;</span>
                                  <span className="text-slate-400 font-mono">10m GSD</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Interpretation */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-start space-x-2">
                        <Database className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">Built-up Change Analysis:</strong> Using Sentinel-2 B04 (Red), B08 (NIR), and B11 (SWIR) spectral bands from real Copernicus imagery. 
                            B11 resampled from 20m to 10m using bilinear interpolation. 
                            Detected <strong className="text-slate-900">{analysis.candidate_summary.total_candidates}</strong> built-up change candidates across the analyzed AOI.
                          </p>
                          <p className="text-[11px] text-slate-500 mt-2 font-mono">
                            Source: {analysis.source || 'Real Sentinel-2 B04/B08/B11 processing'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Limitations */}
                    {analysis.limitations && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-amber-900 mb-1">Scientific Limitations:</p>
                            <ul className="text-[11px] text-amber-800 list-disc list-inside space-y-1">
                              {analysis.limitations.map((limit: string, idx: number) => (
                                <li key={idx}>{limit}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                );
              })() : (() => {
                const analysis = result.analysis as ChangeAnalysisResult;
                return (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                        <Activity className="w-4 h-4 mr-2 text-teal-800" />
                        Real Analysis Results
                      </h2>
                      <div className="flex items-center space-x-2">
                        {getDataModeBadge(analysis.data_mode)}
                        {analysis.data_mode === 'real_sentinel2' && (
                          <span className="text-[10px] text-emerald-700 font-medium flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Verified Real Data
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Statistics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Change Detected</span>
                        <span className="text-xl font-bold font-mono text-orange-700">{(analysis.change_percentage * 100).toFixed(1)}%</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Before NDVI</span>
                        <span className="text-lg font-bold font-mono text-emerald-700">{analysis.before_ndvi_avg.toFixed(3)}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">After NDVI</span>
                        <span className="text-lg font-bold font-mono text-slate-800">{analysis.after_ndvi_avg.toFixed(3)}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded border border-slate-200">
                        <span className="text-slate-500 block mb-0.5 text-[11px] font-medium">Processing Time</span>
                        <span className="text-lg font-bold font-mono text-slate-800">{analysis.metadata.processing_time_ms.toFixed(0)}ms</span>
                      </div>
                    </div>

                    {/* Interpretation */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-start space-x-2">
                        <Database className="w-4 h-4 text-teal-800 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs text-slate-700 leading-relaxed">
                            <strong className="text-slate-900">NDVI Analysis:</strong> Using Sentinel-2 B04 (Red) and B08 (NIR) spectral bands from real Copernicus imagery. 
                            NDVI change detected across <strong className="text-slate-900">{(analysis.change_percentage * 100).toFixed(1)}%</strong> of the analyzed AOI.
                            {result.parsedQuery.direction === 'decrease' && analysis.after_ndvi_avg < analysis.before_ndvi_avg && (
                              <span className="text-emerald-700 font-semibold ml-2">NDVI decrease detected as requested.</span>
                            )}
                            {result.parsedQuery.direction === 'increase' && analysis.after_ndvi_avg > analysis.before_ndvi_avg && (
                              <span className="text-emerald-700 font-semibold ml-2">NDVI increase detected as requested.</span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-2 font-mono">
                            Source: {analysis.source || 'Real Sentinel-2 B04/B8 processing'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SemanticSearch;
