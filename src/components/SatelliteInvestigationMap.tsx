import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Sliders, 
  Layers, 
  Maximize2, 
  Eye, 
  EyeOff, 
  MapPin, 
  Calendar, 
  Cloud, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Construction, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Info,
  ExternalLink,
  ChevronRight,
  Crosshair
} from 'lucide-react';
import { format } from 'date-fns';
import { BuiltUpAnalysisResult, ChangeAnalysisResult } from '../types';

export interface SceneSummary {
  id: string;
  name?: string;
  acquisition_date: string;
  tile_id?: string;
  cloud_cover: number;
  bbox?: [number, number, number, number];
  data_mode?: string;
  preview_url?: string;
}

export interface CandidateRegion {
  id: string;
  type: 'new_construction_candidate' | 'building_expansion_candidate' | string;
  pixel_count: number;
  area_m2: number;
  centroid: [number, number] | number[];
  bounding_box: [number, number, number, number] | number[];
  mean_delta_ndvi: number;
  mean_delta_ndbi: number;
  min_delta_ndvi?: number;
  max_delta_ndbi?: number;
}

interface SatelliteInvestigationMapProps {
  beforeScene: SceneSummary;
  afterScene: SceneSummary;
  aoiBbox: [number, number, number, number];
  analysis?: BuiltUpAnalysisResult | ChangeAnalysisResult | null;
  selectedCandidateId?: string | null;
  onSelectCandidate?: (candidateId: string | null) => void;
}

export const SatelliteInvestigationMap: React.FC<SatelliteInvestigationMapProps> = ({
  beforeScene,
  afterScene,
  aoiBbox,
  analysis,
  selectedCandidateId,
  onSelectCandidate
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Panes
  const beforePaneRef = useRef<HTMLElement | null>(null);
  const afterPaneRef = useRef<HTMLElement | null>(null);
  const maskPaneRef = useRef<HTMLElement | null>(null);

  // Layers
  const baseLayersRef = useRef<{ osm: L.TileLayer; satellite: L.TileLayer } | null>(null);
  const beforeOverlayRef = useRef<L.ImageOverlay | null>(null);
  const afterOverlayRef = useRef<L.ImageOverlay | null>(null);
  const maskOverlayRef = useRef<L.ImageOverlay | null>(null);
  const aoiRectRef = useRef<L.Rectangle | null>(null);
  const candidateLayersRef = useRef<Map<string, L.Rectangle>>(new Map());

  // Component state
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage 0 - 100
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [showChangeOverlay, setShowChangeOverlay] = useState<boolean>(true);
  const [showCandidates, setShowCandidates] = useState<boolean>(true);
  const [activeBaseLayer, setActiveBaseLayer] = useState<'satellite' | 'osm'>('satellite');

  // Extract candidate regions if built-up analysis
  const builtUpAnalysis = analysis && 'classification' in analysis && analysis.classification === 'built_up_change' 
    ? (analysis as BuiltUpAnalysisResult) 
    : null;
  
  const candidateList: CandidateRegion[] = builtUpAnalysis?.candidates || [];
  const selectedCandidate = candidateList.find(c => c.id === selectedCandidateId) || null;

  // Initialize Map and Leaflet Panes
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Calculate map center from AOI
    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    const centerLat = (minLat + maxLat) / 2;
    const centerLon = (minLon + maxLon) / 2;

    const map = L.map(mapContainerRef.current, {
      center: [centerLat, centerLon],
      zoom: 11,
      zoomControl: false,
      attributionControl: false
    });

    // Create custom panes for Before/After split
    // Leaflet default tilePane is 200, overlayPane is 400
    const bPane = map.createPane('beforePane');
    bPane.style.zIndex = '400';

    const aPane = map.createPane('afterPane');
    aPane.style.zIndex = '420';

    const mPane = map.createPane('maskPane');
    mPane.style.zIndex = '440';

    beforePaneRef.current = bPane;
    afterPaneRef.current = aPane;
    maskPaneRef.current = mPane;

    // Basemaps (Real Satellite & OSM)
    const satelliteLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        attribution: 'Esri World Imagery'
      }
    );

    const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: 'OpenStreetMap'
    });

    satelliteLayer.addTo(map);
    baseLayersRef.current = { osm: osmLayer, satellite: satelliteLayer };

    // Attribution
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://dataspace.copernicus.eu/">Copernicus Sentinel-2</a> | Esri')
      .addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Clip Paths on Panes when slider position changes
  const applyPaneClips = useCallback((pos: number) => {
    if (beforePaneRef.current) {
      // Left side shows Before: clip right side by (100 - pos)%
      beforePaneRef.current.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
    }
    if (afterPaneRef.current) {
      // Right side shows After: clip left side by pos%
      afterPaneRef.current.style.clipPath = `inset(0 0 0 ${pos}%)`;
    }
    if (maskPaneRef.current) {
      // Change mask stays on the After side
      maskPaneRef.current.style.clipPath = `inset(0 0 0 ${pos}%)`;
    }
  }, []);

  useEffect(() => {
    applyPaneClips(sliderPosition);
  }, [sliderPosition, applyPaneClips]);

  // Load Imagery Overlays and AOI Boundary
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove existing overlays
    if (beforeOverlayRef.current) {
      map.removeLayer(beforeOverlayRef.current);
      beforeOverlayRef.current = null;
    }
    if (afterOverlayRef.current) {
      map.removeLayer(afterOverlayRef.current);
      afterOverlayRef.current = null;
    }
    if (aoiRectRef.current) {
      map.removeLayer(aoiRectRef.current);
      aoiRectRef.current = null;
    }

    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    const aoiBounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);

    // AOI Rect on base map
    const aoiRect = L.rectangle(aoiBounds, {
      color: '#38bdf8',
      weight: 2,
      dashArray: '5, 5',
      fillColor: '#38bdf8',
      fillOpacity: 0.05
    }).addTo(map);

    aoiRect.bindTooltip(
      `<div class="text-xs font-semibold text-sky-400">Common Working AOI (Aligned)</div>
       <div class="text-[10px] text-slate-300 font-mono">${minLat.toFixed(3)}, ${minLon.toFixed(3)} to ${maxLat.toFixed(3)}, ${maxLon.toFixed(3)}</div>`,
      { permanent: false, direction: 'top' }
    );
    aoiRectRef.current = aoiRect;

    // Use scene bounds if provided, otherwise common AOI
    const beforeBounds = beforeScene.bbox 
      ? L.latLngBounds([beforeScene.bbox[1], beforeScene.bbox[0]], [beforeScene.bbox[3], beforeScene.bbox[2]])
      : aoiBounds;

    const afterBounds = afterScene.bbox 
      ? L.latLngBounds([afterScene.bbox[1], afterScene.bbox[0]], [afterScene.bbox[3], afterScene.bbox[2]])
      : aoiBounds;

    // Before Scene Image Overlay in beforePane
    const beforeUrl = beforeScene.preview_url || `/api/sentinel2/preview/${beforeScene.id}`;
    const beforeOverlay = L.imageOverlay(beforeUrl, beforeBounds, {
      pane: 'beforePane',
      opacity: 0.95
    }).addTo(map);
    beforeOverlayRef.current = beforeOverlay;

    // After Scene Image Overlay in afterPane
    const afterUrl = afterScene.preview_url || `/api/sentinel2/preview/${afterScene.id}`;
    const afterOverlay = L.imageOverlay(afterUrl, afterBounds, {
      pane: 'afterPane',
      opacity: 0.95
    }).addTo(map);
    afterOverlayRef.current = afterOverlay;

    // Fit map bounds to common AOI
    map.fitBounds(aoiBounds.pad(0.12), { duration: 0.8 });
  }, [beforeScene, afterScene, aoiBbox]);

  // Load Built-Up Change Mask Overlay
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (maskOverlayRef.current) {
      map.removeLayer(maskOverlayRef.current);
      maskOverlayRef.current = null;
    }

    if (!showChangeOverlay || !analysis) return;

    const maskUrl = analysis.change_mask_url || (builtUpAnalysis ? `/api/change/built-up-mask/${builtUpAnalysis.analysis_id}` : null);
    if (!maskUrl) return;

    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    const aoiBounds = L.latLngBounds([minLat, minLon], [maxLat, maxLon]);

    const maskOverlay = L.imageOverlay(maskUrl, aoiBounds, {
      pane: 'maskPane',
      opacity: 0.85
    }).addTo(map);

    maskOverlayRef.current = maskOverlay;
  }, [showChangeOverlay, analysis, builtUpAnalysis, aoiBbox]);

  // Render Interactive Candidate Vectors
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing candidate vectors
    candidateLayersRef.current.forEach(layer => map.removeLayer(layer));
    candidateLayersRef.current.clear();

    if (!showCandidates || candidateList.length === 0) return;

    candidateList.forEach(cand => {
      const isSelected = cand.id === selectedCandidateId;
      const isNewConstruction = cand.type === 'new_construction_candidate';
      const strokeColor = isSelected ? '#facc15' : isNewConstruction ? '#f97316' : '#a855f7';
      const fillColor = isNewConstruction ? '#ea580c' : '#9333ea';

      const [cMinLon, cMinLat, cMaxLon, cMaxLat] = cand.bounding_box;
      const bounds = L.latLngBounds([cMinLat, cMinLon], [cMaxLat, cMaxLon]);

      const rect = L.rectangle(bounds, {
        color: strokeColor,
        weight: isSelected ? 4 : 2.5,
        dashArray: isSelected ? undefined : '4, 4',
        fillColor: fillColor,
        fillOpacity: isSelected ? 0.45 : 0.25,
        className: isSelected ? 'candidate-selected-pulsing' : 'candidate-vector'
      }).addTo(map);

      // Tooltip
      const typeLabel = isNewConstruction ? 'New Construction Candidate' : 'Building Expansion Candidate';
      const typeIcon = isNewConstruction ? '🟧' : '🟪';
      const tooltipHtml = `
        <div class="p-1 font-sans text-xs">
          <div class="font-bold flex items-center gap-1.5" style="color: ${strokeColor};">
            <span>${typeIcon}</span>
            <span>${typeLabel}</span>
          </div>
          <div class="text-[11px] text-slate-300 mt-1">
            Area: <strong class="text-white">${cand.area_m2.toLocaleString()} m²</strong> (${(cand.area_m2 / 10000).toFixed(2)} ha)
          </div>
          <div class="text-[10px] text-slate-400 font-mono mt-0.5">
            ΔNDVI: ${cand.mean_delta_ndvi.toFixed(3)} | ΔNDBI: +${cand.mean_delta_ndbi.toFixed(3)}
          </div>
          <div class="text-[10px] text-sky-400 font-semibold mt-1">
            Click to inspect evidence &rarr;
          </div>
        </div>
      `;

      rect.bindTooltip(tooltipHtml, {
        sticky: true,
        direction: 'top',
        className: 'candidate-custom-tooltip'
      });

      rect.on('click', () => {
        if (onSelectCandidate) {
          onSelectCandidate(cand.id);
        }
      });

      candidateLayersRef.current.set(cand.id, rect);
    });
  }, [candidateList, selectedCandidateId, showCandidates, onSelectCandidate]);

  // Zoom to candidate when selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedCandidate) return;

    const [cMinLon, cMinLat, cMaxLon, cMaxLat] = selectedCandidate.bounding_box;
    const bounds = L.latLngBounds([cMinLat, cMinLon], [cMaxLat, cMaxLon]);

    map.flyToBounds(bounds.pad(0.35), {
      duration: 1.2,
      maxZoom: 14
    });
  }, [selectedCandidate]);

  // Draggable Slider Mouse / Touch Handlers
  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPercentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(clampedPercentage);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDraggingSlider(true);
    handleSliderMove(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      setIsDraggingSlider(true);
      handleSliderMove(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDraggingSlider) {
        handleSliderMove(e.clientX);
      }
    };
    const onMouseUp = () => {
      setIsDraggingSlider(false);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDraggingSlider && e.touches.length > 0) {
        handleSliderMove(e.touches[0].clientX);
      }
    };
    const onTouchEnd = () => {
      setIsDraggingSlider(false);
    };

    if (isDraggingSlider) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDraggingSlider, handleSliderMove]);

  // Actions
  const handleFitAoi = () => {
    const map = mapRef.current;
    if (!map) return;
    const [minLon, minLat, maxLon, maxLat] = aoiBbox;
    map.flyToBounds([[minLat, minLon], [maxLat, maxLon]], { padding: [40, 40], duration: 1 });
  };

  const handleFitCandidate = () => {
    const map = mapRef.current;
    if (!map || !selectedCandidate) return;
    const [cMinLon, cMinLat, cMaxLon, cMaxLat] = selectedCandidate.bounding_box;
    map.flyToBounds([[cMinLat, cMinLon], [cMaxLat, cMaxLon]], { padding: [60, 60], maxZoom: 14, duration: 1 });
  };

  const handleToggleBaseMap = () => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    if (!map || !layers) return;

    if (activeBaseLayer === 'satellite') {
      map.removeLayer(layers.satellite);
      layers.osm.addTo(map);
      setActiveBaseLayer('osm');
    } else {
      map.removeLayer(layers.osm);
      layers.satellite.addTo(map);
      setActiveBaseLayer('satellite');
    }
  };

  return (
    <div className="space-y-4">
      {/* Map Header Toolbar with Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 backdrop-blur-md">
        {/* Left: Investigation Title & Spatial Alignment Verified */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-satellite-400" />
            <span className="text-sm font-semibold text-white">Before / After Investigation</span>
          </div>

          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Spatially Aligned 10m Sentinel-2 Grid</span>
          </div>
        </div>

        {/* Right: Interactive Map Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Slider Preset Buttons */}
          <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setSliderPosition(100)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                sliderPosition >= 98
                  ? 'bg-satellite-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View 100% Before Scene"
            >
              Before
            </button>
            <button
              type="button"
              onClick={() => setSliderPosition(50)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                sliderPosition > 2 && sliderPosition < 98
                  ? 'bg-satellite-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Split 50/50 comparison"
            >
              50/50 Split
            </button>
            <button
              type="button"
              onClick={() => setSliderPosition(0)}
              className={`px-2.5 py-1 rounded-md transition-all ${
                sliderPosition <= 2
                  ? 'bg-satellite-500 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="View 100% After Scene"
            >
              After
            </button>
          </div>

          {/* Toggle Change Overlay */}
          <button
            type="button"
            onClick={() => setShowChangeOverlay(!showChangeOverlay)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              showChangeOverlay
                ? 'bg-orange-500/20 text-orange-300 border-orange-500/50 ring-1 ring-orange-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
            title="Toggle Built-up Change Mask Overlay"
          >
            {showChangeOverlay ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Change Mask</span>
          </button>

          {/* Toggle Candidates */}
          {candidateList.length > 0 && (
            <button
              type="button"
              onClick={() => setShowCandidates(!showCandidates)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                showCandidates
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 ring-1 ring-purple-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle Candidate Region Highlights"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Candidates ({candidateList.length})</span>
            </button>
          )}

          {/* Basemap Toggle */}
          <button
            type="button"
            onClick={handleToggleBaseMap}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Switch Satellite / Street Base Layer"
          >
            <Layers className="w-3.5 h-3.5 text-satellite-400" />
            <span>{activeBaseLayer === 'satellite' ? 'Satellite' : 'Street'}</span>
          </button>

          {/* Fit AOI */}
          <button
            type="button"
            onClick={handleFitAoi}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Fit Entire AOI into view"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Fit Selected Candidate */}
          {selectedCandidate && (
            <button
              type="button"
              onClick={handleFitCandidate}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors"
              title="Zoom to selected candidate region"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Zoom Candidate</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Investigation Section: Large Map (65-70%) + Evidence Panel (30-35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Map Container (7 or 8 columns on large screens) */}
        <div className="lg:col-span-8 relative">
          <div
            ref={sliderContainerRef}
            className="relative w-full h-[580px] sm:h-[620px] rounded-xl overflow-hidden border border-ui-border shadow-2xl bg-slate-950 select-none cursor-grab active:cursor-grabbing"
          >
            {/* Underlying Leaflet Map */}
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Draggable Vertical Swipe Divider Bar */}
            <div
              className="absolute top-0 bottom-0 z-30 pointer-events-none transition-transform"
              style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
            >
              {/* Divider Line */}
              <div className="w-0.5 h-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] mx-auto" />

              {/* Slider Handle Pill in Center */}
              <div
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto cursor-ew-resize w-10 h-10 rounded-full bg-slate-900 border-2 border-white shadow-[0_4px_20px_rgba(0,0,0,0.8)] flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
                title="Drag horizontally to compare Before & After scenes"
              >
                <Sliders className="w-4 h-4 text-satellite-400 rotate-90" />
              </div>
            </div>

            {/* Scene Header Badges inside Map View */}
            {/* Before Scene (Top Left) */}
            <div className="absolute top-3 left-3 z-20 pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-lg flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <div>
                  <div className="text-[11px] font-bold text-white tracking-wide flex items-center gap-1.5">
                    <span>BEFORE</span>
                    <span className="text-[10px] font-normal text-slate-400">Baseline</span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono">
                    {format(new Date(beforeScene.acquisition_date), 'MMM dd, yyyy')} &bull; Tile {beforeScene.tile_id || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* After Scene (Top Right) */}
            <div className="absolute top-3 right-3 z-20 pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-lg flex items-center space-x-2">
                <div>
                  <div className="text-[11px] font-bold text-white tracking-wide text-right flex items-center justify-end gap-1.5">
                    <span className="text-[10px] font-normal text-slate-400">Monitoring</span>
                    <span>AFTER</span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-mono text-right">
                    {format(new Date(afterScene.acquisition_date), 'MMM dd, yyyy')} &bull; Tile {afterScene.tile_id || 'N/A'}
                  </div>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
              </div>
            </div>

            {/* Map Legend Overlay (Bottom Left) */}
            <div className="absolute bottom-3 left-3 z-20 pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1">
                  Investigation Legend
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-emerald-400 font-bold">◀ Left</span>
                  <span className="text-[11px] text-slate-300">Before Scene ({format(new Date(beforeScene.acquisition_date), 'yyyy-MM-dd')})</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-sky-400 font-bold">Right ▶</span>
                  <span className="text-[11px] text-slate-300">After Scene ({format(new Date(afterScene.acquisition_date), 'yyyy-MM-dd')})</span>
                </div>

                <div className="pt-1 border-t border-slate-800 space-y-1">
                  <div className="text-[10px] font-semibold text-slate-400">Change Candidates:</div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-sm bg-orange-500/80 border border-orange-300" />
                    <span className="text-[11px] text-orange-200">🟧 New Construction Candidate</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-sm bg-purple-500/80 border border-purple-300" />
                    <span className="text-[11px] text-purple-200">🟪 Building Expansion Candidate</span>
                  </div>
                  <div className="text-[9px] text-slate-400 italic">
                    Spectral change candidates derived from Sentinel-2
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Slider Position Guide */}
            <div className="absolute bottom-3 right-3 z-20 pointer-events-none">
              <div className="bg-slate-900/85 backdrop-blur-md border border-slate-700/60 rounded-md px-2.5 py-1 text-[11px] font-mono text-slate-300 shadow-md">
                Split: {sliderPosition.toFixed(0)}% Before / {(100 - sliderPosition).toFixed(0)}% After
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Evidence Panel (4 columns on large screens) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-ui-dark border border-ui-border rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <Compass className="w-4 h-4 text-satellite-400" />
                <span>Candidate Evidence Panel</span>
              </h3>
              {selectedCandidate && (
                <button
                  type="button"
                  onClick={() => onSelectCandidate && onSelectCandidate(null)}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {selectedCandidate ? (
              <div className="space-y-4">
                {/* Candidate Badge */}
                <div
                  className={`p-3.5 rounded-lg border flex items-start space-x-3 ${
                    selectedCandidate.type === 'new_construction_candidate'
                      ? 'bg-orange-500/10 border-orange-500/30 text-orange-300'
                      : 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                  }`}
                >
                  {selectedCandidate.type === 'new_construction_candidate' ? (
                    <Construction className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                  ) : (
                    <Building2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-white">
                      {selectedCandidate.type === 'new_construction_candidate'
                        ? 'New Construction Candidate'
                        : 'Building Expansion Candidate'}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      ID: {selectedCandidate.id}
                    </div>
                  </div>
                </div>

                {/* Spectral Metrics Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Area</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {selectedCandidate.area_m2.toLocaleString()} m²
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({(selectedCandidate.area_m2 / 10000).toFixed(2)} ha)
                    </span>
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Pixel Count</span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {selectedCandidate.pixel_count.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">at 10m resolution</span>
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Mean ΔNDVI</span>
                    <span className="text-sm font-bold text-emerald-400 mt-0.5 block font-mono">
                      {selectedCandidate.mean_delta_ndvi.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-emerald-300/80">Vegetation loss</span>
                  </div>

                  <div className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-[11px] text-slate-400 block">Mean ΔNDBI</span>
                    <span className="text-sm font-bold text-amber-400 mt-0.5 block font-mono">
                      +{selectedCandidate.mean_delta_ndbi.toFixed(3)}
                    </span>
                    <span className="text-[10px] text-amber-300/80">Built-up index increase</span>
                  </div>
                </div>

                {/* Scene Provenance Comparison */}
                <div className="space-y-2 border-t border-slate-800/80 pt-3">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
                    Scene Provenance
                  </div>

                  {/* Before Scene Box */}
                  <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-semibold text-emerald-300">
                      <span>Before Scene</span>
                      <span className="font-mono text-[10px] text-slate-400">{beforeScene.tile_id || 'N/A'}</span>
                    </div>
                    <div className="text-slate-400 truncate">
                      ID: <span className="text-white font-mono">{beforeScene.id.slice(0, 24)}...</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Acquisition:</span>
                      <span className="text-white font-mono">{format(new Date(beforeScene.acquisition_date), 'yyyy-MM-dd')}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Cloud Cover:</span>
                      <span className="text-white">{beforeScene.cloud_cover.toFixed(1)}%</span>
                    </div>
                  </div>

                  {/* After Scene Box */}
                  <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800 text-[11px] space-y-1">
                    <div className="flex items-center justify-between font-semibold text-sky-300">
                      <span>After Scene</span>
                      <span className="font-mono text-[10px] text-slate-400">{afterScene.tile_id || 'N/A'}</span>
                    </div>
                    <div className="text-slate-400 truncate">
                      ID: <span className="text-white font-mono">{afterScene.id.slice(0, 24)}...</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Acquisition:</span>
                      <span className="text-white font-mono">{format(new Date(afterScene.acquisition_date), 'yyyy-MM-dd')}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Cloud Cover:</span>
                      <span className="text-white">{afterScene.cloud_cover.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

                {/* Mandated Scientific Note */}
                <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-300 leading-relaxed italic">
                      "This is a spectral change candidate derived from Sentinel-2 imagery, not a confirmed building footprint."
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-satellite-400">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">No Candidate Selected</h4>
                  <p className="text-[11px] text-slate-400 max-w-[240px] mx-auto mt-1">
                    Click any highlighted region on the map or select from the candidate list below to inspect spectral evidence.
                  </p>
                </div>
                {candidateList.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => onSelectCandidate && onSelectCandidate(candidateList[0].id)}
                      className="px-3 py-1.5 rounded-lg bg-satellite-500/20 hover:bg-satellite-500/30 text-satellite-300 border border-satellite-500/40 text-xs font-medium transition-all"
                    >
                      Inspect First Candidate &rarr;
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Spatial Grid Verification Note */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-slate-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Spatial Alignment Metadata</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Both scenes are clipped and projected onto the identical AOI bounding box grid 
              <span className="font-mono text-slate-300 ml-1">
                [{aoiBbox.map(n => n.toFixed(2)).join(', ')}]
              </span>. Native Sentinel-2 10m/20m pixels are resampled to a consistent 10m Ground Sample Distance before differencing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SatelliteInvestigationMap;
