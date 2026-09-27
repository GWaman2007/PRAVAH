import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  FileText,
  AlertTriangle,
  Package,
  Camera,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
  Plus,
} from 'lucide-react';
import { QuickFieldReportModal } from './QuickFieldReportModal';
import { formatTimeAgo } from '../../engine/offlineSync';

export const FieldOfficerMyReportsView: React.FC = () => {
  const {
    userContext,
    incidents,
    resourceRequests,
    activeMissions,
    setActiveView,
    setSelectedMissionId,
  } = usePravahStore();

  const [modalOpen, setModalOpen] = useState(false);

  // Filter incidents reported by this officer
  const myIncidents = incidents.filter(
    (i) =>
      i.source === 'OFFICER' ||
      (i.officerBadge && i.officerBadge === userContext.badgeId) ||
      i.author?.name?.toLowerCase().includes(userContext.name.toLowerCase().split(' ')[1] || 'hmar')
  );

  // Filter resource requests by this officer
  const myRequests = resourceRequests.filter(
    (r) =>
      r.officerId === userContext.officerId ||
      r.officerName.toLowerCase().includes(userContext.name.toLowerCase().split(' ')[1] || 'hmar')
  );

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 text-xs text-text-primary">
      {/* Header Banner */}
      <div className="bg-surface border border-border p-4 sm:p-5 rounded-lg shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h1 className="text-base sm:text-lg font-bold text-text-primary">
              My Operational Field Reports &amp; Requisitions
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Tracking all incident alerts, evidence submissions, and supply requisitions filed by <strong>{userContext.name}</strong> ({userContext.badgeId}).
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-3.5 py-2 rounded-md bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-1.5 btn-press cursor-pointer shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>New Field Report</span>
        </button>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-md bg-surface border border-border shadow-xs">
          <span className="text-text-tertiary block text-[10px]">Total Incidents Filed</span>
          <span className="text-base font-bold text-red-500 font-mono">{myIncidents.length}</span>
        </div>
        <div className="p-3 rounded-md bg-surface border border-border shadow-xs">
          <span className="text-text-tertiary block text-[10px]">Supply Requisitions</span>
          <span className="text-base font-bold text-blue-500 font-mono">{myRequests.length}</span>
        </div>
        <div className="p-3 rounded-md bg-surface border border-border shadow-xs">
          <span className="text-text-tertiary block text-[10px]">Acknowledged by HQ</span>
          <span className="text-base font-bold text-emerald-500 font-mono">{myIncidents.length + myRequests.length}</span>
        </div>
        <div className="p-3 rounded-md bg-surface border border-border shadow-xs">
          <span className="text-text-tertiary block text-[10px]">Active Sorties Triggered</span>
          <span className="text-base font-bold text-purple-500 font-mono">
            {activeMissions.filter((m) => m.communityId === userContext.communityId).length}
          </span>
        </div>
      </div>

      {/* Reports Feed */}
      <div className="space-y-3.5">
        <h2 className="text-sm font-bold text-text-primary border-b border-border pb-2">
          Filed Reports Activity Stream
        </h2>

        {myIncidents.length === 0 && myRequests.length === 0 ? (
          <div className="p-8 text-center bg-surface border border-border rounded-lg text-text-tertiary">
            No reports filed yet by this field officer profile.
          </div>
        ) : (
          <div className="space-y-3">
            {/* Resource Requests */}
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="bg-surface border border-border rounded-lg p-4 shadow-xs space-y-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-blue-500/10 text-blue-500">
                      RESOURCE REQUEST
                    </span>
                    <span className="font-mono text-text-tertiary text-[11px]">{req.id}</span>
                    <span className="font-bold text-text-primary text-xs">
                      {req.quantity} {req.unit} of {req.resourceType}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                    STATUS: Actioned
                  </span>
                </div>

                <p className="text-[11px] text-text-secondary">
                  "{req.reason}" {req.notes && `• Notes: ${req.notes}`}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-tertiary pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{req.communityName}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {req.evidencePhoto && (
                    <img
                      src={req.evidencePhoto}
                      alt="Requisition Evidence"
                      className="w-14 h-10 object-cover rounded border border-border"
                    />
                  )}
                </div>
              </div>
            ))}

            {/* Incidents */}
            {myIncidents.map((inc) => (
              <div
                key={inc.id}
                className="bg-surface border border-border rounded-lg p-4 shadow-xs space-y-2 hover:border-primary/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-red-500/10 text-red-500">
                      INCIDENT ALERT
                    </span>
                    <span className="font-mono text-text-tertiary text-[11px]">{inc.id}</span>
                    <span className="font-bold text-text-primary text-xs">{inc.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-red-500/10 text-red-500 border border-red-500/20">
                      {inc.severity}
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                      STATUS: Acknowledged
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-text-secondary leading-snug">
                  "{inc.description}"
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-tertiary pt-1 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span>{inc.location.placeName || inc.location.name}</span>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>{formatTimeAgo(inc.timestamp)}</span>
                  </div>

                  {inc.mediaUrl && (
                    <img
                      src={inc.mediaUrl}
                      alt="Visual Evidence"
                      className="w-14 h-10 object-cover rounded border border-border"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <QuickFieldReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab="INCIDENT"
      />
    </div>
  );
};
