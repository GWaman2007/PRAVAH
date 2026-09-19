import React from 'react';
import type { DistrictHealth, BROBottleneck } from '../../types';
import { useTranslation } from '../../data/uiTranslations';
import {
  X,
  Printer,
  FileText,
  HardHat,
  AlertTriangle,
} from 'lucide-react';

interface EmergencyBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  districtsHealth: DistrictHealth[];
  broBottlenecks: BROBottleneck[];
}

export const EmergencyBriefingModal: React.FC<EmergencyBriefingModalProps> = ({
  isOpen,
  onClose,
  districtsHealth,
  broBottlenecks,
}) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const criticalDistricts = districtsHealth.filter(
    (d) => d.connectivityCategory === 'CRITICAL' || d.accessibilityScore < 50
  );
  const activeBottlenecks = broBottlenecks.filter((b) => b.status !== 'CLEARED' && b.status !== 'REPAIRED_CLEAR');
  const deployedCount = broBottlenecks.filter((b) => b.status === 'CREW_DEPLOYED' || b.status === 'REPAIR_UNDERWAY').length;
  const todayDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs animate-fadeIn">
      <div className="bg-surface border border-border w-full max-w-4xl max-h-[92vh] rounded-md shadow-2xl flex flex-col overflow-hidden text-text-primary text-xs">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-sm bg-primary-tint border border-primary/30 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider font-bold bg-primary-tint text-primary px-1.5 py-0.5 rounded-xs border border-primary/30">
                  TOP SECRET // MDoNER COMMAND
                </span>
                <span className="text-xs font-mono text-text-secondary">REF: NER-LOG-2026-M4</span>
              </div>
              <h2 className="text-base font-bold text-text-primary tracking-tight">
                {t('emergencyMemo')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-surface border border-border text-text-primary text-xs font-semibold hover:bg-surface-subtle transition cursor-pointer btn-press"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('print')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 leading-relaxed custom-scrollbar">
          {/* Executive Overview Card */}
          <div className="bg-surface-subtle p-4 rounded-sm border border-border space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-text-secondary">
              <span>Date: {todayDate}</span>
              <span>Distribution: Hon'ble Minister, MDoNER • Home Secy • DG BRO</span>
            </div>
            <p className="text-text-primary">
              This intelligence dispatch synthesizes real-time mountain connectivity telemetry across all 8 North Eastern states, highlighting critical arterial highway disruptions, Days-of-Supply (DoS) exhaustion forecasts, and Border Roads Organisation (BRO) priority clearance deployments.
            </p>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border">
              <span className="text-text-secondary block text-[11px]">Active Road Blockages</span>
              <span className="font-mono text-xl font-bold text-status-blocked-text">
                {activeBottlenecks.length}
              </span>
            </div>
            <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border">
              <span className="text-text-secondary block text-[11px]">Critical Isolated Districts</span>
              <span className="font-mono text-xl font-bold text-status-highrisk-text">
                {criticalDistricts.length}
              </span>
            </div>
            <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border">
              <span className="text-text-secondary block text-[11px]">Deployed Engineering Units</span>
              <span className="font-mono text-xl font-bold text-primary">
                {deployedCount}
              </span>
            </div>
          </div>

          {/* Critical Choke Points Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <HardHat className="w-4 h-4 text-primary" />
                <span>Ranked Strategic Infrastructure Bottlenecks</span>
              </h3>
              <span className="text-text-secondary font-mono text-[11px]">Project Vartak • Swastik • Pushpak • Sewak</span>
            </div>

            <div className="overflow-x-auto border border-border rounded-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-subtle border-b border-border text-[10px] font-bold text-text-secondary uppercase">
                    <th className="py-2 px-3">Rank</th>
                    <th className="py-2 px-3">Choke Point</th>
                    <th className="py-2 px-3">Highway & State</th>
                    <th className="py-2 px-3">Disruption Type</th>
                    <th className="py-2 px-3">Status</th>
                    <th className="py-2 px-3">BRO Taskforce</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {broBottlenecks.map((btnk, i) => (
                    <tr key={btnk.id} className="hover:bg-surface-subtle/40">
                      <td className="py-2.5 px-3 font-mono font-bold">#{btnk.rank || btnk.priorityRank || i + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-text-primary">{btnk.chokePointName}</td>
                      <td className="py-2.5 px-3">{btnk.highway} ({btnk.state})</td>
                      <td className="py-2.5 px-3 font-mono text-[11px]">{btnk.disruptionType}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded-xs text-[9px] font-bold border ${
                            btnk.status === 'TOTAL_BLOCKAGE' || btnk.status === 'ACTIVE_CRITICAL'
                              ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                              : btnk.status === 'REPAIR_UNDERWAY' || btnk.status === 'CREW_DEPLOYED'
                              ? 'bg-primary-tint text-primary border-primary/30'
                              : 'bg-status-open-tint text-status-open-text border-status-open-solid'
                          }`}
                        >
                          {btnk.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-text-secondary">
                        {btnk.assignedAsset || btnk.recommendedAsset || 'Pending Deployment'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Critical District Vulnerabilities */}
          <div className="space-y-2">
            <h3 className="font-semibold text-xs text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Priority District Accessibility & Stockout Runway</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {districtsHealth.map((d) => {
                const ox = d.daysOfSupply?.oxygen ?? Math.max(1, Math.round(d.minSupplyDays));
                const ra = d.daysOfSupply?.rations ?? Math.max(2, Math.round(d.minSupplyDays * 1.5));
                const fu = d.daysOfSupply?.fuel ?? Math.max(2, Math.round(d.minSupplyDays * 1.2));

                return (
                  <div key={d.id} className="p-3 rounded-sm border border-border bg-surface-subtle space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-text-primary">{d.name} ({d.state})</span>
                      <span className="font-mono font-bold text-xs">{d.accessibilityScore}% Health</span>
                    </div>
                    <p className="text-[11px] text-text-secondary">{d.statusNote}</p>
                    <div className="flex items-center gap-3 pt-1 text-[10px] font-mono text-text-secondary">
                      <span>O2: <strong>{ox}d</strong></span>
                      <span>Rations: <strong>{ra}d</strong></span>
                      <span>Fuel: <strong>{fu}d</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border bg-surface-subtle flex items-center justify-between">
          <span className="text-[10px] text-text-secondary font-mono">
            Generated autonomously by PRAVAH Executive Intelligence Engine
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] text-white rounded-sm text-xs font-semibold btn-press cursor-pointer"
          >
            {t('acknowledge')}
          </button>
        </div>
      </div>
    </div>
  );
};
