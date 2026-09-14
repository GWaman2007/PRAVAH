import React, { useState } from 'react';
import type { DistrictHealth } from '../../types';
import {
  Package,
  HeartPulse,
  Wheat,
  Fuel,
  AlertTriangle,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface SupplyForecasterProps {
  districtsHealth: DistrictHealth[];
  onSelectDistrict: (districtId: string) => void;
}

export const SupplyForecaster: React.FC<SupplyForecasterProps> = ({
  districtsHealth,
  onSelectDistrict,
}) => {
  const [targetDays, setTargetDays] = useState<number>(7);

  // Compute total stocks below target threshold
  const atRiskOxygen = districtsHealth.filter(
    (d) => (d.daysOfSupply?.oxygen ?? Math.round(d.minSupplyDays ?? 7)) < targetDays
  );
  const atRiskRations = districtsHealth.filter(
    (d) => (d.daysOfSupply?.rations ?? Math.round((d.minSupplyDays ?? 7) * 1.4)) < targetDays
  );
  const atRiskFuel = districtsHealth.filter(
    (d) => (d.daysOfSupply?.fuel ?? Math.round((d.minSupplyDays ?? 7) * 1.2)) < targetDays
  );

  return (
    <div className="bg-surface border border-border rounded-md p-5 shadow-xs space-y-4 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-sm bg-primary-tint text-primary flex items-center justify-center border border-primary/30">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
              Essential Supply Runway &amp; Depletion Forecaster
            </h2>
            <p className="text-[11px] text-text-secondary">
              Macro buffer monitoring across Medical Oxygen, PDS Grains, and POL Fuel
            </p>
          </div>
        </div>

        {/* Target Runway Threshold Slider */}
        <div className="flex items-center gap-2 bg-surface-subtle p-2 rounded-sm border border-border">
          <Sliders className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] text-text-secondary font-medium">Safe Runway Target:</span>
          <span className="font-mono font-bold text-primary">{targetDays} Days</span>
          <input
            type="range"
            min={3}
            max={14}
            step={1}
            value={targetDays}
            onChange={(e) => setTargetDays(Number(e.target.value))}
            className="w-20 accent-primary cursor-pointer h-1.5"
          />
        </div>
      </div>

      {/* 3 Supply Buffers Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Medical Oxygen */}
        <div className="p-3.5 rounded-sm bg-surface-subtle border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <HeartPulse className="w-4 h-4 text-primary" />
              Medical Oxygen
            </span>
            <span
              className={`px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] ${
                atRiskOxygen.length > 0
                  ? 'bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/50'
                  : 'bg-status-open-tint text-status-open-text'
              }`}
            >
              {atRiskOxygen.length} Below Target
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">
            Daily regional burn: ~42 Cryogenic cylinders across NER civil hospitals.
          </p>
          {atRiskOxygen.length > 0 && (
            <div className="pt-1 text-[10px] text-status-blocked-text font-medium">
              Critical: {atRiskOxygen.map((d) => d.name).join(', ')}
            </div>
          )}
        </div>

        {/* PDS Staple Grains */}
        <div className="p-3.5 rounded-sm bg-surface-subtle border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Wheat className="w-4 h-4 text-amber-500" />
              PDS Staple Grains
            </span>
            <span
              className={`px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] ${
                atRiskRations.length > 0
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                  : 'bg-status-open-tint text-status-open-text'
              }`}
            >
              {atRiskRations.length} Below Target
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">
            Strategic buffers held in FCI silos in Guwahati, Dimapur, and Silchar.
          </p>
          {atRiskRations.length > 0 && (
            <div className="pt-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium">
              Vulnerable: {atRiskRations.map((d) => d.name).join(', ')}
            </div>
          )}
        </div>

        {/* POL Fuel (Diesel & Kerosene) */}
        <div className="p-3.5 rounded-sm bg-surface-subtle border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Fuel className="w-4 h-4 text-sky-500" />
              POL Petroleum & Fuel
            </span>
            <span
              className={`px-2 py-0.5 rounded-xs font-mono font-bold text-[10px] ${
                atRiskFuel.length > 0
                  ? 'bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/50'
                  : 'bg-status-open-tint text-status-open-text'
              }`}
            >
              {atRiskFuel.length} Below Target
            </span>
          </div>
          <p className="text-[11px] text-text-secondary">
            Refueling convoys routed via Numaligarh & Bongaigaon refineries.
          </p>
          {atRiskFuel.length > 0 && (
            <div className="pt-1 text-[10px] text-status-blocked-text font-medium">
              Deficit: {atRiskFuel.map((d) => d.name).join(', ')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
