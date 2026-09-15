import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { UserRole } from '../../types';
import {
  CloudRain,
  Truck,
  PackageCheck,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Shield,
  Radio,
  UserCheck,
  X,
} from 'lucide-react';

export const InteractiveWalkthroughToolbar: React.FC = () => {
  const {
    activeRole,
    switchRole,
    runDemoStep1,
    runDemoStep2,
    runDemoStep3,
    resetDemoSimulation,
    activeMissions,
    communities,
    activeView,
  } = usePravahStore();

  // Default to minimized so map and cockpit view are 100% visible and unoccluded
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isActionRunning, setIsActionRunning] = useState(false);

  // Dynamic state checks
  const kolasib = communities.find((c) => c.id === 'MZ-KOL-004');
  const isP1 = kolasib?.metrics?.priorityTier === 'P1';
  const kolasibMission = activeMissions.find((m) => m.communityId === 'MZ-KOL-004');
  const isMissionDispatched = kolasibMission?.status === 'IN_TRANSIT';
  const isMissionDelivered = kolasibMission?.status === 'DELIVERED';

  const handleStep1 = () => {
    setIsActionRunning(true);
    setCurrentStep(1);
    runDemoStep1();
    setTimeout(() => setIsActionRunning(false), 400);
  };

  const handleStep2 = () => {
    setIsActionRunning(true);
    setCurrentStep(2);
    runDemoStep2();
    setTimeout(() => setIsActionRunning(false), 400);
  };

  const handleStep3 = () => {
    setIsActionRunning(true);
    setCurrentStep(3);
    runDemoStep3();
    setTimeout(() => setIsActionRunning(false), 400);
  };

  const handleReset = () => {
    setCurrentStep(0);
    resetDemoSimulation();
  };

  return (
    <aside
      aria-label="Interactive Walkthrough Demo Toolbar"
      className={`fixed right-3 sm:right-5 z-[1100] pointer-events-auto select-none flex flex-col items-end transition-all duration-200 ${
        activeView === 'MOBILE_COCKPIT' ? 'bottom-20' : 'bottom-3'
      }`}
    >
      {/* Minimized Pill Button */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1B4B73] hover:bg-[#123A5A] text-white font-semibold text-xs shadow-2xl border border-white/20 backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-pointer ring-2 ring-primary/30 animate-pulse"
        >
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="tracking-wide font-medium">1-Click Resilience Demo Script</span>
          {isP1 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold">
              P1 ACTIVE
            </span>
          )}
          {isMissionDispatched && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-mono font-bold">
              EN ROUTE
            </span>
          )}
          {isMissionDelivered && (
            <span className="px-1.5 py-0.5 rounded-full bg-green-600 text-white text-[9px] font-mono font-bold">
              DELIVERED
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-white/80 shrink-0" />
        </button>
      )}

      {/* Expanded Floating Control Deck */}
      {isExpanded && (
        <div className="w-[94vw] max-w-4xl bg-surface/98 dark:bg-slate-900/98 backdrop-blur-xl border-2 border-[#1B4B73]/60 dark:border-blue-400/40 rounded-lg shadow-2xl p-3 sm:p-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
          {/* Header Row: Title + Role Pills + Collapse Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-status-open-solid animate-ping" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-xs text-text-primary">
                    1-Click Resilience Demo Script
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-primary-tint text-primary font-bold hidden sm:inline">
                    Kolasib NH-306 Monsoon Scenario
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Role Switcher Pills */}
              <div className="flex items-center gap-1 bg-surface-subtle p-0.5 rounded-sm border border-border">
                {(
                  [
                    { role: 'SUPER_ADMIN', label: 'Admin', icon: Shield },
                    { role: 'FLEET_DISPATCHER', label: 'Dispatcher', icon: Radio },
                    { role: 'FIELD_OFFICER', label: 'Officer', icon: UserCheck },
                    { role: 'DRIVER', label: 'Driver', icon: Truck },
                  ] as const
                ).map((r) => {
                  const Icon = r.icon;
                  const isActive = activeRole === r.role;
                  return (
                    <button
                      key={r.role}
                      onClick={() => switchRole(r.role as UserRole)}
                      className={`px-2 py-1 rounded-xs text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1B4B73] text-white font-bold shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Icon className="w-3 h-3" />
                      <span>{r.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Minimize Button */}
              <button
                onClick={() => setIsExpanded(false)}
                title="Minimize toolbar"
                className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-subtle cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 4 Action Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Step 1 Button */}
            <button
              onClick={handleStep1}
              disabled={isActionRunning}
              className={`p-2.5 rounded-md border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                isP1 || currentStep === 1
                  ? 'bg-status-blocked-tint/80 border-status-blocked-solid ring-1 ring-status-blocked-solid text-status-blocked-text'
                  : 'bg-surface hover:bg-surface-subtle border-border'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                    <CloudRain className="w-3.5 h-3.5 text-status-blocked-solid shrink-0" />
                    <span>1. Landslide Spike</span>
                  </div>
                  {isP1 && (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded-xs bg-status-blocked-solid text-white font-bold shrink-0">
                      P1 CUTOFF
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-secondary mt-1 leading-snug">
                  65mm/h cloudburst &amp; mudflow block NH-306. Kolasib surges to P1.
                </p>
              </div>
            </button>

            {/* Step 2 Button */}
            <button
              onClick={handleStep2}
              disabled={isActionRunning}
              className={`p-2.5 rounded-md border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                isMissionDispatched || currentStep === 2
                  ? 'bg-primary-tint/80 border-primary ring-1 ring-primary text-primary'
                  : 'bg-surface hover:bg-surface-subtle border-border'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                    <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>2. Dispatch Detour</span>
                  </div>
                  {isMissionDispatched && (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded-xs bg-[#1B4B73] dark:bg-[#2E6B9E] text-white font-bold shrink-0">
                      EN ROUTE
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-secondary mt-1 leading-snug">
                  Approve Medic-01 convoy with Bairabi Pass alternate bypass route.
                </p>
              </div>
            </button>

            {/* Step 3 Button */}
            <button
              onClick={handleStep3}
              disabled={isActionRunning}
              className={`p-2.5 rounded-md border text-left flex flex-col justify-between transition-all cursor-pointer relative overflow-hidden group ${
                isMissionDelivered || currentStep === 3
                  ? 'bg-status-open-tint/80 border-status-open-solid ring-1 ring-status-open-solid text-status-open-text'
                  : 'bg-surface hover:bg-surface-subtle border-border'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text-primary">
                    <PackageCheck className="w-3.5 h-3.5 text-status-open-solid shrink-0" />
                    <span>3. Delivery Loop</span>
                  </div>
                  {isMissionDelivered && (
                    <span className="text-[9px] font-mono px-1 py-0.5 rounded-xs bg-status-open-solid text-white font-bold shrink-0">
                      DELIVERED
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-text-secondary mt-1 leading-snug">
                  Transit dead-zone, verify handover &amp; restore Kolasib to P4.
                </p>
              </div>
            </button>

            {/* Reset Simulation Button */}
            <button
              onClick={handleReset}
              className="p-2.5 rounded-md border border-border bg-surface hover:bg-surface-subtle text-left flex flex-col justify-between transition-all cursor-pointer group"
            >
              <div>
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text-secondary group-hover:text-text-primary">
                    <RotateCcw className="w-3.5 h-3.5 text-text-secondary group-hover:rotate-180 transition-transform duration-300 shrink-0" />
                    <span>Reset State</span>
                  </div>
                  <span className="text-[9px] font-mono px-1 py-0.5 rounded-xs bg-surface-subtle text-text-tertiary shrink-0">
                    CLEAN
                  </span>
                </div>
                <p className="text-[10px] text-text-tertiary mt-1 leading-snug">
                  Clear disruptions, restore initial inventory &amp; fleet coordinates.
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
};
