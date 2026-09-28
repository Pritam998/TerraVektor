import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  MessageSquare, 
  MapPin, 
  Calendar, 
  Loader2, 
  Filter
} from 'lucide-react';
import { getChangeCandidates, reviewCandidate } from '../services/api';
import { ChangeCandidate } from '../types';

export const ReviewQueue: React.FC = () => {
  const [candidates, setCandidates] = useState<ChangeCandidate[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedCandidate, setSelectedCandidate] = useState<ChangeCandidate | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadCandidates = async () => {
    setIsLoading(true);
    try {
      const data = await getChangeCandidates();
      setCandidates(data);
      if (data.length > 0 && !selectedCandidate) {
        setSelectedCandidate(data[0]);
      }
    } catch (err) {
      console.error('Failed to load review candidates:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, []);

  const handleDecision = async (decision: 'confirmed' | 'rejected' | 'needs_review') => {
    if (!selectedCandidate) return;
    setIsSubmitting(true);
    try {
      await reviewCandidate(selectedCandidate.id, decision, comment);
      setComment('');
      // Update local status
      setCandidates(prev => prev.map(c => {
        if (c.id === selectedCandidate.id) {
          return {
            ...c,
            status: decision === 'needs_review' ? 'pending' : decision
          };
        }
        return c;
      }));
      if (selectedCandidate) {
        setSelectedCandidate({
          ...selectedCandidate,
          status: decision === 'needs_review' ? 'pending' : decision
        });
      }
    } catch (err) {
      console.error('Failed to submit review decision:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    if (filterStatus === 'all') return true;
    return c.status === filterStatus;
  });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-teal-800 uppercase tracking-wider mb-1 font-mono">
          <ClipboardCheck className="w-3.5 h-3.5" />
          <span>Quality Assurance & Ground Truth Validation</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Analyst Review Queue</h1>
        <p className="text-xs text-slate-600 mt-0.5">
          Verify AI-detected surface changes, audit confidence scores, and confirm ground truth annotations.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg p-1.5 w-fit shadow-xs">
        <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
        {['all', 'pending', 'confirmed', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 rounded text-xs font-medium capitalize transition-colors ${
              filterStatus === status 
                ? 'bg-teal-800 text-white shadow-xs' 
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Candidates List */}
        <div className="lg:col-span-6 space-y-3">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 flex items-center justify-center space-x-2 bg-white border border-slate-200 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin text-teal-800" />
              <span className="text-xs">Loading review queue...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-500 text-xs">
              No change candidates in this filter view.
            </div>
          ) : (
            filteredCandidates.map(candidate => {
              const isSelected = selectedCandidate?.id === candidate.id;
              return (
                <div
                  key={candidate.id}
                  onClick={() => setSelectedCandidate(candidate)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/60 border-teal-700 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-900 capitalize">
                          {candidate.change_type.replace('_', ' ')}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize border ${
                          candidate.status === 'confirmed' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : candidate.status === 'rejected'
                            ? 'bg-rose-50 text-rose-800 border-rose-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}>
                          {candidate.status}
                        </span>
                      </div>
                      
                      <div className="text-[11px] text-slate-600 flex items-center gap-3 pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>Confidence: <strong className="font-mono text-slate-800">{(candidate.confidence * 100).toFixed(0)}%</strong></span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono text-slate-500">
                      ID #{candidate.id}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Verification Inspector & Action Box */}
        <div className="lg:col-span-6">
          {selectedCandidate ? (
            <div className="bg-white border border-slate-200 rounded-lg p-5 sticky top-6 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">Review Candidate #{selectedCandidate.id}</h3>
                <span className="text-xs font-mono text-slate-500">
                  Detected: {new Date(selectedCandidate.created_at).toLocaleDateString()}
                </span>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">Classified Type</span>
                    <span className="text-xs font-semibold text-slate-900 capitalize mt-0.5 block">
                      {selectedCandidate.change_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200">
                    <span className="text-[11px] font-medium text-slate-500 block">Model Confidence</span>
                    <span className="text-xs font-mono font-bold text-teal-800 mt-0.5 block">
                      {(selectedCandidate.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded border border-slate-200">
                  <span className="text-[11px] font-medium text-slate-500 block mb-1">Target Coordinates</span>
                  <span className="text-xs font-mono text-slate-800">
                    Lat: {selectedCandidate.latitude.toFixed(6)}, Lon: {selectedCandidate.longitude.toFixed(6)}
                  </span>
                </div>

                <div>
                  <label className="text-xs text-slate-700 font-medium block mb-1.5">
                    Analyst Comment / Verification Log
                  </label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Enter observations, ground truth details, or verification rationale..."
                    className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <button
                  onClick={() => handleDecision('confirmed')}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Confirm Change</span>
                </button>

                <button
                  onClick={() => handleDecision('rejected')}
                  disabled={isSubmitting}
                  className="flex-1 py-2 bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white text-xs font-semibold rounded shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Reject / False Alarm</span>
                </button>

                <button
                  onClick={() => handleDecision('needs_review')}
                  disabled={isSubmitting}
                  className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 disabled:opacity-50 text-slate-700 text-xs font-medium rounded transition-colors"
                >
                  Flag
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 text-xs">
              Select a candidate from the queue to start review.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;
