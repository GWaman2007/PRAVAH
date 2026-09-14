import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

interface RestockToastProps {
  toast: {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null;
  onClose: () => void;
}

export const RestockToast: React.FC<RestockToastProps> = ({ toast, onClose }) => {
  if (!toast || !toast.visible) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-bounce-in">
      <div
        className={`glass-panel rounded-2xl p-4 shadow-2xl border flex items-start gap-3 backdrop-blur-xl ${
          isSuccess
            ? 'border-emerald-500/60 bg-emerald-950/90 text-emerald-100'
            : isWarning
            ? 'border-amber-500/60 bg-amber-950/90 text-amber-100'
            : 'border-cyan-500/60 bg-slate-900/95 text-slate-100'
        }`}
      >
        <div className="mt-0.5 flex-shrink-0">
          {isSuccess ? (
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 animate-pulse">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : isWarning ? (
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <Info className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="flex-1 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm font-display tracking-tight text-white">
              {toast.title}
            </h4>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-slate-300 leading-relaxed font-sans">{toast.message}</p>
          <div className="mt-2 text-[10px] font-mono text-emerald-300 font-semibold flex items-center gap-1">
            <span>Closed-loop feedback verified • Engine recalibrated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
