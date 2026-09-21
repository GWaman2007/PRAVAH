import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePravahStore } from '../../store/usePravahStore';
import { FLEET_ROUTES, HAZARD_ZONES } from '../../data/fleetData';
import { NER_NODES, VEHICLE_PROFILES, NER_SEGMENTS } from '../../data/routingNetwork';
import { NER_CHOKE_POINTS } from '../../data/nerGeoJSON';
import {
  fetchLiveChokePointWeather,
  generateSimulatedMonsoonTelemetry,
  type StationWeatherTelemetry,
} from '../../engine/openMeteoService';
import {
  createVehiclesGeoJSON,
  createVehicleSOSGeoJSON,
  createMissionRoutesGeoJSON,
  createSelectedMissionRouteGeoJSON,
  createRoadStatusGeoJSON,
  createDisastersGeoJSON,
  createCommunitiesGeoJSON,
  createCommunityBoundariesGeoJSON,
  createWarehousesGeoJSON,
  createRoadBreakdownsGeoJSON,
  createMissionEndpointsGeoJSON,
  createGroundIntelIncidentsGeoJSON,
  registerMapIcons,
} from '../../engine/mapGeoJSONAdapters';
import { SegmentModal } from './SegmentModal';
import { RoadIncidentModal } from './RoadIncidentModal';
import { VehicleInspector } from './VehicleInspector';
import { AlertFeedModal } from './AlertFeedModal';
import { SOSModal } from './SOSModal';
import { MapLegend } from './MapLegend';
import { MissionDetailsPanel } from './MissionDetailsPanel';
import { DisasterPolygonModal, type HazardZoneInfo } from './DisasterPolygonModal';
import { useTranslation } from '../../data/uiTranslations';
import { formatTimeAgo } from '../../engine/offlineSync';
import type { Segment, VehicleProfile, ReliefMission, Incident, SegmentIncident, CommunityWithCalculation } from '../../types';
import {
  CloudRain,
  Navigation,
  Truck,
  AlertTriangle,
  Play,
  Pause,
  AlertOctagon,
  Shield,
  Bell,
  Sliders,
  ExternalLink,
  Crosshair,
  Route,
  CheckCircle2,
  Send,
  Radio,
  Layers,
  Sparkles,
} from 'lucide-react';

export const TacticalMapDeck: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const isMapLoadedRef = useRef<boolean>(false);
  const animFrameIdRef = useRef<number | null>(null);
  const [webglError, setWebglError] = useState<string | null>(null);

  const {
    activeLayers,
    toggleLayer,
    rainfallMmHr,
    setRainfallMmHr,
    isMonsoonDownpourSimulated,
    toggleMonsoonDownpourSimulation,
    originHub,
    setOriginHub,
    destinationHub,
    setDestinationHub,
    selectedVehicle,
    setSelectedVehicle,
    candidateRoutes,
    selectedRouteIndex,
    setSelectedRouteIndex,
    activeDisruptions,
    setSegmentDisruption,
    clearAllDisruptions,
    triggerScenarioNH6Landslide,
    triggerScenarioNH29FlashFlood,
    triggerScenarioHaflongBridgeRisk,
    vehicles,
    selectedVehicleId,
    setSelectedVehicleId,
    alerts,
    acknowledgeAlert,
    isSimulationRunning,
    toggleSimulation,
    simulationSpeed,
    setSimulationSpeed,
    toggleVehicleHalt,
    toggleVehicleDeviation,
    triggerVehicleSOS,
    activeRole,
    activeMissions,
    selectedMissionId,
    setSelectedMissionId,
    approveMission,
    dispatchMission,
    reportMissionDeliveryByField,
    adminCloseoutMission,
    communities,
    selectedCommunityId,
    setSelectedCommunityId,
    incidents,
  } = usePravahStore();

  const { t } = useTranslation();

  // Fresh refs for MapLibre event listeners
  const activeMissionsRef = useRef(activeMissions);
  activeMissionsRef.current = activeMissions;
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;
  const activeDisruptionsRef = useRef(activeDisruptions);
  activeDisruptionsRef.current = activeDisruptions;
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;
  const communitiesRef = useRef(communities);
  communitiesRef.current = communities;
  const selectedCommunityIdRef = useRef(selectedCommunityId);
  selectedCommunityIdRef.current = selectedCommunityId;

  // Zoom map to community polygon or coordinates
  const zoomToCommunity = useCallback((communityId: string, mapInstance?: maplibregl.Map | null) => {
    const map = mapInstance || mapInstanceRef.current;
    if (!map) return;
    const comm = communitiesRef.current.find((c) => c.id === communityId);
    if (!comm) return;

    const bounds = new maplibregl.LngLatBounds();
    if (comm.boundary && comm.boundary.coordinates && comm.boundary.coordinates.length > 0) {
      comm.boundary.coordinates.forEach((ring: any) => {
        ring.forEach((pt: any) => {
          bounds.extend([pt[0], pt[1]]);
        });
      });
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 90, bottom: 90, left: 120, right: 120 },
        duration: 1200,
        maxZoom: 12.5,
      });
    } else if (comm.coordinates) {
      map.flyTo({
        center: [comm.coordinates[1], comm.coordinates[0]],
        zoom: 11.5,
        duration: 1200,
      });
    }
  }, []);

  // Active sidebar tab: 'MISSIONS' (Ongoing & Suggested) vs 'ROUTING' (K-Shortest & Constraints)
  const [sidebarTab, setSidebarTab] = useState<'MISSIONS' | 'ROUTING'>('MISSIONS');
  const [missionTab, setMissionTab] = useState<'ONGOING' | 'SUGGESTED'>('ONGOING');
  const [mobileViewTab, setMobileViewTab] = useState<'MAP' | 'CONTROLS'>('MAP');

  // Modals & Panels
  const [inspectedSegment, setInspectedSegment] = useState<Segment | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeSOSVehicleId, setActiveSOSVehicleId] = useState<string | null>(null);
  const [isMissionDetailsOpen, setIsMissionDetailsOpen] = useState<boolean>(true);

  // Tactical GIS Hover & Detailed Incident State
  const [hoveredVehicle, setHoveredVehicle] = useState<{
    x: number;
    y: number;
    vehicle_id: string;
    vehicle_name: string;
    vehicle_type?: string;
    startHub?: string;
    endHub?: string;
    destination_name?: string;
    mission_id?: string;
    status?: string;
  } | null>(null);

  const [hoveredBreakdown, setHoveredBreakdown] = useState<{
    x: number;
    y: number;
    segment_id: string;
    segment_name: string;
    highway?: string;
    status: string;
    cause: string;
    severity?: string;
    reportedBy?: string;
    lastUpdated?: string;
  } | null>(null);

  const [detailedIncident, setDetailedIncident] = useState<{
    segment: Segment;
    disruption: SegmentIncident;
    incident: Incident | null;
    affectedMissions: ReliefMission[];
  } | null>(null);

  // Disaster Polygon & Sector Inspection Modal State
  const [hoveredPolygon, setHoveredPolygon] = useState<{
    x: number;
    y: number;
    title: string;
    subtitle?: string;
    badge: string;
    badgeColor: string;
    items: { label: string; value: string | number; alert?: boolean }[];
    prompt: string;
  } | null>(null);
  const [inspectedCommunity, setInspectedCommunity] = useState<CommunityWithCalculation | null>(null);
  const [inspectedHazardZone, setInspectedHazardZone] = useState<HazardZoneInfo | null>(null);
  const [isDisasterModalOpen, setIsDisasterModalOpen] = useState<boolean>(false);

  // Custom specs state
  const [isCustomSpecsActive, setIsCustomSpecsActive] = useState<boolean>(false);
  const [customWeight, setCustomWeight] = useState<number>(32.0);
  const [customHeight, setCustomHeight] = useState<number>(4.2);
  const [customWidth, setCustomWidth] = useState<number>(2.9);

  // Weather telemetry state
  const [stationTelemetry, setStationTelemetry] = useState<StationWeatherTelemetry[]>([]);
  const [weatherSource, setWeatherSource] = useState<'LIVE' | 'SIMULATED'>('LIVE');

  // Computed: Ongoing vs Suggested Missions
  const ongoingMissions = useMemo(() => {
    return activeMissions.filter((m) => m.status === 'IN_TRANSIT' || m.status === 'PENDING_ADMIN_CLOSEOUT');
  }, [activeMissions]);

  const suggestedMissions = useMemo(() => {
    return activeMissions.filter((m) => m.status === 'SUGGESTED' || m.status === 'APPROVED');
  }, [activeMissions]);

  // Selected mission object
  const activeMission = useMemo(() => {
    if (!selectedMissionId) return null;
    return activeMissions.find((m) => m.id === selectedMissionId) || null;
  }, [activeMissions, selectedMissionId]);

  // Selected vehicle object
  const activeVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find((v) => v.vehicle_id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Selected community object
  const selectedCommunity = useMemo(() => {
    if (!selectedCommunityId) return null;
    return communities.find((c) => c.id === selectedCommunityId) || null;
  }, [communities, selectedCommunityId]);

  // Unacknowledged alerts count
  const unackAlertsCount = useMemo(() => {
    return alerts.filter((a) => !a.acknowledged).length;
  }, [alerts]);

  // 1. Fetch live Open-Meteo weather
  useEffect(() => {
    let isMounted = true;
    async function loadWeather() {
      if (isMonsoonDownpourSimulated) {
        const sim = generateSimulatedMonsoonTelemetry(NER_CHOKE_POINTS);
        if (isMounted) {
          setStationTelemetry(sim);
          setWeatherSource('SIMULATED');
        }
      } else {
        const res = await fetchLiveChokePointWeather(NER_CHOKE_POINTS);
        if (isMounted) {
          setStationTelemetry(res.telemetry);
          setWeatherSource(res.isSimulated ? 'SIMULATED' : 'LIVE');
        }
      }
    }
    loadWeather();
    return () => {
      isMounted = false;
    };
  }, [isMonsoonDownpourSimulated]);

  // Check if any vehicle has active SOS
  useEffect(() => {
    const sosVeh = vehicles.find((v) => v.is_sos_manual || v.status === 'SOS_ALERT');
    if (sosVeh && !activeSOSVehicleId) {
      setActiveSOSVehicleId(sosVeh.vehicle_id);
    }
  }, [vehicles]);

  // 2. Initialize MapLibre GL Map (Single Instance)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Explicitly configure web worker URL so bundlers and static hosts (Vercel) locate the worker module
    if (typeof window !== 'undefined') {
      try {
        maplibregl.setWorkerUrl('/assets/maplibre-gl-worker.mjs');
      } catch {
        // non-fatal
      }
    }

    let map: maplibregl.Map;
    try {
      // Centered on North East India: [92.9376, 26.2006] (lng, lat), zoom 7
      map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [92.9376, 26.2006],
        zoom: 7,
        minZoom: 5,
        maxZoom: 18,
        attributionControl: false,
      });
    } catch (err: any) {
      console.error('[PRAVAH] MapLibre WebGL Initialization error:', err);
      setWebglError(err?.message || 'WebGL2 is required to display this vector map.');
      return;
    }

    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: 'PRAVAH 2.0 • OpenFreeMap • OpenStreetMap',
      }),
      'bottom-right'
    );

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

    map.on('error', (e: any) => {
      console.warn('MapLibre operational event:', e);
    });

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
        console.warn('PRAVAH: Error loading custom SVG icons into MapLibre:', err);
      }

      // -------------------------------------------------------------
      // 1. DISASTERS & GEOLOGICAL HAZARDS (ISRO Bhuvan LHZ & High-Risk Sectors)
      // -------------------------------------------------------------
      map.addSource('disasters', {
        type: 'geojson',
        data: createDisastersGeoJSON(HAZARD_ZONES),
      });

      map.addLayer({
        id: 'disasters-fill',
        type: 'fill',
        source: 'disasters',
        layout: {
          visibility: activeLayers.lhz ? 'visible' : 'none',
        },
        paint: {
          'fill-color': ['get', 'fillColor'],
          'fill-opacity': 0.24,
        },
      });

      map.addLayer({
        id: 'disasters-line',
        type: 'line',
        source: 'disasters',
        layout: {
          visibility: activeLayers.lhz ? 'visible' : 'none',
        },
        paint: {
          'line-color': ['get', 'outlineColor'],
          'line-width': 2.0,
          'line-dasharray': [3, 2],
        },
      });

      map.addLayer({
        id: 'disasters-symbol',
        type: 'symbol',
        source: 'disasters',
        layout: {
          visibility: activeLayers.lhz ? 'visible' : 'none',
          'text-field': ['concat', '⚠️ ', ['get', 'name']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9.5,
          'text-offset': [0, 0],
          'text-anchor': 'center',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#FEF08A',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2.0,
        },
      });

      // -------------------------------------------------------------
      // 2. ROAD ACCESSIBILITY & STATUS (Lines)
      // -------------------------------------------------------------
      map.addSource('road-status', {
        type: 'geojson',
        data: createRoadStatusGeoJSON(NER_SEGMENTS, activeDisruptions),
      });

      map.addLayer({
        id: 'road-status-casing',
        type: 'line',
        source: 'road-status',
        layout: {
          visibility: 'none', // Strictly hidden by default to keep basemap clean
        },
        paint: {
          'line-color': '#0F172A',
          'line-width': ['+', ['get', 'width'], 2],
          'line-opacity': 0.6,
        },
      });

      map.addLayer({
        id: 'road-status-line',
        type: 'line',
        source: 'road-status',
        layout: {
          visibility: 'none', // Strictly hidden by default to keep basemap clean
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'width'],
          'line-opacity': 0.85,
        },
      });

      // -------------------------------------------------------------
      // 3. ALL MISSION ROUTES
      // -------------------------------------------------------------
      map.addSource('mission-routes', {
        type: 'geojson',
        data: createMissionRoutesGeoJSON(activeMissions, FLEET_ROUTES, selectedMissionId),
      });

      map.addLayer({
        id: 'mission-routes-glow',
        type: 'line',
        source: 'mission-routes',
        paint: {
          'line-color': ['get', 'glowColor'],
          'line-width': ['*', ['get', 'lineWeight'], 2.2],
          'line-opacity': ['*', ['get', 'opacity'], 0.4],
        },
      });

      map.addLayer({
        id: 'mission-routes-line',
        type: 'line',
        source: 'mission-routes',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'lineWeight'],
          'line-opacity': ['get', 'opacity'],
        },
      });

      // -------------------------------------------------------------
      // 4. SELECTED MISSION ROUTE (Dedicated strong emphasis)
      // -------------------------------------------------------------
      map.addSource('selected-mission-route', {
        type: 'geojson',
        data: createSelectedMissionRouteGeoJSON(activeMission, FLEET_ROUTES),
      });

      map.addLayer({
        id: 'selected-mission-casing',
        type: 'line',
        source: 'selected-mission-route',
        paint: {
          'line-color': '#0F172A',
          'line-width': 8,
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'selected-mission-line',
        type: 'line',
        source: 'selected-mission-route',
        paint: {
          'line-color': '#2563EB',
          'line-width': 5.2,
          'line-opacity': 1.0,
        },
      });

      // -------------------------------------------------------------
      // 4b. MISSION DESTINATION ENDPOINTS (Terminus of Active Routes)
      // -------------------------------------------------------------
      map.addSource('mission-endpoints', {
        type: 'geojson',
        data: createMissionEndpointsGeoJSON(activeMissions, selectedMissionId, FLEET_ROUTES),
      });

      // Sharp core dot at the exact road termination coordinates
      map.addLayer({
        id: 'mission-endpoints-core',
        type: 'circle',
        source: 'mission-endpoints',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            7.5,
            5,
          ],
          'circle-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            '#DC2626',
            '#EA580C',
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'mission-endpoints-symbol',
        type: 'symbol',
        source: 'mission-endpoints',
        layout: {
          'icon-image': 'icon-destination-endpoint',
          'icon-size': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            1.15,
            0.85,
          ],
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            ['concat', '🚩 TARGET: ', ['get', 'destination_name']],
            ['get', 'destination_name'],
          ],
          'text-font': ['Noto Sans Bold'],
          'text-size': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            12,
            10,
          ],
          'text-offset': [0, 0.8],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            '#FBBF24',
            '#FFFFFF',
          ],
          'text-halo-color': '#0F172A',
          'text-halo-width': 2.5,
        },
      });

      // -------------------------------------------------------------
      // 5. WAREHOUSES & LOGISTICS HUBS
      // -------------------------------------------------------------
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
          'icon-size': 0.8,
          'icon-allow-overlap': true,
          'text-field': ['get', 'name'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#E2E8F0',
          'text-halo-color': '#0F172A',
          'text-halo-width': 1.5,
        },
      });

      // -------------------------------------------------------------
      // 6. COMMUNITIES & PRIORITY TIERS (Database-Backed Real Polygon Boundaries)
      // -------------------------------------------------------------
      map.addSource('community-boundaries', {
        type: 'geojson',
        data: createCommunityBoundariesGeoJSON(communities, selectedCommunityId),
      });

      map.addLayer({
        id: 'community-boundaries-fill',
        type: 'fill',
        source: 'community-boundaries',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-opacity': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            0.42,
            0.22,
          ],
        },
      });

      map.addLayer({
        id: 'community-boundaries-line',
        type: 'line',
        source: 'community-boundaries',
        paint: {
          'line-color': ['get', 'color'],
          'line-width': [
            'case',
            ['boolean', ['get', 'isSelected'], false],
            3.0,
            1.8,
          ],
          'line-dasharray': [2, 1],
        },
      });

      map.addSource('communities', {
        type: 'geojson',
        data: createCommunitiesGeoJSON(communities, selectedCommunityId),
      });

      map.addLayer({
        id: 'communities-circle',
        type: 'circle',
        source: 'communities',
        paint: {
          'circle-radius': 7,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      map.addLayer({
        id: 'communities-label',
        type: 'symbol',
        source: 'communities',
        layout: {
          'text-field': ['concat', ['get', 'name'], ' (', ['get', 'priorityTier'], ')'],
          'text-font': ['Noto Sans Regular'],
          'text-size': 10,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-optional': true,
        },
        paint: {
          'text-color': '#FFFFFF',
          'text-halo-color': '#0F172A',
          'text-halo-width': 1.5,
        },
      });

      // -------------------------------------------------------------
      // 7. ROAD BREAKDOWNS (Data-driven pulsing point at real coordinate)
      // -------------------------------------------------------------
      map.addSource('road-breakdowns', {
        type: 'geojson',
        data: createRoadBreakdownsGeoJSON(activeDisruptions, NER_SEGMENTS, incidents, activeMissions),
      });

      map.addLayer({
        id: 'road-breakdowns-pulse',
        type: 'circle',
        source: 'road-breakdowns',
        layout: {
          visibility: activeLayers.roadStatus ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 12,
          'circle-color': '#DC2626',
          'circle-opacity': 0.32,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#EF4444',
        },
      });

      map.addLayer({
        id: 'road-breakdowns-point',
        type: 'circle',
        source: 'road-breakdowns',
        layout: {
          visibility: activeLayers.roadStatus ? 'visible' : 'none',
        },
        paint: {
          'circle-radius': 6.5,
          'circle-color': '#DC2626',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // -------------------------------------------------------------
      // 7b. GROUND INTEL REPORTED INCIDENTS (Live Blinking Warning Dots)
      // -------------------------------------------------------------
      map.addSource('ground-intel-incidents', {
        type: 'geojson',
        data: createGroundIntelIncidentsGeoJSON(incidents),
      });

      // Animated pulsing warning halo on exact reported incident coordinates
      map.addLayer({
        id: 'ground-intel-incidents-pulse',
        type: 'circle',
        source: 'ground-intel-incidents',
        paint: {
          'circle-radius': 14,
          'circle-color': ['get', 'color'],
          'circle-opacity': 0.38,
          'circle-stroke-width': 1.8,
          'circle-stroke-color': ['get', 'color'],
        },
      });

      // Solid central incident core dot
      map.addLayer({
        id: 'ground-intel-incidents-core',
        type: 'circle',
        source: 'ground-intel-incidents',
        paint: {
          'circle-radius': 6.5,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Incident title badge
      map.addLayer({
        id: 'ground-intel-incidents-symbol',
        type: 'symbol',
        source: 'ground-intel-incidents',
        layout: {
          'text-field': ['concat', '⚠️ ', ['get', 'incidentType'], ': ', ['get', 'placeName']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9.5,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-allow-overlap': false,
        },
        paint: {
          'text-color': '#FCA5A5',
          'text-halo-color': '#0F172A',
          'text-halo-width': 2.5,
        },
      });

      // -------------------------------------------------------------
      // 8. VEHICLE SOS ANIMATED PULSE RING
      // -------------------------------------------------------------
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

      // -------------------------------------------------------------
      // 9. VEHICLES (Individual Native Symbols with High-Visibility Selection)
      // -------------------------------------------------------------
      map.addSource('vehicles', {
        type: 'geojson',
        data: createVehiclesGeoJSON(vehicles, selectedVehicleId),
        cluster: false, // Ensure all operational vehicles are always visible individually
      });

      // Selected vehicle halo ring (rendered beneath vehicle icon)
      map.addLayer({
        id: 'vehicles-selected-ring',
        type: 'circle',
        source: 'vehicles',
        filter: ['==', ['get', 'isSelected'], true],
        paint: {
          'circle-radius': 24,
          'circle-color': 'rgba(56, 189, 248, 0.25)',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#38BDF8',
        },
      });

      // Vehicle Symbol layer (using registered SVG high-res canvas icons)
      map.addLayer({
        id: 'vehicles-unclustered',
        type: 'symbol',
        source: 'vehicles',
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 0.9,
          'icon-rotate': ['get', 'heading_deg'],
          'icon-rotation-alignment': 'map',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'text-field': ['get', 'vehicle_id'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9.5,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['case', ['get', 'isSelected'], '#FBBF24', '#FFFFFF'],
          'text-halo-color': '#0F172A',
          'text-halo-width': 2,
        },
      });

      // -------------------------------------------------------------
      // INTERACTION HANDLERS
      // -------------------------------------------------------------
      // Click vehicle marker
      map.on('click', 'vehicles-unclustered', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties?.vehicle_id) {
          setSelectedVehicleId(feat.properties.vehicle_id);
          setIsInspectorOpen(true);
        }
      });

      // Hover on vehicle marker
      map.on('mousemove', 'vehicles-unclustered', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties?.vehicle_id) {
          const vId = feat.properties.vehicle_id;
          const currentVehicles = vehiclesRef.current;
          const currentMissions = activeMissionsRef.current;
          const veh = currentVehicles.find((v) => v.vehicle_id === vId);
          const mission = currentMissions.find(
            (m) => m.id === feat.properties.mission_id || m.assignedVehicleId === vId
          );
          const route = FLEET_ROUTES[veh?.assigned_route_id || mission?.assignedRouteId || ''];

          setHoveredVehicle({
            x: e.point.x,
            y: e.point.y,
            vehicle_id: vId,
            vehicle_name: feat.properties.vehicle_name || vId,
            vehicle_type: mission?.recommendedVehicleType || veh?.cargo_type,
            startHub: route?.startHub || mission?.originWarehouseName,
            endHub: route?.endHub || mission?.destinationName,
            destination_name: veh?.destination_name || mission?.destinationName,
            mission_id: feat.properties.mission_id || mission?.id,
            status: feat.properties.status || veh?.status,
          });
        }
      });

      map.on('mouseleave', 'vehicles-unclustered', () => {
        setHoveredVehicle(null);
      });

      // Click road segment
      map.on('click', 'road-status-line', (e: any) => {
        const feat = e.features?.[0];
        if (feat?.properties?.segment_id) {
          const seg = NER_SEGMENTS.find((s) => s.id === feat.properties.segment_id);
          if (seg) setInspectedSegment(seg);
        }
      });

      // Hover on road breakdown marker
      map.on('mousemove', 'road-breakdowns-point', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          setHoveredBreakdown({
            x: e.point.x,
            y: e.point.y,
            segment_id: feat.properties.segment_id,
            segment_name: feat.properties.segment_name,
            highway: feat.properties.highway,
            status: feat.properties.status,
            cause: feat.properties.cause,
            severity: feat.properties.severity,
            reportedBy: feat.properties.reportedBy,
            lastUpdated: feat.properties.reportedTime ? formatTimeAgo(feat.properties.reportedTime) : undefined,
          });
        }
      });

      map.on('mouseleave', 'road-breakdowns-point', () => {
        setHoveredBreakdown(null);
      });

      // Click on road breakdown -> Detailed incident modal
      map.on('click', 'road-breakdowns-point', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties?.segment_id) {
          const segId = feat.properties.segment_id;
          const seg = NER_SEGMENTS.find((s) => s.id === segId);
          const currentDisruptions = activeDisruptionsRef.current;
          const currentIncidents = incidentsRef.current;
          const currentMissions = activeMissionsRef.current;

          const dis = currentDisruptions[segId];
          const inc = currentIncidents.find(
            (i) => i.location?.corridorId === segId || i.corridorFlair === seg?.highway || i.id === dis?.incidentId
          );

          if (seg && dis) {
            const affected = currentMissions.filter(
              (m) =>
                m.assignedRouteId?.includes(seg.highway) ||
                m.suggestedDetour?.includes(seg.highway) ||
                seg.name.toLowerCase().includes(m.destinationName.toLowerCase())
            );

            setDetailedIncident({
              segment: seg,
              disruption: dis,
              incident: inc || null,
              affectedMissions: affected,
            });
          }
        }
      });

      // Hover on ground intel incident marker
      map.on('mousemove', 'ground-intel-incidents-core', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          setHoveredBreakdown({
            x: e.point.x,
            y: e.point.y,
            segment_id: feat.properties.id,
            segment_name: `${feat.properties.placeName} (${feat.properties.state})`,
            highway: feat.properties.corridorFlair,
            status: feat.properties.severity,
            cause: feat.properties.incidentType,
            severity: feat.properties.severity,
            reportedBy: `${feat.properties.authorName} (${feat.properties.authorRole})`,
            lastUpdated: feat.properties.timestamp ? formatTimeAgo(feat.properties.timestamp) : undefined,
          });
        }
      });

      map.on('mouseleave', 'ground-intel-incidents-core', () => {
        setHoveredBreakdown(null);
      });

      // Click ground intel incident -> Detailed incident modal
      const handleGroundIntelClick = (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties?.id) {
          const incId = feat.properties.id;
          const currentIncidents = incidentsRef.current;
          const currentDisruptions = activeDisruptionsRef.current;
          const currentMissions = activeMissionsRef.current;

          const inc = currentIncidents.find((i) => i.id === incId);
          if (inc) {
            const seg =
              NER_SEGMENTS.find(
                (s) => s.id === inc.location?.corridorId || s.highway === inc.corridorFlair
              ) || NER_SEGMENTS[0];
            const dis = currentDisruptions[seg.id] || {
              id: `dis-${inc.id}`,
              segmentId: seg.id,
              highway: seg.highway,
              status: inc.severity === 'Total Blockage' ? 'TOTAL_BLOCKAGE' : 'SINGLE_LANE_PASSABLE',
              cause: inc.incidentType,
              severity: inc.severity,
              description: inc.title,
              reportedBy: `${inc.author.name} (${inc.author.role})`,
              reportedTime: inc.timestamp,
              estimatedClearanceHours: 4,
            };
            const affected = currentMissions.filter(
              (m) =>
                m.assignedRouteId?.includes(seg.highway) ||
                m.suggestedDetour?.includes(seg.highway) ||
                seg.name.toLowerCase().includes(m.destinationName.toLowerCase())
            );
            setDetailedIncident({
              segment: seg,
              disruption: dis,
              incident: inc,
              affectedMissions: affected,
            });
          }
        }
      };
      map.on('click', 'ground-intel-incidents-core', handleGroundIntelClick);
      map.on('click', 'ground-intel-incidents-symbol', handleGroundIntelClick);

      // Click mission endpoint
      const handleEndpointClick = (e: any) => {
        const feat = e.features?.[0];
        if (feat?.properties?.mission_id) {
          const target = activeMissions.find((m) => m.id === feat.properties.mission_id);
          if (target) handleFocusMission(target);
        }
      };
      map.on('click', 'mission-endpoints-symbol', handleEndpointClick);
      map.on('click', 'mission-endpoints-core', handleEndpointClick);

      // Click community (circle point or boundary polygon) -> Zoom & Open Sector Details Modal
      const handleCommunitySelect = (e: any) => {
        const feat = e.features?.[0];
        if (feat?.properties?.community_id) {
          const commId = feat.properties.community_id;
          setSelectedCommunityId(commId);
          zoomToCommunity(commId, map);

          const comm = communitiesRef.current.find((c) => c.id === commId);
          if (comm) {
            setInspectedCommunity(comm);
            setInspectedHazardZone(null);
            setIsDisasterModalOpen(true);
          }
        }
      };
      map.on('click', 'communities-circle', handleCommunitySelect);
      map.on('click', 'community-boundaries-fill', handleCommunitySelect);

      // Hover on community boundary polygon -> Show rich disaster sector briefing card
      map.on('mousemove', 'community-boundaries-fill', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          const p = feat.properties;
          const priority = p.priorityTier || 'P3';
          const badgeColor =
            priority === 'P1'
              ? 'bg-red-500/20 text-red-400 border-red-500/50'
              : priority === 'P2'
              ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/50';

          setHoveredPolygon({
            x: e.point.x,
            y: e.point.y,
            title: p.name,
            subtitle: `${p.district || ''}, ${p.state || ''}`,
            badge: `${priority} ${priority === 'P1' ? 'CRITICAL' : priority === 'P2' ? 'HIGH RISK' : 'MODERATE'}`,
            badgeColor,
            items: [
              { label: 'Cutoff Runway', value: `${p.cutoffHours || 4}h until isolation`, alert: (p.cutoffHours || 4) <= 4 },
              { label: 'Population', value: `${Number(p.population || 0).toLocaleString()} residents` },
              { label: 'Corridor', value: p.primaryCorridor || 'Lifeline Axis' },
              { label: 'Priority Score', value: `${p.finalScore || 85}/100` },
            ],
            prompt: t('clickToInspectPolygon'),
          });
        }
      });
      map.on('mouseleave', 'community-boundaries-fill', () => {
        setHoveredPolygon(null);
      });

      // Click on disaster hazard polygon -> Open Geological Hazard Intelligence Modal
      map.on('click', 'disasters-fill', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          setInspectedHazardZone(feat.properties as HazardZoneInfo);
          setInspectedCommunity(null);
          setIsDisasterModalOpen(true);
        }
      });

      // Hover on disaster hazard polygon -> Show geological hazard preview card
      map.on('mousemove', 'disasters-fill', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          const p = feat.properties;
          const sev = p.severity || 'Critical';
          const badgeColor =
            sev === 'Very High' || sev === 'Critical'
              ? 'bg-red-500/20 text-red-400 border-red-500/50'
              : 'bg-orange-500/20 text-orange-400 border-orange-500/50';

          setHoveredPolygon({
            x: e.point.x,
            y: e.point.y,
            title: p.name,
            subtitle: `${p.corridor || p.state || 'Hazard Sector'}`,
            badge: `${sev.toUpperCase()}${p.hazard_score ? ` (${p.hazard_score}/10)` : ''}`,
            badgeColor,
            items: [
              { label: 'Hazard Type', value: p.hazard_type || 'Landslide Hazard Zone' },
              { label: 'ISRO Code', value: p.bhuvan_code || 'ISRO-BHUVAN-LHZ' },
              { label: 'Slope', value: p.slope_gradient || '35° - 55°' },
              { label: 'Advisory', value: (p.advisory || '').slice(0, 48) + '...' },
            ],
            prompt: t('clickToInspectHazard'),
          });
        }
      });
      map.on('mouseleave', 'disasters-fill', () => {
        setHoveredPolygon(null);
      });

      // Cursor change on interactive layers
      const interactiveLayers = [
        'vehicles-cluster',
        'vehicles-unclustered',
        'road-status-line',
        'road-breakdowns-point',
        'road-breakdowns-pulse',
        'ground-intel-incidents-core',
        'ground-intel-incidents-pulse',
        'mission-endpoints-symbol',
        'mission-endpoints-core',
        'communities-circle',
        'community-boundaries-fill',
        'disasters-fill',
      ];
      interactiveLayers.forEach((layerId) => {
        map.on('mouseenter', layerId, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layerId, () => {
          map.getCanvas().style.cursor = '';
        });
      });

      // If a community was selected prior to map load, zoom into it immediately
      if (selectedCommunityIdRef.current) {
        zoomToCommunity(selectedCommunityIdRef.current, map);
      }
    });

    mapInstanceRef.current = map;

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      map.remove();
      mapInstanceRef.current = null;
      isMapLoadedRef.current = false;
    };
  }, [zoomToCommunity]);

  // Zoom to community whenever selectedCommunityId changes on an active map
  useEffect(() => {
    if (!isMapLoadedRef.current || !selectedCommunityId) return;
    zoomToCommunity(selectedCommunityId);
  }, [selectedCommunityId, zoomToCommunity]);

  // 3. Smooth Animated Pulses for SOS & Road Breakdowns
  useEffect(() => {
    let start = performance.now();

    const animatePulse = (time: number) => {
      const elapsed = (time - start) / 1000;
      const radiusOffset = (Math.sin(elapsed * 2.5) + 1) * 3; // 0 to 6 (subtle)
      const opacity = 0.38 - (Math.sin(elapsed * 2.5) + 1) * 0.12; // 0.14 to 0.38

      const map = mapInstanceRef.current;
      if (map && isMapLoadedRef.current) {
        if (map.getLayer('vehicle-sos-pulse')) {
          map.setPaintProperty('vehicle-sos-pulse', 'circle-radius', 18 + radiusOffset * 1.5);
          map.setPaintProperty('vehicle-sos-pulse', 'circle-opacity', Math.max(0.15, opacity));
        }
        if (map.getLayer('road-breakdowns-pulse')) {
          map.setPaintProperty('road-breakdowns-pulse', 'circle-radius', 11 + radiusOffset * 0.6);
          map.setPaintProperty('road-breakdowns-pulse', 'circle-opacity', Math.max(0.12, opacity));
        }
        if (map.getLayer('ground-intel-incidents-pulse')) {
          map.setPaintProperty('ground-intel-incidents-pulse', 'circle-radius', 13 + radiusOffset * 1.5);
          map.setPaintProperty('ground-intel-incidents-pulse', 'circle-opacity', Math.max(0.12, opacity));
        }
      }

      animFrameIdRef.current = requestAnimationFrame(animatePulse);
    };

    animFrameIdRef.current = requestAnimationFrame(animatePulse);
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, []);

  // 4. Update Sources when store data changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoadedRef.current) return;

    // Update vehicles & SOS
    const vehSource = map.getSource('vehicles') as maplibregl.GeoJSONSource;
    if (vehSource) {
      vehSource.setData(createVehiclesGeoJSON(vehicles, selectedVehicleId));
    }
    const sosSource = map.getSource('vehicle-sos') as maplibregl.GeoJSONSource;
    if (sosSource) {
      sosSource.setData(createVehicleSOSGeoJSON(vehicles));
    }

    // Update mission routes
    const routesSource = map.getSource('mission-routes') as maplibregl.GeoJSONSource;
    if (routesSource) {
      routesSource.setData(createMissionRoutesGeoJSON(activeMissions, FLEET_ROUTES, selectedMissionId));
    }
    const selRouteSource = map.getSource('selected-mission-route') as maplibregl.GeoJSONSource;
    if (selRouteSource) {
      selRouteSource.setData(createSelectedMissionRouteGeoJSON(activeMission, FLEET_ROUTES));
    }

    // Update mission endpoints
    const endpointsSource = map.getSource('mission-endpoints') as maplibregl.GeoJSONSource;
    if (endpointsSource) {
      endpointsSource.setData(createMissionEndpointsGeoJSON(activeMissions, selectedMissionId, FLEET_ROUTES));
    }

    // Update road status & breakdowns
    const roadSource = map.getSource('road-status') as maplibregl.GeoJSONSource;
    if (roadSource) {
      roadSource.setData(createRoadStatusGeoJSON(NER_SEGMENTS, activeDisruptions));
    }
    const breakdownSource = map.getSource('road-breakdowns') as maplibregl.GeoJSONSource;
    if (breakdownSource) {
      breakdownSource.setData(createRoadBreakdownsGeoJSON(activeDisruptions, NER_SEGMENTS, incidents, activeMissions));
    }
    const groundIntelSource = map.getSource('ground-intel-incidents') as maplibregl.GeoJSONSource;
    if (groundIntelSource) {
      groundIntelSource.setData(createGroundIntelIncidentsGeoJSON(incidents));
    }

    // Update disasters & hazard zones
    const disasterSource = map.getSource('disasters') as maplibregl.GeoJSONSource;
    if (disasterSource) {
      disasterSource.setData(createDisastersGeoJSON(HAZARD_ZONES));
    }

    // Update communities (database-backed boundary polygons and points)
    const commPolySource = map.getSource('community-boundaries') as maplibregl.GeoJSONSource;
    if (commPolySource) {
      commPolySource.setData(createCommunityBoundariesGeoJSON(communities, selectedCommunityId));
    }
    const commSource = map.getSource('communities') as maplibregl.GeoJSONSource;
    if (commSource) {
      commSource.setData(createCommunitiesGeoJSON(communities, selectedCommunityId));
    }
  }, [
    vehicles,
    selectedVehicleId,
    activeMissions,
    selectedMissionId,
    activeMission,
    activeDisruptions,
    communities,
    selectedCommunityId,
    incidents,
  ]);

  // 5. Update Layer Visibility from activeLayers filters
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapLoadedRef.current) return;

    const setVisibility = (layerId: string, visible: boolean) => {
      if (map.getLayer(layerId)) {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      }
    };

    // COMMUNITIES & HAZARDS: Boundary Polygons & Markers
    setVisibility('community-boundaries-fill', activeLayers.lhz);
    setVisibility('community-boundaries-line', activeLayers.lhz);
    setVisibility('communities-circle', activeLayers.lhz);
    setVisibility('communities-label', activeLayers.lhz);
    setVisibility('disasters-fill', activeLayers.lhz);
    setVisibility('disasters-line', activeLayers.lhz);
    setVisibility('disasters-symbol', activeLayers.lhz);

    // ROAD STATUS: Controls status lines and data-driven incident markers
    setVisibility('road-status-casing', activeLayers.roadStatus);
    setVisibility('road-status-line', activeLayers.roadStatus);
    setVisibility('road-breakdowns-pulse', activeLayers.roadStatus);
    setVisibility('road-breakdowns-point', activeLayers.roadStatus);

    // GROUND INTEL FEED INCIDENTS: Always visible live incident locations with pulsing warning dots
    setVisibility('ground-intel-incidents-pulse', true);
    setVisibility('ground-intel-incidents-core', true);
    setVisibility('ground-intel-incidents-symbol', true);

    // MISSION ROUTES & ENDPOINTS: Active routes and mission destination targets (solid markers only)
    setVisibility('mission-routes-glow', activeLayers.routes);
    setVisibility('mission-routes-line', activeLayers.routes);
    setVisibility('selected-mission-casing', activeLayers.routes);
    setVisibility('selected-mission-line', activeLayers.routes);
    setVisibility('mission-endpoints-core', activeLayers.routes);
    setVisibility('mission-endpoints-symbol', activeLayers.routes);

    // FLEET: Vehicles and SOS alerts
    setVisibility('vehicles-selected-ring', activeLayers.fleet);
    setVisibility('vehicles-unclustered', activeLayers.fleet);
    setVisibility('vehicle-sos-pulse', activeLayers.fleet);
  }, [activeLayers]);

  // 6. Responsive ResizeObserver for Map Container
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.resize();
      }
    });

    ro.observe(mapContainerRef.current);
    return () => ro.disconnect();
  }, []);

  // 7. Focus Map on Selected Mission using actual road coordinates
  const handleFocusMission = useCallback((mission: ReliefMission) => {
    setSelectedMissionId(mission.id);
    if (mission.assignedVehicleId) {
      setSelectedVehicleId(mission.assignedVehicleId);
    }
    setIsMissionDetailsOpen(true);

    const map = mapInstanceRef.current;
    if (!map) return;

    const rawCoords =
      mission.routeGeometry && mission.routeGeometry.length >= 2
        ? mission.routeGeometry
        : FLEET_ROUTES[mission.assignedRouteId]?.coordinates;

    const bounds = new maplibregl.LngLatBounds();

    if (rawCoords && rawCoords.length > 0) {
      rawCoords.forEach((coord) => {
        bounds.extend([coord[1], coord[0]]);
      });
    }

    const endpointCoord =
      rawCoords && rawCoords.length > 0
        ? rawCoords[rawCoords.length - 1]
        : mission.destinationEndpoint;

    if (endpointCoord) {
      bounds.extend([endpointCoord[1], endpointCoord[0]]);
    }

    if (mission.originCoords) {
      bounds.extend([mission.originCoords[1], mission.originCoords[0]]);
    }

    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 80, bottom: 80, left: 100, right: 100 },
        duration: 1200,
        maxZoom: 13,
      });
    }
  }, [setSelectedMissionId, setSelectedVehicleId]);

  // Clear mission and community focus
  const handleClearFocus = useCallback(() => {
    setSelectedMissionId(null);
    setSelectedCommunityId(null);
    const map = mapInstanceRef.current;
    if (map) {
      map.easeTo({
        center: [92.9376, 26.2006],
        zoom: 7,
        duration: 1000,
      });
    }
  }, [setSelectedMissionId, setSelectedCommunityId]);

  const selectedRoute = candidateRoutes[selectedRouteIndex] || candidateRoutes[0];

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-page-bg relative">
      {/* Mobile Switcher Tab Bar (< lg) */}
      <div className="lg:hidden flex items-center bg-surface border-b border-border p-1.5 shrink-0 z-20">
        <button
          onClick={() => {
            setMobileViewTab('MAP');
            setTimeout(() => mapInstanceRef.current?.resize(), 100);
          }}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileViewTab === 'MAP'
              ? 'bg-[#1B4B73] text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>{t('tacticalGisMap')}</span>
        </button>
        <button
          onClick={() => setMobileViewTab('CONTROLS')}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileViewTab === 'CONTROLS'
              ? 'bg-[#1B4B73] text-white shadow-xs'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t('missionOperations')}</span>
          {suggestedMissions.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-xs bg-status-blocked-solid text-white text-[9px] font-mono font-bold">
              {suggestedMissions.length}
            </span>
          )}
        </button>
      </div>

      {/* Segment Inspection Modal */}
      <SegmentModal
        segment={inspectedSegment}
        vehicle={selectedVehicle}
        rainfallMmHr={rainfallMmHr}
        currentDisruption={inspectedSegment ? activeDisruptions[inspectedSegment.id] : undefined}
        onClose={() => setInspectedSegment(null)}
        onApplyDisruption={(segId, dis) => setSegmentDisruption(segId, dis)}
      />

      {/* Detailed Road Incident / Disruption Modal */}
      {detailedIncident && (
        <RoadIncidentModal
          isOpen={Boolean(detailedIncident)}
          onClose={() => setDetailedIncident(null)}
          segment={detailedIncident.segment}
          disruption={detailedIncident.disruption}
          incident={detailedIncident.incident}
          affectedMissions={detailedIncident.affectedMissions}
          onOpenSegmentEngineering={(seg) => {
            setDetailedIncident(null);
            setInspectedSegment(seg);
          }}
        />
      )}

      {/* SOS Distress Modal */}
      <SOSModal
        vehicle={vehicles.find((v) => v.vehicle_id === activeSOSVehicleId) || null}
        onClose={() => setActiveSOSVehicleId(null)}
        onStandDown={(id) => {
          toggleVehicleHalt(id);
          setActiveSOSVehicleId(null);
        }}
      />

      {/* Alert Feed Modal */}
      <AlertFeedModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        alerts={alerts}
        onAcknowledge={(id) => acknowledgeAlert(id)}
        onSelectVehicle={(id) => {
          setSelectedVehicleId(id);
          setIsInspectorOpen(true);
        }}
      />

      {/* ========================================================================= */}
      {/* LEFT SIDEBAR: MISSION OPERATIONS & PREDICTIVE ROUTING                     */}
      {/* ========================================================================= */}
      <aside aria-label="Tactical Mission Control Sidebar" className={`w-full lg:w-96 bg-surface border-r border-border flex flex-col h-full overflow-hidden z-10 shadow-xs pb-16 lg:pb-0 shrink-0 ${mobileViewTab === 'CONTROLS' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Navigation Tabs Header: Mission Operations vs K-Shortest Routing */}
        <div className="flex border-b border-border bg-surface-subtle p-1 shrink-0">
          <button
            onClick={() => setSidebarTab('MISSIONS')}
            className={`flex-1 py-2 px-2.5 rounded-xs text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              sidebarTab === 'MISSIONS'
                ? 'bg-surface text-primary shadow-xs border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>{t('missionOperations')}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-xs bg-primary/10 text-primary">
              {activeMissions.length}
            </span>
          </button>
          <button
            onClick={() => setSidebarTab('ROUTING')}
            className={`flex-1 py-2 px-2.5 rounded-xs text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              sidebarTab === 'ROUTING'
                ? 'bg-surface text-primary shadow-xs border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 text-sky-500" />
            <span>{t('kShortestPaths')}</span>
          </button>
        </div>

        {/* TAB 1: MISSION OPERATIONS (Two-Tab UX: ONGOING MISSIONS vs SUGGESTED MISSIONS) */}
        {sidebarTab === 'MISSIONS' && (
          <div className="flex-1 flex flex-col overflow-hidden text-xs">
            {/* Tab Toggle: [ ONGOING MISSIONS ] [ SUGGESTED MISSIONS ] */}
            <div className="p-2 border-b border-border bg-surface-subtle shrink-0">
              <div className="flex bg-surface p-0.5 rounded-sm border border-border">
                <button
                  onClick={() => setMissionTab('ONGOING')}
                  className={`flex-1 py-1.5 px-2 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    missionTab === 'ONGOING'
                      ? 'bg-[#1B4B73] text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-status-open-solid animate-ping" />
                  <span>{t('ongoing')}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-xs font-mono text-[9px] ${
                      missionTab === 'ONGOING' ? 'bg-white/20 text-white' : 'bg-surface-subtle text-text-secondary'
                    }`}
                  >
                    {ongoingMissions.length}
                  </span>
                </button>

                <button
                  onClick={() => setMissionTab('SUGGESTED')}
                  className={`flex-1 py-1.5 px-2 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    missionTab === 'SUGGESTED'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>{t('suggested')}</span>
                  {suggestedMissions.length > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-xs font-mono text-[9px] font-bold ${
                        missionTab === 'SUGGESTED' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {suggestedMissions.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Content for ONGOING MISSIONS */}
            {missionTab === 'ONGOING' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                {ongoingMissions.length === 0 ? (
                  <div className="p-4 text-center bg-surface-subtle rounded-sm text-text-secondary text-[11px] space-y-1">
                    <p className="font-semibold">{t('noOngoingMissions')}</p>
                    <p className="text-[10px]">{t('switchToSuggested')}</p>
                  </div>
                ) : (
                  ongoingMissions.map((m) => {
                    const isSelected = m.id === selectedMissionId;
                    const veh = vehicles.find(
                      (v) => v.mission_id === m.id || v.vehicle_id === m.assignedVehicleId
                    );

                    return (
                      <div
                        key={m.id}
                        onClick={() => handleFocusMission(m)}
                        className={`p-3 rounded-sm border transition-all cursor-pointer space-y-2 text-xs shadow-xs ${
                          isSelected
                            ? 'bg-primary-tint/30 border-primary ring-1 ring-primary'
                            : 'bg-surface border-border hover:bg-surface-subtle'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-primary-tint text-primary">
                                {m.id}
                              </span>
                              <span className="font-bold text-text-primary">{m.destinationName}</span>
                            </div>
                            <span className="text-[10px] text-text-secondary block mt-0.5">
                              {t('origin')}: <strong>{m.originWarehouseName}</strong> ➔ {t('target')}:{' '}
                              <strong>{m.disasterZoneName}</strong>
                            </span>
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] border shrink-0 ${
                              m.status === 'PENDING_ADMIN_CLOSEOUT'
                                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 animate-pulse'
                                : 'bg-status-open-tint text-status-open-text border-status-open-solid/40'
                            }`}
                          >
                            {m.status === 'PENDING_ADMIN_CLOSEOUT'
                              ? 'AWAITING SIGN-OFF'
                              : veh?.speed_kmh
                              ? `${veh.speed_kmh} km/h`
                              : 'IN_TRANSIT'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5 text-[10px] text-text-secondary bg-surface-subtle p-1.5 rounded-xs">
                          <div>
                            <span>{t('rig')}:</span>{' '}
                            <strong className="text-text-primary font-mono">
                              {veh?.vehicle_id || m.assignedVehicleId || 'Convoy Unit'}
                            </strong>
                          </div>
                          <div>
                            <span>{t('progress')}:</span>{' '}
                            <strong className="text-status-open-text font-mono">
                              {m.status === 'PENDING_ADMIN_CLOSEOUT' ? '100' : (veh?.route_progress_pct ?? 45)}%
                            </strong>
                          </div>
                          <div>
                            <span>{t('dist')}:</span>{' '}
                            <strong className="text-text-primary font-mono">{m.routeDistanceKm || 60} km</strong>
                          </div>
                          <div>
                            <span>{t('eta')}:</span>{' '}
                            <strong className="text-text-primary font-mono">
                              {m.status === 'PENDING_ADMIN_CLOSEOUT' ? 'Arrived' : `${m.routeDurationMinutes || 90} min`}
                            </strong>
                          </div>
                        </div>

                        {/* Action buttons for Ongoing / Closeout */}
                        {m.status === 'PENDING_ADMIN_CLOSEOUT' ? (
                          <div className="pt-1 border-t border-border/40 space-y-1">
                            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              Delivery reported by crew • Awaiting Admin Sign-Off
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                adminCloseoutMission(m.id);
                              }}
                              className="w-full py-1 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xs text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Sign Off &amp; Remove from Ongoing</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px]">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                reportMissionDeliveryByField(m.id);
                              }}
                              className="px-2 py-0.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-xs font-semibold text-[10px] flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Report Finished</span>
                            </button>
                            <span className="text-primary font-bold">{t('focusRoute')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Content for SUGGESTED MISSIONS */}
            {missionTab === 'SUGGESTED' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                {suggestedMissions.length === 0 ? (
                  <div className="p-4 text-center bg-surface-subtle rounded-sm text-text-secondary text-[11px]">
                    {t('allMissionsDispatched')}
                  </div>
                ) : (
                  suggestedMissions.map((m) => {
                    const isSelected = m.id === selectedMissionId;
                    const isApproved = m.status === 'APPROVED';

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          handleFocusMission(m);
                          setIsMissionDetailsOpen(true);
                        }}
                        className={`p-3 rounded-sm border transition-all space-y-2.5 text-xs shadow-xs cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500'
                            : 'bg-surface border-border hover:border-amber-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-amber-500/15 text-amber-500">
                                {m.id}
                              </span>
                              <span className="font-bold text-text-primary">{m.destinationName}</span>
                            </div>
                            <span className="text-[10px] text-text-secondary block mt-0.5">
                              {t('origin')}: <strong>{m.originWarehouseName}</strong> ➔ {t('target')}:{' '}
                              <strong>{m.disasterZoneName}</strong>
                            </span>
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] border shrink-0 ${
                              isApproved
                                ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                            }`}
                          >
                            {m.status}
                          </span>
                        </div>

                        <div className="p-1.5 rounded-xs bg-surface-subtle text-[10px] space-y-1">
                          <div className="text-text-secondary">
                            <span>{t('allocatedRig')}:</span>{' '}
                            <strong className="text-text-primary">{m.recommendedVehicleType}</strong>
                          </div>
                          <div className="text-text-secondary">
                            <span>{t('corridor')}:</span>{' '}
                            <strong className="text-status-open-text">{m.suggestedDetour}</strong>
                          </div>
                          <div className="text-text-secondary flex justify-between">
                            <span>{t('distance')}: <strong>{m.routeDistanceKm || 65} km</strong></span>
                            <span>{t('eta')}: <strong>{m.routeDurationMinutes || 100} min</strong></span>
                          </div>
                        </div>

                        {/* Prominent Direct REVIEW & APPROVE Button */}
                        <div className="pt-1 border-t border-border/40 flex items-center gap-2">
                          <button
                            onClick={() => {
                              handleFocusMission(m);
                              setIsMissionDetailsOpen(true);
                            }}
                            className="w-full py-1.5 px-2.5 rounded-xs bg-[#1B4B73] hover:bg-[#123A5A] text-white font-bold text-xs flex items-center justify-center gap-1.5 btn-press cursor-pointer shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-sky-300" />
                            <span>{t('review')}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PREDICTIVE ROUTING & CONSTRAINTS */}
        {sidebarTab === 'ROUTING' && (
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 text-xs">
            {/* Origin & Destination */}
            <div className="space-y-2 bg-surface-subtle p-3 rounded-sm border border-border">
              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  {t('originLogisticsHub')}
                </label>
                <select
                  value={originHub}
                  onChange={(e) => setOriginHub(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-surface border border-border rounded-sm text-text-primary"
                >
                  {Object.values(NER_NODES).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-text-secondary uppercase">
                  {t('destinationCommunity')}
                </label>
                <select
                  value={destinationHub}
                  onChange={(e) => setDestinationHub(e.target.value)}
                  className="w-full mt-1 px-2 py-1.5 text-xs bg-surface border border-border rounded-sm text-text-primary"
                >
                  {Object.values(NER_NODES).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Profile Selector */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-text-secondary uppercase">
                    {t('vehicleConstraintProfile')}
                  </label>
                  <button
                    onClick={() => setIsCustomSpecsActive(!isCustomSpecsActive)}
                    className="text-[10px] text-primary hover:underline cursor-pointer"
                  >
                    {isCustomSpecsActive ? t('presets') : t('customSpecs')}
                  </button>
                </div>

                {!isCustomSpecsActive ? (
                  <select
                    value={selectedVehicle.id}
                    onChange={(e) => {
                      const v = VEHICLE_PROFILES.find((p) => p.id === e.target.value);
                      if (v) setSelectedVehicle(v);
                    }}
                    className="w-full mt-1 px-2 py-1.5 text-xs bg-surface border border-border rounded-sm text-text-primary"
                  >
                    {VEHICLE_PROFILES.map((vp) => (
                      <option key={vp.id} value={vp.id}>
                        {vp.name} ({vp.weight_tonnes}T, {vp.height_m}m H)
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="mt-2 p-2 bg-surface rounded-xs border border-border space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span>{t('grossWeight')}:</span>
                      <span className="font-mono font-bold">{customWeight}T</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={50}
                      value={customWeight}
                      onChange={(e) => setCustomWeight(Number(e.target.value))}
                      className="w-full h-1.5 accent-primary"
                    />
                    <button
                      onClick={() => {
                        setSelectedVehicle({
                          id: 'CUSTOM_AXLE',
                          name: `Custom Rig (${customWeight}T)`,
                          type: 'Custom User Specification',
                          height_m: customHeight,
                          width_m: customWidth,
                          weight_tonnes: customWeight,
                          turn_radius_m: 14.0,
                          fuel_efficiency_km_l: 3.0,
                          max_speed_kmh: 60,
                          icon: 'truck',
                        });
                      }}
                      className="w-full py-1 text-[10px] font-semibold bg-[#1B4B73] text-white rounded-xs"
                    >
                      {t('applyCustomLoad')}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Live Rainfall Slider */}
            <div className="p-3 bg-surface rounded-sm border border-border space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                  <CloudRain className="w-3.5 h-3.5 text-sky-500" />
                  <span>{t('rainfallDegradation')}</span>
                </span>
                <span className="font-mono text-xs font-bold bg-surface-subtle px-1.5 py-0.5 rounded border border-border">
                  {rainfallMmHr} mm/h
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={60}
                value={rainfallMmHr}
                onChange={(e) => setRainfallMmHr(Number(e.target.value))}
                className="w-full accent-sky-500 h-1.5 cursor-pointer"
              />
              <div className="grid grid-cols-3 gap-1 pt-1">
                <button
                  onClick={() => setRainfallMmHr(0)}
                  className="py-0.5 text-[9px] rounded-xs bg-surface-subtle hover:bg-border/60 border border-border text-text-secondary"
                >
                  {t('clearRain')}
                </button>
                <button
                  onClick={() => setRainfallMmHr(24)}
                  className="py-0.5 text-[9px] rounded-xs bg-surface-subtle hover:bg-border/60 border border-border text-text-secondary"
                >
                  {t('rainLight')}
                </button>
                <button
                  onClick={() => setRainfallMmHr(48)}
                  className="py-0.5 text-[9px] rounded-xs bg-surface-subtle hover:bg-border/60 border border-border text-status-blocked-text"
                >
                  {t('rainSurge')}
                </button>
              </div>
            </div>

            {/* Field Disruption Injectors */}
            <div className="p-3 bg-surface rounded-sm border border-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-text-primary flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-status-blocked-solid" />
                  <span>{t('disruptionScenarios')}</span>
                </span>
                {Object.keys(activeDisruptions).length > 0 && (
                  <button
                    onClick={clearAllDisruptions}
                    className="text-[10px] text-status-blocked-text hover:underline cursor-pointer"
                  >
                    {t('clearAll')}
                  </button>
                )}
              </div>

              <div className="space-y-1.5">
                <button
                  onClick={triggerScenarioNH6Landslide}
                  className="w-full p-2 rounded-xs border border-status-blocked-solid/30 bg-status-blocked-tint/30 hover:bg-status-blocked-tint/60 text-left cursor-pointer transition"
                >
                  <span className="font-semibold block text-[11px] text-status-blocked-text">
                    {t('nh6LandslideTitle')}
                  </span>
                  <span className="text-[10px] text-text-secondary block">{t('nh6LandslideDesc')}</span>
                </button>

                <button
                  onClick={triggerScenarioNH29FlashFlood}
                  className="w-full p-2 rounded-xs border border-status-blocked-solid/30 bg-status-blocked-tint/30 hover:bg-status-blocked-tint/60 text-left cursor-pointer transition"
                >
                  <span className="font-semibold block text-[11px] text-status-blocked-text">
                    {t('nh29MudflowTitle')}
                  </span>
                  <span className="text-[10px] text-text-secondary block">{t('nh29MudflowDesc')}</span>
                </button>

                <button
                  onClick={triggerScenarioHaflongBridgeRisk}
                  className="w-full p-2 rounded-xs border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left cursor-pointer transition"
                >
                  <span className="font-semibold block text-[11px] text-amber-500">
                    {t('haflongBridgeTitle')}
                  </span>
                  <span className="text-[10px] text-text-secondary block">{t('haflongBridgeDesc')}</span>
                </button>
              </div>
            </div>

            {/* Evaluated Paths List */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-text-primary block">
                {t('evaluatedPaths')} ({candidateRoutes.length})
              </span>
              {candidateRoutes.map((route, idx) => {
                const isSelected = idx === selectedRouteIndex;
                return (
                  <div
                    key={route.id}
                    onClick={() => setSelectedRouteIndex(idx)}
                    className={`p-2.5 rounded-sm border cursor-pointer transition text-xs ${
                      isSelected
                        ? 'border-primary bg-primary-tint/30'
                        : 'border-border bg-surface hover:bg-surface-subtle'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: route.color }} />
                        <strong className="text-text-primary">{t('rank')} {route.rank}: {route.rankLabel}</strong>
                      </div>
                      <span className={`font-mono font-bold ${route.isPassable ? 'text-status-open-text' : 'text-status-blocked-text'}`}>
                        {route.isPassable ? `${route.compositeSafetyScore}% Safe` : 'BLOCKED'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-text-secondary mt-1">
                      <span>Dist: <strong>{route.totalDistanceKm} km</strong></span>
                      <span>ETA: <strong>{route.degradedDurationMinutes} min</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Telemetry Scrubber Bar (Bottom of Left Sidebar) */}
        <div className="p-3 bg-surface-subtle border-t border-border shrink-0 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-text-primary flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span>{t('fleetTelemetrySim')}</span>
            </span>

            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="relative p-1 rounded-xs border border-border bg-surface text-text-secondary hover:text-text-primary cursor-pointer"
              title="Alert Feed"
            >
              <Bell className="w-3.5 h-3.5" />
              {unackAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-status-blocked-solid text-[9px] font-bold text-white">
                  {unackAlertsCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSimulation}
              className="flex-1 py-1 px-2 text-xs font-semibold rounded-xs border border-border bg-surface text-text-primary hover:bg-surface-subtle flex items-center justify-center gap-1 cursor-pointer btn-press"
            >
              {isSimulationRunning ? (
                <>
                  <Pause className="w-3 h-3 text-amber-500" />
                  <span>{t('pause')}</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-status-open-solid" />
                  <span>{t('resume')}</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-1 bg-surface p-0.5 rounded-xs border border-border text-xs">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`px-1.5 py-0.5 font-mono text-[10px] font-bold rounded-xs cursor-pointer ${
                    simulationSpeed === spd ? 'bg-primary text-white' : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* CENTER: MAPLIBRE GL JS TACTICAL MAP CONTAINER                            */}
      {/* ========================================================================= */}
      <div className={`flex-1 relative flex flex-col h-full overflow-hidden isolate ${mobileViewTab === 'MAP' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Top Floating Controls Bar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          {/* Active Mission or Community Focus Pill */}
          {activeMission ? (
            <div className="pointer-events-auto bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-sm border border-primary shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span className="font-mono text-[10px] font-bold text-primary">
                FOCUS: {activeMission.id}
              </span>
              <span className="text-xs font-bold text-text-primary">
                {activeMission.communityName}
              </span>
              <button
                onClick={handleClearFocus}
                className="ml-2 px-1.5 py-0.5 bg-surface hover:bg-surface-subtle text-[10px] font-semibold text-text-secondary hover:text-text-primary rounded-xs border border-border cursor-pointer"
                title="Reset focus"
              >
                {t('clearFocus')}
              </button>
            </div>
          ) : selectedCommunity ? (
            <div className="pointer-events-auto bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md px-3 py-1.5 rounded-sm border border-primary shadow-md flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className={`px-1.5 py-0.5 rounded-xs font-bold text-[10px] ${
                selectedCommunity.metrics?.priorityTier === 'P1'
                  ? 'bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/40'
                  : selectedCommunity.metrics?.priorityTier === 'P2'
                  ? 'bg-status-highrisk-tint text-status-highrisk-text border border-status-highrisk-solid/40'
                  : 'bg-status-restricted-tint text-status-restricted-text border border-status-restricted-solid/40'
              }`}>
                {selectedCommunity.metrics?.priorityTier || 'P3'}
              </span>
              <span className="text-xs font-bold text-text-primary">
                {selectedCommunity.name}
              </span>
              <span className="text-[11px] text-text-secondary hidden sm:inline">
                ({selectedCommunity.district})
              </span>
              <button
                onClick={handleClearFocus}
                className="ml-2 px-1.5 py-0.5 bg-surface hover:bg-surface-subtle text-[10px] font-semibold text-text-secondary hover:text-text-primary rounded-xs border border-border cursor-pointer"
                title="Reset map view to whole Northeast region"
              >
                {t('resetMapView')}
              </button>
            </div>
          ) : (
            <div className="pointer-events-auto bg-surface/90 dark:bg-slate-900/90 backdrop-blur-md px-2.5 py-1.5 rounded-sm border border-border shadow-xs text-xs font-semibold text-text-primary flex items-center gap-2">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>PRAVAH 2.0 {t('tacticalGisMap')}</span>
            </div>
          )}

          {/* Layer Visibility Filters */}
          <div className="pointer-events-auto bg-surface/95 dark:bg-slate-900/95 backdrop-blur-md p-1 rounded-sm border border-border shadow-md flex items-center gap-1 text-[11px]">
            <button
              onClick={() => toggleLayer('lhz')}
              className={`px-2 py-1 rounded-xs border font-medium cursor-pointer transition ${
                activeLayers.lhz
                  ? 'bg-primary-tint text-primary border-primary/60'
                  : 'bg-surface text-text-secondary border-border'
              }`}
              title="Toggle Community Sector Boundary Polygons"
            >
              {t('layerCommunities')}
            </button>
            <button
              onClick={() => toggleLayer('roadStatus')}
              className={`px-2 py-1 rounded-xs border font-medium cursor-pointer transition ${
                activeLayers.roadStatus
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/60'
                  : 'bg-surface text-text-secondary border-border'
              }`}
              title="Toggle road network status condition overlay (Open/Degraded/Blocked)"
            >
              {t('layerRoadStatus')}
            </button>
            <button
              onClick={() => toggleLayer('routes')}
              className={`px-2 py-1 rounded-xs border font-medium cursor-pointer transition ${
                activeLayers.routes
                  ? 'bg-primary-tint text-primary border-primary/60'
                  : 'bg-surface text-text-secondary border-border'
              }`}
            >
              {t('layerRoutes')}
            </button>
            <button
              onClick={() => toggleLayer('fleet')}
              className={`px-2 py-1 rounded-xs border font-medium cursor-pointer transition ${
                activeLayers.fleet
                  ? 'bg-status-open-tint text-status-open-text border-status-open-solid/60'
                  : 'bg-surface text-text-secondary border-border'
              }`}
            >
              {t('layerFleet')}
            </button>
            <button
              onClick={toggleMonsoonDownpourSimulation}
              className={`px-2 py-1 rounded-xs border font-medium flex items-center gap-1 cursor-pointer transition ${
                isMonsoonDownpourSimulated
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/60 animate-pulse'
                  : 'bg-surface text-text-secondary border-border'
              }`}
            >
              <CloudRain className="w-3 h-3 text-sky-400" />
              <span>{isMonsoonDownpourSimulated ? t('layerMonsoonSurge') : t('layerMonsoonSim')}</span>
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full relative z-0 isolate">
          {webglError && (
            <div className="absolute inset-0 z-30 flex items-center justify-center p-6 bg-surface/90 backdrop-blur-md">
              <div className="max-w-md p-5 rounded-md border border-amber-500/40 bg-surface shadow-xl text-center space-y-3">
                <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
                <h3 className="text-sm font-bold text-text-primary">Hardware Acceleration Required</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {webglError}
                </p>
                <p className="text-[11px] text-text-secondary opacity-80">
                  Please ensure WebGL / Graphics Acceleration is enabled in your browser settings (e.g. Chrome Settings &gt; System &gt; Use graphics acceleration when available) or try refreshing.
                </p>
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-primary text-white text-xs font-semibold rounded-xs shadow-xs hover:bg-primary-hover cursor-pointer"
                >
                  Reload GIS Deck
                </button>
              </div>
            </div>
          )}

          {/* Vehicle Hover Preview Card */}
          {activeLayers.fleet && hoveredVehicle && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/80 rounded-sm p-3 shadow-xl backdrop-blur-md text-xs w-64 space-y-2 text-slate-200 animate-fadeIn select-none"
              style={{
                left: Math.min(Math.max(12, hoveredVehicle.x + 12), (mapContainerRef.current?.clientWidth || window.innerWidth) - 270),
                top: Math.min(Math.max(12, hoveredVehicle.y - 20), (mapContainerRef.current?.clientHeight || window.innerHeight) - 180),
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <div>
                  <div className="font-bold text-sm text-white">{hoveredVehicle.vehicle_name}</div>
                  {hoveredVehicle.vehicle_type && (
                    <div className="text-[11px] font-medium text-emerald-400">{hoveredVehicle.vehicle_type}</div>
                  )}
                </div>
                {hoveredVehicle.status && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                      hoveredVehicle.status === 'IN_TRANSIT'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : hoveredVehicle.status === 'HALTED'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {hoveredVehicle.status.replace('_', ' ')}
                  </span>
                )}
              </div>

              {(hoveredVehicle.startHub || hoveredVehicle.endHub || hoveredVehicle.destination_name) && (
                <div className="space-y-0.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">{t('route')}</div>
                  <div className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                    <span className="truncate">{hoveredVehicle.startHub || t('origin')}</span>
                    <span className="text-slate-500">→</span>
                    <span className="truncate">
                      {hoveredVehicle.endHub || hoveredVehicle.destination_name || t('target')}
                    </span>
                  </div>
                </div>
              )}

              {hoveredVehicle.mission_id && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-400">{t('mission')}</span>
                  <span className="font-mono font-bold text-primary">{hoveredVehicle.mission_id}</span>
                </div>
              )}
            </div>
          )}

          {/* Road Incident / Disruption Hover Preview Card */}
          {activeLayers.roadStatus && hoveredBreakdown && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-red-500/60 rounded-sm p-3 shadow-xl backdrop-blur-md text-xs w-64 space-y-2 text-slate-200 animate-fadeIn select-none"
              style={{
                left: Math.min(Math.max(12, hoveredBreakdown.x + 12), (mapContainerRef.current?.clientWidth || window.innerWidth) - 270),
                top: Math.min(Math.max(12, hoveredBreakdown.y - 20), (mapContainerRef.current?.clientHeight || window.innerHeight) - 180),
              }}
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
                <div className="pr-2">
                  <div className="font-bold text-sm text-red-400">{hoveredBreakdown.segment_name}</div>
                  {hoveredBreakdown.highway && (
                    <div className="text-[11px] font-mono text-slate-400">{hoveredBreakdown.highway}</div>
                  )}
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                    hoveredBreakdown.status === 'BLOCKED'
                      ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {hoveredBreakdown.status}
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">{t('cause')}:</span>
                  <span className="font-semibold text-slate-200">{hoveredBreakdown.cause}</span>
                </div>
                {hoveredBreakdown.severity && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t('severity')}:</span>
                    <span className="font-semibold text-amber-300 uppercase">{hoveredBreakdown.severity}</span>
                  </div>
                )}
                {hoveredBreakdown.lastUpdated && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">{t('lastUpdated')}:</span>
                    <span className="text-slate-300">{hoveredBreakdown.lastUpdated}</span>
                  </div>
                )}
              </div>
              <div className="pt-1 text-[10px] text-slate-500 italic text-right">{t('clickForDetails')}</div>
            </div>
          )}

          {/* Disaster & Community Sector Polygon Hover Preview Card */}
          {activeLayers.lhz && hoveredPolygon && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-slate-700/80 rounded-sm p-3 shadow-2xl backdrop-blur-md text-xs w-68 space-y-2 text-slate-200 animate-fadeIn select-none"
              style={{
                left: Math.min(Math.max(12, hoveredPolygon.x + 14), (mapContainerRef.current?.clientWidth || window.innerWidth) - 290),
                top: Math.min(Math.max(12, hoveredPolygon.y - 30), (mapContainerRef.current?.clientHeight || window.innerHeight) - 220),
              }}
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-1.5 gap-2">
                <div>
                  <div className="font-bold text-sm text-white">{hoveredPolygon.title}</div>
                  {hoveredPolygon.subtitle && (
                    <div className="text-[11px] text-slate-400">{hoveredPolygon.subtitle}</div>
                  )}
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 border ${hoveredPolygon.badgeColor}`}>
                  {hoveredPolygon.badge}
                </span>
              </div>

              <div className="space-y-1 text-[11px]">
                {hoveredPolygon.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2">
                    <span className="text-slate-400">{item.label}:</span>
                    <span className={`font-semibold truncate max-w-[155px] ${item.alert ? 'text-red-400' : 'text-slate-200'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-primary flex items-center justify-end gap-1 font-medium">
                <span>{hoveredPolygon.prompt}</span>
                <span>→</span>
              </div>
            </div>
          )}
        </div>

        {/* Interactive GIS Legend */}
        <MapLegend />
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE: MISSION DETAILS PANEL OR VEHICLE INSPECTOR                    */}
      {/* ========================================================================= */}
      {/* 1. Right-side Mission Details Panel */}
      {isMissionDetailsOpen && activeMission && (
        <div className="w-full lg:w-80 h-auto lg:h-full z-20 shrink-0">
          <MissionDetailsPanel
            mission={activeMission}
            vehicle={vehicles.find((v) => v.mission_id === activeMission.id || (activeMission.id === 'MISSION-MZ-04' && v.vehicle_id === 'Medic-01')) || null}
            routeDef={FLEET_ROUTES[activeMission.assignedRouteId] || null}
            disruptions={activeDisruptions}
            onClose={() => setIsMissionDetailsOpen(false)}
            onFocusMap={() => handleFocusMission(activeMission)}
            onClearFocus={handleClearFocus}
            onApprove={(id) => approveMission(id)}
            onDispatch={(id, vId) => dispatchMission(id, vId)}
            onInspectVehicle={(vId) => {
              setSelectedVehicleId(vId);
              setIsInspectorOpen(true);
            }}
          />
        </div>
      )}

      {/* 2. Vehicle Inspector (Side sheet or Modal overlay) */}
      {isInspectorOpen && activeVehicle && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-2xs"
            onClick={() => setIsInspectorOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] lg:relative lg:inset-auto lg:max-h-none w-full lg:w-80 h-auto lg:h-full z-30 lg:z-20 shadow-2xl lg:shadow-none animate-fadeIn shrink-0">
            <VehicleInspector
              vehicle={activeVehicle}
              onClose={() => setIsInspectorOpen(false)}
              onToggleHalt={(id) => toggleVehicleHalt(id)}
              onToggleDeviation={(id) => toggleVehicleDeviation(id)}
              onTriggerSOS={(id) => triggerVehicleSOS(id)}
              onFocusMission={(missionId) => {
                const targetMission = activeMissions.find((m) => m.id === missionId);
                if (targetMission) handleFocusMission(targetMission);
              }}
            />
          </div>
        </>
      )}

      {/* ========================================================================= */}
      {/* OVERLAY MODALS                                                            */}
      {/* ========================================================================= */}
      {/* 3. Disaster Polygon & Sector Intelligence Modal */}
      <DisasterPolygonModal
        isOpen={isDisasterModalOpen}
        onClose={() => {
          setIsDisasterModalOpen(false);
          setInspectedCommunity(null);
          setInspectedHazardZone(null);
        }}
        community={inspectedCommunity}
        hazardZone={inspectedHazardZone}
        activeMission={
          inspectedCommunity
            ? activeMissions.find(
                (m) =>
                  m.communityId === inspectedCommunity.id ||
                  m.communityName.toLowerCase().includes(inspectedCommunity.name.toLowerCase()) ||
                  inspectedCommunity.name.toLowerCase().includes(m.communityName.toLowerCase())
              ) || null
            : null
        }
        onFocusMission={(mission) => handleFocusMission(mission)}
      />

      {/* 4. Road Incident Details Modal */}
      <RoadIncidentModal
        isOpen={detailedIncident !== null}
        onClose={() => setDetailedIncident(null)}
        segment={detailedIncident?.segment || null}
        disruption={detailedIncident?.disruption || null}
        incident={detailedIncident?.incident || null}
        affectedMissions={detailedIncident?.affectedMissions || []}
        onOpenSegmentEngineering={(seg) => {
          setDetailedIncident(null);
          setInspectedSegment(seg);
        }}
      />

      {/* 5. Road Segment Engineering Modal */}
      {inspectedSegment && (
        <SegmentModal
          segment={inspectedSegment}
          vehicle={selectedVehicle}
          rainfallMmHr={rainfallMmHr}
          currentDisruption={activeDisruptions[inspectedSegment.id]}
          onClose={() => setInspectedSegment(null)}
          onApplyDisruption={(segId, dis) => {
            if (dis) {
              setSegmentDisruption(segId, dis);
            }
          }}
        />
      )}

      {/* 6. Alert Feed Modal */}
      <AlertFeedModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        alerts={alerts}
        onAcknowledge={(alertId) => acknowledgeAlert(alertId)}
        onSelectVehicle={(vehId) => {
          setSelectedVehicleId(vehId);
          setIsInspectorOpen(true);
          setIsAlertModalOpen(false);
        }}
      />

      {/* 7. Driver SOS Emergency Modal */}
      {activeSOSVehicleId && (
        <SOSModal
          vehicle={vehicles.find((v) => v.vehicle_id === activeSOSVehicleId) || null}
          onClose={() => setActiveSOSVehicleId(null)}
          onStandDown={() => {
            setActiveSOSVehicleId(null);
          }}
        />
      )}
    </div>
  );
};
