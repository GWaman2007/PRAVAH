import React from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { UserRole } from '../../types';
import { DataStalenessChip } from './DataStalenessChip';
import {
  ShieldAlert,
  Radio,
  Wifi,
  WifiOff,
  Sun,
  Moon,
  Truck,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    userContext,
    activeRole,
    switchRole,
    theme,
    toggleTheme,
    isOnline,
    isSimulatedOffline,
    offlineQueueCount,
    toggleSimulatedOffline,
    isSupabaseConfigured,
    incidents,
    communities,
    vehicles,
    alerts,
  } = usePravahStore();

  // Macro KPI calculations
  const totalBlockages = incidents.filter((i) => i.severity === 'Total Blockage').length;
  const p1Communities = communities.filter((c) => c.metrics.priorityTier === 'P1').length;
  const activeConvoys = vehicles.filter((v) => v.status === 'ON_ROUTE' || v.status === 'DEAD_ZONE_EXTRAPOLATING').length;
  const overdueWatchdogs = vehicles.filter((v) => v.is_watchdog_amber || v.is_watchdog_red).length;

  return (
    <div className="bg-surface">
      {/* Top Banner: Brand, Network Pill, Role Selector, Theme */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Branding */}
          <div className="flex items-center gap-3 select-none">
            {/* Emblem Icon */}
            <img 
              src={theme === 'dark' ? '/assets/pravah-logo-white.png' : '/assets/pravah-logo.png'} 
              alt="PRAVAH Emblem" 
              className="h-10 w-10 object-contain dark:brightness-0 dark:invert drop-shadow-sm flex-shrink-0"
            />

            {/* Text Hierarchy */}
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2 leading-none">
                <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white font-sans">
                  PRAVAH
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wide bg-blue-50 text-blue-700 border border-blue-200 dark:bg-slate-800 dark:text-sky-400 dark:border-slate-700/80">
                  MDoNER
                </span>
              </div>
              <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 tracking-normal mt-0.5 whitespace-nowrap">
                Predictive Resilient Accessibility &amp; Logistics Intelligence Network
              </span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2.5 shrink-0">
            {/* Real-Time Data Staleness Indicator */}
            <DataStalenessChip className="hidden xs:flex" />

            {/* Network / Offline PWA Status Pill */}
            <button
              onClick={toggleSimulatedOffline}
              title={
                isSupabaseConfigured
                  ? "Connected to Supabase Cloud Database & Realtime Bus. Click to toggle simulated offline mountain dead-zone mode."
                  : "Running local/offline mode. Connect Supabase to sync across devices on Vercel. Click to toggle simulated offline."
              }
              className={`flex items-center space-x-1 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-sm text-[11px] sm:text-xs font-medium border transition-colors btn-press cursor-pointer shrink-0 ${
                isOnline
                  ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
                  : 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-open-solid animate-pulse" />
                  <span className="font-medium hidden sm:inline">
                    {isSupabaseConfigured ? 'Supabase Live Cloud' : 'Online / Live Sync'}
                  </span>
                  <span className="font-medium sm:hidden text-[10px]">
                    {isSupabaseConfigured ? 'Cloud Live' : 'Live'}
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-highrisk-solid" />
                  <span className="font-medium hidden sm:inline">
                    Offline Mode ({offlineQueueCount} queued)
                  </span>
                  <span className="font-medium sm:hidden text-[10px]">
                    Off ({offlineQueueCount})
                  </span>
                </>
              )}
            </button>

            {/* Persistent Role Switcher / Demo Simulator */}
            <div className="flex items-center bg-surface-subtle border border-border px-1 py-0.5 rounded-sm max-w-[95px] sm:max-w-none">
              <Users className="w-3 h-3 text-text-secondary ml-0.5 shrink-0 hidden sm:inline" />
              <select
                aria-label="Select User Role Simulator"
                value={activeRole}
                onChange={(e) => switchRole(e.target.value as UserRole)}
                className="bg-transparent text-[10px] sm:text-xs font-medium text-text-primary border-none focus:ring-0 cursor-pointer pl-0.5 pr-3 sm:pr-6 py-0.5 sm:py-1 truncate w-full"
              >
                <option value="SUPER_ADMIN">Admin (MDoNER)</option>
                <option value="FLEET_DISPATCHER">Dispatcher (Logistics)</option>
                <option value="FIELD_OFFICER">Field Officer (MZ-04)</option>
                <option value="DRIVER">Driver (Medic-01)</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              id="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              className="p-1 sm:p-2 rounded-sm border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors btn-press cursor-pointer shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1B4B73]" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bar: Macro Network Telemetry */}
      <div className="bg-surface-subtle border-t border-border py-1.5 sm:py-2 px-3 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2 text-xs">
          {/* User Badge Info */}
          <div className="flex flex-wrap items-center gap-1.5 text-text-secondary text-[10px] sm:text-xs">
            <span className="font-semibold text-text-primary">{userContext.name}</span>
            <span className="text-text-tertiary hidden sm:inline">|</span>
            <span className="hidden sm:inline truncate max-w-[180px] lg:max-w-none">{userContext.department}</span>
            {userContext.activeMissionId && (
              <span className="px-1.5 py-0.2 rounded-sm bg-primary-tint text-primary font-mono font-medium text-[9px] sm:text-[10px]">
                Mission {userContext.activeMissionId}
              </span>
            )}
          </div>

          {/* Macro KPI Counters */}
          <div className="grid grid-cols-2 sm:flex sm:items-center gap-1.5 sm:gap-4 text-[10px] sm:text-xs pt-1 sm:pt-0 border-t sm:border-t-0 border-border/50">
            <div className="flex items-center space-x-1.5 bg-surface sm:bg-transparent p-1 sm:p-0 rounded-xs border sm:border-0 border-border/40">
              <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-blocked-solid shrink-0" />
              <span className="text-text-secondary truncate">Blockages:</span>
              <span className="font-bold text-status-blocked-text ml-auto sm:ml-0">{totalBlockages}</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-surface sm:bg-transparent p-1 sm:p-0 rounded-xs border sm:border-0 border-border/40">
              <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-highrisk-solid shrink-0" />
              <span className="text-text-secondary truncate">P1 Hubs:</span>
              <span className="font-bold text-status-highrisk-text ml-auto sm:ml-0">{p1Communities}</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-surface sm:bg-transparent p-1 sm:p-0 rounded-xs border sm:border-0 border-border/40">
              <Truck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-status-open-solid shrink-0" />
              <span className="text-text-secondary truncate">Convoys:</span>
              <span className="font-bold text-status-open-text ml-auto sm:ml-0">{activeConvoys}</span>
            </div>

            <div className="flex items-center space-x-1.5 bg-surface sm:bg-transparent p-1 sm:p-0 rounded-xs border sm:border-0 border-border/40">
              <Radio className={`w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0 ${overdueWatchdogs > 0 ? 'text-status-blocked-solid animate-ping' : 'text-text-tertiary'}`} />
              <span className="text-text-secondary truncate">Overdue:</span>
              <span className={`font-bold ml-auto sm:ml-0 ${overdueWatchdogs > 0 ? 'text-status-blocked-text' : 'text-text-primary'}`}>
                {overdueWatchdogs}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
