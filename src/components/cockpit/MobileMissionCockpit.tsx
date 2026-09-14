import React, { useState, useEffect, useRef } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
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
  Radio,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Zap,
  CornerUpRight,
  ShieldAlert,
  Sliders,
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
    toggleVehicleHalt,
    toggleVehicleDeviation,
    markMissionDelivered,
    addIncident,
    simulationSpeed,
    setSimulationSpeed,
    isSimulationRunning,
    toggleSimulation,
  } = usePravahStore();

  // Active mission vehicle: Medic-01 on Mission MZ-04
  const activeVehicle =
    vehicles.find((v) => v.vehicle_id === 'Medic-01') || vehicles[0];

  const targetCommunity =
    communities.find((c) => c.id === activeVehicle.destination_community_id) || communities[0];

  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [clearanceNotes, setClearanceNotes] = useState('');
  const [isSOSConfirmOpen, setIsSOSConfirmOpen] = useState(false);
  const [roadblockAheadSimulated, setRoadblockAheadSimulated] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);

  const isDelivered = activeVehicle.status === 'DELIVERED_COMPLETED';
  const isDeadZone = activeVehicle.status === 'DEAD_ZONE_EXTRAPOLATING';
  const isSOS = activeVehicle.status === 'SOS_ALERT' || activeVehicle.is_sos_manual;
  const isHalted = activeVehicle.is_stopped_manual;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: activeVehicle.current_coords,
      zoom: 11,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Route coordinates along NH-306 (Silchar to Kolasib)
    const routeCoords: [number, number][] = [
      [24.8333, 92.7789], // Silchar Depot
      [24.7200, 92.7650],
      [24.6050, 92.7520],
      [24.5120, 92.7480],
      [24.4200, 92.7350], // Lailapur Border
      [24.3800, 92.7200], // Vairengte Gate
      [24.3400, 92.7280], // Mountain Ghat
      [24.2850, 92.7350], // Bilkhawthlir Hazard/Dead-Zone
      [24.2500, 92.7100],
      [24.2246, 92.6784], // Kolasib East Hospital
    ];

    // Detour polyline (Green safe bypass)
    routePolylineRef.current = L.polyline(routeCoords, {
      color: '#12B76A',
      weight: 5,
      opacity: 0.85,
    }).addTo(map);

    // Blackout Zone Polygon (Bilkhawthlir)
    const blackoutPoly: [number, number][] = [
      [24.3200, 92.7100],
      [24.3200, 92.7600],
      [24.2600, 92.7600],
      [24.2600, 92.7100],
    ];
    L.polygon(blackoutPoly, {
      color: '#B54708',
      fillColor: '#FFFAEB',
      fillOpacity: 0.35,
      weight: 2,
      dashArray: '4, 4',
    }).addTo(map).bindPopup('Bilkhawthlir Cellular Blackout Zone (Expected transit: 28 mins)');

    // Destination Hospital Pin
    const hospitalIcon = L.divIcon({
      html: `<div style="background-color:#1B4B73;color:white;padding:4px;border-radius:4px;font-weight:bold;font-size:10px;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);text-align:center;">🏥 Kolasib</div>`,
      className: 'custom-hospital-icon',
      iconSize: [64, 24],
      iconAnchor: [32, 12],
    });
    L.marker([24.2246, 92.6784], { icon: hospitalIcon }).addTo(map);

    // Vehicle Marker with Heading
    const truckIcon = L.divIcon({
      html: `
        <div style="transform: rotate(${activeVehicle.heading_deg}deg); transition: transform 0.3s ease;">
          <div style="background:#1B4B73; border:2px solid white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 6px rgba(0,0,0,0.4);">
            <span style="color:white; font-size:14px;">🚚</span>
          </div>
        </div>
      `,
      className: 'custom-truck-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
    vehicleMarkerRef.current = L.marker(activeVehicle.current_coords, { icon: truckIcon }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update vehicle marker & re-center map on coordinates update
  useEffect(() => {
    if (!mapInstanceRef.current || !vehicleMarkerRef.current) return;
    vehicleMarkerRef.current.setLatLng(activeVehicle.current_coords);

    // Update marker heading rotation
    const el = vehicleMarkerRef.current.getElement();
    if (el) {
      const inner = el.querySelector('div');
      if (inner) inner.style.transform = `rotate(${activeVehicle.heading_deg}deg)`;
    }

    mapInstanceRef.current.panTo(activeVehicle.current_coords, { animate: true, duration: 0.8 });
  }, [activeVehicle.current_coords, activeVehicle.heading_deg]);

  const handleOfficerClearanceReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceNotes) return;

    addIncident({
      title: `OFFICIAL CLEARANCE: Single lane opened on NH-306 Kolasib sector`,
      corridorFlair: 'r/Mizoram-NH-306',
      incidentType: 'Road Subsidence',
      severity: 'Single Lane Passable',
      location: {
        lat: activeVehicle.current_coords[0],
        lng: activeVehicle.current_coords[1],
        placeName: 'NH-306 Km 44 Bilkhawthlir Escarpment',
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

  return (
    <div className="max-w-md mx-auto px-3 py-4 space-y-3 pb-32 select-none text-xs text-text-primary">
      {/* 1. Google Maps Style Maneuver Banner */}
      <div className="bg-[#1B4B73] dark:bg-[#123A5A] text-white p-4 rounded-md shadow-md flex items-center justify-between gap-3 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
            <CornerUpRight className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-sky-200">
              In 350m • NH-306 Safe Mountain Bypass
            </div>
            <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
              Turn Right onto Bilkhawthlir Escarpment Detour
            </h2>
          </div>
        </div>

        <div className="text-right font-mono shrink-0">
          <div className="text-base font-bold text-white">
            {activeVehicle.speed_kmh || activeVehicle.current_speed_kmh || 38} <span className="text-[10px] font-normal">km/h</span>
          </div>
          <div className="text-[10px] text-sky-200">ETA: 42m</div>
        </div>
      </div>

      {/* 2. Mission ID & Offline Connectivity Pill */}
      <div className="bg-surface border border-border p-3 rounded-md shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-status-open-solid animate-ping" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-text-primary">Mission {activeVehicle.mission_id}</span>
              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-xs bg-primary-tint text-primary font-bold">
                {activeVehicle.vehicle_id}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary">
              Dest: <strong>{targetCommunity.name}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={toggleSimulatedOffline}
          className={`flex items-center space-x-1 px-2 py-1 rounded-sm text-[10px] font-semibold border btn-press ${
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

      {/* 3. Mountain Dead-Zone & Watchdog SLA Timer Card */}
      <div
        className={`p-3.5 rounded-md border shadow-xs space-y-1.5 ${
          isDeadZone
            ? 'bg-status-highrisk-tint border-status-highrisk-solid text-status-highrisk-text'
            : 'bg-surface border-border text-text-primary'
        }`}
      >
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-1.5 font-bold">
            <Radio className={`w-4 h-4 ${isDeadZone ? 'text-amber-600 animate-pulse' : 'text-primary'}`} />
            <span>Cellular Dead-Zone Watchdog SLA</span>
          </div>
          <span className="font-mono text-[10px] font-bold">
            {isDeadZone ? 'BLACKOUT EXTENUATION' : 'CELLULAR SATELLITE LOCK'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/50">
          <div>
            <span className="text-text-secondary block">D-R Distance Extrapolated:</span>
            <strong className="font-mono text-sm text-text-primary">
              {isDeadZone ? '6.8 km (IMU Dead-Reckoning)' : '0.0 km (Real GPS)'}
            </strong>
          </div>
          <div>
            <span className="text-text-secondary block">Watchdog SLA Remaining:</span>
            <strong className={`font-mono text-sm ${isDeadZone ? 'text-status-highrisk-text' : 'text-text-primary'}`}>
              {isDeadZone ? '12 mins (Exit SLA: 28m)' : 'Nominal (0m Overdue)'}
            </strong>
          </div>
        </div>
      </div>

      {/* 4. Center Interactive 2.5D Leaflet Navigation Map */}
      <div className="bg-surface border border-border rounded-md shadow-xs overflow-hidden">
        <div className="p-2.5 bg-surface-subtle border-b border-border flex items-center justify-between text-[11px]">
          <span className="font-semibold text-text-primary flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-primary" />
            <span>Live Mountain Route Radar (NH-306 Safe Bypass)</span>
          </span>
          <span className="font-mono text-[10px] text-primary">Heading: {Math.round(activeVehicle.heading_deg)}° S</span>
        </div>

        {/* Embedded Map Canvas */}
        <div className="relative h-64 w-full">
          <div ref={mapContainerRef} className="w-full h-full" />

          {/* Roadblock Ahead Simulated Alert Banner */}
          {roadblockAheadSimulated && (
            <div className="absolute top-2 left-2 right-2 bg-status-blocked-solid text-white p-2.5 rounded-sm shadow-lg flex items-center justify-between text-xs animate-bounce z-20">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span className="font-bold">IMMINENT ROCKFALL 400m AHEAD</span>
              </div>
              <button
                onClick={() => setRoadblockAheadSimulated(false)}
                className="px-2 py-0.5 rounded-xs bg-white text-status-blocked-text text-[10px] font-bold cursor-pointer"
              >
                Reroute Bypass
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 5. Floating Simulation Action Bar for Testing & Demo */}
      <div className="bg-surface border border-border p-3 rounded-md shadow-xs space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-semibold text-text-primary flex items-center gap-1">
            <Sliders className="w-3 h-3 text-primary" />
            <span>Telemetry Simulation &amp; Hazard Injection</span>
          </span>
          <span className="text-[10px] font-mono text-text-secondary">Speed: {simulationSpeed}x</span>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={toggleSimulation}
            className={`py-1.5 px-2 rounded-xs font-semibold text-[10px] border flex items-center justify-center gap-1 btn-press cursor-pointer ${
              isSimulationRunning
                ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
                : 'bg-surface text-text-secondary border-border'
            }`}
          >
            {isSimulationRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{isSimulationRunning ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            onClick={() => setSimulationSpeed(simulationSpeed === 1 ? 2 : simulationSpeed === 2 ? 5 : 1)}
            className="py-1.5 px-2 bg-surface hover:bg-surface-subtle text-text-primary rounded-xs border border-border font-mono text-[10px] font-bold btn-press cursor-pointer flex items-center justify-center gap-1"
          >
            <FastForward className="w-3 h-3 text-primary" />
            <span>{simulationSpeed}x Spd</span>
          </button>

          <button
            onClick={() => toggleVehicleHalt(activeVehicle.vehicle_id)}
            className={`py-1.5 px-1.5 rounded-xs font-semibold text-[10px] border flex items-center justify-center gap-1 btn-press cursor-pointer ${
              isHalted
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40'
                : 'bg-surface text-text-secondary border-border'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>{isHalted ? 'Resume' : 'Halt'}</span>
          </button>

          <button
            onClick={() => setRoadblockAheadSimulated(!roadblockAheadSimulated)}
            className="py-1.5 px-1.5 bg-surface hover:bg-surface-subtle text-text-primary rounded-xs border border-border text-[10px] font-semibold btn-press cursor-pointer flex items-center justify-center gap-1"
          >
            <AlertOctagon className="w-3 h-3 text-status-blocked-solid" />
            <span>Roadblock</span>
          </button>
        </div>
      </div>

      {/* 6. Cargo Manifest Snapshot */}
      <div className="bg-surface border border-border p-3 rounded-md shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
          <span className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-primary" />
            <span>Cold-Chain Medical Manifest (Medic-01)</span>
          </span>
          <span className="text-[10px] font-mono text-status-open-text">VERIFIED</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          <div className="p-2 rounded-xs bg-surface-subtle border border-border flex items-center justify-between">
            <span className="text-text-secondary">IV Fluids:</span>
            <strong className="font-mono text-primary">500 bottles</strong>
          </div>
          <div className="p-2 rounded-xs bg-surface-subtle border border-border flex items-center justify-between">
            <span className="text-text-secondary">Antivenom:</span>
            <strong className="font-mono text-primary">90 vials</strong>
          </div>
        </div>
      </div>

      {/* 7. BOTTOM FIXED ACTION HUD (Thumb-Reachable 44x44px Targets) */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border p-3 z-30 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          {/* Action 1: SOS Beacon Button */}
          <button
            onClick={() => setIsSOSConfirmOpen(true)}
            className="touch-target p-2 rounded-md bg-status-blocked-solid hover:bg-status-blocked-text text-white font-semibold text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs cursor-pointer"
          >
            <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
            <span className="text-[11px]">Emergency SOS</span>
          </button>

          {/* Action 2: Field Officer Roadblock Clearance Report */}
          <button
            onClick={() => setClearanceModalOpen(true)}
            className="touch-target p-2 rounded-md bg-surface border border-border text-text-primary hover:bg-surface-subtle font-medium text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs cursor-pointer"
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
            className={`touch-target p-2 rounded-md font-semibold text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs cursor-pointer ${
              isDelivered
                ? 'bg-status-open-tint text-status-open-text border border-status-open-solid'
                : 'bg-status-open-solid hover:bg-status-open-text text-white animate-pulse'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[11px] text-center leading-tight">
              {isDelivered ? 'Restock Complete' : 'CONFIRM DELIVERY'}
            </span>
          </button>
        </div>
      </div>

      {/* SOS Confirmation Modal */}
      {isSOSConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-surface border-2 border-status-blocked-solid rounded-md max-w-xs w-full p-5 space-y-4 text-center shadow-xl">
            <AlertOctagon className="w-12 h-12 text-status-blocked-solid mx-auto animate-bounce" />
            <div>
              <h3 className="text-base font-bold text-text-primary">Trigger Emergency SOS?</h3>
              <p className="text-xs text-text-secondary mt-1">
                Transmits distress packet with GPS coordinates to MDoNER State Command, alerting police and BRO QRT squads.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIsSOSConfirmOpen(false)}
                className="py-2 rounded-sm border border-border text-xs font-semibold text-text-secondary hover:bg-surface-subtle btn-press cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  playEmergencyAlertSound();
                  triggerVehicleSOS(activeVehicle.vehicle_id);
                  setIsSOSConfirmOpen(false);
                }}
                className="py-2 rounded-sm bg-status-blocked-solid hover:bg-status-blocked-text text-white text-xs font-bold btn-press shadow-xs cursor-pointer"
              >
                Transmit SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Officer Clearance Modal */}
      {clearanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-surface border border-border rounded-md max-w-sm w-full p-5 space-y-3 shadow-xl text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="font-semibold text-sm text-text-primary">
                Official Roadblock Report (+10 Multiplier)
              </h3>
              <button
                onClick={() => setClearanceModalOpen(false)}
                className="p-1 text-text-secondary hover:text-text-primary cursor-pointer"
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

              <div className="p-2 rounded-sm bg-primary-tint/30 text-primary font-medium text-[11px]">
                Signed by Officer: {userContext.name} ({userContext.badgeId})
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setClearanceModalOpen(false)}
                  className="px-3 py-1.5 border border-border rounded-sm text-text-secondary hover:bg-surface-subtle btn-press cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] text-white rounded-sm font-semibold btn-press shadow-xs flex items-center space-x-1 cursor-pointer"
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
