import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Calendar, 
  Cloud, 
  MapPin, 
  Layers, 
  Loader2, 
  ExternalLink, 
  Copy, 
  Check, 
  Info, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  Database,
  Crosshair,
  ArrowUpDown
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import LeafletMapView from '../components/LeafletMapView';
import { searchSentinel2 } from '../services/api';
import { Sentinel2Product, Sentinel2SearchResponse } from '../types';

interface PresetAOI {
  name: string;
  bbox: [number, number, number, number]; // [minLon, minLat, maxLon, maxLat]
  description: string;
}

const PRESET_AOIS: PresetAOI[] = [
  {
    name: 'Pune & Western Ghats',
    bbox: [73.70, 18.40, 74.05, 18.70],
    description: 'Urban expansion and vegetation zone in Maharashtra'
  },
  {
    name: 'Mumbai Coastal Region',
    bbox: [72.75, 18.90, 73.10, 19.25],
    description: 'Harbor, mangroves, and dense coastal metropolitan area'
  },
  {
    name: 'Bengaluru Tech Corridor',
    bbox: [77.45, 12.85, 77.75, 13.10],
    description: 'Urban lakes, rapid development, and technology parks'
  },
  {
    name: 'Delhi NCR Metropolitan',
    bbox: [76.90, 28.45, 77.35, 28.85],
    description: 'National capital region, Yamuna river basin'
  },
  {
    name: 'Jaipur & Aravalli Region',
    bbox: [75.65, 26.80, 75.95, 27.05],
    description: 'Heritage urban center and semi-arid terrain'
  },
  {
    name: 'Chennai Coastal Zone',
    bbox: [80.10, 12.90, 80.35, 13.20],
    description: 'Port city and coastal wetlands along Coromandel Coast'
  }
];

export const Sentinel2Search: React.FC = () => {
  // Query Parameters State
  const [aoiBbox, setAoiBbox] = useState<[number, number, number, number] | null>(PRESET_AOIS[0].bbox);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | ''>(0);
  
  // Default to May 2024 verified clear-sky benchmark window for instant live ESA results
  const [startDate, setStartDate] = useState<string>('2024-05-01');
  const [endDate, setEndDate] = useState<string>('2024-05-25');
  const [maxCloudCover, setMaxCloudCover] = useState<number>(30);
  const [productType, setProductType] = useState<'S2MSI2A' | 'S2MSI1C' | 'ALL'>('S2MSI2A');
  const [limit, setLimit] = useState<number>(20);

  // UI / Map Interaction State
  const [isDrawingAoi, setIsDrawingAoi] = useState<boolean>(false);
  const [isForceRefresh, setIsForceRefresh] = useState<boolean>(false);
  const [showManualCoords, setShowManualCoords] = useState<boolean>(false);
  const [showVerificationGuide, setShowVerificationGuide] = useState<boolean>(false);
  const [showOdataInspector, setShowOdataInspector] = useState<boolean>(false);
  const [manualMinLon, setManualMinLon] = useState<string>(String(PRESET_AOIS[0].bbox[0]));
  const [manualMinLat, setManualMinLat] = useState<string>(String(PRESET_AOIS[0].bbox[1]));
  const [manualMaxLon, setManualMaxLon] = useState<string>(String(PRESET_AOIS[0].bbox[2]));
  const [manualMaxLat, setManualMaxLat] = useState<string>(String(PRESET_AOIS[0].bbox[3]));

  // Search Results State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchResponse, setSearchResponse] = useState<Sentinel2SearchResponse | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Sentinel2Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'date' | 'cloud'>('date');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync manual inputs when AOI bbox changes
  useEffect(() => {
    if (aoiBbox) {
      setManualMinLon(String(aoiBbox[0]));
      setManualMinLat(String(aoiBbox[1]));
      setManualMaxLon(String(aoiBbox[2]));
      setManualMaxLat(String(aoiBbox[3]));
    }
  }, [aoiBbox]);

  // Handle Preset selection
  const handlePresetChange = (indexStr: string) => {
    if (indexStr === '') {
      setSelectedPresetIndex('');
      return;
    }
    const idx = Number(indexStr);
    setSelectedPresetIndex(idx);
    const preset = PRESET_AOIS[idx];
    if (preset) {
      setAoiBbox(preset.bbox);
    }
  };

  // Apply manual coordinate inputs
  const handleApplyManualCoords = () => {
    const minLon = parseFloat(manualMinLon);
    const minLat = parseFloat(manualMinLat);
    const maxLon = parseFloat(manualMaxLon);
    const maxLat = parseFloat(manualMaxLat);

    if (isNaN(minLon) || isNaN(minLat) || isNaN(maxLon) || isNaN(maxLat)) {
      setErrorMessage('All 4 coordinate values must be valid decimal numbers.');
      return;
    }
    if (minLon >= maxLon || minLat >= maxLat) {
      setErrorMessage('Bounding box requires minLon < maxLon and minLat < maxLat.');
      return;
    }
    if (minLon < -180 || maxLon > 180 || minLat < -90 || maxLat > 90) {
      setErrorMessage('Coordinates must be in valid WGS84 range (-180 to 180, -90 to 90).');
      return;
    }

    setErrorMessage(null);
    setSelectedPresetIndex('');
    setAoiBbox([minLon, minLat, maxLon, maxLat]);
  };

  // Quick Date Range helpers
  const handleSetDatePreset = (daysAgo: number) => {
    const end = new Date();
    const start = subDays(end, daysAgo);
    setStartDate(format(start, 'yyyy-MM-dd'));
    setEndDate(format(end, 'yyyy-MM-dd'));
  };

  // Perform Sentinel-2 Search
  const handleSearch = async (e?: React.FormEvent, overrideForceRefresh?: boolean) => {
    if (e) e.preventDefault();

    if (!aoiBbox) {
      setErrorMessage('Please select or draw an Area of Interest (AOI) on the map.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMessage('Start date must be earlier than or equal to End date.');
      return;
    }

    const force = overrideForceRefresh !== undefined ? overrideForceRefresh : isForceRefresh;

    setErrorMessage(null);
    setIsLoading(true);
    setHasSearched(true);
    setSelectedProduct(null);

    try {
      const response = await searchSentinel2({
        bbox: aoiBbox,
        start_date: startDate,
        end_date: endDate,
        max_cloud_cover: maxCloudCover,
        product_type: productType,
        limit,
        force_refresh: force
      });

      setSearchResponse(response);
      if (response.results.length > 0) {
        setSelectedProduct(response.results[0]);
      }
    } catch (err: any) {
      console.error('Sentinel-2 search failed:', err);
      const detail = err.response?.data?.detail || err.message || 'Failed to search Sentinel-2 imagery.';
      setErrorMessage(detail);
      setSearchResponse(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-search once on mount with default Pune preset
  useEffect(() => {
    handleSearch();
  }, []);

  // Sorted Results
  const sortedProducts = React.useMemo(() => {
    if (!searchResponse || !searchResponse.results) return [];
    const list = [...searchResponse.results];
    if (sortBy === 'date') {
      list.sort((a, b) => new Date(b.acquisition_date).getTime() - new Date(a.acquisition_date).getTime());
    } else if (sortBy === 'cloud') {
      list.sort((a, b) => a.cloud_cover - b.cloud_cover);
    }
    return list;
  }, [searchResponse, sortBy]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Copernicus Header */}
      <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1.5">
              <span className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[11px] font-mono font-semibold uppercase tracking-wider">
                Copernicus Data Space Ecosystem
              </span>
              <span className="text-xs text-slate-500 font-mono">SIH 2026 Problem Statement 26227</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Sentinel-2 Multi-Spectral Scene Discovery
            </h1>
            <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
              Direct OData catalog discovery for European Space Agency (ESA) Copernicus Sentinel-2 Level-2A surface reflectance imagery.
              Select an Area of Interest (AOI), filter by sensing date and cloud coverage, and inspect real scene footprints with ground resolution telemetry.
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start md:self-auto">
            <a
              href="https://dataspace.copernicus.eu/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium transition-colors shadow-xs"
            >
              <span>CDSE Portal</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Control Panel & Right Leaflet Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Search Filter Panel */}
        <div className="lg:col-span-4 space-y-5">
          <form onSubmit={handleSearch} className="bg-white rounded-lg p-5 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center">
                <SlidersHorizontal className="w-4 h-4 mr-2 text-teal-800" />
                Query Parameters
              </h2>
              <span className="text-[11px] font-mono text-slate-500">OData API</span>
            </div>

            {/* Error Message banner */}
            {errorMessage && (
              <div className="bg-rose-50 border border-rose-200 rounded p-3 space-y-1 text-rose-900 text-xs">
                <div className="flex items-center space-x-2 text-rose-800 font-semibold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
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

            {/* AOI Section */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                1. Area of Interest (AOI)
              </label>

              {/* Quick AOI Presets */}
              <div className="space-y-1">
                <span className="text-[11px] text-slate-500">Regional Presets:</span>
                <select
                  value={selectedPresetIndex}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700"
                >
                  <option value="">-- Custom Drawn / Coordinate BBox --</option>
                  {PRESET_AOIS.map((preset, idx) => (
                    <option key={preset.name} value={idx}>
                      {preset.name} ({preset.bbox[1].toFixed(2)}N, {preset.bbox[0].toFixed(2)}E)
                    </option>
                  ))}
                </select>
              </div>

              {/* Map Draw Trigger */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsDrawingAoi(!isDrawingAoi)}
                  className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors ${
                    isDrawingAoi
                      ? 'bg-amber-100 text-amber-900 border border-amber-400 font-semibold'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5 text-slate-600" />
                  <span>{isDrawingAoi ? 'Drawing Active...' : 'Draw AOI on Map'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowManualCoords(!showManualCoords)}
                  className="px-2.5 py-1.5 rounded text-xs bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center space-x-1"
                  title="Edit bounding box numbers directly"
                >
                  <span>BBox</span>
                  {showManualCoords ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {/* Collapsible Manual BBox input */}
              {showManualCoords && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded space-y-2 text-xs">
                  <p className="text-[11px] text-slate-500 font-mono">WGS84 [minLon, minLat, maxLon, maxLat]:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] text-slate-500">Min Lon (West)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMinLon}
                        onChange={(e) => setManualMinLon(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Min Lat (South)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMinLat}
                        onChange={(e) => setManualMinLat(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Max Lon (East)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMaxLon}
                        onChange={(e) => setManualMaxLon(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Max Lat (North)</span>
                      <input
                        type="number"
                        step="0.01"
                        value={manualMaxLat}
                        onChange={(e) => setManualMaxLat(e.target.value)}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-slate-900 font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleApplyManualCoords}
                    className="w-full py-1 text-center bg-teal-800 hover:bg-teal-900 text-white rounded font-medium text-[11px] transition-colors"
                  >
                    Apply Coordinates
                  </button>
                </div>
              )}

              {/* Current Active AOI summary pill */}
              {aoiBbox && (
                <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700">
                  <div className="flex items-center space-x-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-teal-800" />
                    <span className="font-mono">
                      {aoiBbox[1].toFixed(2)}, {aoiBbox[0].toFixed(2)} &rarr; {aoiBbox[3].toFixed(2)}, {aoiBbox[2].toFixed(2)}
                    </span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-teal-800 font-mono">Active AOI</span>
                </div>
              )}
            </div>

            {/* Date Range Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase text-slate-700 tracking-wider">
                  2. Sensing Date Range
                </label>
                <div className="flex items-center space-x-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setStartDate('2024-05-01');
                      setEndDate('2024-05-25');
                    }}
                    className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded font-medium"
                    title="Verified clear-sky benchmark window with guaranteed live Copernicus Sentinel-2 Level-2A imagery"
                  >
                    Benchmark: May 2024
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDatePreset(14)}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                  >
                    14d
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetDatePreset(30)}
                    className="px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200"
                  >
                    30d
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">Start Date</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      max={endDate}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] text-slate-500 mb-1">End Date</span>
                  <div className="relative">
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Cloud Cover Slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold uppercase text-slate-700 tracking-wider">
                  3. Cloud Threshold: <span className="text-teal-800 font-mono font-bold">{maxCloudCover}%</span>
                </label>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setMaxCloudCover(10)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded"
                  >
                    &le;10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxCloudCover(30)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded"
                  >
                    &le;30%
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaxCloudCover(100)}
                    className="px-1.5 py-0.5 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded"
                  >
                    All
                  </button>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={maxCloudCover}
                onChange={(e) => setMaxCloudCover(Number(e.target.value))}
                className="w-full accent-teal-800 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>0% (Clear Sky)</span>
                <span>50%</span>
                <span>100% (Any)</span>
              </div>
            </div>

            {/* Product Type & Limit */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Product Level</label>
                <select
                  value={productType}
                  onChange={(e) => setProductType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                >
                  <option value="S2MSI2A">Level-2A (Bottom of Atmos.)</option>
                  <option value="S2MSI1C">Level-1C (Top of Atmos.)</option>
                  <option value="ALL">All Levels</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Result Limit</label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:border-teal-700 font-mono"
                >
                  <option value="10">10 products</option>
                  <option value="20">20 products</option>
                  <option value="50">50 products</option>
                </select>
              </div>
            </div>

            {/* Cache Control Toggle */}
            <div className="pt-1 flex items-center justify-between text-xs text-slate-700">
              <label className="flex items-center space-x-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isForceRefresh}
                  onChange={(e) => setIsForceRefresh(e.target.checked)}
                  className="rounded border-slate-300 text-teal-800 focus:ring-teal-700"
                />
                <span className="text-[11px] text-slate-600">Force Live CDSE Query (bypass cache)</span>
              </label>
            </div>

            {/* Search Submit Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <button
                type="submit"
                disabled={isLoading || !aoiBbox}
                className="py-2 px-3 bg-teal-800 hover:bg-teal-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium rounded shadow-xs transition-colors flex items-center justify-center space-x-1.5 text-xs"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Query Catalog</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSearch(undefined, true)}
                disabled={isLoading || !aoiBbox}
                className="py-2 px-3 bg-white hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed text-teal-800 border border-teal-300 font-medium rounded shadow-xs transition-colors flex items-center justify-center space-x-1.5 text-xs"
                title="Bypass in-memory cache and directly query live Copernicus OData"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
                <span>Force Live CDSE</span>
              </button>
            </div>
          </form>

          {/* Search Statistics / Provenance Card */}
          {searchResponse && (
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-xs text-xs space-y-2.5">
              {/* Primary Data Mode Banner */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-600 font-medium">Data Origin:</span>
                {searchResponse.data_mode === 'live_copernicus' ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
                    LIVE Copernicus API
                  </span>
                ) : searchResponse.data_mode === 'cached' ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    Cached ({searchResponse.cache_age_seconds || 0}s old)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    Demo Benchmark
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-slate-600">
                <span>Endpoint:</span>
                <span className="text-slate-900 font-mono text-[10px] truncate max-w-[200px]" title={searchResponse.api_endpoint}>
                  catalogue.dataspace.copernicus.eu
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Query Latency:</span>
                <span className="text-slate-900 font-mono">{searchResponse.execution_time_ms} ms</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Scenes Discovered:</span>
                <span className="text-slate-900 font-bold font-mono">{searchResponse.total_results}</span>
              </div>
              {searchResponse.data_mode === 'cached' && (
                <div className="flex items-center justify-between text-slate-600">
                  <span>Cache Status:</span>
                  <button
                    type="button"
                    onClick={() => handleSearch(undefined, true)}
                    className="text-teal-800 hover:text-teal-900 underline text-[11px] font-medium"
                  >
                    Query Live CDSE Now &rarr;
                  </button>
                </div>
              )}

              {/* Action buttons for verification and inspection */}
              <div className="pt-2 border-t border-slate-200 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowOdataInspector(!showOdataInspector)}
                  className="flex-1 py-1 px-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded text-[11px] border border-slate-300 transition-colors text-center"
                >
                  {showOdataInspector ? 'Hide Query' : 'Inspect OData'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowVerificationGuide(true)}
                  className="flex-1 py-1 px-2 bg-teal-50 hover:bg-teal-100 text-teal-800 rounded text-[11px] border border-teal-300 transition-colors text-center font-medium"
                >
                  Verify Live ESA &rarr;
                </button>
              </div>

              {/* Collapsible OData Query String Inspector */}
              {showOdataInspector && searchResponse.odata_filter && (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[10px] space-y-1">
                  <div className="flex items-center justify-between text-slate-700 font-semibold">
                    <span>OData $filter Expression:</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(searchResponse.odata_filter || '')}
                      className="text-teal-800 hover:underline"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="font-mono text-slate-800 break-all whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 max-h-32 overflow-y-auto">
                    {searchResponse.odata_filter}
                  </pre>
                </div>
              )}

              {searchResponse.message && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded text-[11px] text-amber-900">
                  {searchResponse.message}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leaflet Map Visualizer - Visual Centerpiece */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 p-2.5 flex-1 min-h-[500px] flex flex-col shadow-xs">
            <div className="px-3 py-2 flex items-center justify-between border-b border-slate-200 text-xs">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-teal-700" />
                <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Interactive Spatial Viewer</span>
                <span className="text-slate-500 text-[11px] hidden sm:inline">&bull; Click scene footprints to inspect details</span>
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                {sortedProducts.length > 0 ? `${sortedProducts.length} Footprints` : 'No Footprints'}
              </div>
            </div>

            <div className="flex-1 min-h-[460px] relative mt-2">
              <LeafletMapView
                aoiBbox={aoiBbox}
                onAoiChange={setAoiBbox}
                products={sortedProducts}
                selectedProductId={selectedProduct?.id || null}
                onSelectProduct={(prod) => setSelectedProduct(prod)}
                isDrawingAoi={isDrawingAoi}
                setIsDrawingAoi={setIsDrawingAoi}
                center={[
                  aoiBbox ? (aoiBbox[1] + aoiBbox[3]) / 2 : 18.5204,
                  aoiBbox ? (aoiBbox[0] + aoiBbox[2]) / 2 : 73.8567
                ]}
                zoom={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
        {/* Results Header */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <Database className="w-4 h-4 text-teal-800" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                Discovered Sentinel-2 Scenes ({sortedProducts.length})
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                AOI footprint match &bull; Dates: {startDate} to {endDate} &bull; Cloud &le; {maxCloudCover}%
              </p>
            </div>
          </div>

          {sortedProducts.length > 0 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-slate-500 flex items-center">
                <ArrowUpDown className="w-3.5 h-3.5 mr-1 text-slate-400" />
                Sort:
              </span>
              <button
                type="button"
                onClick={() => setSortBy('date')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === 'date'
                    ? 'bg-teal-800 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Date (Newest)
              </button>
              <button
                type="button"
                onClick={() => setSortBy('cloud')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  sortBy === 'cloud'
                    ? 'bg-teal-800 text-white font-semibold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Cloud (Lowest)
              </button>
            </div>
          )}
        </div>

        {/* Results Grid / List */}
        {isLoading ? (
          <div className="py-16 text-center space-y-2">
            <Loader2 className="w-6 h-6 text-teal-800 animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-800">Querying Copernicus Data Space catalog...</p>
            <p className="text-[11px] text-slate-500 font-mono">Filtering by spatial intersection & sensing attributes</p>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="py-14 text-center space-y-2.5 px-4">
            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-semibold text-slate-900">No Sentinel-2 Imagery Found</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              No scenes matched the current AOI and criteria ({startDate} to {endDate}, cloud &le; {maxCloudCover}%).
            </p>
            <div className="pt-1 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMaxCloudCover(100);
                  handleSetDatePreset(60);
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded border border-slate-300 transition-colors"
              >
                Expand Date Range & Set Max Cloud to 100%
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {sortedProducts.map((product) => {
              const isSelected = selectedProduct?.id === product.id;
              const cloudColor =
                product.cloud_cover < 10
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : product.cloud_cover < 30
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300';

              const formattedDate = product.acquisition_date
                ? format(new Date(product.acquisition_date), 'MMM dd, yyyy HH:mm')
                : 'Unknown';

              return (
                <div
                  key={product.id}
                  onClick={() => setSelectedProduct(product)}
                  className={`rounded border transition-all p-3.5 cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-teal-50/30 border-teal-700 ring-1 ring-teal-700 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-mono font-semibold">
                          {product.product_type}
                        </span>
                        {product.data_mode === 'live_copernicus' ? (
                          <span className="px-1.5 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
                            Live
                          </span>
                        ) : product.data_mode === 'cached' ? (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Cached
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-300 rounded text-[10px] font-mono font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                            Demo
                          </span>
                        )}
                      </div>

                      <span className={`px-2 py-0.5 border rounded text-[10px] font-mono font-medium flex items-center space-x-1 ${cloudColor}`}>
                        <Cloud className="w-3 h-3" />
                        <span>{product.cloud_cover}% Cloud</span>
                      </span>
                    </div>

                    {/* Product Name */}
                    <div>
                      <h4
                        className="text-xs font-semibold text-slate-900 line-clamp-2 hover:text-teal-800 transition-colors"
                        title={product.name}
                      >
                        {product.name}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        ID: {product.id.slice(0, 8)}...{product.id.slice(-6)}
                      </p>
                    </div>

                    {/* Metadata details */}
                    <div className="space-y-1 text-xs text-slate-600 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center text-[11px]">
                          <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                          Acquisition:
                        </span>
                        <span className="font-mono text-[11px] text-slate-800">{formattedDate} UTC</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Platform:</span>
                        <span className="font-mono text-slate-800">{product.platform}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Tile ID:</span>
                        <span className="font-mono text-slate-800">{product.tile_id || 'N/A'}</span>
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Centroid:</span>
                        <span className="font-mono text-slate-800">
                          {product.center[1].toFixed(2)}&deg;N, {product.center[0].toFixed(2)}&deg;E
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                      }}
                      className={`flex-1 py-1 px-2 rounded text-xs font-medium flex items-center justify-center space-x-1 transition-colors ${
                        isSelected
                          ? 'bg-teal-800 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{isSelected ? 'Inspecting' : 'View Footprint'}</span>
                    </button>

                    <a
                      href={product.cdse_browser_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                      title="Open full interactive Sentinel-2 scene in Copernicus Browser"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(product.id);
                      }}
                      className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                      title="Copy Copernicus Product UUID"
                    >
                      {copiedId === product.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Product Inspection Details Modal/Card */}
      {selectedProduct && (
        <div className="bg-white rounded-lg p-5 border border-slate-300 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider font-mono">
                  Inspecting Sentinel-2 Scene Footprint
                </span>
                {selectedProduct.data_mode === 'live_copernicus' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
                    LIVE Copernicus API
                  </span>
                ) : selectedProduct.data_mode === 'cached' ? (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    Cached Data
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                    Demo Benchmark
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-slate-900 break-all">{selectedProduct.name}</h3>
            </div>
            <div className="flex items-center space-x-2">
              <a
                href={selectedProduct.cdse_browser_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-teal-800 hover:bg-teal-900 text-white rounded text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <span>Copernicus Browser</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                type="button"
                onClick={() => setSelectedProduct(null)}
                className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px]">Copernicus UUID</span>
              <span className="font-mono text-slate-800 text-[11px] break-all">{selectedProduct.id}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px]">Acquisition Date</span>
              <span className="text-slate-800 font-mono text-[11px]">
                {selectedProduct.acquisition_date
                  ? format(new Date(selectedProduct.acquisition_date), 'MMM dd, yyyy HH:mm')
                  : 'N/A'}{' '}
                UTC
              </span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px]">Cloud Coverage</span>
              <span className="text-slate-900 font-bold font-mono">{selectedProduct.cloud_cover}%</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-slate-500 block mb-0.5 text-[11px]">Processing Level</span>
              <span className="text-slate-900 font-bold font-mono">{selectedProduct.product_type}</span>
            </div>
          </div>

          {selectedProduct.metadata && Object.keys(selectedProduct.metadata).length > 0 && (
            <div className="pt-1 text-xs">
              <p className="text-slate-500 mb-1 text-[11px] uppercase tracking-wider font-semibold">Sensor Attributes:</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(selectedProduct.metadata).map(([key, val]) => (
                  val ? (
                    <span key={key} className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded font-mono text-[10px]">
                      {key}: {String(val)}
                    </span>
                  ) : null
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sentinel2Search;
