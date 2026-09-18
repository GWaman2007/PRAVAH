import React, { useState, useRef } from 'react';
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
  GripHorizontal,
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

  const [isExpanded, setIsExpanded] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isActionRunning, setIsActionRunning] = useState(false);

  // Drag state
  const toolbarRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const dragStartInfo = useRef({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0 });

  // Initialize position and handle clamping on expand/collapse
  React.useEffect(() => {
    if (!toolbarRef.current) return;

    const rect = toolbarRef.current.getBoundingClientRect();

    if (!position) {
      // First mount: convert initial CSS position (bottom-center) to explicit x,y coordinates
      setPosition({ x: rect.left, y: rect.top });
    } else {
      // Ensure panel stays on screen when resizing (e.g., expanding)
      const newX = Math.max(0, Math.min(position.x, window.innerWidth - rect.width));
      const newY = Math.max(0, Math.min(position.y, window.innerHeight - rect.height));
      
      if (newX !== position.x || newY !== position.y) {
        setPosition({ x: newX, y: newY });
      }
    }
  }, [isExpanded]);

  // Dynamic state checks
  const kolasib = communities.find((c) => c.id === 'MZ-KOL-004');
  const isP1 = kolasib?.metrics?.priorityTier === 'P1';
  const kolasibMission = activeMissions.find((m) => m.communityId === 'MZ-KOL-004');
  const isMissionDispatched = kolasibMission?.status === 'IN_TRANSIT';
  const isMissionDelivered = kolasibMission?.status === 'DELIVERED';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || !position) return;
    
    // Ignore interactive elements inside the drag handle (unless they are the handle itself)
    const target = e.target as HTMLElement;
    if (target.closest('button') && !target.classList.contains('drag-handle')) {
      return;
    }

    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    hasDraggedRef.current = false;

    dragStartInfo.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: position.x,
      initialPosY: position.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !position) return;
    
    const deltaX = e.clientX - dragStartInfo.current.startX;
    const deltaY = e.clientY - dragStartInfo.current.startY;
    
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasDraggedRef.current = true;
    }

    let newX = dragStartInfo.current.initialPosX + deltaX;
    let newY = dragStartInfo.current.initialPosY + deltaY;

    if (toolbarRef.current) {
      const rect = toolbarRef.current.getBoundingClientRect();
      newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
      newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
    }
    
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

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
      ref={toolbarRef}
      style={position ? {
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none'
      } : {
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        touchAction: 'none'
      }}
      aria-label="Interactive Walkthrough Demo Toolbar"
      className="fixed z-[1100] pointer-events-auto select-none max-w-full px-2"
    >
      {/* Minimized Pill Button */}
      {!isExpanded && (
        <button
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onClick={(e) => {
            if (hasDraggedRef.current) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            setIsExpanded(true);
          }}
          className="drag-handle flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#1B4B73] hover:bg-[#123A5A] text-white font-semibold text-xs shadow-2xl border border-white/20 backdrop-blur-md transition-all duration-200 hover:scale-105 cursor-grab active:cursor-grabbing ring-2 ring-primary/30 animate-pulse max-w-[95vw]"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
          <span className="tracking-wide font-medium truncate max-w-[135px] sm:max-w-none text-[11px] sm:text-xs">
            1-Click Resilience Demo
          </span>
          {isP1 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-mono font-bold shrink-0">
              P1 ACTIVE
            </span>
          )}
          {isMissionDispatched && (
            <span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[9px] font-mono font-bold shrink-0">
              EN ROUTE
            </span>
          )}
          {isMissionDelivered && (
            <span className="px-1.5 py-0.5 rounded-full bg-green-600 text-white text-[9px] font-mono font-bold shrink-0">
              DELIVERED
            </span>
          )}
          <ChevronUp className="w-3.5 h-3.5 text-white/80 shrink-0" />
        </button>
      )}

      {/* Expanded Floating Control Deck */}
      {isExpanded && (
        <div className="w-[95vw] sm:w-[92vw] max-w-4xl max-h-[85vh] overflow-y-auto custom-scrollbar bg-surface/98 dark:bg-slate-900/98 backdrop-blur-xl border-2 border-[#1B4B73]/60 dark:border-blue-400/40 rounded-lg shadow-2xl p-3 sm:p-4 space-y-2.5 sm:space-y-3 animate-in fade-in zoom-in-95 duration-200">
          {/* Header Row: Title + Role Pills + Collapse Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 pb-2">
            <div 
              className="drag-handle flex flex-1 items-center gap-1.5 sm:gap-2 cursor-grab active:cursor-grabbing"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <GripHorizontal className="w-4 h-4 text-text-tertiary shrink-0" />
              <div className="w-2 h-2 rounded-full bg-status-open-solid animate-ping shrink-0" />
              <div>
                <div className="flex items-center gap-1.5 pointer-events-none">
                  <span className="font-bold uppercase tracking-wider text-[11px] sm:text-xs text-text-primary">
                    Resilience Demo Script
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-primary-tint text-primary font-bold hidden xs:inline">
                    Kolasib NH-306
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Role Switcher Pills */}
              <div className="flex items-center gap-0.5 sm:gap-1 bg-surface-subtle p-0.5 rounded-sm border border-border">
                {(
                  [
                    { role: 'SUPER_ADMIN', label: 'Admin', icon: Shield },
                    { role: 'FLEET_DISPATCHER', label: 'Dispatch', icon: Radio },
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
                      className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-xs text-[9px] sm:text-[10px] font-medium flex items-center gap-1 transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#1B4B73] text-white font-bold shadow-xs'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span className="hidden xs:inline">{r.label}</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
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
