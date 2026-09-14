import React from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { UserRole } from '../../types';
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
    <header className="bg-surface border-b border-border sticky top-0 z-40 shadow-xs">
      {/* Top Banner: Brand, Network Pill, Role Selector, Theme */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-[#1B4B73] dark:bg-[#2E6B9E] flex items-center justify-center text-white font-bold shadow-xs">
              <span className="text-xl tracking-wider">प्र</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-lg tracking-tight text-text-primary">
                  PRAVAH
                </span>
                <span className="text-xs px-2 py-0.5 rounded-sm bg-primary/10 text-primary font-mono font-medium">
                  MDoNER NER-AI
                </span>
              </div>
              <p className="text-xs text-text-secondary hidden sm:block">
                Predictive Resilient Accessibility & Logistics Intelligence Network
              </p>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            {/* Network / Offline PWA Status Pill */}
            <button
              onClick={toggleSimulatedOffline}
              title="Click to toggle simulated offline mountain dead-zone mode"
              className={`inline-flex items-center justify-center space-x-1.5 h-9 px-3 rounded-md text-xs font-medium border transition-colors whitespace-nowrap flex-shrink-0 btn-press ${
                isOnline
                  ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
                  : 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-status-open-solid animate-pulse" />
                  <span className="font-medium">Online / Live Sync</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-status-highrisk-solid" />
                  <span className="font-medium">
                    Offline Mode ({offlineQueueCount} queued)
                  </span>
                </>
              )}
            </button>

            {/* Persistent Role Switcher / Demo Simulator */}
            <div className="flex items-center space-x-1 bg-surface-subtle border border-border h-9 px-2 rounded-md">
              <Users className="w-3.5 h-3.5 text-text-secondary ml-1" />
              <select
                aria-label="Select User Role Simulator"
                value={activeRole}
                onChange={(e) => switchRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-medium text-text-primary border-none focus:ring-0 cursor-pointer pl-1 pr-6 py-1"
              >
                <option value="SUPER_ADMIN">Super Admin (MDoNER / State Command)</option>
                <option value="FLEET_DISPATCHER">Fleet Logistics Dispatcher</option>
                <option value="FIELD_OFFICER">Field Officer (Mission MZ-04)</option>
                <option value="DRIVER">Truck Driver (Medic-01)</option>
              </select>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle light or dark theme"
              className="inline-flex items-center justify-center w-9 h-9 rounded-md border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors btn-press flex-shrink-0"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-[#1B4B73]" />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Bar: Macro Network Telemetry */}
      <div className="bg-surface-subtle border-t border-border py-2 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* User Badge Info */}
          <div className="flex items-center space-x-2 text-text-secondary">
            <span className="font-medium text-text-primary">{userContext.name}</span>
            <span className="text-text-tertiary">|</span>
            <span>{userContext.department}</span>
            {userContext.activeMissionId && (
              <span className="px-1.5 py-0.5 rounded-sm bg-primary-tint text-primary font-mono font-medium">
                Mission {userContext.activeMissionId}
              </span>
            )}
          </div>

          {/* Macro KPI Counters */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-status-blocked-solid" />
              <span className="text-text-secondary">Blockages:</span>
              <span className="font-bold text-status-blocked-text">{totalBlockages}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <Flame className="w-3.5 h-3.5 text-status-highrisk-solid" />
              <span className="text-text-secondary">Cut-off P1 Hubs:</span>
              <span className="font-bold text-status-highrisk-text">{p1Communities}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-status-open-solid" />
              <span className="text-text-secondary">Active Convoys:</span>
              <span className="font-bold text-status-open-text">{activeConvoys}</span>
            </div>

            <div className="flex items-center space-x-1.5">
              <Radio className={`w-3.5 h-3.5 ${overdueWatchdogs > 0 ? 'text-status-blocked-solid animate-ping' : 'text-text-tertiary'}`} />
              <span className="text-text-secondary">Overdue Watchdogs:</span>
              <span className={`font-bold ${overdueWatchdogs > 0 ? 'text-status-blocked-text' : 'text-text-primary'}`}>
                {overdueWatchdogs}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
