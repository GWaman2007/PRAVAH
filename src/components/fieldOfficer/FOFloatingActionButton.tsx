/**
 * PRAVAH Field Officer — Floating Action Button & Bottom Sheet Menu
 * Reference Design: Screen 4 "+ Action Menu"
 */
import React, { useState } from 'react';
import {
  Plus,
  X,
  AlertTriangle,
  Package,
  FileText,
  Camera,
} from 'lucide-react';
import type { QuickReportTab } from './QuickFieldReportModal';

interface FOFloatingActionButtonProps {
  onOpenAction: (tab: QuickReportTab) => void;
}

export const FOFloatingActionButton: React.FC<FOFloatingActionButtonProps> = ({ onOpenAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (tab: QuickReportTab) => {
    setIsOpen(false);
    onOpenAction(tab);
  };

  return (
    <>
      {/* Floating + Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fo-fab"
        aria-label="Create New Report or Request"
        title="Create New Report or Request"
      >
        <Plus className="w-6 h-6 text-white stroke-[2.5]" />
      </button>

      {/* Bottom Sheet Menu */}
      {isOpen && (
        <div className="fo-sheet-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="fo-sheet-content"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-700/60 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-blue-500" />
                <h3 className="text-base font-bold text-white tracking-tight">Create New</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Cards */}
            <div className="space-y-2.5">
              {/* Report Incident */}
              <button
                onClick={() => handleSelect('INCIDENT')}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-gradient-to-r from-red-950/60 to-red-900/30 border border-red-500/30 hover:border-red-500/60 transition-all cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30 group-hover:scale-105 transition-transform">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Report Incident</span>
                  <span className="text-xs text-slate-400 truncate block">Road blockage, landslide, flooding...</span>
                </div>
              </button>

              {/* Request Resources */}
              <button
                onClick={() => handleSelect('RESOURCE_REQUEST')}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-gradient-to-r from-blue-950/60 to-blue-900/30 border border-blue-500/30 hover:border-blue-500/60 transition-all cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30 group-hover:scale-105 transition-transform">
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Request Resources</span>
                  <span className="text-xs text-slate-400 truncate block">Report required supplies for community</span>
                </div>
              </button>

              {/* Post Field Update */}
              <button
                onClick={() => handleSelect('FIELD_UPDATE')}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-gradient-to-r from-emerald-950/60 to-emerald-900/30 border border-emerald-500/30 hover:border-emerald-500/60 transition-all cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Post Field Update</span>
                  <span className="text-xs text-slate-400 truncate block">General field information</span>
                </div>
              </button>

              {/* Upload Evidence */}
              <button
                onClick={() => handleSelect('INCIDENT')}
                className="w-full flex items-center gap-3.5 p-3 rounded-xl bg-gradient-to-r from-purple-950/60 to-purple-900/30 border border-purple-500/30 hover:border-purple-500/60 transition-all cursor-pointer text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/30 group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-bold text-white block">Upload Evidence</span>
                  <span className="text-xs text-slate-400 truncate block">Photos, videos, documents</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
