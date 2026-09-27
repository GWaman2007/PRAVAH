/**
 * PRAVAH — Field Officer Mobile Application Shell
 * 
 * Renders the entire Field Officer experience inside a mobile-sized viewport.
 * On desktop: centered phone-like container with device chrome and desktop simulator bar.
 * On mobile: full-screen native app feel.
 */
import React, { useState, useCallback } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { FIELD_OFFICERS } from '../../engine/missionEngine';
import { FOHomeScreen } from './FOHomeScreen';
import { FOMapScreen } from './FOMapScreen';
import { FOReportsScreen } from './FOReportsScreen';
import { FOCommunityScreen } from './FOCommunityScreen';
import { FieldOfficerMissionsView } from './FieldOfficerMissionsView';
import { FOFloatingActionButton } from './FOFloatingActionButton';
import { QuickFieldReportModal } from './QuickFieldReportModal';
import type { QuickReportTab } from './QuickFieldReportModal';
import type { UserRole } from '../../types';
import {
  Home,
  Map,
  MessageSquare,
  Users,
  Bell,
  Truck,
  ChevronDown,
  Wifi,
  WifiOff,
  RotateCcw,
  X,
  AlertTriangle,
  Radio,
  CheckCircle2,
  Shield,
  Smartphone,
  ExternalLink,
} from 'lucide-react';

type FOTab = 'HOME' | 'MAP' | 'MISSIONS' | 'REPORTS' | 'COMMUNITY';

export const FieldOfficerMobileShell: React.FC = () => {
  const {
    userContext,
    activeRole,
    switchRole,
    activeOfficerId,
    setActiveOfficerId,
    isOnline,
    isSimulatedOffline,
    toggleSimulatedOffline,
    offlineQueueCount,
    incidents,
    activeMissions,
    communities,
    resetCommunityScenario,
    theme,
    alerts,
    acknowledgeAlert,
    setSelectedMissionId,
  } = usePravahStore();

  const [activeTab, setActiveTab] = useState<FOTab>('HOME');
  const [showOfficerDropdown, setShowOfficerDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<QuickReportTab>('INCIDENT');

  const community = communities.find(c => c.id === userContext.communityId) || communities[0];
  const unreadAlerts = incidents.filter(i => !i.hasOfficerVerified).length + alerts.filter(a => !a.acknowledged).length;

  const openAction = useCallback((tab: QuickReportTab) => {
    setModalTab(tab);
    setModalOpen(true);
  }, []);

  const handleTabChange = useCallback((tab: FOTab) => {
    setActiveTab(tab);
  }, []);

  const navigateToMap = useCallback(() => {
    setActiveTab('MAP');
  }, []);

  const navigateToMission = useCallback((missionId?: string) => {
    if (missionId) setSelectedMissionId(missionId);
    setActiveTab('MISSIONS');
  }, [setSelectedMissionId]);

  // Listen to mission route click custom events
  React.useEffect(() => {
    const handleEvent = (e: any) => {
      if (e.detail?.missionId) {
        setSelectedMissionId(e.detail.missionId);
        setActiveTab('MISSIONS');
      }
    };
    window.addEventListener('pravah-navigate-mission', handleEvent);
    return () => window.removeEventListener('pravah-navigate-mission', handleEvent);
  }, [setSelectedMissionId]);

  const tabs: { id: FOTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'HOME', label: 'Home', icon: Home },
    { id: 'MAP', label: 'Map', icon: Map },
    {
      id: 'MISSIONS',
      label: 'Missions',
      icon: Truck,
      badge: activeMissions.filter(m => (m.communityId === userContext.communityId || m.id === userContext.activeMissionId) && m.status === 'IN_TRANSIT').length || undefined,
    },
    { id: 'REPORTS', label: 'Reports', icon: MessageSquare, badge: incidents.length > 0 ? incidents.length : undefined },
    { id: 'COMMUNITY', label: 'Community', icon: Users },
  ];

  const currentOfficer = FIELD_OFFICERS.find(o => o.id === activeOfficerId) || FIELD_OFFICERS[0];
  const initials = currentOfficer?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'FO';

  const effectiveOnline = isOnline && !isSimulatedOffline;

  // Curated field notifications (Requirement 16)
  const notificationsList = [
    {
      id: 'notif-disruption-1',
      title: 'Road Disruption Reported',
      message: 'NH-29 Segment 15 has been blocked due to landslide debris.',
      time: '12m ago',
      type: 'DISRUPTION',
      severity: 'CRITICAL',
    },
    {
      id: 'notif-mission-1',
      title: 'Mission Affected',
      message: `Mission MZ-04 to ${community?.name || 'Kohima'} rerouted via secondary corridor.`,
      time: '25m ago',
      type: 'MISSION',
      severity: 'HIGH',
    },
    {
      id: 'notif-route-1',
      title: 'Route Updated',
      message: 'Alternative bypass via Dimapur-Kohima bypass verified by BRO.',
      time: '45m ago',
      type: 'ROUTE',
      severity: 'INFO',
    },
    {
      id: 'notif-resource-1',
      title: 'Resource Request Processed',
      message: 'Automated requisition payload dispatched to Dimapur Base Hub.',
      time: '1h ago',
      type: 'RESOURCE',
      severity: 'SUCCESS',
    },
  ];

  return (
    <>
      {/* Outer desktop container */}
      <div className="fo-mobile-shell-outer">
        {/* Desktop Top Simulator Navigation Bar (Requirement 3: Role Switcher Remains Accessible) */}
        <div className="fo-desktop-top-bar">
          <div className="flex items-center gap-2.5">
            <img
              src={theme === 'dark' ? '/assets/pravah-logo-white.png' : '/assets/pravah-logo.png'}
              alt="PRAVAH"
              className="h-6 w-6 object-contain"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black tracking-tight text-white">PRAVAH</span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                FIELD OFFICER SIMULATOR
              </span>
            </div>
            <span className="text-xs text-slate-400 hidden md:inline ml-2 pl-2 border-l border-slate-700">
              Assigned: <strong className="text-slate-200">{community?.name}</strong> ({currentOfficer?.badgeId || 'MZ-04'})
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Offline simulation toggle */}
            <button
              onClick={toggleSimulatedOffline}
              title="Click to toggle simulated mountain dead-zone offline mode"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                effectiveOnline
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20'
              }`}
            >
              {effectiveOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{effectiveOnline ? 'Online (Live)' : `Offline Dead-Zone (${offlineQueueCount} queued)`}</span>
            </button>

            {/* Desktop Role Selector Dropdown (Requirement 3) */}
            <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 px-2 py-1 rounded-lg">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Role:</span>
              <select
                aria-label="Desktop Role Switcher"
                value={`FIELD_OFFICER:${activeOfficerId}`}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('FIELD_OFFICER:')) {
                    const officerId = val.split(':')[1];
                    setActiveOfficerId(officerId);
                    switchRole('FIELD_OFFICER');
                  } else {
                    switchRole(val as UserRole);
                  }
                }}
                className="bg-transparent text-xs font-semibold text-white border-none focus:ring-0 cursor-pointer pr-4"
              >
                <option value="SUPER_ADMIN" className="bg-[#1a2332] text-white">
                  Admin (Shri A. Sarma, IAS)
                </option>
                <option value="FLEET_DISPATCHER" className="bg-[#1a2332] text-white">
                  Dispatcher (Major P.K. Baruah)
                </option>
                <optgroup label="Field Officers (Ground Intel)">
                  {FIELD_OFFICERS.map((officer) => (
                    <option
                      key={officer.id}
                      value={`FIELD_OFFICER:${officer.id}`}
                      className="bg-[#1a2332] text-white"
                    >
                      Field Officer ({officer.name} — {officer.badgeId})
                    </option>
                  ))}
                </optgroup>
                <option value="DRIVER" className="bg-[#1a2332] text-white">
                  Driver (Rajesh Mech — Medic-01)
                </option>
              </select>
            </div>
          </div>
        </div>

        {/* The Mobile Phone Container */}
        <div className="fo-mobile-shell">
          {/* Speaker slit notch (Desktop preview only) */}
          <div className="fo-phone-notch" />

          {/* ─── MOBILE APP HEADER (Screen 1 / 4) ─── */}
          <header className="fo-app-header">
            <div className="flex items-center justify-between px-4 py-2.5">
              {/* Left: PRAVAH branding */}
              <div className="flex items-center gap-2">
                <img
                  src={theme === 'dark' ? '/assets/pravah-logo-white.png' : '/assets/pravah-logo.png'}
                  alt="PRAVAH"
                  className="h-6 w-6 object-contain"
                />
                <span className="text-base font-black tracking-tight text-white font-sans">PRAVAH</span>
              </div>

              {/* Right: Connectivity + Bell + Avatar */}
              <div className="flex items-center gap-2.5">
                {/* Online/Offline indicator */}
                <button
                  onClick={toggleSimulatedOffline}
                  title="Toggle offline dead-zone"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                    effectiveOnline 
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
                  }`}
                >
                  {effectiveOnline ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  {effectiveOnline ? 'Online' : `Offline${offlineQueueCount > 0 ? ` (${offlineQueueCount})` : ''}`}
                </button>

                {/* Notification bell */}
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer text-slate-300"
                  aria-label="Open Field Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadAlerts > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                      {unreadAlerts > 9 ? '9+' : unreadAlerts}
                    </span>
                  )}
                </button>

                {/* Officer avatar */}
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white text-[11px] font-bold border border-blue-400/40 shadow-sm">
                  {initials}
                </div>
              </div>
            </div>

            {/* Officer / Role selector row inside mobile header (Requirement 3 & 4) */}
            <div className="px-4 pb-2.5 relative">
              <button
                onClick={() => setShowOfficerDropdown(!showOfficerDropdown)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <span>Field Officer ({currentOfficer?.badgeId || 'MZ-04'})</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showOfficerDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Officer & Role dropdown menu */}
              {showOfficerDropdown && (
                <div className="absolute left-4 right-4 top-full mt-1 bg-[#1a2332] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800">
                  {/* Field Officers section */}
                  <div className="p-1.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 py-1 block">
                      Field Officers (Ground Intel)
                    </span>
                    {FIELD_OFFICERS.map(officer => (
                      <button
                        key={officer.id}
                        onClick={() => {
                          setActiveOfficerId(officer.id);
                          setShowOfficerDropdown(false);
                        }}
                        className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          activeOfficerId === officer.id
                            ? 'bg-blue-500/15 text-blue-400 font-bold'
                            : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          activeOfficerId === officer.id
                            ? 'bg-blue-500/30 text-blue-300 border border-blue-500/40'
                            : 'bg-slate-700 text-slate-400'
                        }`}>
                          {officer.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div className="text-left flex-1 min-w-0">
                          <span className="block truncate">{officer.name}</span>
                          <span className="text-[10px] text-slate-500 font-normal">{officer.badgeId} • {officer.jurisdictionState || officer.communityName}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Switch to Admin / Driver section */}
                  <div className="p-1.5 bg-slate-900/60">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-2 py-1 block">
                      Switch Role
                    </span>
                    <button
                      onClick={() => {
                        setShowOfficerDropdown(false);
                        switchRole('SUPER_ADMIN');
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <Shield className="w-4 h-4 text-blue-400" />
                      <div>
                        <span className="font-semibold block leading-tight">Admin Dashboard</span>
                        <span className="text-[10px] text-slate-500">Shri A. Sarma, IAS</span>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        setShowOfficerDropdown(false);
                        switchRole('DRIVER');
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer text-left"
                    >
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <div>
                        <span className="font-semibold block leading-tight">Driver Cockpit</span>
                        <span className="text-[10px] text-slate-500">Rajesh Mech (Medic-01)</span>
                      </div>
                    </button>
                  </div>

                  {/* Reset community scenario */}
                  <div className="p-1.5 bg-slate-950">
                    <button
                      onClick={() => {
                        resetCommunityScenario(community?.id);
                        setShowOfficerDropdown(false);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[11px] font-semibold text-amber-400 hover:bg-amber-500/10 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Community Scenario ({community?.name})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </header>

          {/* ─── NOTIFICATIONS SLIDE-DOWN TRAY (Requirement 16) ─── */}
          {showNotifications && (
            <div className="absolute top-[82px] left-0 right-0 z-40 bg-[#121A28] border-b border-slate-700 shadow-2xl p-3 animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 mb-2">
                <div className="flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Field Notifications</span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {notificationsList.map(n => (
                  <div key={n.id} className="p-2.5 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-400" />
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-500">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-tight">{n.message}</p>
                  </div>
                ))}

                {alerts.map(a => (
                  <div key={a.id} className="p-2.5 rounded-lg bg-red-950/40 border border-red-500/30 text-xs flex items-start justify-between gap-2">
                    <div>
                      <span className="font-bold text-red-300 block">{a.title}</span>
                      <span className="text-[11px] text-slate-300 block mt-0.5">{a.message}</span>
                    </div>
                    {!a.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(a.id)}
                        className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] shrink-0 cursor-pointer"
                      >
                        Ack
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── MAIN CONTENT AREA ─── */}
          <main className="fo-app-content">
            {activeTab === 'HOME' && (
              <FOHomeScreen
                onNavigateToMap={navigateToMap}
                onOpenAction={openAction}
              />
            )}
            {activeTab === 'MAP' && <FOMapScreen onNavigateToMission={navigateToMission} />}
            {activeTab === 'MISSIONS' && (
              <div className="p-2 sm:p-3 overflow-y-auto h-full">
                <FieldOfficerMissionsView onNavigateToMap={navigateToMap} />
              </div>
            )}
            {activeTab === 'REPORTS' && <FOReportsScreen onOpenAction={openAction} />}
            {activeTab === 'COMMUNITY' && (
              <FOCommunityScreen onNavigateToMap={navigateToMap} onOpenAction={openAction} />
            )}
          </main>

          {/* ─── FLOATING ACTION BUTTON (Screen 4: + Action Menu) ─── */}
          <FOFloatingActionButton onOpenAction={openAction} />

          {/* ─── FIXED BOTTOM NAVIGATION (Screen 1-3) ─── */}
          <nav className="fo-bottom-nav">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
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
        </div>
      </div>

      {/* Click-away overlay for dropdown */}
      {showOfficerDropdown && (
        <div
          className="fixed inset-0 z-40 bg-black/20"
          onClick={() => setShowOfficerDropdown(false)}
        />
      )}

      {/* Quick Field Report Modal */}
      {modalOpen && (
        <QuickFieldReportModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          initialTab={modalTab}
        />
      )}
    </>
  );
};
