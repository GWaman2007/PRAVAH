import React from 'react';
import { IncidentCard } from './IncidentCard';
import type { Incident, AuthorRole } from '../types/incident';
import { AlertCircle, Plus, RefreshCw } from 'lucide-react';

interface IncidentFeedProps {
  incidents: Incident[];
  onVote: (id: string, voteType: 'up' | 'down') => void;
  onLocateOnMap: (incident: Incident) => void;
  onAddUpdate: (incidentId: string, updateData: { author: string; role: AuthorRole; message: string }) => void;
  onOpenLightbox: (imageUrl: string) => void;
  selectedIncidentId: string | null;
  onOpenCreateModal: () => void;
  onResetFilters: () => void;
}

export const IncidentFeed: React.FC<IncidentFeedProps> = ({
  incidents,
  onVote,
  onLocateOnMap,
  onAddUpdate,
  onOpenLightbox,
  selectedIncidentId,
  onOpenCreateModal,
  onResetFilters,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3.5 custom-scrollbar">
      {incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
            <AlertCircle className="w-6 h-6 text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-200 mb-1">
            No Disruption Reports Found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mb-4">
            No active road blocks match your current corridor filter or search query. You can reset filters or log a fresh ground incident.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onResetFilters}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" />
              Reset Filters
            </button>
            <button
              onClick={onOpenCreateModal}
              className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Log Ground Report
            </button>
          </div>
        </div>
      ) : (
        incidents.map((incident) => (
          <IncidentCard
            key={incident.id}
            incident={incident}
            onVote={onVote}
            onLocateOnMap={onLocateOnMap}
            onAddUpdate={onAddUpdate}
            onOpenLightbox={onOpenLightbox}
            isSelected={selectedIncidentId === incident.id}
          />
        ))
      )}
    </div>
  );
};
