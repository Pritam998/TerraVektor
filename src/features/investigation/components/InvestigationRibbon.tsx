import React from 'react';
import { 
  Check, 
  Circle, 
  Compass, 
  Layers, 
  HelpCircle, 
  CheckCircle2, 
  MapPin, 
  Calendar 
} from 'lucide-react';
import { format } from 'date-fns';

export type StageState = 'completed' | 'current' | 'pending';

interface InvestigationRibbonProps {
  currentStage?: 'discover' | 'detect' | 'explain' | 'verify';
  aoiLabel?: string;
  centroidCoords?: [number, number];
  beforeDate?: string;
  afterDate?: string;
  candidateCount?: number;
  verifiedCount?: number;
}

export const InvestigationRibbon: React.FC<InvestigationRibbonProps> = ({
  currentStage = 'explain',
  aoiLabel = 'Pune Urban Area',
  centroidCoords = [73.8567, 18.5204],
  beforeDate,
  afterDate,
  candidateCount = 0,
  verifiedCount = 0
}) => {
  const stages: {
    key: 'discover' | 'detect' | 'explain' | 'verify';
    stepNumber: string;
    label: string;
    caption: string;
  }[] = [
    { key: 'discover', stepNumber: '01', label: 'DISCOVER', caption: 'Copernicus CDSE L2A' },
    { key: 'detect', stepNumber: '02', label: 'DETECT', caption: 'Spectral Differencing' },
    { key: 'explain', stepNumber: '03', label: 'EXPLAIN', caption: 'Candidate Morphology' },
    { key: 'verify', stepNumber: '04', label: 'VERIFY', caption: verifiedCount > 0 ? `${verifiedCount} Verified` : 'Analyst Decision' }
  ];

  const getStageState = (stageKey: 'discover' | 'detect' | 'explain' | 'verify'): StageState => {
    const order = ['discover', 'detect', 'explain', 'verify'];
    const currentIndex = order.indexOf(currentStage);
    const stageIndex = order.indexOf(stageKey);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-md p-2.5 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Stages Chain */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto py-0.5">
          {stages.map((stage, index) => {
            const state = getStageState(stage.key);
            const isLast = index === stages.length - 1;

            return (
              <React.Fragment key={stage.key}>
                <div className={`flex items-center space-x-2 px-2.5 py-1 rounded transition-colors shrink-0 ${
                  state === 'current'
                    ? 'bg-teal-50 border border-teal-200'
                    : state === 'completed'
                    ? 'bg-slate-50 text-slate-700'
                    : 'text-slate-400'
                }`}>
                  {/* Status Glyph */}
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0 font-bold ${
                    state === 'completed'
                      ? 'bg-emerald-600 text-white'
                      : state === 'current'
                      ? 'bg-teal-800 text-white'
                      : 'border border-slate-300 text-slate-400 bg-white'
                  }`}>
                    {state === 'completed' ? (
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    ) : state === 'current' ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    ) : (
                      <Circle className="w-2 h-2 text-slate-300" />
                    )}
                  </div>

                  {/* Stage Text */}
                  <div className="leading-tight">
                    <div className="flex items-center space-x-1.5">
                      <span className={`text-[10px] font-mono font-semibold ${
                        state === 'current' ? 'text-teal-900' : state === 'completed' ? 'text-slate-700' : 'text-slate-400'
                      }`}>
                        {stage.stepNumber}
                      </span>
                      <span className={`text-[11px] font-bold tracking-wider ${
                        state === 'current' ? 'text-teal-950' : state === 'completed' ? 'text-slate-800' : 'text-slate-400'
                      }`}>
                        {stage.label}
                      </span>
                      {state === 'current' && (
                        <span className="text-[9px] font-mono uppercase bg-teal-800 text-white px-1 py-0.2 rounded font-medium">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono truncate max-w-[130px]">
                      {stage.caption}
                    </div>
                  </div>
                </div>

                {!isLast && (
                  <div className="text-slate-300 font-mono text-xs shrink-0 select-none">
                    ───►
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Right Metadata Strip (Evidence Coordinates Motif) */}
        <div className="flex flex-wrap items-center gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 text-xs font-mono shrink-0">
          <div className="flex items-center space-x-1 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <MapPin className="w-3 h-3 text-teal-800" />
            <span className="font-semibold text-slate-800 font-sans">{aoiLabel}</span>
            <span className="text-slate-400 text-[10px]">
              ({centroidCoords[1].toFixed(4)}° N, {centroidCoords[0].toFixed(4)}° E)
            </span>
          </div>

          {(beforeDate || afterDate) && (
            <div className="flex items-center space-x-1 text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
              <Calendar className="w-3 h-3 text-teal-800" />
              <span>
                {beforeDate ? format(new Date(beforeDate), 'dd MMM yyyy') : 'Baseline'}
                {' '}&rarr;{' '}
                {afterDate ? format(new Date(afterDate), 'dd MMM yyyy') : 'Monitor'}
              </span>
            </div>
          )}

          {candidateCount > 0 && (
            <div className="px-2 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 font-semibold text-[11px]">
              {candidateCount} Change Candidates
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvestigationRibbon;
