import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  MapPin, 
  Calendar, 
  Building2, 
  Construction, 
  AlertTriangle,
  Database,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';

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
  type: string;
  pixel_count: number;
  area_m2: number;
  centroid: [number, number] | number[];
  bounding_box: [number, number, number, number] | number[];
  mean_delta_ndvi: number;
  mean_delta_ndbi: number;
  min_delta_ndvi?: number;
  max_delta_ndbi?: number;
}

interface InvestigationWorkspacePanelProps {
  candidate: CandidateRegion;
  beforeScene: SceneSummary;
  afterScene: SceneSummary;
  onClose: () => void;
  dataMode?: string;
  limitations?: string[];
  source?: string;
}

export const InvestigationWorkspacePanel: React.FC<InvestigationWorkspacePanelProps> = ({
  candidate,
  beforeScene,
  afterScene,
  onClose,
  dataMode,
  limitations,
  source
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const isDemo = dataMode === 'demo_data';
  const isConstruction = candidate.type === 'new_construction_candidate';
  const candidateTitle = isConstruction ? 'New Construction Candidate' : 'Building Expansion Candidate';
  const iconColorClass = isConstruction ? 'text-orange-600' : 'text-purple-600';
  const bgColorClass = isConstruction ? 'bg-orange-50' : 'bg-purple-50';

  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pos = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(pos);
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleSliderMove(e.clientX);
    };
    const onMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  const beforeUrl = beforeScene.preview_url || `/api/sentinel2/preview/${beforeScene.id}`;
  const afterUrl = afterScene.preview_url || `/api/sentinel2/preview/${afterScene.id}`;

  return (
    <div className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-white shadow-2xl z-[500] flex flex-col border-l border-slate-200 overflow-y-auto">
      {/* Header */}
      <div className={`p-5 flex items-start justify-between border-b border-slate-200 ${bgColorClass}`}>
        <div className="flex items-start space-x-3">
          {isConstruction ? (
            <Construction className={`w-5 h-5 mt-0.5 ${iconColorClass}`} />
          ) : (
            <Building2 className={`w-5 h-5 mt-0.5 ${iconColorClass}`} />
          )}
          <div>
            <h2 className="text-sm font-bold text-slate-900 leading-tight">
              {candidateTitle}
            </h2>
            <div className="flex items-center space-x-2 mt-1.5 text-xs text-slate-600 font-mono">
              <MapPin className="w-3.5 h-3.5" />
              <span>
                {candidate.centroid[1].toFixed(4)}, {candidate.centroid[0].toFixed(4)}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={onClose}
          aria-label="Close investigation panel"
          className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500 hover:text-slate-900"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {isDemo && (
        <div className="bg-amber-100 px-5 py-2 flex items-center justify-center space-x-2 border-b border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-800" />
          <span className="text-[11px] font-bold text-amber-900 tracking-wider">DEMO DATA MODE</span>
        </div>
      )}

      <div className="p-5 space-y-6 flex-1">
        {/* Before/After Evidence Slider */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Visual Evidence</h3>
          
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mb-1">
            <span>{format(new Date(beforeScene.acquisition_date), 'MMM dd, yyyy')}</span>
            <span>{format(new Date(afterScene.acquisition_date), 'MMM dd, yyyy')}</span>
          </div>

          <div 
            ref={sliderRef}
            className="relative w-full h-[240px] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 cursor-crosshair select-none"
            onMouseDown={(e) => {
              setIsDragging(true);
              handleSliderMove(e.clientX);
            }}
          >
            {/* After Image (Background) */}
            <img 
              src={afterUrl} 
              alt="After scene imagery" 
              className="absolute inset-0 w-full h-full object-cover" 
              draggable={false}
            />
            
            {/* Before Image (Foreground, Clipped) */}
            <img 
              src={beforeUrl} 
              alt="Before scene imagery" 
              className="absolute inset-0 w-full h-full object-cover"
              style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              draggable={false}
            />
            
            {/* Slider Handle */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize flex items-center justify-center z-10 shadow-[0_0_5px_rgba(0,0,0,0.5)]"
              style={{ left: `calc(${sliderPosition}% - 2px)` }}
            >
              <div className="w-4 h-8 bg-white border border-slate-300 rounded shadow flex items-center justify-center">
                <div className="w-0.5 h-4 bg-slate-300 mx-px" />
                <div className="w-0.5 h-4 bg-slate-300 mx-px" />
              </div>
            </div>
            
            {/* Context Label */}
            <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
              AOI Context
            </div>
          </div>
        </div>

        {/* Why Flagged */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Interpretation</h3>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed">
            Detected spectral change consistent with possible built-up change. 
            Vegetation-related spectral response {candidate.mean_delta_ndvi < 0 ? 'decreased' : 'changed'} 
            while built-up spectral response {candidate.mean_delta_ndbi > 0 ? 'increased' : 'changed'}.
          </div>
        </div>

        {/* Evidence Metrics */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Spectral Metrics</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">Affected Area</span>
              <span className="text-sm font-bold font-mono text-slate-800">{candidate.area_m2.toLocaleString()} m²</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">Changed Pixels</span>
              <span className="text-sm font-bold font-mono text-slate-800">{candidate.pixel_count}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">Mean ΔNDVI</span>
              <span className="text-sm font-bold font-mono text-emerald-700">{candidate.mean_delta_ndvi.toFixed(3)}</span>
            </div>
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="text-[10px] text-slate-500 font-medium block">Mean ΔNDBI</span>
              <span className="text-sm font-bold font-mono text-amber-700">+{candidate.mean_delta_ndbi.toFixed(3)}</span>
            </div>
          </div>
        </div>

        {/* Source info */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Data Source</h3>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px] font-mono text-slate-600 space-y-2">
            <div>
              <strong className="text-slate-800 font-sans text-xs flex items-center"><Database className="w-3 h-3 mr-1" /> Before</strong>
              <div>{format(new Date(beforeScene.acquisition_date), 'yyyy-MM-dd HH:mm')}</div>
              <div className="truncate" title={beforeScene.name}>{beforeScene.name || beforeScene.id}</div>
              <div>Tile: {beforeScene.tile_id || 'N/A'}</div>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <strong className="text-slate-800 font-sans text-xs flex items-center"><Database className="w-3 h-3 mr-1" /> After</strong>
              <div>{format(new Date(afterScene.acquisition_date), 'yyyy-MM-dd HH:mm')}</div>
              <div className="truncate" title={afterScene.name}>{afterScene.name || afterScene.id}</div>
              <div>Tile: {afterScene.tile_id || 'N/A'}</div>
            </div>
          </div>
        </div>

        {/* Scientific Limitations */}
        {(limitations && limitations.length > 0) && (
          <div className="space-y-2 pb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Scientific Limitations</h3>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <ul className="text-[10px] text-amber-800 list-disc list-inside space-y-1.5 leading-relaxed">
                {limitations.map((limit, idx) => (
                  <li key={idx}>{limit}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
