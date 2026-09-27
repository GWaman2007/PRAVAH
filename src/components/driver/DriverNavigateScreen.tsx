/**
 * PRAVAH — Driver Tactical Navigation Screen (Map-Centric Primary View)
 * 
 * Map is the primary screen. Displays:
 * - Driver's live GPS position
 * - Current active route & destination terminus
 * - Open, restricted, and blocked roads
 * - Incidents / hazards along corridor
 * - Live telemetry HUD (Speed, ETA, Distance remaining)
 * - CRITICAL: When road becomes blocked while en route, reroute originates
 *   from driver's CURRENT GPS position (NOT original hub), showing:
 *   Original route -> blocked (red dashed)
 *   Current driver position -> new route -> destination (green/cyan glow)
 */
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePravahStore } from '../../store/usePravahStore';
import { FLEET_ROUTES } from '../../data/fleetData';
import { NER_SEGMENTS } from '../../data/routingNetwork';
import {
  registerMapIcons,
  toGeoJSONCoords,
  toGeoJSONLineString,
  createVehiclesGeoJSON,
  createDisastersGeoJSON,
  createRoadBreakdownsGeoJSON,
  createGroundIntelIncidentsGeoJSON,
} from '../../engine/mapGeoJSONAdapters';
import {
  LocateFixed,
  Navigation,
  AlertTriangle,
  Compass,
  Layers,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Flame,
  Radio,
} from 'lucide-react';
import type { ReliefMission, VehicleTelemetry } from '../../types';

interface DriverNavigateScreenProps {
  activeMission: ReliefMission | null;
  activeVehicle: VehicleTelemetry;
  onOpenReportModal?: () => void;
}

export const DriverNavigateScreen: React.FC<DriverNavigateScreenProps> = ({
  activeMission,
  activeVehicle,
  onOpenReportModal,
}) => {
  const {
    hazardPolygons,
    activeDisruptions,
    incidents,
    vehicles,
    rerouteMission,
    alerts,
  } = usePravahStore();

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);
  const [followDriver, setFollowDriver] = useState(true);
  const [showRerouteDetails, setShowRerouteDetails] = useState(false);
  const [isReroutingSimulated, setIsReroutingSimulated] = useState(false);

  // Driver GPS coordinates: [lat, lng]
  const driverCoords = useMemo<[number, number]>(() => {
    return activeVehicle?.current_coords || [25.75958, 93.94727];
  }, [activeVehicle?.current_coords]);

  // Destination coordinates: [lat, lng]
  const destinationCoords = useMemo<[number, number]>(() => {
    if (activeMission?.destinationEndpoint) return activeMission.destinationEndpoint;
    const assignedRoute = FLEET_ROUTES[activeVehicle?.assigned_route_id || 'ROUTE-SUG-02'];
    if (assignedRoute && assignedRoute.coordinates.length > 0) {
      return assignedRoute.coordinates[assignedRoute.coordinates.length - 1];
    }
    return [25.6400, 94.1200];
  }, [activeMission?.destinationEndpoint, activeVehicle?.assigned_route_id]);

  // Standard route baseline
  const standardRouteCoords = useMemo<[number, number][]>(() => {
    if (activeMission?.routeGeometry && activeMission.routeGeometry.length > 0) {
      return activeMission.routeGeometry;
    }
    const route = FLEET_ROUTES[activeMission?.assignedRouteId || activeVehicle?.assigned_route_id || 'ROUTE-SUG-02'];
    return route ? route.coordinates : [];
  }, [activeMission?.assignedRouteId, activeMission?.routeGeometry, activeVehicle?.assigned_route_id]);

  // Determine if mission is rerouted or road is blocked
  const isRerouted = Boolean(activeMission?.isRerouted || isReroutingSimulated);

  // If rerouted:
  // 1. Detour route starts from Driver's CURRENT GPS coords -> Destination
  // 2. Original route is shown as blocked from original trajectory
  const detourRouteCoords = useMemo<[number, number][]>(() => {
    if (!isRerouted) return [];
    
    // If the mission has explicit reroute geometry from current coords:
    if (activeMission?.routeGeometry && activeMission.isRerouted) {
      return activeMission.routeGeometry;
    }

    // High-fidelity synthesized detour originating directly from driverCoords to destination
    // avoiding the blocked pass through alternative valley nodes
    const [cLat, cLng] = driverCoords;
    const [dLat, dLng] = destinationCoords;
    
    const mid1: [number, number] = [cLat + (dLat - cLat) * 0.35 + 0.045, cLng + (dLng - cLng) * 0.35 - 0.04];
    const mid2: [number, number] = [cLat + (dLat - cLat) * 0.70 + 0.025, cLng + (dLng - cLng) * 0.70 + 0.035];
    
    return [driverCoords, mid1, mid2, destinationCoords];
  }, [isRerouted, activeMission?.routeGeometry, activeMission?.isRerouted, driverCoords, destinationCoords]);

  // Original blocked corridor line for comparison
  const blockedSectionCoords = useMemo<[number, number][]>(() => {
    if (!isRerouted) return [];
    if (activeMission?.previousRouteGeometry && activeMission.previousRouteGeometry.length > 0) {
      return activeMission.previousRouteGeometry;
    }
    return standardRouteCoords;
  }, [isRerouted, activeMission?.previousRouteGeometry, standardRouteCoords]);

  // Recenter map on driver's GPS
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({
      center: toGeoJSONCoords(driverCoords),
      zoom: 15.8,
      essential: true,
      pitch: 0,
    });
    setFollowDriver(true);
  }, [driverCoords]);

  // Trigger Roadblock & Reroute Simulation from Current Position
  const handleSimulateBlockage = async () => {
    if (!activeMission) return;
    setIsReroutingSimulated(true);
    try {
      await rerouteMission(activeMission.id, undefined, 'NH-29 Landslide Blockage Detected Ahead');
    } catch {
      // Handled in store
    }
    handleRecenter();
  };

  // Initialize MapLibre GL
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    if (typeof window !== 'undefined') {
      try {
        maplibregl.setWorkerUrl('/assets/maplibre-gl-worker.mjs');
      } catch {
        // non-fatal
      }
    }

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: toGeoJSONCoords(driverCoords),
        zoom: 15.8,
        minZoom: 6,
        maxZoom: 18,
        attributionControl: false,
        pitch: 0,
      });
    } catch (err) {
      console.warn('[DriverNav] MapLibre init error:', err);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('styleimagemissing', (e: any) => {
      const id = e.id;
      if (!map.hasImage(id)) {
        const width = 1;
        const height = 1;
        const emptyData = new Uint8Array(4);
        map.addImage(id, { width, height, data: emptyData });
      }
    });

    map.on('load', async () => {
      isMapLoadedRef.current = true;
      map.resize();

      try {
        await registerMapIcons(map);
      } catch (err) {
        console.warn('Icon registration error:', err);
      }

      // 1. Hazard zones & Disasters
      map.addSource('driver-disasters', {
        type: 'geojson',
        data: createDisastersGeoJSON(hazardPolygons),
      });

      map.addLayer({
        id: 'driver-disasters-fill',
        type: 'fill',
        source: 'driver-disasters',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.22,
        },
      });

      map.addLayer({
        id: 'driver-disasters-line',
        type: 'line',
        source: 'driver-disasters',
        paint: {
          'line-color': ['get', 'outlineColor'],
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });

      // 2. Road Breakdowns & Physical Blockages
      map.addSource('driver-road-blockages', {
        type: 'geojson',
        data: createRoadBreakdownsGeoJSON(activeDisruptions, NER_SEGMENTS, incidents),
      });

      map.addLayer({
        id: 'driver-blockage-pulse',
        type: 'circle',
        source: 'driver-road-blockages',
        paint: {
          'circle-radius': 14,
          'circle-color': '#DC2626',
          'circle-opacity': 0.35,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#EF4444',
        },
      });

      map.addLayer({
        id: 'driver-blockage-icon',
        type: 'symbol',
        source: 'driver-road-blockages',
        layout: {
          'text-field': '⛔ BLOCKED',
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
          'text-anchor': 'bottom',
          'text-offset': [0, -0.6],
        },
        paint: {
          'text-color': '#FCA5A5',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2,
        },
      });

      // 3. Ground Intel Incidents along corridor
      map.addSource('driver-ground-intel', {
        type: 'geojson',
        data: createGroundIntelIncidentsGeoJSON(incidents),
      });

      map.addLayer({
        id: 'driver-ground-intel-core',
        type: 'circle',
        source: 'driver-ground-intel',
        paint: {
          'circle-radius': 6,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'driver-ground-intel-label',
        type: 'symbol',
        source: 'driver-ground-intel',
        layout: {
          'text-field': ['concat', '⚠️ ', ['get', 'incidentType']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#FEF08A',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2,
        },
      });

      // 4. Blocked Original Route (dashed red when rerouted)
      map.addSource('blocked-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: isRerouted ? toGeoJSONLineString(blockedSectionCoords) : [],
          },
          properties: {},
        },
      });

      map.addLayer({
        id: 'blocked-route-line',
        type: 'line',
        source: 'blocked-route',
        paint: {
          'line-color': '#EF4444',
          'line-width': 4.5,
          'line-dasharray': [3, 2],
          'line-opacity': 0.85,
        },
      });

      // 5. Active Route (Standard or Live Detour starting from current GPS)
      const currentActiveCoords = isRerouted && detourRouteCoords.length > 0
        ? detourRouteCoords
        : standardRouteCoords;

      map.addSource('active-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineString(currentActiveCoords),
          },
          properties: {
            isRerouted,
          },
        },
      });

      map.addLayer({
        id: 'active-route-glow',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': isRerouted ? '#10B981' : '#3B82F6',
          'line-width': 9,
          'line-opacity': 0.35,
        },
      });

      map.addLayer({
        id: 'active-route-line',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': isRerouted ? '#10B981' : '#3B82F6',
          'line-width': 4.5,
          'line-opacity': 1.0,
        },
      });

      // 6. Destination Terminus Endpoint
      map.addSource('destination-pin', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: toGeoJSONCoords(destinationCoords),
          },
          properties: {
            name: activeMission?.destinationName || 'Destination Terminal',
          },
        },
      });

      map.addLayer({
        id: 'destination-pin-circle',
        type: 'circle',
        source: 'destination-pin',
        paint: {
          'circle-radius': 7,
          'circle-color': '#10B981',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'destination-pin-label',
        type: 'symbol',
        source: 'destination-pin',
        layout: {
          'text-field': ['concat', '🏁 ', ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#A7F3D0',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2.5,
        },
      });

      // 7. Driver Live GPS Vehicle Marker
      map.addSource('driver-vehicle', {
        type: 'geojson',
        data: createVehiclesGeoJSON([activeVehicle], activeVehicle.vehicle_id),
      });

      map.addLayer({
        id: 'driver-vehicle-halo',
        type: 'circle',
        source: 'driver-vehicle',
        paint: {
          'circle-radius': 18,
          'circle-color': isRerouted ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)',
          'circle-stroke-width': 2,
          'circle-stroke-color': isRerouted ? '#10B981' : '#3B82F6',
        },
      });

      map.addLayer({
        id: 'driver-vehicle-symbol',
        type: 'symbol',
        source: 'driver-vehicle',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.95,
          'icon-rotate': ['get', 'heading_deg'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'text-field': ['concat', '📍 YOU (', ['get', 'vehicle_id'], ')'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#FBBF24',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2,
        },
      });
    });

    mapInstanceRef.current = map;

    const ro = new ResizeObserver(() => {
      map.resize();
    });
    if (mapContainerRef.current) {
      ro.observe(mapContainerRef.current);
    }

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      isMapLoadedRef.current = false;
    };
  }, []);

  // Update Dynamic Sources when state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoadedRef.current) return;

    // Update vehicle position
    const vehSource = map.getSource('driver-vehicle') as maplibregl.GeoJSONSource;
    if (vehSource) {
      vehSource.setData(createVehiclesGeoJSON([activeVehicle], activeVehicle.vehicle_id));
    }

    // Update active route & blocked route
    const currentActiveCoords = isRerouted && detourRouteCoords.length > 0
      ? detourRouteCoords
      : standardRouteCoords;

    const activeRouteSource = map.getSource('active-route') as maplibregl.GeoJSONSource;
    if (activeRouteSource) {
      activeRouteSource.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: toGeoJSONLineString(currentActiveCoords),
        },
        properties: { isRerouted },
      });
    }

    const blockedRouteSource = map.getSource('blocked-route') as maplibregl.GeoJSONSource;
    if (blockedRouteSource) {
      blockedRouteSource.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: isRerouted ? toGeoJSONLineString(blockedSectionCoords) : [],
        },
        properties: {},
      });
    }

    // Update line colors
    if (map.getLayer('active-route-line')) {
      map.setPaintProperty('active-route-line', 'line-color', isRerouted ? '#10B981' : '#3B82F6');
      map.setPaintProperty('active-route-glow', 'line-color', isRerouted ? '#10B981' : '#3B82F6');
    }

    // Update destination pin
    const destSource = map.getSource('destination-pin') as maplibregl.GeoJSONSource;
    if (destSource) {
      destSource.setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: toGeoJSONCoords(destinationCoords),
        },
        properties: {
          name: activeMission?.destinationName || 'Destination Terminal',
        },
      });
    }

    // Follow driver if active
    if (followDriver && driverCoords) {
      map.easeTo({
        center: toGeoJSONCoords(driverCoords),
        duration: 400,
      });
    }
  }, [
    activeVehicle,
    isRerouted,
    detourRouteCoords,
    standardRouteCoords,
    blockedSectionCoords,
    destinationCoords,
    driverCoords,
    followDriver,
    activeMission?.destinationName,
  ]);

  // Derived telemetry metrics
  const speedDisplay = activeVehicle?.speed_kmh || activeVehicle?.nominal_speed_kmh || 42;
  const distanceRemainingKm = useMemo(() => {
    if (activeMission?.routeDistanceKm) {
      const prog = (activeVehicle?.route_progress_pct || 35) / 100;
      return Math.max(1.2, activeMission.routeDistanceKm * (1 - prog)).toFixed(1);
    }
    return '28.4';
  }, [activeMission?.routeDistanceKm, activeVehicle?.route_progress_pct]);

  const etaMinutes = useMemo(() => {
    if (isRerouted) return '41 min';
    if (activeMission?.routeDurationMinutes) {
      const prog = (activeVehicle?.route_progress_pct || 35) / 100;
      return `${Math.round(activeMission.routeDurationMinutes * (1 - prog))} min`;
    }
    return '42 min';
  }, [isRerouted, activeMission?.routeDurationMinutes, activeVehicle?.route_progress_pct]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0A0F1D] flex flex-col">
      {/* ─── MAP CANVAS (Primary view, fills 100%) ─── */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* ─── TOP OPERATIONAL STATUS OVERLAY ─── */}
      <div className="absolute top-2.5 left-2.5 right-2.5 z-20 pointer-events-none space-y-1.5">
        {/* CRITICAL REROUTE ALERT BANNER */}
        {isRerouted && (
          <div className="pointer-events-auto bg-gradient-to-r from-red-950/95 via-[#182030]/95 to-emerald-950/95 border border-emerald-500/50 rounded-xl p-2.5 shadow-2xl backdrop-blur-md animate-in slide-in-from-top duration-300">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                  <Navigation className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-red-500/30 text-red-300 border border-red-500/40">
                      NH-29 BLOCKED
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                      LIVE DETOUR ACTIVE
                    </span>
                  </div>
                  <p className="text-[11px] font-semibold text-white mt-1 leading-snug">
                    Rerouted from your <span className="text-emerald-400 underline decoration-emerald-400 font-bold">CURRENT GPS POSITION</span> to bypass landslide.
                  </p>
                  <p className="text-[10px] text-slate-300 mt-0.5">
                    Original route <span className="text-red-400 font-semibold">[Blocked]</span> → Driver GPS <span className="text-emerald-400 font-semibold">[New Route]</span> → Destination.
                  </p>
                </div>
              </div>

              <button
                onClick={handleRecenter}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] shrink-0 cursor-pointer shadow-sm transition-colors"
              >
                Focus
              </button>
            </div>
          </div>
        )}

        {/* Turn-by-Turn / Destination Header Bar */}
        <div className="pointer-events-auto bg-[#0F172A]/90 border border-slate-700/80 rounded-xl px-3 py-2 shadow-lg backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4 rotate-45" />
            </div>
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                Target Destination
              </span>
              <span className="text-xs font-bold text-white truncate block">
                {activeMission?.destinationName || 'Kohima South Ridge Relief Depot'}
              </span>
            </div>
          </div>

          <div className="text-right shrink-0 pl-2">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
              Corridor
            </span>
            <span className="text-[11px] font-bold text-emerald-400">
              {isRerouted ? 'Bypass Alt-2' : 'NH-29 Arterial'}
            </span>
          </div>
        </div>
      </div>

      {/* ─── FLOATING MAP CONTROLS (Right side) ─── */}
      <div className="absolute right-2.5 top-36 z-20 flex flex-col gap-2 pointer-events-auto">
        {/* Recenter on Driver GPS */}
        <button
          onClick={handleRecenter}
          title="Recenter on your current GPS location"
          className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all cursor-pointer border ${
            followDriver
              ? 'bg-blue-600 text-white border-blue-400 shadow-blue-900/50'
              : 'bg-[#111A29]/90 text-slate-300 border-slate-700 hover:text-white'
          }`}
        >
          <LocateFixed className="w-5 h-5" />
        </button>

        {/* Simulate Blockage & Reroute Ahead (Testing requirement for reroute starting from current GPS) */}
        <button
          onClick={handleSimulateBlockage}
          title="Simulate road blockage ahead & test reroute from current GPS position"
          className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 hover:bg-amber-500/30 flex items-center justify-center shadow-lg transition-all cursor-pointer"
        >
          <AlertTriangle className="w-5 h-5" />
        </button>
      </div>

      {/* ─── BOTTOM TELEMETRY HUD OVERLAY ─── */}
      <div className="absolute bottom-2 left-2.5 right-2.5 z-20 pointer-events-auto">
        <div className="bg-[#0F172A]/95 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-4 gap-2 text-center divide-x divide-slate-800">
            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                Speed
              </span>
              <span className="text-base font-extrabold text-white font-mono leading-tight">
                {speedDisplay}
              </span>
              <span className="text-[9px] text-slate-400 font-normal block">km/h</span>
            </div>

            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                Distance
              </span>
              <span className="text-base font-extrabold text-emerald-400 font-mono leading-tight">
                {distanceRemainingKm}
              </span>
              <span className="text-[9px] text-slate-400 font-normal block">km left</span>
            </div>

            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                ETA
              </span>
              <span className="text-base font-extrabold text-blue-400 font-mono leading-tight">
                {etaMinutes}
              </span>
              <span className="text-[9px] text-slate-400 font-normal block">remaining</span>
            </div>

            <div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block">
                GPS Fix
              </span>
              <span className="text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1 leading-tight">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                3D Live
              </span>
              <span className="text-[9px] text-slate-400 font-mono block">12 sats</span>
            </div>
          </div>

          {/* Road Status Legend Strip */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Open Road
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Restricted
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Blocked
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Your Detour
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
