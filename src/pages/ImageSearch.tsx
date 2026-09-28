import React, { useState } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  MapPin, 
  Calendar, 
  Loader2, 
  Check, 
  Sliders,
  Layers,
  ArrowRight
} from 'lucide-react';
import { imageSearch } from '../services/api';
import { SearchResult } from '../types';

interface SamplePatch {
  id: string;
  name: string;
  category: string;
  description: string;
  color: string;
}

const SAMPLE_PATCHES: SamplePatch[] = [
  {
    id: 'patch-1',
    name: 'Industrial & Earthwork Site',
    category: 'Construction',
    description: 'Ground clearing, heavy machinery tracks, and excavated red soil.',
    color: 'from-amber-600 to-orange-700'
  },
  {
    id: 'patch-2',
    name: 'Dense Deciduous Canopy',
    category: 'Vegetation',
    description: 'Western Ghats forest belt with high NDVI spectral signature.',
    color: 'from-emerald-600 to-teal-800'
  },
  {
    id: 'patch-3',
    name: 'Inland Water Reservoir',
    category: 'Water Body',
    description: 'High NIR absorption water basin with sedimentation perimeter.',
    color: 'from-cyan-600 to-blue-800'
  },
  {
    id: 'patch-4',
    name: 'High-Density Residential Grid',
    category: 'Urban',
    description: 'Impervious concrete surfaces, road networks, and building rooftops.',
    color: 'from-slate-600 to-zinc-800'
  }
];

export const ImageSearch: React.FC = () => {
  const [selectedPatch, setSelectedPatch] = useState<SamplePatch>(SAMPLE_PATCHES[0]);
  const [customFile, setCustomFile] = useState<string | null>(null);
  const [limit, setLimit] = useState(6);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    try {
      const response = await imageSearch(customFile || selectedPatch.id, limit);
      setResults(response.results || []);
    } catch (err) {
      console.error('Image search failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCustomFile(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono">
          <ImageIcon className="w-3.5 h-3.5" />
          <span>Visual Feature Embedding</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Visual Similarity Search (CBIR)</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Content-Based Image Retrieval using satellite visual representations to find visually identical terrain patterns.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input Query Selection */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Select Query Patch or Upload</h2>

          {/* Sample Patches */}
          <div className="space-y-2">
            {SAMPLE_PATCHES.map((patch) => {
              const isSelected = !customFile && selectedPatch.id === patch.id;
              return (
                <div
                  key={patch.id}
                  onClick={() => {
                    setSelectedPatch(patch);
                    setCustomFile(null);
                  }}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center space-x-3 ${
                    isSelected 
                      ? 'bg-teal-50/60 border-teal-700 shadow-xs' 
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded bg-gradient-to-br ${patch.color} flex items-center justify-center flex-shrink-0 shadow-xs`}>
                    <Layers className="w-5 h-5 text-white/90" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-900 truncate">{patch.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {patch.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{patch.description}</p>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-teal-800 flex-shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Upload Custom Tile */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-medium text-slate-600 mb-2">Or upload imagery patch (.tif, .png, .jpg)</label>
            <label className="border-2 border-dashed border-slate-300 hover:border-teal-700 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer bg-slate-50 transition-colors">
              <Upload className="w-5 h-5 text-slate-500 mb-1" />
              <span className="text-xs text-slate-800 font-medium">Click to upload custom AOI patch</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Supports Sentinel-2 RGB, GeoTIFF, or PNG</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
            {customFile && (
              <div className="mt-2 text-xs text-emerald-700 font-medium flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                <span>Custom image loaded</span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="w-full py-2.5 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Comparing Image Embeddings...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Execute Similarity Retrieval</span>
              </>
            )}
          </button>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-slate-700">Visual Matches</span>
            <span className="font-mono">Sorted by Cosine Similarity</span>
          </div>

          {!hasSearched ? (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center flex flex-col items-center justify-center shadow-xs">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-2">
                <ImageIcon className="w-5 h-5" />
              </div>
              <p className="text-xs font-semibold text-slate-800">No active image query</p>
              <p className="text-[11px] text-slate-500 max-w-sm mt-1">
                Select a visual query patch from the left and click "Execute Similarity Retrieval" to match satellite scenes.
              </p>
            </div>
          ) : results.length === 0 && !isLoading ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-xs">
              No matching scenes found.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((result) => (
                <div
                  key={result.scene_id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 hover:border-slate-300 transition-all flex flex-col justify-between space-y-3 shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
                        {Math.round(result.similarity_score * 100)}% Visual Match
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {result.metadata?.sensor || 'Sentinel-2'}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-slate-900 truncate" title={result.scene_name}>
                      {result.scene_name}
                    </h3>

                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5 font-mono">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>{new Date(result.acquisition_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 font-mono">Res: {result.metadata?.resolution || '10m'}</span>
                    <span className="text-slate-700 font-medium">Source: {result.metadata?.source || 'ESA'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageSearch;
