import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  AlertTriangle,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  X,
  Clock,
  Route as RouteIcon,
  Truck,
  Send,
} from 'lucide-react';

export const RerouteProposalModal: React.FC = () => {
  const {
    rerouteProposals,
    approveRerouteProposal,
    dismissRerouteProposal,
    updateRerouteWithAi,
  } = usePravahStore();

  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [showAiPopover, setShowAiPopover] = useState(false);

  // Active pending proposal
  const activeProposal = rerouteProposals.find((p) => p.status === 'PENDING_APPROVAL');

  if (!activeProposal) return null;

  const handleApprove = () => {
    approveRerouteProposal(activeProposal.id);
  };

  const handleDismiss = () => {
    dismissRerouteProposal(activeProposal.id);
  };

  const handleApplyAiEdit = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiLoading(true);
    try {
      const explanation = await updateRerouteWithAi(activeProposal.id, aiPrompt);
      setAiExplanation(explanation);
      setAiPrompt('');
      setShowAiPopover(false);
    } catch (err) {
      console.error('Error modifying reroute with AI:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-rose-500/40 rounded-2xl shadow-2xl shadow-rose-950/40 text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-rose-500/30 bg-rose-950/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Active Convoy Reroute Proposal
                </h2>
                <span className="px-2 py-0.5 text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 rounded-full">
                  Hazard Intercept
                </span>
              </div>
              <p className="text-xs text-rose-300/80">
                A newly confirmed road blockage impacts an ongoing relief mission
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Affected Convoy & Driver */}
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-lg text-indigo-400">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  {activeProposal.vehicleName}
                </h4>
                <p className="text-xs text-slate-400">
                  Driver: <span className="text-slate-200 font-medium">{activeProposal.driverName}</span> | Mission ID: {activeProposal.missionId}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-full">
              In Transit
            </span>
          </div>

          {/* Blockage Cause */}
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-200 space-y-1">
            <span className="font-bold text-rose-300 block">
              Impassable Roadway: {activeProposal.blockedSegmentName}
            </span>
            <p className="text-slate-300">{activeProposal.incidentSummary}</p>
          </div>

          {/* Route Comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-slate-800/40 border border-slate-700/40 rounded-xl space-y-2 opacity-60">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Original Route (Obstructed)
              </span>
              <div className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
                <RouteIcon className="w-4 h-4 text-slate-400" />
                {activeProposal.currentRouteId}
              </div>
              <span className="text-[11px] text-rose-400 font-medium block">
                ✕ Terminated by road obstruction
              </span>
            </div>

            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl space-y-2">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                Recommended Bypass Detour
              </span>
              <div className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                <RouteIcon className="w-4 h-4 text-emerald-400" />
                {activeProposal.proposedRouteName}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <ArrowRight className="w-3 h-3 text-emerald-400" />
                  +{activeProposal.distanceDeltaKm} km
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" />
                  +{activeProposal.etaDeltaMinutes} min ETA
                </span>
              </div>
            </div>
          </div>

          {/* AI Explanation feedback if available */}
          {aiExplanation && (
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-xs text-indigo-300 flex items-start gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-indigo-400 mt-0.5" />
              <span>{aiExplanation}</span>
            </div>
          )}

          {/* "Edit with AI" inline popover */}
          {showAiPopover && (
            <div className="p-4 bg-slate-800 border border-indigo-500/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs text-indigo-300 font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Modify Reroute with Natural Language
                </span>
                <button
                  onClick={() => setShowAiPopover(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Add 30m buffer for night driving, avoid steep ghat passes..."
                  className="flex-1 p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
                />
                <button
                  onClick={handleApplyAiEdit}
                  disabled={isAiLoading || !aiPrompt.trim()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors"
                >
                  {isAiLoading ? 'Updating...' : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <button
              onClick={() => setShowAiPopover((p) => !p)}
              className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-indigo-400" />
              ✨ Edit with AI
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={handleDismiss}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={handleApprove}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/40 flex items-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Push to Driver Cockpit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
