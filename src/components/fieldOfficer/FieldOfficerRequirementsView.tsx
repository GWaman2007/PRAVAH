import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Package,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Camera,
  Layers,
  FileText,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { QuickFieldReportModal } from './QuickFieldReportModal';
import type { ResourceRequirementItem } from '../../types';

export const FieldOfficerRequirementsView: React.FC = () => {
  const {
    userContext,
    communities,
    resourceRequirements,
    resourceRequests,
    setActiveView,
  } = usePravahStore();

  const [modalOpen, setModalOpen] = useState(false);

  const targetCommunityId = userContext.communityId || 'COMMUNITY_KOLASIB';
  const community =
    communities.find((c) => c.id === targetCommunityId) ||
    communities.find((c) => c.id === 'COMMUNITY_KOLASIB') ||
    communities[0];

  const requirements = resourceRequirements[community.id] || [
    { resourceType: 'Food Kits', required: 100, available: 20, shortage: 80, unit: 'kits', urgency: 'CRITICAL', lastUpdated: '12 min ago' },
    { resourceType: 'Water Units', required: 50, available: 10, shortage: 40, unit: 'cans (20L)', urgency: 'CRITICAL', lastUpdated: '15 min ago' },
    { resourceType: 'Medical Kits', required: 20, available: 3, shortage: 17, unit: 'trauma kits', urgency: 'CRITICAL', lastUpdated: '10 min ago' },
    { resourceType: 'Tarpaulins / Shelter Kits', required: 40, available: 15, shortage: 25, unit: 'sets', urgency: 'HIGH', lastUpdated: '35 min ago' },
  ];

  const communityRequests = resourceRequests.filter(
    (r) => r.communityId === community.id
  );

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-6 text-xs text-text-primary">
      {/* Header Banner */}
      <div className="bg-surface border border-border p-4 sm:p-5 rounded-lg shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h1 className="text-base sm:text-lg font-bold text-text-primary">
              {community.name.toUpperCase()} — RESOURCE REQUIREMENTS
            </h1>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Real-time community supply shortages and field-driven requisition pipeline connecting directly into the PRAVAH dispatch engine.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 rounded-md bg-primary hover:bg-primary/90 text-white font-bold text-xs flex items-center gap-2 btn-press cursor-pointer shadow-md shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ REQUEST RESOURCES</span>
        </button>
      </div>

      {/* Resource Inventory & Shortage Matrix */}
      <div className="bg-surface border border-border rounded-lg shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Community Inventory &amp; Critical Shortages</span>
          </h2>
          <span className="text-[11px] text-text-tertiary">
            Updated in real-time by ground reports
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-subtle text-text-secondary border-b border-border text-[11px]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Resource Type</th>
                <th className="py-2.5 px-4 font-semibold text-center">Required</th>
                <th className="py-2.5 px-4 font-semibold text-center">Available</th>
                <th className="py-2.5 px-4 font-semibold text-center">Shortage</th>
                <th className="py-2.5 px-4 font-semibold">Urgency</th>
                <th className="py-2.5 px-4 font-semibold">Last Updated</th>
                <th className="py-2.5 px-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {requirements.map((req, idx) => (
                <tr key={idx} className="hover:bg-surface-subtle/50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-bold text-text-primary block">{req.resourceType}</span>
                    <span className="text-[10px] text-text-tertiary">{req.unit}</span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-text-primary">
                    {req.required}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                    {req.available}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-red-500">
                    {req.shortage}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        req.urgency === 'CRITICAL'
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}
                    >
                      {req.urgency}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-text-tertiary text-[11px]">
                    {req.lastUpdated || 'Just now'}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setModalOpen(true)}
                      className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      Requisition +
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Dispatched Requisitions History */}
      <div className="bg-surface border border-border rounded-lg p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-text-primary">
              Recent Field Officer Requisition Tickets ({communityRequests.length})
            </h2>
          </div>
          <span className="text-[11px] text-text-tertiary">
            Connected to PRAVAH engine for automated sortie routing
          </span>
        </div>

        {communityRequests.length === 0 ? (
          <div className="p-6 text-center text-text-tertiary text-xs">
            No previous requisitions recorded for this community.
          </div>
        ) : (
          <div className="space-y-2.5">
            {communityRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-md bg-surface-subtle border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[10px] px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                      {req.id}
                    </span>
                    <span className="font-bold text-text-primary text-xs">
                      {req.quantity} {req.unit} of {req.resourceType}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                        req.urgency === 'CRITICAL'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-amber-500/10 text-amber-500'
                      }`}
                    >
                      {req.urgency}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-secondary">
                    Reason: "{req.reason}" {req.notes && `• Notes: ${req.notes}`}
                  </p>
                  <span className="text-[10px] text-text-tertiary block">
                    Requested by {req.officerName} • {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                    STATUS: {req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <QuickFieldReportModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialTab="RESOURCE_REQUEST"
        defaultCommunityId={community.id}
      />
    </div>
  );
};
