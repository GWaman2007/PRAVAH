import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Navigation,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ShieldCheck,
  Package,
  Wifi,
  WifiOff,
  Radio,
  Play,
  Pause,
  FastForward,
  CornerUpRight,
  Sliders,
  Send,
  X,
  Truck,
  LocateFixed,
  Maximize2,
  Minimize2,
  Compass,
  Layers,
} from 'lucide-react';
import { playAckChime, playEmergencyAlertSound } from '../../utils/audioAlert';
import { FLEET_ROUTES, BLACKOUT_ZONES, HAZARD_ZONES } from '../../data/fleetData';
import { NER_SEGMENTS } from '../../data/routingNetwork';
import { IncidentReportModal } from '../feed/IncidentReportModal';
import { DataStalenessChip } from '../layout/DataStalenessChip';
import { useTranslation } from '../../data/uiTranslations';
import type { CorridorFlair } from '../../types';
import {
  registerMapIcons,
  toGeoJSONCoords,
  toGeoJSONLineString,
  createVehiclesGeoJSON,
  createVehicleSOSGeoJSON,
  createDisastersGeoJSON,
  createCommunitiesGeoJSON,
  createCommunityBoundariesGeoJSON,
  createWarehousesGeoJSON,
  createRoadBreakdownsGeoJSON,
  createGroundIntelIncidentsGeoJSON,
} from '../../engine/mapGeoJSONAdapters';

export const MobileMissionCockpit: React.FC = () => {
  const { t } = useTranslation();

  const {
    userContext,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    communities,
    isOnline,
    offlineQueueCount,
    toggleSimulatedOffline,
    triggerVehicleSOS,
    cancelVehicleSOS,
    toggleVehicleHalt,
    markMissionDelivered,
    reportMissionDeliveryByField,
    activeMissions,
    addIncident,
    simulationSpeed,
    setSimulationSpeed,
    isSimulationRunning,
    toggleSimulation,
    theme,
    activeDisruptions,
    incidents,
    setActiveView,
    setSelectedMissionId,
    hazardPolygons,
  } = usePravahStore();

  // Active mission vehicle: selected vehicle or default to first
  const activeVehicle =
    vehicles.find((v) => v.vehicle_id === (selectedVehicleId || 'Medic-01')) || vehicles[0];

  const targetCommunity =
    communities.find((c) => c.id === activeVehicle.destination_community_id) || communities[0];

  const assignedRoute =
    FLEET_ROUTES[activeVehicle.assigned_route_id] || FLEET_ROUTES['ROUTE-MZ-04'];

  const [clearanceModalOpen, setClearanceModalOpen] = useState(false);
  const [isSOSConfirmOpen, setIsSOSConfirmOpen] = useState(false);
  const [roadblockAheadSimulated, setRoadblockAheadSimulated] = useState(false);
  const [followConvoy, setFollowConvoy] = useState(true);
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);
  const followConvoyRef = useRef<boolean>(followConvoy);
  followConvoyRef.current = followConvoy;

  const activeMission = activeMissions.find(
    (m) => m.assignedVehicleId === activeVehicle.vehicle_id || m.id === activeVehicle.mission_id
  );
  const isPendingCloseout = activeMission?.status === 'PENDING_ADMIN_CLOSEOUT';
  const isDelivered = activeVehicle.status === 'DELIVERED_COMPLETED' || activeMission?.status === 'DELIVERED';
  const isDeadZone = activeVehicle.status === 'DEAD_ZONE_EXTRAPOLATING';
  const isSOS = activeVehicle.status === 'SOS_ALERT' || activeVehicle.is_sos_manual;
  const isHalted = activeVehicle.is_stopped_manual;

  // Maneuver banner details based on active convoy
  const getManeuverDetails = (vehId: string) => {
    switch (vehId) {
      case 'Oxy-Tanker-04':
        return {
          corridor: 'In 800m • NH-10 Teesta Mountain Corridor',
          turn: 'Maintain Low Gear • Approaching 29th Mile Blackout',
          eta: '1h 15m',
        };
      case 'Ration-Convoy-07':
        return {
          corridor: 'In 500m • NH-29 Pagla Pahar High Ridge',
          turn: 'Bear Left onto Pagla Pahar High Ridge Detour',
          eta: '55m',
        };
      case 'Medic-01':
      default:
        return {
          corridor: 'In 350m • NH-306 Safe Mountain Bypass',
          turn: 'Turn Right onto Bilkhawthlir Escarpment Detour',
          eta: '42m',
        };
    }
  };

  const currentManeuver = getManeuverDetails(activeVehicle.vehicle_id);

  // Active blackout zone
  const getActiveBlackoutZone = useCallback(() => {
    return (
      BLACKOUT_ZONES.find((z) =>
        activeVehicle.assigned_route_id.includes('SK')
          ? z.id === 'ZONE-BO-02'
          : activeVehicle.assigned_route_id.includes('NL')
          ? z.id === 'ZONE-BO-03'
          : z.id === 'ZONE-BO-01'
      ) || BLACKOUT_ZONES[0]
    );
  }, [activeVehicle.assigned_route_id]);

  // Recenter map on the convoy
  const handleRecenter = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({
      center: toGeoJSONCoords(activeVehicle.current_coords),
      zoom: 12,
      essential: true,
    });
    setFollowConvoy(true);
  }, [activeVehicle.current_coords]);

  // 1. Initialize MapLibre GL Map (Synced with Main Tactical GIS Map)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    if (typeof window !== 'undefined') {
      try {
        maplibregl.setWorkerUrl('/assets/maplibre-gl-worker.mjs');
      } catch {
        // non-fatal
      }
    }

    const initialCenter = toGeoJSONCoords(activeVehicle.current_coords);

    let map: maplibregl.Map;
    try {
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: initialCenter,
        zoom: 11.5,
        minZoom: 5,
        maxZoom: 18,
        attributionControl: false,
      });
    } catch (err) {
      console.warn('[PRAVAH] Cockpit MapLibre GL init error:', err);
      return;
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');

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
        console.warn('Error loading custom icons into Cockpit Map:', err);
      }

      // 1. DISASTERS & HAZARDS (Realtime API Hazard Polygons + ISRO LHZ Baseline)
      map.addSource('disasters', {
        type: 'geojson',
        data: createDisastersGeoJSON(hazardPolygons),
      });

      map.addLayer({
        id: 'disasters-fill',
        type: 'fill',
        source: 'disasters',
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.22,
        },
      });

      map.addLayer({
        id: 'disasters-line',
        type: 'line',
        source: 'disasters',
        paint: {
          'line-color': ['get', 'outlineColor'],
          'line-width': 1.8,
          'line-dasharray': [3, 2],
        },
      });

      map.addLayer({
        id: 'disasters-symbol',
        type: 'symbol',
        source: 'disasters',
        layout: {
          'text-field': ['concat', '⚠️ ', ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9,
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#FEF08A',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2.0,
        },
      });

      // 2. COMMUNITY BOUNDARIES
      map.addSource('community-boundaries', {
        type: 'geojson',
        data: createCommunityBoundariesGeoJSON(communities, activeVehicle.destination_community_id),
      });

      map.addLayer({
        id: 'community-boundaries-fill',
        type: 'fill',
        source: 'community-boundaries',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': 0.2,
        },
      });

      map.addLayer({
        id: 'community-boundaries-line',
        type: 'line',
        source: 'community-boundaries',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 1.6,
          'line-dasharray': [2, 1],
        },
      });

      // 3. WAREHOUSES & LOGISTICS HUBS
      map.addSource('warehouses', {
        type: 'geojson',
        data: createWarehousesGeoJSON(),
      });

      map.addLayer({
        id: 'warehouses-icon',
        type: 'symbol',
        source: 'warehouses',
        layout: {
          'icon-image': 'icon-warehouse',
          'icon-size': 0.75,
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9.5,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#E2E8F0',
          'text-halo-color': '#0F172A',
          'text-halo-width': 1.5,
        },
      });

      // 4. ACTIVE CONVOY MISSION ROUTE CORRIDOR
      map.addSource('active-route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: toGeoJSONLineString(assignedRoute.coordinates),
          },
          properties: {},
        },
      });

      map.addLayer({
        id: 'active-route-glow',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': '#2563EB',
          'line-width': 9,
          'line-opacity': 0.35,
        },
      });

      map.addLayer({
        id: 'active-route-casing',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': '#0F172A',
          'line-width': 6,
          'line-opacity': 0.8,
        },
      });

      map.addLayer({
        id: 'active-route-line',
        type: 'line',
        source: 'active-route',
        paint: {
          'line-color': '#2563EB',
          'line-width': 4.2,
          'line-opacity': 1.0,
        },
      });

      // 5. MISSION DESTINATION TERMINUS ENDPOINT
      const destCoords = assignedRoute.coordinates[assignedRoute.coordinates.length - 1];
      map.addSource('destination-endpoint', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: toGeoJSONCoords(destCoords),
          },
          properties: {
            destination_name: targetCommunity.name,
          },
        },
      });

      map.addLayer({
        id: 'dest-core',
        type: 'circle',
        source: 'destination-endpoint',
        paint: {
          'circle-radius': 6,
          'circle-color': '#DC2626',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'dest-symbol',
        type: 'symbol',
        source: 'destination-endpoint',
        layout: {
          'icon-image': 'icon-destination-endpoint',
          'icon-size': 0.95,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'text-field': ['concat', '🚩 TARGET: ', ['get', 'destination_name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10.5,
          'text-offset': [0, 0.8],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#FBBF24',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2.5,
        },
      });

      // 6. BLACKOUT ZONE POLYGON
      const blackoutZone = getActiveBlackoutZone();
      map.addSource('blackout-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [blackoutZone.polygon.map((c) => [c[1], c[0]])],
          },
          properties: {
            name: blackoutZone.name,
          },
        },
      });

      map.addLayer({
        id: 'blackout-fill',
        type: 'fill',
        source: 'blackout-zone',
        paint: {
          'fill-color': '#B54708',
          'fill-opacity': 0.18,
        },
      });

      map.addLayer({
        id: 'blackout-line',
        type: 'line',
        source: 'blackout-zone',
        paint: {
          'line-color': '#EA580C',
          'line-width': 1.8,
          'line-dasharray': [3, 2],
        },
      });

      // 7. ROAD BREAKDOWNS & HAZARD CHOKE POINTS
      map.addSource('road-breakdowns', {
        type: 'geojson',
        data: createRoadBreakdownsGeoJSON(activeDisruptions, NER_SEGMENTS, incidents, activeMissions),
      });

      map.addLayer({
        id: 'road-breakdowns-pulse',
        type: 'circle',
        source: 'road-breakdowns',
        paint: {
          'circle-radius': 11,
          'circle-color': '#DC2626',
          'circle-opacity': 0.35,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#EF4444',
        },
      });

      map.addLayer({
        id: 'road-breakdowns-point',
        type: 'circle',
        source: 'road-breakdowns',
        paint: {
          'circle-radius': 6,
          'circle-color': '#DC2626',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // 8. GROUND INTEL INCIDENTS
      map.addSource('ground-intel-incidents', {
        type: 'geojson',
        data: createGroundIntelIncidentsGeoJSON(incidents),
      });

      map.addLayer({
        id: 'ground-intel-pulse',
        type: 'circle',
        source: 'ground-intel-incidents',
        paint: {
          'circle-radius': 12,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.35,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['get', 'color'],
        },
      });

      map.addLayer({
        id: 'ground-intel-core',
        type: 'circle',
        source: 'ground-intel-incidents',
        paint: {
          'circle-radius': 5.5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 1.8,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'ground-intel-symbol',
        type: 'symbol',
        source: 'ground-intel-incidents',
        layout: {
          'text-field': ['concat', '⚠️ ', ['get', 'incidentType']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#FCA5A5',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2.0,
        },
      });

      // 9. VEHICLE SOS ANIMATED HALO
      map.addSource('vehicle-sos', {
        type: 'geojson',
        data: createVehicleSOSGeoJSON(vehicles),
      });

      map.addLayer({
        id: 'vehicle-sos-pulse',
        type: 'circle',
        source: 'vehicle-sos',
        paint: {
          'circle-radius': 22,
          'circle-color': '#DC2626',
          'circle-opacity': 0.45,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#EF4444',
        },
      });

      // 10. VEHICLES (Individual Native Symbols)
      map.addSource('vehicles', {
        type: 'geojson',
        data: createVehiclesGeoJSON(vehicles, activeVehicle.vehicle_id),
      });

      map.addLayer({
        id: 'vehicles-selected-ring',
        type: 'circle',
        source: 'vehicles',
        filter: ['==', ['get', 'isSelected'], true],
        paint: {
          'circle-radius': 22,
          'circle-color': 'rgba(56, 189, 248, 0.25)',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#38BDF8',
        },
      });

      map.addLayer({
        id: 'vehicles-symbol',
        type: 'symbol',
        source: 'vehicles',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.9,
          'icon-rotate': ['get', 'heading_deg'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'text-field': ['get', 'vehicle_id'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9.5,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': ['case', ['get', 'isSelected'], '#FBBF24', '#FFFFFF'],
          'text-halo-color': '#0F172A',
          'text-halo-width': 2,
        },
      });
    });

    mapInstanceRef.current = map;

    // Attach ResizeObserver to keep vector canvas rendered cleanly
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

  // 2. Dynamically Update Vehicles and Follow Convoy
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoadedRef.current) return;

    const vehSource = map.getSource('vehicles') as maplibregl.GeoJSONSource;
    if (vehSource) {
      vehSource.setData(createVehiclesGeoJSON(vehicles, activeVehicle.vehicle_id));
    }

    const sosSource = map.getSource('vehicle-sos') as maplibregl.GeoJSONSource;
    if (sosSource) {
      sosSource.setData(createVehicleSOSGeoJSON(vehicles));
    }

    // Smoothly pan to follow the convoy in real-time
    if (followConvoyRef.current && activeVehicle.current_coords) {
      map.easeTo({
        center: toGeoJSONCoords(activeVehicle.current_coords),
        duration: 500,
      });
    }
  }, [vehicles, activeVehicle.vehicle_id, activeVehicle.current_coords]);

  // 3. Switch Route, Destination, and Blackout when activeVehicle changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoadedRef.current) return;

    // Update Route Line
    const routeSource = map.getSource('active-route') as maplibregl.GeoJSONSource;
    if (routeSource) {
      routeSource.setData({
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: toGeoJSONLineString(assignedRoute.coordinates),
        },
        properties: {},
      });
    }

    // Update Destination Endpoint
    const destCoords = assignedRoute.coordinates[assignedRoute.coordinates.length - 1];
    const destSource = map.getSource('destination-endpoint') as maplibregl.GeoJSONSource;
    if (destSource) {
      destSource.setData({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: toGeoJSONCoords(destCoords),
        },
        properties: {
          destination_name: targetCommunity.name,
        },
      });
    }

    // Update Blackout Zone
    const blackoutZone = getActiveBlackoutZone();
    const blackoutSource = map.getSource('blackout-zone') as maplibregl.GeoJSONSource;
    if (blackoutSource) {
      blackoutSource.setData({
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [blackoutZone.polygon.map((c) => [c[1], c[0]])],
        },
        properties: {
          name: blackoutZone.name,
        },
      });
    }

    // Fly to new convoy coordinates
    map.flyTo({
      center: toGeoJSONCoords(activeVehicle.current_coords),
      zoom: 11.5,
      duration: 800,
    });
  }, [activeVehicle.vehicle_id, activeVehicle.assigned_route_id, targetCommunity.name, getActiveBlackoutZone]);

  // 4. Sync Road Breakdowns and Ground Intel Incidents
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoadedRef.current) return;

    const breakdownSource = map.getSource('road-breakdowns') as maplibregl.GeoJSONSource;
    if (breakdownSource) {
      breakdownSource.setData(createRoadBreakdownsGeoJSON(activeDisruptions, NER_SEGMENTS, incidents, activeMissions));
    }

    const intelSource = map.getSource('ground-intel-incidents') as maplibregl.GeoJSONSource;
    if (intelSource) {
      intelSource.setData(createGroundIntelIncidentsGeoJSON(incidents));
    }
  }, [activeDisruptions, incidents, activeMissions]);

  // 5. Handle Map Size on Expansion Toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.resize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isMapExpanded]);

  const defaultCorridorFlair: CorridorFlair = activeVehicle.assigned_route_id.includes('SK')
    ? 'r/NH-10-Sikkim'
    : activeVehicle.assigned_route_id.includes('NL')
    ? 'r/NH-29-Nagaland'
    : 'r/Mizoram-NH-306';

  const defaultLocationName = `${assignedRoute.name} (en route to ${targetCommunity.name})`;

  return (
    <div className="max-w-md mx-auto px-3 py-4 space-y-3 pb-44 select-none text-xs text-text-primary">
      {/* 0. Multi-Mission Convoy Selector Strip */}
      <div className="bg-surface border border-border p-2 rounded-md shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-text-secondary px-0.5">
          <span className="font-semibold text-text-primary flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span>{t('assignedMissionConvoy')}</span>
          </span>
          <span className="font-mono text-[10px] text-text-secondary">
            {vehicles.length} Active Missions (Field Testing)
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {vehicles.map((veh) => {
            const isSelected = veh.vehicle_id === activeVehicle.vehicle_id;
            const hasSOS = veh.status === 'SOS_ALERT' || veh.is_sos_manual;
            const isDead = veh.status === 'DEAD_ZONE_EXTRAPOLATING';
            return (
              <button
                key={veh.vehicle_id}
                onClick={() => setSelectedVehicleId(veh.vehicle_id)}
                className={`p-2 rounded-sm text-left border transition-all btn-press cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-primary-tint border-primary text-primary shadow-xs ring-1 ring-primary/40'
                    : 'bg-surface-subtle hover:bg-surface border-border text-text-secondary'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono font-bold text-[11px] truncate">{veh.vehicle_id}</span>
                  {hasSOS ? (
                    <span className="w-2 h-2 rounded-full bg-status-blocked-solid animate-ping" />
                  ) : isDead ? (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-status-open-solid" />
                  )}
                </div>
                <div className="text-[9px] truncate font-medium mt-0.5 opacity-90">
                  Msn: {veh.mission_id}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* In-Cabin Emergency Distress Beacon Active Banner */}
      {isSOS && (
        <div className="bg-status-blocked-solid text-white p-3 rounded-md shadow-md flex items-center justify-between gap-3 animate-siren">
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 shrink-0 animate-pulse text-white" />
            <div>
              <div className="font-bold text-xs uppercase tracking-wider text-white">
                🚨 {t('emergencyDistressBeacon')}
              </div>
              <div className="text-[10px] text-white/90 leading-tight">
                Broadcasting coordinates to State Command &amp; QRT squads.
              </div>
            </div>
          </div>
          <button
            onClick={() => cancelVehicleSOS(activeVehicle.vehicle_id)}
            className="px-2.5 py-1 rounded-sm bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] shrink-0 border border-white/30 transition-colors btn-press cursor-pointer"
          >
            {t('cancelSos')}
          </button>
        </div>
      )}

      {/* 1. Google Maps Style Maneuver Banner */}
      <div className="bg-[#1B4B73] dark:bg-[#123A5A] text-white p-4 rounded-md shadow-md flex items-center justify-between gap-3 animate-fadeIn">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
            <CornerUpRight className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-wider uppercase text-sky-200">
              {currentManeuver.corridor}
            </div>
            <h2 className="text-sm font-bold tracking-tight text-white leading-tight">
              {currentManeuver.turn}
            </h2>
          </div>
        </div>

        <div className="text-right font-mono shrink-0">
          <div className="text-base font-bold text-white">
            {activeVehicle.speed_kmh || activeVehicle.current_speed_kmh || 38}{' '}
            <span className="text-[10px] font-normal">km/h</span>
          </div>
          <div className="text-[10px] text-sky-200">ETA: {currentManeuver.eta}</div>
        </div>
      </div>

      {/* 2. Mission ID & Offline Connectivity Pill */}
      <div className="bg-surface border border-border p-2.5 sm:p-3 rounded-md shadow-xs flex items-center justify-between gap-2">
        <div className="flex items-center space-x-2 sm:space-x-2.5 min-w-0">
          <img
            src={theme === 'dark' ? '/assets/pravah-emblem-white.png' : '/assets/pravah-emblem.png'}
            alt="PRAVAH"
            className="h-7 w-7 object-contain shrink-0"
          />
          <span className="w-2 h-2 rounded-full bg-status-open-solid animate-ping shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-text-primary truncate">Mission {activeVehicle.mission_id}</span>
              <span className="font-mono text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-xs bg-primary-tint text-primary font-bold shrink-0">
                {activeVehicle.vehicle_id}
              </span>
            </div>
            <p className="text-[10px] text-text-secondary truncate max-w-[120px] xs:max-w-[160px] sm:max-w-none">
              Dest: <strong>{targetCommunity.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <DataStalenessChip compact />
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
      </div>

      {/* 3. Mountain Dead-Zone & Watchdog SLA Timer Card */}
      <div
        className={`p-3 rounded-md border text-xs space-y-2 transition-all ${
          isDeadZone
            ? 'bg-amber-500/10 border-amber-500/50'
            : 'bg-surface border-border'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio
              className={`w-4 h-4 ${
                isDeadZone ? 'text-amber-500 animate-pulse' : 'text-status-open-solid'
              }`}
            />
            <span className="font-bold text-xs text-text-primary">
              {isDeadZone ? t('cellularBlackoutDetected') : t('cellularLinkNominal')}
            </span>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              isDeadZone
                ? 'bg-amber-500/20 text-amber-500'
                : 'bg-status-open-tint text-status-open-text'
            }`}
          >
            {isDeadZone ? 'DEAD-RECKONING' : '4G LTE CONNECTED'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-border/50">
          <div>
            <span className="text-text-secondary block">Traveled in Dead-Zone:</span>
            <strong className="font-mono text-sm text-text-primary">
              {activeVehicle.dead_reckoning_distance_m > 0
                ? `${(activeVehicle.dead_reckoning_distance_m / 1000).toFixed(1)} km (IMU Dead-Reckoning)`
                : '0.0 km (Real GPS)'}
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

      {/* 4. Center Interactive Vector Navigation Map (Synchronized with Main Tactical GIS Map) */}
      <div className="bg-surface border border-border rounded-md shadow-xs overflow-hidden relative isolate z-0">
        <div className="p-2.5 bg-surface-subtle border-b border-border flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Navigation className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="font-semibold text-text-primary truncate max-w-[140px] xs:max-w-[180px] sm:max-w-xs">
              Radar: {assignedRoute.name}
            </span>
            <span className="px-1.5 py-0.2 rounded-xs bg-primary-tint text-primary font-mono text-[9px] font-bold shrink-0">
              {Math.round(activeVehicle.heading_deg)}°
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {/* Follow Convoy Toggle */}
            <button
              onClick={() => setFollowConvoy(!followConvoy)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border flex items-center gap-1 cursor-pointer transition ${
                followConvoy
                  ? 'bg-primary text-white border-primary shadow-xs'
                  : 'bg-surface text-text-secondary border-border hover:bg-surface-subtle'
              }`}
              title="Toggle automatic convoy following"
            >
              <Compass className="w-3 h-3" />
              <span>{followConvoy ? 'Tracking' : 'Free Pan'}</span>
            </button>

            {/* Recenter button */}
            <button
              onClick={handleRecenter}
              className="p-1 rounded bg-surface hover:bg-surface-subtle border border-border text-text-secondary hover:text-text-primary cursor-pointer"
              title="Recenter on Convoy"
            >
              <LocateFixed className="w-3.5 h-3.5" />
            </button>

            {/* Expand / Compact Toggle */}
            <button
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="p-1 rounded bg-surface hover:bg-surface-subtle border border-border text-text-secondary hover:text-text-primary cursor-pointer"
              title={isMapExpanded ? 'Compact Radar View' : 'Expand Tactical View'}
            >
              {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>

            {/* Full Tactical GIS Command Bridge */}
            <button
              onClick={() => {
                setSelectedMissionId(activeVehicle.mission_id);
                setActiveView('GIS_COMMAND');
              }}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1B4B73] hover:bg-[#123A5A] text-white border border-blue-400/40 flex items-center gap-1 cursor-pointer shadow-xs transition"
              title="Switch to full regional Tactical GIS Command deck"
            >
              <Layers className="w-3 h-3 text-sky-300" />
              <span>Full GIS</span>
            </button>
          </div>
        </div>

        {/* Embedded Map Canvas strictly contained inside card */}
        <div className={`relative ${isMapExpanded ? 'h-[440px]' : 'h-72 sm:h-80'} w-full overflow-hidden isolate z-0 rounded-b-md transition-all duration-200`}>
          <div ref={mapContainerRef} className="w-full h-full rounded-b-md" />

          {/* Roadblock Ahead Simulated Alert Banner */}
          {roadblockAheadSimulated && (
            <div className="absolute top-2 left-2 right-2 bg-status-blocked-solid text-white p-2.5 rounded-sm shadow-lg flex items-center justify-between text-xs animate-bounce z-20">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-white" />
                <span className="font-bold">IMMINENT ROCKFALL 400m AHEAD</span>
              </div>
              <button
                onClick={() => setRoadblockAheadSimulated(false)}
                className="px-2 py-0.5 rounded-xs bg-surface text-status-blocked-text text-[10px] font-bold cursor-pointer hover:bg-surface-subtle"
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
            <span>{t('telemetrySimulationTitle')}</span>
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
            <span>{isSimulationRunning ? t('pause') : t('resume')}</span>
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
            <span>{isHalted ? t('resume') : t('halt')}</span>
          </button>

          <button
            onClick={() => setRoadblockAheadSimulated(!roadblockAheadSimulated)}
            className="py-1.5 px-1.5 bg-surface hover:bg-surface-subtle text-text-primary rounded-xs border border-border text-[10px] font-semibold btn-press cursor-pointer flex items-center justify-center gap-1"
          >
            <AlertOctagon className="w-3 h-3 text-status-blocked-solid" />
            <span>{t('roadblock')}</span>
          </button>
        </div>
      </div>

      {/* 6. Cargo Manifest Snapshot */}
      <div className="bg-surface border border-border p-3 rounded-md shadow-xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-text-primary">
          <span className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-primary" />
            <span>{t('cargoManifest')} ({activeVehicle.vehicle_id})</span>
          </span>
          <span className="text-[10px] font-mono text-status-open-text">VERIFIED</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
          {activeVehicle.cargo_manifest && activeVehicle.cargo_manifest.length > 0 ? (
            activeVehicle.cargo_manifest.slice(0, 4).map((c, idx) => (
              <div
                key={idx}
                className="p-2 rounded-xs bg-surface-subtle border border-border flex items-center justify-between"
              >
                <span className="text-text-secondary truncate mr-1">{c.item.split('(')[0]}:</span>
                <strong className="font-mono text-primary shrink-0">
                  {c.quantity} {c.unit}
                </strong>
              </div>
            ))
          ) : (
            <div className="col-span-2 text-text-secondary italic">Standard Relief Supplies Manifested</div>
          )}
        </div>
      </div>

      {/* 7. BOTTOM FIXED ACTION HUD (Thumb-Reachable 44x44px Targets) */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-border p-3 z-40 shadow-lg">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
          {/* Action 1: SOS Beacon Button */}
          <button
            onClick={() => setIsSOSConfirmOpen(true)}
            className="touch-target p-2 rounded-md bg-status-blocked-solid hover:bg-status-blocked-text text-white font-semibold text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs cursor-pointer"
          >
            <AlertOctagon className="w-5 h-5 text-white animate-pulse" />
            <span className="text-[11px]">{t('emergencySOS')}</span>
          </button>

          {/* Action 2: Field Officer Roadblock Clearance Report */}
          <button
            onClick={() => setClearanceModalOpen(true)}
            className="touch-target p-2 rounded-md bg-surface border border-border text-text-primary hover:bg-surface-subtle font-medium text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5 text-primary" />
            <span className="text-[11px] text-center leading-tight">{t('submitGroundReport')}</span>
          </button>

          {/* Action 3: Single-Tap MARK DELIVERED Handover */}
          <button
            onClick={() => {
              playAckChime();
              if (activeMission) {
                reportMissionDeliveryByField(activeMission.id);
              } else {
                markMissionDelivered(targetCommunity.id, activeVehicle.vehicle_id);
              }
            }}
            disabled={isDelivered || isPendingCloseout}
            className={`touch-target p-2 rounded-md font-semibold text-xs flex flex-col items-center justify-center space-y-1 btn-press shadow-xs cursor-pointer ${
              isDelivered
                ? 'bg-status-open-tint text-status-open-text border border-status-open-solid'
                : isPendingCloseout
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/50'
                : 'bg-status-open-solid hover:bg-status-open-text text-white animate-pulse'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[11px] text-center leading-tight">
              {isDelivered
                ? t('restockComplete')
                : isPendingCloseout
                ? 'Delivery Reported • Pending Admin'
                : t('confirmDelivery')}
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
                Transmits distress beacon with GPS coordinates to MDoNER State Command &amp; Regional QRT squads.
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

      {/* Unified Incident Report Modal with Mission Context */}
      <IncidentReportModal
        isOpen={clearanceModalOpen}
        onClose={() => setClearanceModalOpen(false)}
        defaultCorridor={defaultCorridorFlair}
        defaultLocationName={defaultLocationName}
        defaultCoords={activeVehicle.current_coords}
        defaultCorridorId={activeVehicle.assigned_route_id}
        defaultTitle={`Roadblock / Hazard on ${assignedRoute.name}`}
      />
    </div>
  );
};
