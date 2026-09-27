/**
 * PRAVAH — Final Driver Mobile Application Shell
 * 
 * Mobile-app-in-browser concept matching Field Officer layout.
 * On desktop: Centered phone-sized container, dark PRAVAH theme, rounded mobile frame.
 * On mobile: Full-screen native experience.
 * 
 * Bottom Navigation:
 * 1. Home
 * 2. Navigate (Map primary screen)
 * 3. Mission
 * 4. Updates
 * 
 * Floating Action (+):
 * Lightweight driver reports (Road blockage, Hazard, Accident, Vehicle issue, Unable to proceed).
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { DriverHomeScreen } from './DriverHomeScreen';
import { DriverNavigateScreen } from './DriverNavigateScreen';
import { DriverMissionScreen } from './DriverMissionScreen';
import { DriverUpdatesScreen } from './DriverUpdatesScreen';
import { DriverReportModal } from './DriverReportModal';
import { FLEET_ROUTES } from '../../data/fleetData';
import { FIELD_OFFICERS } from '../../engine/missionEngine';
import {
  Home,
  Navigation,
  Package,
  Bell,
  Plus,
  Wifi,
  WifiOff,
  ChevronDown,
  RotateCcw,
  Shield,
  Smartphone,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Check,
  AlertOctagon,
  X,
  Truck,
  Volume2,
  VolumeX,
  Route,
  MapPin,
  Clock,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Languages,
} from 'lucide-react';
import {
  playEmergencyAlertSound,
  playAckChime,
  playTextToSpeech,
  stopTextToSpeech,
} from '../../utils/audioAlert';
import type { UserRole, ReliefMission, VehicleTelemetry, LanguageId } from '../../types';

type DriverTab = 'HOME' | 'NAVIGATE' | 'MISSION' | 'UPDATES';

export const DriverMobileShell: React.FC = () => {
  const {
    activeRole,
    switchRole,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    activeMissions,
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    offlineQueueCount,
    theme,
    alerts,
    acknowledgeAlert,
    triggerVehicleSOS,
    cancelVehicleSOS,
    selectedMissionId,
    setSelectedMissionId,
    activeDriverEmergencyAlert,
    acknowledgeDriverEmergencyAlert,
  } = usePravahStore();

  const [activeTab, setActiveTab] = useState<DriverTab>('HOME');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [dismissedAlertModalId, setDismissedAlertModalId] = useState<string | null>(null);
  const [isPlayingAlertAudio, setIsPlayingAlertAudio] = useState(false);
  const [selectedAlertLang, setSelectedAlertLang] = useState<LanguageId>('hi');

  // Sync alert language when alert arrives
  useEffect(() => {
    if (activeDriverEmergencyAlert) {
      setSelectedAlertLang(activeDriverEmergencyAlert.language || 'hi');
    }
  }, [activeDriverEmergencyAlert?.id, activeDriverEmergencyAlert?.language]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopTextToSpeech();
    };
  }, []);

  const handleToggleAlertAudio = (text: string, lang: LanguageId) => {
    if (isPlayingAlertAudio) {
      stopTextToSpeech();
      setIsPlayingAlertAudio(false);
      return;
    }

    setIsPlayingAlertAudio(true);
    playTextToSpeech(
      text,
      lang,
      {
        id: activeDriverEmergencyAlert?.missionId,
        highway: activeDriverEmergencyAlert?.affectedRoute,
        location: activeDriverEmergencyAlert?.incidentLocation,
        disruptionType: activeDriverEmergencyAlert?.incidentTitle,
        detourRoute: activeDriverEmergencyAlert?.newRouteName,
        estimatedDelay: `${activeDriverEmergencyAlert?.updatedEtaMinutes} min`,
      },
      {
        speed: 0.82,
        onStart: () => setIsPlayingAlertAudio(true),
        onEnd: () => setIsPlayingAlertAudio(false),
        onError: () => setIsPlayingAlertAudio(false),
      }
    );
  };

  const handleAcknowledgeEmergencyAlert = () => {
    if (!activeDriverEmergencyAlert) return;
    stopTextToSpeech();
    setIsPlayingAlertAudio(false);
    playAckChime();
    acknowledgeDriverEmergencyAlert(activeDriverEmergencyAlert.id);
  };

  const handleViewRouteOnMap = () => {
    if (activeDriverEmergencyAlert) {
      setDismissedAlertModalId(activeDriverEmergencyAlert.id);
      setSelectedMissionId(activeDriverEmergencyAlert.missionId);
    }
    setActiveTab('NAVIGATE');
  };

  // Sync state lifecycle: 🟠 Offline -> Saved locally -> 🟢 Online -> Syncing -> ✓ Synced
  const effectiveOnline = isOnline && !isSimulatedOffline;
  const [syncState, setSyncState] = useState<'OFFLINE' | 'SAVED_LOCALLY' | 'ONLINE' | 'SYNCING' | 'SYNCED'>(
    effectiveOnline ? 'ONLINE' : 'OFFLINE'
  );

  const prevOnlineRef = useRef(effectiveOnline);

  useEffect(() => {
    if (!effectiveOnline) {
      setSyncState(offlineQueueCount > 0 ? 'SAVED_LOCALLY' : 'OFFLINE');
    } else if (!prevOnlineRef.current && effectiveOnline) {
      // Transitioning from offline to online: Online -> Syncing -> Synced
      setSyncState('SYNCING');
      const timer1 = setTimeout(() => {
        setSyncState('SYNCED');
        const timer2 = setTimeout(() => {
          setSyncState('ONLINE');
        }, 2200);
        return () => clearTimeout(timer2);
      }, 1400);
      return () => clearTimeout(timer1);
    } else {
      setSyncState('ONLINE');
    }
    prevOnlineRef.current = effectiveOnline;
  }, [effectiveOnline, offlineQueueCount]);

  // 1. Ongoing missions strictly: exclude SUGGESTED
  const ongoingMissions = useMemo(() => {
    return activeMissions.filter(
      (m) => m.status === 'IN_TRANSIT' || m.status === 'PENDING_ADMIN_CLOSEOUT' || m.status === 'APPROVED' || m.status === 'DELIVERED'
    );
  }, [activeMissions]);

  // 2. Active Mission Resolution:
  // Match selectedMissionId first, then selectedVehicleId, otherwise default to first ongoing mission
  const activeMission = useMemo<ReliefMission | null>(() => {
    if (selectedMissionId) {
      const match = ongoingMissions.find((m) => m.id === selectedMissionId);
      if (match) return match;
    }
    if (selectedVehicleId) {
      const match = ongoingMissions.find((m) => m.assignedVehicleId === selectedVehicleId);
      if (match) return match;
    }
    return ongoingMissions[0] || null;
  }, [ongoingMissions, selectedMissionId, selectedVehicleId]);

  // 3. Active Vehicle Resolution:
  const activeVehicle = useMemo<VehicleTelemetry>(() => {
    if (activeMission?.assignedVehicleId) {
      const matched = vehicles.find((v) => v.vehicle_id === activeMission.assignedVehicleId);
      if (matched) return matched;
    }
    if (selectedVehicleId) {
      const matched = vehicles.find((v) => v.vehicle_id === selectedVehicleId);
      if (matched) return matched;
    }
    // Default to Ration-Convoy-07 or Medic-01
    const rationUnit = vehicles.find((v) => v.vehicle_id === 'Ration-Convoy-07');
    if (rationUnit) return rationUnit;
    return vehicles[0];
  }, [activeMission, selectedVehicleId, vehicles]);

  // Driver GPS coordinates
  const driverCoords = useMemo<[number, number]>(() => {
    return activeVehicle?.current_coords || [25.75958, 93.94727];
  }, [activeVehicle?.current_coords]);

  // Unread operational alerts count
  const unreadAlertsCount = useMemo(() => {
    return alerts.filter(
      (a) => !a.acknowledged && (a.severity === 'CRITICAL' || a.title.includes('ROUTE') || a.title.includes('BROADCAST'))
    ).length;
  }, [alerts]);

  // Navigation handlers
  const navigateToMap = useCallback(() => {
    setActiveTab('NAVIGATE');
  }, []);

  const navigateToMission = useCallback(() => {
    setActiveTab('MISSION');
  }, []);

  const navigateToUpdates = useCallback(() => {
    setActiveTab('UPDATES');
  }, []);

  // SOS Toggle
  const handleTriggerSOS = () => {
    playEmergencyAlertSound();
    triggerVehicleSOS(activeVehicle.vehicle_id);
    setSosModalOpen(false);
  };

  const handleCancelSOS = () => {
    cancelVehicleSOS(activeVehicle.vehicle_id);
  };

  const isVehicleSOS = Boolean(activeVehicle?.is_sos_manual || activeVehicle?.status === 'SOS_ALERT');

  // Bottom Navigation configuration (4 Tabs)
  const navTabs: { id: DriverTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'NAVIGATE', label: 'Navigate', icon: Navigation },
    { id: 'MISSION', label: 'Mission', icon: Package },
    { id: 'UPDATES', label: 'Updates', icon: Bell, badge: unreadAlertsCount > 0 ? unreadAlertsCount : undefined },
  ];

  return (
    <>
      {/* Outer desktop container */}
      <div className="fo-mobile-shell-outer">
        {/* Desktop Top Simulator Navigation Bar */}
        <div className="fo-desktop-top-bar">
          <div className="flex items-center gap-2.5 shrink-0 min-w-0">
            <img
              src={theme === 'dark' ? '/assets/pravah-logo-white.png' : '/assets/pravah-logo.png'}
              alt="PRAVAH"
              className="h-6 w-6 object-contain shrink-0"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-sm font-black tracking-tight text-white whitespace-nowrap">PRAVAH</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                DRIVER COCKPIT
              </span>
            </div>
            <span className="text-xs text-slate-400 hidden xl:inline ml-2 pl-2 border-l border-slate-700 whitespace-nowrap">
              Unit: <strong className="text-slate-200">{activeVehicle?.vehicle_id}</strong> ({activeVehicle?.driver_name})
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {/* Offline simulation toggle */}
            <button
              onClick={toggleSimulatedOffline}
              title="Click to toggle simulated mountain dead-zone offline mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                effectiveOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {effectiveOnline ? <Wifi className="w-3.5 h-3.5 text-emerald-400" /> : <WifiOff className="w-3.5 h-3.5 text-amber-400" />}
              <span>{effectiveOnline ? 'Online (Live)' : `Offline (${offlineQueueCount} queued)`}</span>
            </button>

            {/* Vehicle Selector (Convoy switch) */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded-lg shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase whitespace-nowrap">Convoy:</span>
              <select
                aria-label="Vehicle Switcher"
                value={activeVehicle?.vehicle_id}
                onChange={(e) => {
                  setSelectedVehicleId(e.target.value);
                  const matchedMission = ongoingMissions.find(m => m.assignedVehicleId === e.target.value);
                  if (matchedMission) setSelectedMissionId(matchedMission.id);
                }}
                className="bg-transparent text-xs font-semibold text-white border-none focus:ring-0 cursor-pointer pr-4 max-w-[145px] truncate"
              >
                {vehicles.map((v) => (
                  <option key={v.vehicle_id} value={v.vehicle_id} className="bg-[#1a2332] text-white">
                    {v.vehicle_id} ({v.driver_name})
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Role Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded-lg shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase whitespace-nowrap">Role:</span>
              <select
                aria-label="Desktop Role Switcher"
                value="DRIVER"
                onChange={(e) => switchRole(e.target.value as UserRole)}
                className="bg-transparent text-xs font-semibold text-white border-none focus:ring-0 cursor-pointer pr-4 max-w-[140px] truncate"
              >
                <option value="SUPER_ADMIN" className="bg-[#1a2332] text-white">
                  Admin (Shri A. Sarma, IAS)
                </option>
                <option value="FLEET_DISPATCHER" className="bg-[#1a2332] text-white">
                  Dispatcher (Major P.K. Baruah)
                </option>
                <option value="FIELD_OFFICER" className="bg-[#1a2332] text-white">
                  Field Officer (Insp. L. Hmar)
                </option>
                <option value="DRIVER" className="bg-[#1a2332] text-white">
                  Driver ({activeVehicle?.driver_name})
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* The Mobile Phone Container */}
        <div className="fo-mobile-shell">
          {/* Phone speaker notch (Desktop only) */}
          <div className="fo-phone-notch" />

          {/* ─── MOBILE APP HEADER ─── */}
          <header className="fo-app-header">
            <div className="flex items-center justify-between px-3.5 py-2">
              {/* Left: Branding & Role Dropdown Pill */}
              <div className="relative">
                <button
                  onClick={() => setShowRoleDropdown((prev) => !prev)}
                  className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-800/60 transition-colors cursor-pointer text-left"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white leading-none">
                        {activeVehicle?.vehicle_id || 'Ration-Convoy-07'}
                      </span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </div>
                    <span className="text-[10px] text-slate-400 leading-none">
                      {activeVehicle?.driver_name || 'Temsu Ao'}
                    </span>
                  </div>
                </button>

                {/* Role Switcher Slide-Down Menu */}
                {showRoleDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-64 bg-[#1a2332] border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800 animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 bg-slate-900/60">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 block mb-1">
                        Active Vehicle Unit
                      </span>
                      {vehicles.slice(0, 3).map((v) => (
                        <button
                          key={v.vehicle_id}
                          onClick={() => {
                            setSelectedVehicleId(v.vehicle_id);
                            const matchedMission = ongoingMissions.find(m => m.assignedVehicleId === v.vehicle_id);
                            if (matchedMission) setSelectedMissionId(matchedMission.id);
                            setShowRoleDropdown(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                            activeVehicle?.vehicle_id === v.vehicle_id
                              ? 'bg-emerald-500/15 text-emerald-400 font-bold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{v.vehicle_id}</span>
                          <span className="text-[10px] text-slate-400">{v.driver_name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="p-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 block mb-1">
                        Switch Application Role
                      </span>
                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          switchRole('SUPER_ADMIN');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <Shield className="w-3.5 h-3.5 text-blue-400" />
                        <div>
                          <span className="font-semibold block leading-tight">Admin Dashboard</span>
                          <span className="text-[10px] text-slate-500">Super Admin Command</span>
                        </div>
                      </button>

                      <button
                        onClick={() => {
                          setShowRoleDropdown(false);
                          switchRole('FIELD_OFFICER');
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                        <div>
                          <span className="font-semibold block leading-tight">Field Officer Mobile</span>
                          <span className="text-[10px] text-slate-500">Insp. L. Hmar</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Sync Status Indicator & SOS */}
              <div className="flex items-center gap-2">
                {/* Offline Status State Machine Pill */}
                <button
                  onClick={toggleSimulatedOffline}
                  title="Toggle Simulated Mountain Offline Dead-zone"
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                    syncState === 'OFFLINE'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : syncState === 'SAVED_LOCALLY'
                      ? 'bg-amber-500/30 text-amber-200 border-amber-500/50'
                      : syncState === 'SYNCING'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse'
                      : syncState === 'SYNCED'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {syncState === 'OFFLINE' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span>🟠 Offline</span>
                    </>
                  )}
                  {syncState === 'SAVED_LOCALLY' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      <span>Saved locally</span>
                    </>
                  )}
                  {syncState === 'SYNCING' && (
                    <>
                      <Radio className="w-3 h-3 text-blue-400 animate-spin" />
                      <span>Syncing...</span>
                    </>
                  )}
                  {syncState === 'SYNCED' && (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>✓ Synced</span>
                    </>
                  )}
                  {syncState === 'ONLINE' && (
                    <>
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span>🟢 Online</span>
                    </>
                  )}
                </button>

                {/* SOS Emergency Button */}
                {isVehicleSOS ? (
                  <button
                    onClick={handleCancelSOS}
                    className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-extrabold text-[10px] flex items-center gap-1 animate-bounce cursor-pointer shadow-lg shadow-red-950"
                  >
                    <AlertOctagon className="w-3 h-3" />
                    <span>SOS ACTIVE</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setSosModalOpen(true)}
                    className="px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-[10px] border border-red-500/30 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <AlertOctagon className="w-3 h-3" />
                    <span>SOS</span>
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* ─── ACTIVE EMERGENCY ROUTE ALERT BANNER (If alert is active & unacknowledged) ─── */}
          {activeDriverEmergencyAlert && !activeDriverEmergencyAlert.acknowledged && (
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-amber-600 border-b border-red-400/40 p-2.5 px-3 flex items-center justify-between gap-2 text-white shadow-xl shrink-0 z-30 animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base animate-pulse">🚨</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded text-amber-300">
                      EMERGENCY ROUTE ALERT
                    </span>
                    <span className="text-[10px] font-mono font-bold text-white">
                      ETA: {activeDriverEmergencyAlert.updatedEtaMinutes}m
                    </span>
                  </div>
                  <p className="text-[11px] font-bold truncate text-white">
                    {activeDriverEmergencyAlert.newRouteName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() =>
                    handleToggleAlertAudio(
                      activeDriverEmergencyAlert.multilingualTexts?.[selectedAlertLang] ||
                        activeDriverEmergencyAlert.audioBroadcastText,
                      selectedAlertLang
                    )
                  }
                  className={`p-1.5 rounded-lg border font-bold text-[10px] flex items-center gap-1 cursor-pointer transition-all ${
                    isPlayingAlertAudio
                      ? 'bg-amber-400 text-slate-950 border-amber-300 animate-pulse'
                      : 'bg-black/30 hover:bg-black/50 text-white border-white/20'
                  }`}
                  title="Listen to Voice Alert"
                >
                  {isPlayingAlertAudio ? <VolumeX className="w-3.5 h-3.5 text-amber-300" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setDismissedAlertModalId(null)}
                  className="px-2 py-1 rounded-lg bg-black/40 hover:bg-black/60 text-white font-bold text-[10px] border border-white/20 cursor-pointer"
                >
                  Details
                </button>
                <button
                  onClick={handleAcknowledgeEmergencyAlert}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] shadow-sm flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  <span>Ack</span>
                </button>
              </div>
            </div>
          )}

          {/* ─── MAIN CONTENT VIEWPORT ─── */}
          <main className="fo-app-content">
            {activeTab === 'HOME' && (
              <DriverHomeScreen
                activeMission={activeMission}
                activeVehicle={activeVehicle}
                onNavigateToMap={navigateToMap}
                onNavigateToMission={navigateToMission}
                onNavigateToUpdates={navigateToUpdates}
              />
            )}

            {activeTab === 'NAVIGATE' && (
              <DriverNavigateScreen
                activeMission={activeMission}
                activeVehicle={activeVehicle}
                onOpenReportModal={() => setReportModalOpen(true)}
              />
            )}

            {activeTab === 'MISSION' && (
              <DriverMissionScreen
                activeMission={activeMission}
                activeVehicle={activeVehicle}
                onNavigateToMap={navigateToMap}
              />
            )}

            {activeTab === 'UPDATES' && (
              <DriverUpdatesScreen
                activeMission={activeMission}
                activeVehicle={activeVehicle}
                onNavigateToMap={navigateToMap}
              />
            )}
          </main>

          {/* ─── FLOATING ACTION BUTTON (+) for Lightweight Driver Reporting ─── */}
          <div className={`absolute right-4 ${activeTab === 'NAVIGATE' ? 'bottom-32' : 'bottom-20'} z-30 pointer-events-auto transition-all`}>
            <button
              onClick={() => setReportModalOpen(true)}
              title="Quick Driver Road Incident / Hazard Report"
              className="w-12 h-12 rounded-full bg-gradient-to-tr from-blue-600 to-emerald-500 text-white flex items-center justify-center shadow-2xl shadow-blue-950/80 hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white/20"
            >
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>

          {/* ─── FIXED BOTTOM NAVIGATION (4 Tabs) ─── */}
          <nav className="fo-bottom-nav">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`fo-bottom-nav-item ${isActive ? 'active text-blue-400' : 'text-slate-500'}`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
                    {tab.badge && tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 min-w-[15px] h-3.5 px-0.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                        {tab.badge > 99 ? '99+' : tab.badge}
                      </span>
                    )}
                  </div>
                  <span className={`text-[10px] mt-0.5 font-semibold transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500'}`}>
                    {tab.label}
                  </span>
                  {isActive && <div className="fo-nav-indicator" />}
                </button>
              );
            })}
          </nav>

          {/* ─── FULL-SCREEN EMERGENCY ROUTE ALERT MODAL (Driver Cockpit) ─── */}
          {activeDriverEmergencyAlert &&
            !activeDriverEmergencyAlert.acknowledged &&
            dismissedAlertModalId !== activeDriverEmergencyAlert.id && (
              <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end sm:justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <div className="bg-[#0f172a] border-2 border-red-500 rounded-3xl p-4 sm:p-5 max-w-sm mx-auto w-full space-y-3.5 shadow-2xl shadow-red-950/80 ring-2 ring-red-500/30 relative">
                  {/* Close / Minimize button in top corner */}
                  <button
                    onClick={() => setDismissedAlertModalId(activeDriverEmergencyAlert.id)}
                    className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
                    title="Minimize alert to top banner"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Header Badge & Title */}
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-red-500/20 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950 animate-pulse">
                      <ShieldAlert className="w-6 h-6" />
                    </div>
                    <div className="min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40">
                          EMERGENCY ROUTE ALERT
                        </span>
                        <span className="text-[10px] font-mono text-amber-400 font-bold">
                          BASE COMMAND
                        </span>
                      </div>
                      <h3 className="text-sm font-black text-white mt-0.5 tracking-tight truncate">
                        {activeDriverEmergencyAlert.vehicleId} ({activeDriverEmergencyAlert.driverName})
                      </h3>
                    </div>
                  </div>

                  {/* Status & Incident Briefing Card */}
                  <div className="p-3 rounded-2xl bg-black/40 border border-red-500/30 space-y-2.5 text-xs">
                    {/* 1. What Incident Occurred */}
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          Incident Detected
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-mono font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                          Risk {activeDriverEmergencyAlert.disruptionRiskPct}% (Model A)
                        </span>
                      </div>
                      <p className="font-bold text-white text-[12px] mt-0.5">
                        {activeDriverEmergencyAlert.incidentTitle}
                      </p>
                      <p className="text-[10px] text-slate-300">
                        Location: {activeDriverEmergencyAlert.incidentLocation} &bull; Type: {activeDriverEmergencyAlert.incidentType}
                      </p>
                    </div>

                    {/* 2. Route Affected / Blocked vs New Alternate Bypass */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-800">
                      <div className="flex items-start gap-2">
                        <span className="text-red-400 text-xs mt-0.5">🚫</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-red-400 uppercase font-semibold block">
                            Affected / Blocked Route
                          </span>
                          <p className="text-[11px] font-bold text-slate-300 line-through decoration-red-500">
                            {activeDriverEmergencyAlert.affectedRoute}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-emerald-950/40 p-2 rounded-xl border border-emerald-500/30">
                        <span className="text-emerald-400 text-xs mt-0.5">🟢</span>
                        <div className="min-w-0">
                          <span className="text-[10px] text-emerald-400 uppercase font-bold block">
                            New Alternate Bypass Route
                          </span>
                          <p className="text-[11px] font-extrabold text-white">
                            {activeDriverEmergencyAlert.newRouteName}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. Live GPS Reroute & Updated ETA */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                      <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block font-semibold">Live GPS Reroute</span>
                        <span className="font-mono font-bold text-emerald-400 block mt-0.5">
                          {activeDriverEmergencyAlert.isRerouted ? '✓ Anchored from Live GPS' : 'Detour Active'}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500">
                          [{activeDriverEmergencyAlert.currentGps[0].toFixed(3)}, {activeDriverEmergencyAlert.currentGps[1].toFixed(3)}]
                        </span>
                      </div>
                      <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                        <span className="text-slate-400 block font-semibold">Updated ETA & Distance</span>
                        <span className="font-mono font-extrabold text-white text-xs block mt-0.5">
                          {activeDriverEmergencyAlert.updatedEtaMinutes} min
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {activeDriverEmergencyAlert.routeDistanceKm} km detour
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Regional Script & Voice Message */}
                  <div className="p-3 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-semibold flex items-center gap-1">
                        <Languages className="w-3 h-3 text-blue-400" />
                        Regional Voice Alert
                      </span>
                      {/* Language switch selector pills */}
                      <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-slate-800">
                        {(['hi', 'as', 'bn', 'mn', 'en'] as LanguageId[]).map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setSelectedAlertLang(lang)}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition-all cursor-pointer ${
                              selectedAlertLang === lang
                                ? 'bg-blue-600 text-white'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            {lang}
                          </button>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-slate-200 leading-relaxed italic bg-black/30 p-2.5 rounded-xl border border-white/5">
                      &ldquo;{activeDriverEmergencyAlert.multilingualTexts?.[selectedAlertLang] ||
                        activeDriverEmergencyAlert.audioBroadcastText}&rdquo;
                    </p>

                    {/* Listen Voice Alert Button */}
                    <button
                      onClick={() =>
                        handleToggleAlertAudio(
                          activeDriverEmergencyAlert.multilingualTexts?.[selectedAlertLang] ||
                            activeDriverEmergencyAlert.audioBroadcastText,
                          selectedAlertLang
                        )
                      }
                      className={`w-full py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        isPlayingAlertAudio
                          ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-950 animate-pulse'
                          : 'bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border-blue-500/40'
                      }`}
                    >
                      {isPlayingAlertAudio ? (
                        <>
                          <VolumeX className="w-4 h-4 text-slate-950" />
                          <span>Stop Voice Alert</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-blue-400" />
                          <span>Listen to Regional Voice Alert ({selectedAlertLang.toUpperCase()})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Primary Action Buttons: View Route on Map & Acknowledge */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleViewRouteOnMap}
                      className="flex-1 py-3 px-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-blue-950/50 cursor-pointer transition-all"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>VIEW ROUTE ON MAP</span>
                    </button>
                    <button
                      onClick={handleAcknowledgeEmergencyAlert}
                      className="flex-1 py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 cursor-pointer transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ACKNOWLEDGE &amp; CONTINUE</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
        </div>
      </div>

      {/* Click-away overlay for dropdown */}
      {showRoleDropdown && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowRoleDropdown(false)} />
      )}

      {/* Driver Lightweight Report Modal */}
      {reportModalOpen && (
        <DriverReportModal
          isOpen={reportModalOpen}
          onClose={() => setReportModalOpen(false)}
          driverCoords={driverCoords}
          vehicleId={activeVehicle?.vehicle_id || 'Ration-Convoy-07'}
          driverName={activeVehicle?.driver_name || 'Temsu Ao'}
        />
      )}

      {/* SOS Distress Confirmation Modal */}
      {sosModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-[#111A29] border border-red-500/50 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center mx-auto animate-bounce">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                TRIGGER EMERGENCY SOS?
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-snug">
                This transmits an immediate high-priority distress signal from unit {activeVehicle?.vehicle_id} to Central Command and BRO Rescue Teams.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSosModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerSOS}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg shadow-red-950 cursor-pointer"
              >
                TRANSMIT SOS
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
