import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface RestockToastData {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'warning' | 'info';
}

interface RestockToastProps {
  toast: RestockToastData | null;
  onClose: () => void;
}

export const RestockToast: React.FC<RestockToastProps> = ({ toast, onClose }) => {
  if (!toast || !toast.visible) return null;

  const isSuccess = toast.type === 'success';
  const isWarning = toast.type === 'warning';

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full animate-fadeIn">
      <div
        className={`rounded-md p-4 shadow-xl border flex items-start gap-3 backdrop-blur-xs ${
          isSuccess
            ? 'border-status-open-solid bg-surface text-text-primary'
            : isWarning
            ? 'border-status-highrisk-solid bg-surface text-text-primary'
            : 'border-primary bg-surface text-text-primary'
        }`}
      >
        <div className="mt-0.5 shrink-0">
          {isSuccess ? (
            <div className="w-8 h-8 rounded-sm bg-status-open-tint border border-status-open-solid flex items-center justify-center text-status-open-solid">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          ) : isWarning ? (
            <div className="w-8 h-8 rounded-sm bg-status-highrisk-tint border border-status-highrisk-solid flex items-center justify-center text-status-highrisk-solid">
              <AlertCircle className="w-5 h-5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-sm bg-primary-tint border border-primary flex items-center justify-center text-primary">
              <Info className="w-5 h-5" />
            </div>
          )}
        </div>

        <div className="flex-1 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-text-primary">
              {toast.title}
            </h4>
            <button
              onClick={onClose}
              className="text-text-secondary hover:text-text-primary p-1 rounded-sm cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="mt-1 text-text-secondary leading-relaxed font-sans">{toast.message}</p>
          <div className="mt-2 text-[10px] font-mono text-status-open-text font-semibold flex items-center gap-1">
            <span>Closed-loop replenishment verified • Priority tier dropped to P4</span>
          </div>
        </div>
      </div>
    </div>
  );
};
