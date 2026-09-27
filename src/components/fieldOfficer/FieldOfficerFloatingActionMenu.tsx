import React, { useState } from 'react';
import {
  Plus,
  X,
  AlertTriangle,
  Package,
  FileText,
  Camera,
} from 'lucide-react';
import { QuickFieldReportModal, type QuickReportTab } from './QuickFieldReportModal';

export const FieldOfficerFloatingActionMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<QuickReportTab>('INCIDENT');

  const handleOpenAction = (tab: QuickReportTab) => {
    setModalTab(tab);
    setIsOpen(false);
    setModalOpen(true);
  };

  return (
    <>
      {/* Floating Action Button (FAB) and Speed Dial */}
      <div className="fixed bottom-16 right-4 sm:bottom-6 sm:right-6 z-40 flex flex-col items-end space-y-2">
        {isOpen && (
          <div className="flex flex-col items-end space-y-2 mb-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <button
              onClick={() => handleOpenAction('INCIDENT')}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-all cursor-pointer font-medium text-xs btn-press"
            >
              <span>Report Incident</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={() => handleOpenAction('RESOURCE_REQUEST')}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all cursor-pointer font-medium text-xs btn-press"
            >
              <span>Request Resources</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={() => handleOpenAction('FIELD_UPDATE')}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all cursor-pointer font-medium text-xs btn-press"
            >
              <span>Post Field Update</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </button>

            <button
              onClick={() => handleOpenAction('INCIDENT')}
              className="flex items-center gap-2 px-3 py-2 rounded-full bg-purple-600 text-white shadow-lg hover:bg-purple-700 transition-all cursor-pointer font-medium text-xs btn-press"
            >
              <span>Upload Evidence</span>
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Field Officer Quick Actions Menu"
          className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-xl text-white transition-all transform btn-press cursor-pointer ${
            isOpen ? 'bg-slate-800 rotate-45' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
          }`}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
        </button>
      </div>

      {/* Quick Field Report Modal */}
      <QuickFieldReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab={modalTab}
      />
    </>
  );
};
