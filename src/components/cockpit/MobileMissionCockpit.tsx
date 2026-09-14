import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  Smartphone,
  Navigation,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Package,
  MapPin,
  Wifi,
  WifiOff,
  BatteryCharging,
  Radio,
  FileText,
  Send,
  X,
} from 'lucide-react';
import { playAckChime, playEmergencyAlertSound } from '../../utils/audioAlert';

export const MobileMissionCockpit: React.FC = () => {
  const {
    userContext,
    activeRole,
    vehicles,
    communities,
    isOnline,
    offlineQueueCount,
    toggleSimulatedOffline,
    triggerVehicleSOS,
    markMissionDelivered,
    addIncident,
  } = usePravahStore();

  // Find the active mission vehicle: Medic-01 on Mission MZ-04
  const activeVehicle =
    vehicles.find((v) => v.vehicle_id === 'Medic-01') || vehicles[0];

  // Find the destination community: Kolasib East (MZ-KOL-004)
  const targetCommunity =
    communities.find((c) => c.id === activeVehicle.destination_community_id) || communities[0];

  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [clearanceNotes, setClearanceNotes] = useState('');
  const [isSOSConfirmOpen, setIsSOSConfirmOpen] = useState(false);

  const handleOfficerClearanceReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceNotes) return;

    addIncident({
      title: `OFFICIAL CLEARANCE: Road cleared on NH-306 Kolasib sector`,
      corridorFlair: 'r/Mizoram-NH-306',
      incidentType: 'Road Subsidence',
      severity: 'Single Lane Passable',
      location: {
        lat: activeVehicle.current_coords[0],
        lng: activeVehicle.current_coords[1],
        placeName: 'NH-306 Km 44 Bilkhawthlir Sector',
        corridorId: 'SEG-SIL-KOL',
      },
      author: {
        name: userContext.name,
        role: 'Field Officer (BRO/Police)',
      },
      timestamp: new Date().toISOString(),
      mediaUrl: 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80',
    });

    setClearanceNotes('');
    setClearanceModalOpen(false);
  };

  const isDelivered = activeVehicle.status === 'DELIVERED_COMPLETED';
  const isDeadZone = activeVehicle.status === 'DEAD_ZONE_EXTRAPOLATING';

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-4 pb-28">
      {/* Mobile Top Header: Mission ID & Network Pill */}
      <div className="bg-surface border border-border p-3.5 rounded-md shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-sm bg-[#1B4B73] dark:bg-[#2E6B9E] flex items-center justify-center text-white font-bold text-xs">
            MZ
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-sm text-text-primary">
                Mission {activeVehicle.mission_id}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary-tint text-primary font-mono font-semibold">
                {activeVehicle.vehicle_id}
              </span>
            </div>
            <p className="text-[11px] text-text-secondary">
              Officer: {activeVehicle.convoy_lead_officer}
            </p>
          </div>
        </div>

        {/* Network Sync Pill */}
        <button
          onClick={toggleSimulatedOffline}
          className={`flex items-center space-x-1 px-2.5 py-1 rounded-sm text-[11px] font-semibold border btn-press ${
            isOnline
              ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
              : 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-3 h-3 text-status-open-solid" />
              <span>Live Sync</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3 text-status-highrisk-solid" />
              <span>Offline ({offlineQueueCount})</span>
            </>
          )}
        </button>
      </div>

      {/* Dead-Zone Watchdog SLA Timer Card */}
      <div
        className={`p-4 rounded-md border shadow-xs space-y-2 ${
          activeVehicle.is_watchdog_red
            ? 'bg-status-blocked-tint border-status-blocked-solid text-status-blocked-text animate-pulse'
            : activeVehicle.is_watchdog_amber
            ? 'bg-status-highrisk-tint border-status-highrisk-solid text-status-highrisk-text'
            : isDeadZone
            ? 'bg-status-unknown-tint border-status-unknown-solid text-text-primary'
            : 'bg-surface border-border text-text-primary'
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 font-semibold">
            <Radio className="w-4 h-4 text-primary" />
            <span>Cellular Dead-Zone Watchdog SLA</span>
          </div>
          <span className="font-mono text-[11px] font-bold">
            {isDeadZone ? 'BLACKOUT ENGAGED' : 'ONLINE CORRIDOR'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
          <div>
            <div className="text-[10px] text-text-secondary">Extrapolated Position:</div>
            <div className="font-bold text-sm">
              {(activeVehicle.dead_reckoning_distance_m / 1000).toFixed(1)} km D-R
            </div>
          </div>
          <div>
            <div className="text-[10px] text-text-secondary">Expected Exit SLA:</div>
            <div className="font-bold text-sm">
              {activeVehicle.overdue_duration_min && activeVehicle.overdue_duration_min > 0
                ? `OVERDUE +${activeVehicle.overdue_duration_min}m`
                : 'Within 28m SLA'}
            </div>
          </div>
        </div>

        {activeVehicle.is_watchdog_amber && (
          <div className="pt-1 text-[11px] font-semibold text-status-highrisk-text flex items-center space-x-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Amber SLA Warning: Overdue exiting mountain blackout zone!</span>
          </div>
        )}
      </div>

      {/* Navigation HUD Card */}
      <div className="bg-surface border border-border p-4 rounded-md shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center space-x-1">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span>Navigation Route Guidance</span>
          </span>
          <span className="text-xs font-mono font-bold text-primary">
            {activeVehicle.speed_kmh} km/h • {activeVehicle.heading_deg}°
          </span>
        </div>

        {/* Route Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-text-secondary">
            <span>Route Progress</span>
            <span className="font-bold text-text-primary">
              {activeVehicle.route_progress_pct}%
            </span>
          </div>
          <div className="w-full bg-border rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-300"
              style={{ width: `${activeVehicle.route_progress_pct}%` }}
            />
          </div>
        </div>

        <div className="p-2.5 rounded-sm bg-surface-subtle border border-border text-xs space-y-1">
          <div className="flex items-center space-x-1 text-text-secondary">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            <span>Destination:</span>
            <strong className="text-text-primary">{targetCommunity.name}</strong>
          </div>
          <p className="text-[11px] text-text-secondary">
            Primary Corridor: {targetCommunity.primaryCorridor}
          </p>
        </div>
      </div>

      {/* Cargo Manifest Card */}
      <div className="bg-surface border border-border p-4 rounded-md shadow-xs space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-text-primary">
          <span className="flex items-center space-x-1.5">
            <Package className="w-3.5 h-3.5 text-primary" />
            <span>Cargo Manifest Verification</span>
          </span>
          <span className="text-[10px] text-text-secondary">Mission-Scoped</span>
        </div>

        <div className="space-y-1.5 pt-1">
          {activeVehicle.cargo_manifest.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-sm bg-surface-subtle border border-border"
            >
              <span className="font-medium text-text-primary">{item.item}</span>
              <span className="font-bold font-mono text-primary">
                {item.quantity} {item.unit}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Destination Stock Status Buffer */}
      <div className="bg-surface border border-border p-4 rounded-md shadow-xs space-y-2 text-xs">
        <div className="flex items-center justify-between font-semibold text-text-primary">
          <span>Target Hospital Buffer Status</span>
          <span className="text-[10px] font-mono font-bold text-status-highrisk-text">
            T_window: {targetCommunity.metrics.actionableDispatchWindow.toFixed(1)}h
          </span>
        </div>
        <p className="text-[11px] text-text-secondary">
          Delivery resets inventory to 100% capacity and shifts community from P1 Critical to P4 Nominal.
        </p>
      </div>

      {/* BOTTOM FIXED ACTION HUD (Thumb-Reachable 44x44px Targets per design.md Section 8) */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border p-3 z-30 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          {/* Action 1: SOS Beacon Button */}
          <button
            onClick={() => setIsSOSConfirmOpen(true)}
            className="touch-target p-2 rounded-md bg-status-blocked-solid hover:bg-status-blocked-text text-white font-semibold text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs"
          >
            <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
            <span className="text-[11px]">Emergency SOS</span>
          </button>

          {/* Action 2: Field Officer Roadblock Clearance Report */}
          <button
            onClick={() => setClearanceModalOpen(true)}
            className="touch-target p-2 rounded-md bg-surface border border-border text-text-primary hover:bg-surface-subtle font-medium text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs"
          >
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-[11px] text-center leading-tight">Report Roadblock</span>
          </button>

          {/* Action 3: Single-Tap MARK DELIVERED Handover */}
          <button
            onClick={() => {
              playAckChime();
              markMissionDelivered(targetCommunity.id, activeVehicle.vehicle_id);
            }}
            disabled={isDelivered}
            className={`touch-target p-2 rounded-md font-semibold text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs ${
              isDelivered
                ? 'bg-status-open-tint text-status-open-text border border-status-open-solid'
                : 'bg-status-open-solid hover:bg-status-open-text text-white'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[11px] text-center leading-tight">
              {isDelivered ? 'Delivered' : 'Mark Delivered'}
            </span>
          </button>
        </div>
      </div>

      {/* SOS Confirmation Modal */}
      {isSOSConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-md max-w-xs w-full p-5 space-y-4 text-center shadow-xl">
            <AlertOctagon className="w-12 h-12 text-status-blocked-solid mx-auto animate-bounce" />
            <div>
              <h3 className="text-base font-bold text-text-primary">Trigger Emergency SOS?</h3>
              <p className="text-xs text-text-secondary mt-1">
                This will dispatch emergency mountain rescue units and transmit satellite distress telemetry to State Command.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsSOSConfirmOpen(false)}
                className="py-2.5 rounded-sm border border-border text-xs font-semibold text-text-secondary hover:bg-surface-subtle btn-press"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  playEmergencyAlertSound();
                  triggerVehicleSOS(activeVehicle.vehicle_id);
                  setIsSOSConfirmOpen(false);
                }}
                className="py-2.5 rounded-sm bg-status-blocked-solid hover:bg-status-blocked-text text-white text-xs font-bold btn-press shadow-xs"
              >
                Confirm SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Officer Clearance Modal */}
      {clearanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-md max-w-sm w-full p-5 space-y-3 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-semibold text-sm text-text-primary">
                Official Roadblock Report (+10 Multiplier)
              </h3>
              <button
                onClick={() => setClearanceModalOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleOfficerClearanceReport} className="space-y-3">
              <div>
                <label className="font-medium text-text-secondary block mb-1">
                  Field Observations / Clearance Notes:
                </label>
                <textarea
                  rows={3}
                  required
                  value={clearanceNotes}
                  onChange={(e) => setClearanceNotes(e.target.value)}
                  placeholder="e.g. Cleared right lane near KM-44 Bilkhawthlir. Escorting Medic-01 through single alternate corridor."
                  className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                />
              </div>

              <div className="p-2 rounded-sm bg-primary-tint/30 text-primary font-medium">
                Signed by Officer: {userContext.name} ({userContext.badgeId})
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setClearanceModalOpen(false)}
                  className="px-3 py-1.5 border border-border rounded-sm text-text-secondary hover:bg-surface-subtle btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] text-white rounded-sm font-semibold btn-press shadow-xs flex items-center space-x-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Official Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
