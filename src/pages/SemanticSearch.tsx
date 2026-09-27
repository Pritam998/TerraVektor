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
  Construction
} from 'lucide-react';
import { semanticRetrieval } from '../services/api';
import { SemanticRetrievalResponse, ParsedQuery, BuiltUpAnalysisResult } from '../types';
import { format } from 'date-fns';

export const SemanticSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [result, setResult] = useState<SemanticRetrievalResponse | null>(null);
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
        <div className="flex items-center space-x-2 text-xs font-semibold text-satellite-400 uppercase tracking-wider mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Semantic Retrieval</span>
        </div>
        <h1 className="text-2xl font-bold text-white">Natural Language Satellite Query</h1>
        <p className="text-sm text-slate-400">
          Enter natural language queries to find vegetation changes using real Sentinel-2 imagery and NDVI analysis.
        </p>
      </div>

      {/* Search Input Box */}
      <div className="bg-ui-dark border border-ui-border rounded-xl p-5 shadow-lg space-y-4">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex flex-col sm:flex-row gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'Find areas around Pune where vegetation decreased between May 2024 and May 2026.'"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-satellite-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="px-6 py-3 bg-satellite-500 hover:bg-satellite-600 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-lg shadow-satellite-500/25 transition-all flex items-center justify-center space-x-2 min-w-[120px]"
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
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80">
          <span className="text-xs text-slate-400 font-medium mr-1">Example queries:</span>
          {sampleQueries.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(sample);
                handleSearch(sample);
              }}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all text-left"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-start space-x-2 text-xs text-red-300">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <span className="flex-1">{errorMessage}</span>
        </div>
      )}

      {/* Results View */}
      {hasSearched && result && (
        <div className="space-y-6">
          {/* Parsed Query Display */}
          {result.parsedQuery && (
            <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-semibold text-white flex items-center">
                  <Sparkles className="w-4 h-4 mr-2 text-satellite-400" />
                  Interpreted Query
                </h2>
                {result.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Location</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">
                    {result.parsedQuery.location}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Phenomenon</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block capitalize">
                    {result.parsedQuery.phenomenon}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Direction</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block capitalize">
                    {result.parsedQuery.direction || 'Change'}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">Start Date</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">
                    {result.parsedQuery.startDate}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">End Date</span>
                  <span className="text-sm font-semibold text-white mt-0.5 block">
                    {result.parsedQuery.endDate}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-slate-400 block">AOI BBox</span>
                  <span className="text-xs font-mono text-slate-300 mt-0.5 block">
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
              <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Before Scene</h3>
                  {getDataModeBadge(result.beforeScene.data_mode)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Product ID</span>
                    <span className="font-mono text-slate-200 truncate max-w-[200px]">{result.beforeScene.id.slice(0, 20)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Acquisition Date</span>
                    <span className="font-mono text-white">{format(new Date(result.beforeScene.acquisition_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tile</span>
                    <span className="font-mono text-white">{result.beforeScene.tile_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cloud Cover</span>
                    <span className="font-mono text-white">{result.beforeScene.cloud_cover.toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* After Scene */}
              <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider">After Scene</h3>
                  {getDataModeBadge(result.afterScene.data_mode)}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Product ID</span>
                    <span className="font-mono text-slate-200 truncate max-w-[200px]">{result.afterScene.id.slice(0, 20)}...</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Acquisition Date</span>
                    <span className="font-mono text-white">{format(new Date(result.afterScene.acquisition_date), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Tile</span>
                    <span className="font-mono text-white">{result.afterScene.tile_id || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Cloud Cover</span>
                    <span className="font-mono text-white">{result.afterScene.cloud_cover.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analysis Results */}
          {result.analysis && (
            <div className="bg-ui-dark border border-ui-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-base font-semibold text-white flex items-center">
                  {result.analysis.classification === 'built_up_change' ? (
                    <>
                      <Building2 className="w-4 h-4 mr-2 text-satellite-400" />
                      Built-up Change Analysis Results
                    </>
                  ) : (
                    <>
                      <Activity className="w-4 h-4 mr-2 text-satellite-400" />
                      Real Analysis Results
                    </>
                  )}
                </h2>
                <div className="flex items-center space-x-2">
                  {getDataModeBadge(result.analysis.data_mode)}
                  {result.analysis.data_mode === 'real_sentinel2' && (
                    <span className="text-[10px] text-emerald-400 flex items-center">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Verified Real Data
                    </span>
                  )}
                </div>
              </div>

              {/* Built-up Analysis Results */}
              {result.analysis.classification === 'built_up_change' && (
                <>
                  {/* NDBI/NDVI Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Mean ΔNDVI</span>
                      <span className="text-lg font-semibold text-emerald-400">{result.analysis.metrics.mean_ndvi_change.toFixed(3)}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Mean ΔNDBI</span>
                      <span className="text-lg font-semibold text-amber-400">{result.analysis.metrics.mean_ndbi_change.toFixed(3)}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Changed Pixels</span>
                      <span className="text-lg font-semibold text-white">{result.analysis.metrics.changed_pixels.toLocaleString()}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Change %</span>
                      <span className="text-lg font-semibold text-white">{(result.analysis.metrics.change_percentage * 100).toFixed(2)}%</span>
                    </div>
                  </div>

                  {/* Candidate Summary */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-orange-500/30">
                      <span className="text-slate-400 block mb-1 text-[11px]">New Construction</span>
                      <span className="text-xl font-bold text-orange-400">{result.analysis.candidate_summary.new_construction_count}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg border border-purple-500/30">
                      <span className="text-slate-400 block mb-1 text-[11px]">Building Expansion</span>
                      <span className="text-xl font-bold text-purple-400">{result.analysis.candidate_summary.building_expansion_count}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Total Candidates</span>
                      <span className="text-xl font-bold text-white">{result.analysis.candidate_summary.total_candidates}</span>
                    </div>
                  </div>

                  {/* Candidate Regions */}
                  {result.analysis.candidates && result.analysis.candidates.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-white">Detected Candidate Regions</h3>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {result.analysis.candidates.map((candidate, idx) => (
                          <div key={idx} className={`p-3 rounded-lg border ${
                            candidate.type === 'new_construction_candidate' 
                              ? 'bg-orange-500/10 border-orange-500/30' 
                              : 'bg-purple-500/10 border-purple-500/30'
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-white flex items-center">
                                {candidate.type === 'new_construction_candidate' ? (
                                  <><Construction className="w-3 h-3 mr-1 text-orange-400" /> New Construction</>
                                ) : (
                                  <><Building2 className="w-3 h-3 mr-1 text-purple-400" /> Building Expansion</>
                                )}
                              </span>
                              <span className="text-[10px] text-slate-400">{candidate.id}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-400">Area:</span>
                                <span className="text-white ml-1">{candidate.area_m2.toLocaleString()} m²</span>
                              </div>
                              <div>
                                <span className="text-slate-400">Pixels:</span>
                                <span className="text-white ml-1">{candidate.pixel_count}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">ΔNDVI:</span>
                                <span className="text-white ml-1">{candidate.mean_delta_ndvi.toFixed(3)}</span>
                              </div>
                              <div>
                                <span className="text-slate-400">ΔNDBI:</span>
                                <span className="text-white ml-1">{candidate.mean_delta_ndbi.toFixed(3)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Interpretation */}
                  <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-start space-x-2">
                      <Database className="w-4 h-4 text-satellite-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-white">Built-up Change Analysis:</strong> Using Sentinel-2 B04 (Red), B08 (NIR), and B11 (SWIR) spectral bands from real Copernicus imagery. 
                          B11 resampled from 20m to 10m using bilinear interpolation. 
                          Detected <strong className="text-white">{result.analysis.candidate_summary.total_candidates}</strong> built-up change candidates across the analyzed AOI.
                        </p>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Source: {result.analysis.source || 'Real Sentinel-2 B04/B08/B11 processing'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Limitations */}
                  {result.analysis.limitations && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-start space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-amber-300 mb-1">Scientific Limitations:</p>
                          <ul className="text-[11px] text-amber-200/80 list-disc list-inside space-y-1">
                            {result.analysis.limitations.map((limit, idx) => (
                              <li key={idx}>{limit}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Vegetation Analysis Results (existing) */}
              {result.analysis.classification !== 'built_up_change' && (
                <>
                  {/* Statistics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Change Detected</span>
                      <span className="text-xl font-bold text-white">{(result.analysis.change_percentage * 100).toFixed(1)}%</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Before NDVI</span>
                      <span className="text-lg font-semibold text-emerald-400">{result.analysis.before_ndvi_avg.toFixed(3)}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">After NDVI</span>
                      <span className="text-lg font-semibold text-amber-400">{result.analysis.after_ndvi_avg.toFixed(3)}</span>
                    </div>
                    <div className="bg-slate-800/50 p-3 rounded-lg">
                      <span className="text-slate-400 block mb-1 text-[11px]">Processing Time</span>
                      <span className="text-lg font-semibold text-slate-200">{result.analysis.metadata.processing_time_ms.toFixed(0)}ms</span>
                    </div>
                  </div>

                  {/* Interpretation */}
                  <div className="bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                    <div className="flex items-start space-x-2">
                      <Database className="w-4 h-4 text-satellite-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-300 leading-relaxed">
                          <strong className="text-white">NDVI Analysis:</strong> Using Sentinel-2 B04 (Red) and B08 (NIR) spectral bands from real Copernicus imagery. 
                          NDVI change detected across <strong className="text-white">{(result.analysis.change_percentage * 100).toFixed(1)}%</strong> of the analyzed AOI.
                          {result.parsedQuery.direction === 'decrease' && 'after_ndvi_avg' in result.analysis && result.analysis.after_ndvi_avg < result.analysis.before_ndvi_avg && (
                            <span className="text-emerald-400 ml-2">NDVI decrease detected as requested.</span>
                          )}
                          {result.parsedQuery.direction === 'increase' && 'after_ndvi_avg' in result.analysis && result.analysis.after_ndvi_avg > result.analysis.before_ndvi_avg && (
                            <span className="text-emerald-400 ml-2">NDVI increase detected as requested.</span>
                          )}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-2">
                          Source: {result.analysis.source || 'Real Sentinel-2 B04/B8 processing'}
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SemanticSearch;
