import React from 'react';
import type { DistrictHealth } from '../../types';
import {
  X,
  MapPin,
  HeartPulse,
  Wheat,
  Fuel,
  HardHat,
} from 'lucide-react';

interface DistrictDetailModalProps {
  district: DistrictHealth | null;
  onClose: () => void;
  onDeployBRO: (districtName: string) => void;
}

export const DistrictDetailModal: React.FC<DistrictDetailModalProps> = ({
  district,
  onClose,
  onDeployBRO,
}) => {
  if (!district) return null;

  const d = district;
  const oxygenDays = d.daysOfSupply?.oxygen ?? Math.max(1, Math.round(d.minSupplyDays));
  const rationsDays = d.daysOfSupply?.rations ?? Math.max(2, Math.round(d.minSupplyDays * 1.5));
  const fuelDays = d.daysOfSupply?.fuel ?? Math.max(2, Math.round(d.minSupplyDays * 1.2));
  const lifelineHighway = d.lifelineHighway || 'NH-27 / NH-29 Lifeline';
  const alternateRoute = d.alternateRoute || 'None (Single Corridored)';
  const nearestBroHQ = d.nearestBroHQ || 'BRO Project HQ';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-surface border border-border rounded-md w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col text-text-primary text-xs"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-sm bg-primary-tint text-primary flex items-center justify-center border border-primary/30">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-text-primary">
                  {d.name} District
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-surface border border-border text-text-secondary">
                  {d.state}
                </span>
                <span
                  className={`px-1.5 py-0.5 text-[10px] font-bold rounded-xs border ${
                    d.connectivityCategory === 'CRITICAL'
                      ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                      : d.connectivityCategory === 'AT_RISK'
                      ? 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
                      : 'bg-status-open-tint text-status-open-text border-status-open-solid'
                  }`}
                >
                  {d.connectivityCategory}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Strategic District Accessibility &amp; Essential Supplies Runway
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
          {/* Health Index Card */}
          <div className="p-3 bg-surface-subtle/60 rounded-sm border border-border flex items-center justify-between">
            <div>
              <span className="text-text-secondary text-[11px] block">Accessibility Health Index</span>
              <span className="text-xl font-bold font-mono text-text-primary">{d.accessibilityScore}%</span>
            </div>
            <div className="text-right">
              <span className="text-text-secondary text-[11px] block">Population at Risk</span>
              <span className="font-bold text-text-primary text-sm font-mono">{d.population.toLocaleString()}</span>
            </div>
          </div>

          {/* Status Note */}
          <div className="p-3 rounded-sm bg-surface-subtle border border-border text-text-secondary leading-relaxed">
            <strong>Command Situation:</strong> {d.statusNote}
          </div>

          {/* Days-of-Supply Runways */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Days-of-Supply (DoS) Autonomy Reserves
            </span>

            <div className="grid grid-cols-3 gap-2.5">
              {/* Medical Oxygen */}
              <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border space-y-1">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px]">Medical Oxygen</span>
                  <HeartPulse className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="font-mono text-base font-bold text-text-primary">
                  {oxygenDays} <span className="text-xs font-normal text-text-secondary">days</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className={`h-full ${oxygenDays <= 3 ? 'bg-status-blocked-solid' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, (oxygenDays / 10) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Staple Grains */}
              <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border space-y-1">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px]">Staple Grains</span>
                  <Wheat className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="font-mono text-base font-bold text-text-primary">
                  {rationsDays} <span className="text-xs font-normal text-text-secondary">days</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className={`h-full ${rationsDays <= 5 ? 'bg-status-blocked-solid' : 'bg-status-open-solid'}`}
                    style={{ width: `${Math.min(100, (rationsDays / 15) * 100)}%` }}
                  />
                </div>
              </div>

              {/* POL Fuel */}
              <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border space-y-1">
                <div className="flex items-center justify-between text-text-secondary">
                  <span className="text-[10px]">POL Fuel</span>
                  <Fuel className="w-3.5 h-3.5 text-sky-500" />
                </div>
                <div className="font-mono text-base font-bold text-text-primary">
                  {fuelDays} <span className="text-xs font-normal text-text-secondary">days</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5 overflow-hidden mt-1">
                  <div
                    className={`h-full ${fuelDays <= 4 ? 'bg-status-blocked-solid' : 'bg-sky-500'}`}
                    style={{ width: `${Math.min(100, (fuelDays / 12) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Infrastructure Lifeline Details */}
          <div className="p-3 bg-surface-subtle/50 rounded-xs border border-border space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block">
              Strategic Highway Access
            </span>
            <div className="text-[11px] text-text-secondary space-y-1">
              <div>
                <strong>Primary Inbound Lifeline:</strong> {lifelineHighway}
              </div>
              <div>
                <strong>Alternative Bypass:</strong> {alternateRoute}
              </div>
              <div>
                <strong>Nearest BRO Base:</strong> {nearestBroHQ}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-subtle border-t border-border flex items-center justify-between">
          <span className="text-[10px] text-text-secondary font-mono">
            MDoNER National Logistics Command ID: {d.id}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm border border-border text-text-secondary hover:bg-surface btn-press cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onDeployBRO(d.name);
                onClose();
              }}
              className="px-3.5 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white font-semibold rounded-sm flex items-center gap-1.5 btn-press shadow-xs cursor-pointer"
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Prioritize BRO Support</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
