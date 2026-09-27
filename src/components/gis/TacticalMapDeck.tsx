import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { usePravahStore } from '../../store/usePravahStore';
import { FLEET_ROUTES } from '../../data/fleetData';
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
  createModelBRouteOptionsGeoJSON,
  createSpatialSegmentMarkersGeoJSON,
  createRoadStatusGeoJSON,
  createModelARiskGeoJSON,
  getSegmentCurvedCoordinates,
  createDisastersGeoJSON,
  createCommunitiesGeoJSON,
  createCommunityBoundariesGeoJSON,
  createWarehousesGeoJSON,
  createRoadBreakdownsGeoJSON,
  createMissionEndpointsGeoJSON,
  createGroundIntelIncidentsGeoJSON,
  createDraftIncidentPlotsGeoJSON,
  createSelectedDraftRouteGeoJSON,
  registerMapIcons,
} from '../../engine/mapGeoJSONAdapters';
import { getMissionCorridorSegments, getAuthoritativeMissionExposure } from '../../engine/modelAService';
import { SegmentModal } from './SegmentModal';
import { SpatialSegmentModal } from './SpatialSegmentModal';
import { RoadIncidentModal } from './RoadIncidentModal';
import { VehicleInspector } from './VehicleInspector';
import { AlertFeedModal } from './AlertFeedModal';
import { SOSModal } from './SOSModal';
import { MapLegend } from './MapLegend';
import { MissionDetailsPanel } from './MissionDetailsPanel';
import { DisasterPolygonModal, type HazardZoneInfo } from './DisasterPolygonModal';
import { useTranslation } from '../../data/uiTranslations';
import { formatTimeAgo } from '../../engine/offlineSync';
import type { Segment, VehicleProfile, ReliefMission, Incident, SegmentIncident, CommunityWithCalculation, DraftIncidentPlot, RouteSpatialSegment } from '../../types';
import { ensureLngLat } from '../../engine/gisMath';
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
  RefreshCw,
  Cpu,
  ClipboardList,
} from 'lucide-react';

export interface TacticalMapDeckProps {
  compactMobileOnly?: boolean;
  onNavigateToMission?: (missionId: string) => void;
}

export const TacticalMapDeck: React.FC<TacticalMapDeckProps> = ({ compactMobileOnly = false, onNavigateToMission }) => {
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
    cancelVehicleSOS,
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
    hazardPolygons,
    refreshHazardPolygons,
    draftPlots,
    approvedDraftPlots,
    rejectedReports,
    approveDraftPlot,
    dismissDraftPlot,
    submitCitizenReport,
    submitOfficerReport,
    pendingMapFocus,
    setPendingMapFocus,
    hubs,
    inventory,
    setSelectedHubId,
    setActiveView,
    modelAPredictions,
    missionRouteOptionsByMissionId,
    selectedRouteOptionByMissionId,
    selectMissionRoute,
    userContext,
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
  const hazardPolygonsRef = useRef(hazardPolygons);
  hazardPolygonsRef.current = hazardPolygons;
  const pendingMapFocusRef = useRef(pendingMapFocus);
  pendingMapFocusRef.current = pendingMapFocus;
  const selectMissionRouteRef = useRef(selectMissionRoute);
  selectMissionRouteRef.current = selectMissionRoute;

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

  // Active sidebar tab: 'MISSIONS' vs 'ROUTING' vs 'REPORTS_REVIEW'
  const [sidebarTab, setSidebarTab] = useState<'MISSIONS' | 'ROUTING' | 'REPORTS_REVIEW'>('MISSIONS');
  const [selectedDraftPlotId, setSelectedDraftPlotId] = useState<string | null>(null);
  const [reviewSubTab, setReviewSubTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  const allDraftPlots = useMemo(() => {
    const map = new Map<string, DraftIncidentPlot>();
    approvedDraftPlots.forEach((p) => map.set(p.id, p));
    draftPlots.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [draftPlots, approvedDraftPlots]);

  const allDraftPlotsRef = useRef(allDraftPlots);
  allDraftPlotsRef.current = allDraftPlots;

  const selectedDraftPlot = useMemo(() => {
    return allDraftPlots.find((d) => d.id === selectedDraftPlotId) || null;
  }, [allDraftPlots, selectedDraftPlotId]);

  // Direct Gemini Field Intel Ingest state
  const [intelInputText, setIntelInputText] = useState('');
  const [isProcessingIntel, setIsProcessingIntel] = useState(false);
  const [intelStatus, setIntelStatus] = useState<string | null>(null);

  const handleProcessIntel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!intelInputText.trim() || isProcessingIntel) return;
    setIsProcessingIntel(true);
    setIntelStatus('Connecting to Multimodal AI Engine...');
    try {
      const res = await submitCitizenReport({
        rawText: intelInputText.trim(),
        coords: [25.712, 93.998], // Default to active NER corridor centroid
        reporterName: 'Field Intel Ingest',
      });
      if (res.status === 'NEW_DRAFT') {
        setIntelStatus('✨ Processed by AI & Added to Review Queue!');
        setIntelInputText('');
        if (res.draftPlot) {
          setSelectedDraftPlotId(res.draftPlot.id);
          if (mapInstanceRef.current && res.draftPlot.coordinates) {
            mapInstanceRef.current.flyTo({
              center: [res.draftPlot.coordinates[1], res.draftPlot.coordinates[0]],
              zoom: 12,
              speed: 1.2,
            });
          }
        }
      } else if (res.status === 'DUPLICATE') {
        setIntelStatus(`✨ AI detected duplicate: Citation merged into ${res.duplicateOfId}`);
        setIntelInputText('');
      } else {
        setIntelStatus(`Flagged by AI: ${res.rejectionReason || 'Spam / Geographic Mismatch'}`);
      }
    } catch (err: any) {
      setIntelStatus(`Error: ${err?.message || 'AI processing failed'}`);
    } finally {
      setIsProcessingIntel(false);
      setTimeout(() => setIntelStatus(null), 5000);
    }
  };

  const [missionTab, setMissionTab] = useState<'ONGOING' | 'SUGGESTED'>('ONGOING');
  const [mobileViewTab, setMobileViewTab] = useState<'MAP' | 'CONTROLS'>('MAP');

  // Modals & Panels
  const [inspectedSegment, setInspectedSegment] = useState<Segment | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeSOSVehicleId, setActiveSOSVehicleId] = useState<string | null>(null);
  const dismissedSOSVehicleIdsRef = useRef<Set<string>>(new Set());

  // Listen for fresh driver SOS triggers to allow subsequent legitimate emergencies
  useEffect(() => {
    const handleNewSOS = (e: any) => {
      const vId = e.detail?.vehicleId;
      if (vId) {
        dismissedSOSVehicleIdsRef.current.delete(vId);
        const match = vehicles.find((v) => v.vehicle_id === vId || v.vehicle_name === vId);
        if (match) {
          dismissedSOSVehicleIdsRef.current.delete(match.vehicle_id);
          dismissedSOSVehicleIdsRef.current.delete(match.vehicle_name);
        }
      }
    };
    window.addEventListener('pravah:new_sos', handleNewSOS);
    return () => window.removeEventListener('pravah:new_sos', handleNewSOS);
  }, [vehicles]);

  const handleDismissSOS = useCallback((vehId: string) => {
    dismissedSOSVehicleIdsRef.current.add(vehId);
    const targetVeh = vehicles.find((v) => v.vehicle_id === vehId || v.vehicle_name === vehId);
    if (targetVeh) {
      dismissedSOSVehicleIdsRef.current.add(targetVeh.vehicle_id);
      dismissedSOSVehicleIdsRef.current.add(targetVeh.vehicle_name);
      cancelVehicleSOS(targetVeh.vehicle_id);
    } else {
      cancelVehicleSOS(vehId);
    }
    setActiveSOSVehicleId(null);
  }, [cancelVehicleSOS, vehicles]);

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

  const [hoveredModelASegment, setHoveredModelASegment] = useState<{
    x: number;
    y: number;
    segment_id: string;
    segment_name: string;
    highway?: string;
    model_a_probability: number;
    model_a_risk_band: string;
    operational_status: string;
    is_active_mission_segment: boolean;
  } | null>(null);

  const [hoveredRouteOption, setHoveredRouteOption] = useState<{
    x: number;
    y: number;
    option_id: string;
    mission_id: string;
    route_name: string;
    route_number: number;
    route_rank: number;
    is_selected: boolean;
    distance_km: number;
    predicted_eta_minutes: number;
    predicted_delay_factor: number;
    is_rank_1: boolean;
  } | null>(null);

  // Model A 5-Equal-Distance Spatial Segment Inspection State
  const [selectedSpatialSegmentOrder, setSelectedSpatialSegmentOrder] = useState<number | null>(null);
  const [inspectedSpatialSegment, setInspectedSpatialSegment] = useState<{
    segment: RouteSpatialSegment;
    routeName?: string;
  } | null>(null);

  const [detailedIncident, setDetailedIncident] = useState<{
    segment: Segment;
    disruption: SegmentIncident;
    incident: Incident | null;
    affectedMissions: ReliefMission[];
  } | null>(null);

  // Tactical Hub Hover State
  const [hoveredHub, setHoveredHub] = useState<{
    x: number;
    y: number;
    hub_id: string;
    name: string;
    code: string;
    state: string;
    status: string;
    type: string;
    vehicles_count: number;
    available_vehicles_count: number;
    resources_count: number;
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
    return activeMissions.filter(
      (m) => m.status === 'IN_TRANSIT' || m.status === 'PENDING_ADMIN_CLOSEOUT' || m.status === 'APPROVED'
    );
  }, [activeMissions]);

  const suggestedMissions = useMemo(() => {
    return activeMissions.filter((m) => m.status === 'SUGGESTED');
  }, [activeMissions]);

  // Selected mission object - scoped to this particular field officer's assigned area when in field officer / mobile mode
  const activeMission = useMemo(() => {
    if (compactMobileOnly || activeRole === 'FIELD_OFFICER') {
      const officerMission = activeMissions.find(
        (m) =>
          m.communityId === userContext.communityId ||
          m.id === userContext.activeMissionId ||
          Boolean(userContext.communityName && m.communityName && m.communityName.toLowerCase().includes(userContext.communityName.toLowerCase().split(' ')[0]))
      );
      if (officerMission) return officerMission;
    }
    if (!selectedMissionId) return null;
    return activeMissions.find((m) => m.id === selectedMissionId) || null;
  }, [activeMissions, selectedMissionId, compactMobileOnly, activeRole, userContext]);

  const activeSelectedRouteOptId = activeMission
    ? selectedRouteOptionByMissionId[activeMission.id] || activeMission.selectedRouteOptionId
    : null;

  // Corridor road segments for active selected mission - authoritative current route segments first
  const activeMissionCorridor = useMemo(() => {
    if (!activeMission) return new Set<string>();
    if (activeMission.corridorSegmentIds && activeMission.corridorSegmentIds.length > 0) {
      return new Set(activeMission.corridorSegmentIds);
    }
    const missionOptions = missionRouteOptionsByMissionId[activeMission.id] || activeMission.routeOptions;
    const { mappedSegments } = getMissionCorridorSegments(
      activeMission,
      NER_SEGMENTS,
      activeSelectedRouteOptId,
      missionOptions
    );
    return new Set(mappedSegments.map((s) => s.id));
  }, [activeMission, activeSelectedRouteOptId, missionRouteOptionsByMissionId]);

  // Selected vehicle object
  const activeVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find((v) => v.vehicle_id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Selected community object - scoped to this particular field officer's assigned area
  const selectedCommunity = useMemo(() => {
    if (compactMobileOnly || activeRole === 'FIELD_OFFICER') {
      const comm = communities.find((c) => c.id === userContext.communityId);
      if (comm) return comm;
    }
    if (!selectedCommunityId) return null;
    return communities.find((c) => c.id === selectedCommunityId) || null;
  }, [communities, selectedCommunityId, compactMobileOnly, activeRole, userContext]);

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

  // Check if any vehicle has active SOS (avoid looping)
  useEffect(() => {
    const sosVeh = vehicles.find(
      (v) =>
        (v.is_sos_manual || v.status === 'SOS_ALERT') &&
        !dismissedSOSVehicleIdsRef.current.has(v.vehicle_id) &&
        !dismissedSOSVehicleIdsRef.current.has(v.vehicle_name)
    );

    if (sosVeh) {
      if (activeSOSVehicleId !== sosVeh.vehicle_id) {
        setActiveSOSVehicleId(sosVeh.vehicle_id);
      }
    } else {
      if (activeSOSVehicleId) {
        setActiveSOSVehicleId(null);
      }
    }
  }, [vehicles, activeSOSVehicleId]);

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
      // 1. DISASTERS & GEOLOGICAL HAZARDS (Realtime API Hazard Polygons + ISRO LHZ Baseline)
      // -------------------------------------------------------------
      map.addSource('disasters', {
        type: 'geojson',
        data: createDisastersGeoJSON(hazardPolygons),
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
      // 2B. MODEL A PREDICTIVE ROAD DISRUPTION RISK (Source)
      // Dedicated GeoJSON-based layer strictly separating predictive
      // hazard probability (orange/red-orange) from operational status.
      // -------------------------------------------------------------
      map.addSource('model-a-risk', {
        type: 'geojson',
        data: createModelARiskGeoJSON(NER_SEGMENTS, modelAPredictions, activeDisruptions, activeMissionCorridor, activeMission, FLEET_ROUTES),
      });


      // -------------------------------------------------------------
      // 3. ALL MISSION ROUTES
      // -------------------------------------------------------------
      map.addSource('mission-routes', {
        type: 'geojson',
        data: createMissionRoutesGeoJSON(activeMissions, FLEET_ROUTES, selectedMissionId, modelAPredictions, vehicles),
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
      // 4B. MODEL B ROUTE OPTIONS (Suggested Missions Route Alternatives)
      // Displays Model B route options with dynamic disruption risk colors:
      // High (>= 80%): Red, Elevated (>= 50%): Orange, Low (< 50%): Blue
      // -------------------------------------------------------------
      const isSuggestedInit = activeMission?.status === 'SUGGESTED';
      const optsInit = (isSuggestedInit && !activeMission?.isRerouted)
        ? (activeMission.routeOptions || missionRouteOptionsByMissionId[activeMission.id] || [])
        : [];
      const selOptIdInit = selectedRouteOptionByMissionId[activeMission?.id || ''] || activeMission?.selectedRouteOptionId;

      map.addSource('model-b-route-options', {
        type: 'geojson',
        data: createModelBRouteOptionsGeoJSON(
          optsInit,
          selOptIdInit,
          modelAPredictions,
          Boolean(activeMission?.isRerouted),
          activeMission?.originCoords,
          activeMission?.destinationEndpoint
        ),
      });

      map.addLayer({
        id: 'model-b-route-glow',
        type: 'line',
        source: 'model-b-route-options',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'glow_color'],
          'line-width': ['get', 'glow_width'],
          'line-opacity': ['get', 'glow_opacity'],
          'line-blur': 3,
        },
      });

      map.addLayer({
        id: 'model-b-route-casing',
        type: 'line',
        source: 'model-b-route-options',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'casing_color'], '#0f172a'],
          'line-width': ['coalesce', ['get', 'casing_width'], 8.5],
          'line-opacity': 0.85,
        },
      });

      map.addLayer({
        id: 'model-b-route-line',
        type: 'line',
        source: 'model-b-route-options',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': ['get', 'line_width'],
          'line-opacity': ['get', 'line_opacity'],
        },
      });

      // 4B-ii. Model A 5-Equal-Distance Spatial Segment Milestone Markers (S1..S5) & Incidents
      map.addSource('model-a-spatial-markers', {
        type: 'geojson',
        data: createSpatialSegmentMarkersGeoJSON(optsInit, selOptIdInit, null),
      });

      map.addLayer({
        id: 'model-a-spatial-markers-glow',
        type: 'circle',
        source: 'model-a-spatial-markers',
        paint: {
          'circle-radius': 14,
          'circle-color': ['coalesce', ['get', 'color'], '#2563EB'],
          'circle-opacity': 0.35,
          'circle-blur': 0.5,
        },
      });

      map.addLayer({
        id: 'model-a-spatial-markers-circle',
        type: 'circle',
        source: 'model-a-spatial-markers',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'is_selected'], false],
            10.5,
            7.5,
          ],
          'circle-color': ['coalesce', ['get', 'color'], '#2563EB'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      map.addLayer({
        id: 'model-a-spatial-markers-text',
        type: 'symbol',
        source: 'model-a-spatial-markers',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 9.5,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      // -------------------------------------------------------------
      // 4C. SELECTED / REROUTED AUTHORITATIVE MISSION ROUTE
      // Dynamic risk color:
      // High (>= 80%): Red (#DC2626)
      // Elevated (>= 50%): Orange (#EA580C)
      // Less (< 50%): Royal Blue (#2563EB)
      // When rerouted: Royal Blue (#2563EB) as authoritative main route
      // -------------------------------------------------------------
      map.addSource('selected-mission-route', {
        type: 'geojson',
        data: createSelectedMissionRouteGeoJSON(activeMission, FLEET_ROUTES, modelAPredictions, vehicles),
      });

      map.addLayer({
        id: 'selected-mission-glow',
        type: 'line',
        source: 'selected-mission-route',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'glowColor'], '#3B82F6'],
          'line-width': 13,
          'line-opacity': 0.45,
          'line-blur': 4,
        },
      });

      map.addLayer({
        id: 'selected-mission-casing',
        type: 'line',
        source: 'selected-mission-route',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': '#0F172A',
          'line-width': 8.5,
          'line-opacity': 0.90,
        },
      });

      map.addLayer({
        id: 'selected-mission-line',
        type: 'line',
        source: 'selected-mission-route',
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#2563EB'],
          'line-width': 5.8,
          'line-opacity': 1.0,
        },
      });

      // -------------------------------------------------------------
      // 4B-ii. MODEL A PREDICTIVE ROAD DISRUPTION HAZARD OVERLAYS
      // Rendered on top so hazard choke points and high-risk segments
      // illuminate clearly over the base route lines.
      // -------------------------------------------------------------
      map.addLayer({
        id: 'model-a-risk-glow',
        type: 'line',
        source: 'model-a-risk',
        layout: {
          visibility: activeLayers.modelA ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'risk_color'],
          'line-width': ['get', 'glow_width'],
          'line-opacity': ['get', 'glow_opacity'],
          'line-blur': 4,
        },
      });

      map.addLayer({
        id: 'model-a-risk-line',
        type: 'line',
        source: 'model-a-risk',
        layout: {
          visibility: activeLayers.modelA ? 'visible' : 'none',
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': ['get', 'risk_color'],
          'line-width': ['get', 'risk_width'],
          'line-opacity': ['get', 'risk_opacity'],
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
        data: createWarehousesGeoJSON(hubs, inventory, vehicles),
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
      // 7c. DRAFT INCIDENT PLOTS (Pulsing Ghost Preview Pins for AI Drafts)
      // -------------------------------------------------------------
      map.addSource('draft-incident-plots', {
        type: 'geojson',
        data: createDraftIncidentPlotsGeoJSON(allDraftPlotsRef.current),
      });

      // Animated high-intensity red blinking outer halo
      map.addLayer({
        id: 'draft-incident-plots-halo',
        type: 'circle',
        source: 'draft-incident-plots',
        paint: {
          'circle-radius': 16,
          'circle-color': '#EF4444',
          'circle-opacity': 0.65,
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#DC2626',
        },
      });

      // Solid central red incident core dot with white border
      map.addLayer({
        id: 'draft-incident-plots-core',
        type: 'circle',
        source: 'draft-incident-plots',
        paint: {
          'circle-radius': 7.5,
          'circle-color': '#DC2626',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Incident title badge
      map.addLayer({
        id: 'draft-incident-plots-label',
        type: 'symbol',
        source: 'draft-incident-plots',
        layout: {
          'text-field': [
            'case',
            ['==', ['get', 'status'], 'APPROVED'],
            ['concat', '🚨 APPROVED INCIDENT: ', ['get', 'title']],
            ['concat', '⚠️ AI DRAFT: ', ['get', 'title']],
          ],
          'text-font': ['Noto Sans Bold'],
          'text-size': 9.5,
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#FCA5A5',
          'text-halo-color': '#450A0A',
          'text-halo-width': 2.5,
        },
      });

      // -------------------------------------------------------------
      // 7d. SELECTED DRAFT ROUTE & EXPECTED PIN PREVIEW
      // -------------------------------------------------------------
      map.addSource('selected-draft-route', {
        type: 'geojson',
        data: createSelectedDraftRouteGeoJSON(null),
      });

      // Glowing corridor line along expected road route
      map.addLayer({
        id: 'selected-draft-route-glow',
        type: 'line',
        source: 'selected-draft-route',
        filter: ['==', '$type', 'LineString'],
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 10,
          'line-opacity': 0.45,
          'line-blur': 3,
        },
      });


      // Expected pin pulse ring (Red Blinker)
      map.addLayer({
        id: 'selected-draft-pin-pulse',
        type: 'circle',
        source: 'selected-draft-route',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 24,
          'circle-color': '#EF4444',
          'circle-opacity': 0.65,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#DC2626',
        },
      });

      // Expected pin center point
      map.addLayer({
        id: 'selected-draft-pin-point',
        type: 'circle',
        source: 'selected-draft-route',
        filter: ['==', '$type', 'Point'],
        paint: {
          'circle-radius': 8,
          'circle-color': '#EF4444',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#FFFFFF',
        },
      });

      // Expected pin badge text
      map.addLayer({
        id: 'selected-draft-pin-badge',
        type: 'symbol',
        source: 'selected-draft-route',
        filter: ['==', '$type', 'Point'],
        layout: {
          'text-field': ['concat', '📍 EXPECTED PIN: ', ['get', 'hazardType'], ' (', ['get', 'severity'], ')'],
          'text-font': ['Noto Sans Bold'],
          'text-size': 10,
          'text-offset': [0, 1.5],
          'text-anchor': 'top',
          'text-allow-overlap': true,
        },
        paint: {
          'text-color': '#FEF08A',
          'text-halo-color': '#78350F',
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
        data: createVehiclesGeoJSON(vehicles, selectedVehicleId, activeMissions, selectedMissionId),
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
          const vId = feat.properties.vehicle_id;
          setSelectedVehicleId(vId);
          setIsInspectorOpen(true);
          const currentMissions = activeMissionsRef.current;
          const matchedMission = currentMissions.find(
            (m) => m.assignedVehicleId === vId || m.id === feat.properties.mission_id
          );
          if (matchedMission) {
            setSelectedMissionId(matchedMission.id);
          }
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

      // Click on mission route line -> if Field Officer / compact mobile, redirect to that particular mission in missions section!
      const handleMissionRouteClick = (e: any) => {
        const feat = e.features?.[0];
        const mId = feat?.properties?.mission_id || feat?.properties?.missionId;
        if (mId) {
          if (onNavigateToMission) {
            onNavigateToMission(mId);
          } else if (compactMobileOnly || activeRole === 'FIELD_OFFICER') {
            setSelectedMissionId(mId);
            window.dispatchEvent(new CustomEvent('pravah-navigate-mission', { detail: { missionId: mId } }));
          } else {
            setSelectedMissionId(mId);
            setIsMissionDetailsOpen(true);
          }
        }
      };

      map.on('click', 'mission-routes-line', handleMissionRouteClick);
      map.on('click', 'selected-mission-line', handleMissionRouteClick);
      map.on('mouseenter', 'mission-routes-line', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'mission-routes-line', () => { map.getCanvas().style.cursor = ''; });
      map.on('mouseenter', 'selected-mission-line', () => { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', 'selected-mission-line', () => { map.getCanvas().style.cursor = ''; });

      // Click road segment
      map.on('click', 'road-status-line', (e: any) => {
        const feat = e.features?.[0];
        if (feat?.properties?.segment_id) {
          const seg = NER_SEGMENTS.find((s) => s.id === feat.properties.segment_id);
          if (seg) setInspectedSegment(seg);
        }
      });

      // Click Model A predictive risk segment -> Opens existing SegmentModal with 17 features & probability
      map.on('click', 'model-a-risk-line', (e: any) => {
        const feat = e.features?.[0];
        if (feat?.properties?.segment_id) {
          const seg = NER_SEGMENTS.find((s) => s.id === feat.properties.segment_id);
          if (seg) setInspectedSegment(seg);
        }
      });

      // Hover on Model A predictive risk segment
      map.on('mousemove', 'model-a-risk-line', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          setHoveredModelASegment({
            x: e.point.x,
            y: e.point.y,
            segment_id: feat.properties.segment_id,
            segment_name: feat.properties.segment_name,
            highway: feat.properties.highway,
            model_a_probability: Number(feat.properties.model_a_probability || 0),
            model_a_risk_band: feat.properties.model_a_risk_band,
            operational_status: feat.properties.operational_status,
            is_active_mission_segment: !!feat.properties.is_active_mission_segment,
          });
        }
      });

      map.on('mouseleave', 'model-a-risk-line', () => {
        setHoveredModelASegment(null);
      });

      // Click Model B route option line (Route 1 or Route 2) to toggle and select that route directly on the map
      map.on('click', 'model-b-route-line', (e: any) => {
        const feat = e.features?.[0];
        if (feat?.properties?.mission_id) {
          const mId = feat.properties.mission_id;
          const currentOptId = feat.properties.option_id;
          const targetMission = activeMissionsRef.current.find((m) => m.id === mId);
          const opts = targetMission?.routeOptions || missionRouteOptionsByMissionId[mId] || [];
          const selOptId = selectedRouteOptionByMissionId[mId] || targetMission?.selectedRouteOptionId;

          // If clicking an already selected route and a specific spatial segment was clicked, inspect it!
          if (currentOptId === selOptId && feat.properties.segment_order) {
            const segOrder = Number(feat.properties.segment_order);
            setSelectedSpatialSegmentOrder(segOrder);
            const activeOpt = opts.find((o) => o.id === selOptId) || opts[0];
            const targetSeg = activeOpt?.spatialSegments?.find((s) => s.order === segOrder);
            if (targetSeg) {
              setInspectedSpatialSegment({
                segment: targetSeg,
                routeName: activeOpt?.routeName,
              });
              return;
            }
          }

          if (currentOptId) {
            selectMissionRouteRef.current(mId, currentOptId);
          }
        }
      });

      map.on('mousemove', 'model-b-route-line', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          map.getCanvas().style.cursor = 'pointer';
          setHoveredRouteOption({
            x: e.point.x,
            y: e.point.y,
            option_id: feat.properties.option_id,
            mission_id: feat.properties.mission_id,
            route_name: feat.properties.route_name || (feat.properties.route_number === 1 ? 'Primary Corridor' : 'Alternative Bypass'),
            route_number: Number(feat.properties.route_number || 1),
            route_rank: Number(feat.properties.route_rank || 1),
            is_selected: Boolean(feat.properties.is_selected),
            distance_km: Number(feat.properties.distance_km || 0),
            predicted_eta_minutes: Number(feat.properties.predicted_eta_minutes || 0),
            predicted_delay_factor: Number(feat.properties.predicted_delay_factor || 1.0),
            is_rank_1: Boolean(feat.properties.is_rank_1),
          });
        }
      });

      map.on('mouseleave', 'model-b-route-line', () => {
        map.getCanvas().style.cursor = '';
        setHoveredRouteOption(null);
      });

      // Click / Hover Model A Spatial Segment Milestone Markers (S1..S5)
      const handleSpatialMarkerClick = (e: any) => {
        const feat = e.features?.[0];
        if (feat?.properties) {
          const segOrder = Number(feat.properties.order);
          setSelectedSpatialSegmentOrder(segOrder);
          const activeMission = activeMissionsRef.current.find((m) => m.id === selectedMissionId) || activeMissionsRef.current[0];
          const opts = activeMission?.routeOptions || missionRouteOptionsByMissionId[activeMission?.id || ''] || [];
          const selOptId = selectedRouteOptionByMissionId[activeMission?.id || ''] || activeMission?.selectedRouteOptionId;
          const activeOpt = opts.find((o) => o.id === selOptId) || opts.find((o) => o.predictedPreferredRoute) || opts[0];
          const targetSeg = activeOpt?.spatialSegments?.find((s) => s.order === segOrder);
          if (targetSeg) {
            setInspectedSpatialSegment({
              segment: targetSeg,
              routeName: activeOpt?.routeName,
            });
          }
        }
      };

      map.on('click', 'model-a-spatial-markers-circle', handleSpatialMarkerClick);
      map.on('click', 'model-a-spatial-markers-text', handleSpatialMarkerClick);

      map.on('mouseenter', 'model-a-spatial-markers-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'model-a-spatial-markers-circle', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'model-a-spatial-markers-text', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'model-a-spatial-markers-text', () => {
        map.getCanvas().style.cursor = '';
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
                (seg.highway && (m.assignedRouteId?.includes(seg.highway) || m.suggestedDetour?.includes(seg.highway))) ||
                Boolean(seg.name && m.destinationName && seg.name.toLowerCase().includes(m.destinationName.toLowerCase()))
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

      // Hover on draft incident plot marker
      map.on('mousemove', 'draft-incident-plots-core', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          setHoveredBreakdown({
            x: e.point.x,
            y: e.point.y,
            segment_id: feat.properties.id,
            segment_name: `[AI DRAFT] ${feat.properties.title}`,
            highway: feat.properties.corridor,
            status: feat.properties.severity,
            cause: feat.properties.hazardType,
            severity: feat.properties.severity,
            reportedBy: `${feat.properties.reporterName} (+${feat.properties.citationsCount} Citations)`,
            lastUpdated: 'Verified by Multimodal AI',
          });
        }
      });

      map.on('mouseleave', 'draft-incident-plots-core', () => {
        setHoveredBreakdown(null);
      });

      // Click draft incident plot marker -> Select and open in Review Queue
      map.on('click', 'draft-incident-plots-core', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties?.id) {
          setSelectedDraftPlotId(feat.properties.id);
          setSidebarTab('REPORTS_REVIEW');
          setReviewSubTab('PENDING');
        }
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
                (seg.highway && (m.assignedRouteId?.includes(seg.highway) || m.suggestedDetour?.includes(seg.highway))) ||
                Boolean(seg.name && m.destinationName && seg.name.toLowerCase().includes(m.destinationName.toLowerCase()))
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

          const sourceLabel =
            p.source === 'GDACS_API'
              ? 'GDACS Live Alert (UN/EC)'
              : p.source === 'OVERPASS_API'
              ? 'OSM Live Boundary API'
              : p.source === 'SUPABASE_CLOUD'
              ? 'Supabase Cloud Synced'
              : 'ISRO Bhuvan LHZ Baseline';

          setHoveredPolygon({
            x: e.point.x,
            y: e.point.y,
            title: p.name,
            subtitle: `${p.corridor || p.state || 'Hazard Sector'}`,
            badge: `${sev.toUpperCase()}${p.hazard_score ? ` (${p.hazard_score}/10)` : ''}`,
            badgeColor,
            items: [
              { label: 'Data Source', value: sourceLabel },
              { label: 'Hazard Type', value: p.hazard_type || 'Landslide Hazard Zone' },
              { label: 'Threat Score', value: p.hazard_score ? `${p.hazard_score}/10` : '8.5/10' },
              { label: 'Advisory', value: (p.advisory || '').slice(0, 48) + '...' },
            ],
            prompt: t('clickToInspectHazard'),
          });
        }
      });
      map.on('mouseleave', 'disasters-fill', () => {
        setHoveredPolygon(null);
      });

      // Click on warehouse/hub -> Select and navigate to Logistics Center
      map.on('click', 'warehouses-icon', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          setSelectedHubId(feat.properties.hub_id);
          setActiveView('HUBS_RESOURCES');
        }
      });

      // Hover on warehouse -> Show live capacity & fleet summary
      map.on('mousemove', 'warehouses-icon', (e: any) => {
        const feat = e.features?.[0];
        if (feat && feat.properties) {
          const p = feat.properties;
          setHoveredHub({
            x: e.point.x,
            y: e.point.y,
            hub_id: p.hub_id,
            name: p.name,
            code: p.code,
            state: p.state,
            status: p.status,
            type: p.type,
            vehicles_count: Number(p.vehicles_count || 0),
            available_vehicles_count: Number(p.available_vehicles_count || 0),
            resources_count: Number(p.resources_count || 0),
          });
        }
      });
      map.on('mouseleave', 'warehouses-icon', () => {
        setHoveredHub(null);
      });

      // Cursor change on interactive layers
      const interactiveLayers = [
        'warehouses-icon',
        'vehicles-cluster',
        'vehicles-unclustered',
        'road-status-line',
        'model-a-risk-line',
        'road-breakdowns-point',
        'road-breakdowns-pulse',
        'ground-intel-incidents-core',
        'ground-intel-incidents-pulse',
        'draft-incident-plots-core',
        'draft-incident-plots-halo',
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

      // If a pending map focus was queued (e.g. newly approved AI plot), focus on it immediately
      if (pendingMapFocusRef.current?.coords) {
        map.flyTo({
          center: pendingMapFocusRef.current.coords,
          zoom: pendingMapFocusRef.current.zoom || 13,
          speed: 1.4,
          essential: true,
        });
        if (pendingMapFocusRef.current.draftId) {
          setSelectedDraftPlotId(pendingMapFocusRef.current.draftId);
        }
      } else if (selectedCommunityIdRef.current) {
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

  // Reactively fly to pendingMapFocus whenever it changes (e.g. AI approved plot)
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapLoadedRef.current || !pendingMapFocus?.coords) return;
    mapInstanceRef.current.flyTo({
      center: pendingMapFocus.coords,
      zoom: pendingMapFocus.zoom || 13,
      speed: 1.4,
      essential: true,
    });
    if (pendingMapFocus.draftId) {
      setSelectedDraftPlotId(pendingMapFocus.draftId);
    }
  }, [pendingMapFocus]);

  // Global map fly-to navigation listener
  useEffect(() => {
    const handleFlyTo = (e: any) => {
      const coords = e.detail?.coords;
      const zoom = e.detail?.zoom || 13;
      const draftId = e.detail?.draftId;

      if (draftId) {
        setSelectedDraftPlotId(draftId);
      }

      if (mapInstanceRef.current && coords && Array.isArray(coords) && coords.length >= 2) {
        mapInstanceRef.current.flyTo({
          center: [Number(coords[0]), Number(coords[1])] as [number, number],
          zoom,
          speed: 1.4,
          essential: true,
        });
      }
    };
    window.addEventListener('pravah:fly-to', handleFlyTo);
    return () => window.removeEventListener('pravah:fly-to', handleFlyTo);
  }, []);

  // 3. Smooth Animated Pulses for SOS & Road Breakdowns
  useEffect(() => {
    let start = performance.now();

    const animatePulse = (time: number) => {
      const elapsed = (time - start) / 1000;
      // High-intensity emergency blinker (oscillating at ~2.5 Hz)
      const pulse = (Math.sin(elapsed * 5.0) + 1) / 2;
      const blinkerRadius = 14 + pulse * 18; // expands from 14px to 32px
      const blinkerOpacity = Math.max(0.18, 0.90 - pulse * 0.70); // fades from 0.90 to 0.20
      const blinkerStroke = 2.0 + pulse * 1.5;

      const map = mapInstanceRef.current;
      if (map && isMapLoadedRef.current) {
        if (map.getLayer('vehicle-sos-pulse')) {
          map.setPaintProperty('vehicle-sos-pulse', 'circle-radius', 18 + pulse * 14);
          map.setPaintProperty('vehicle-sos-pulse', 'circle-opacity', blinkerOpacity);
        }
        if (map.getLayer('road-breakdowns-pulse')) {
          map.setPaintProperty('road-breakdowns-pulse', 'circle-radius', 12 + pulse * 10);
          map.setPaintProperty('road-breakdowns-pulse', 'circle-opacity', blinkerOpacity);
        }
        if (map.getLayer('ground-intel-incidents-pulse')) {
          map.setPaintProperty('ground-intel-incidents-pulse', 'circle-radius', blinkerRadius);
          map.setPaintProperty('ground-intel-incidents-pulse', 'circle-opacity', blinkerOpacity);
          map.setPaintProperty('ground-intel-incidents-pulse', 'circle-stroke-width', blinkerStroke);
          map.setPaintProperty('ground-intel-incidents-pulse', 'circle-color', '#EF4444');
          map.setPaintProperty('ground-intel-incidents-pulse', 'circle-stroke-color', '#DC2626');
        }
        if (map.getLayer('draft-incident-plots-halo')) {
          map.setPaintProperty('draft-incident-plots-halo', 'circle-radius', blinkerRadius);
          map.setPaintProperty('draft-incident-plots-halo', 'circle-opacity', blinkerOpacity);
          map.setPaintProperty('draft-incident-plots-halo', 'circle-stroke-width', blinkerStroke);
          map.setPaintProperty('draft-incident-plots-halo', 'circle-color', '#EF4444');
          map.setPaintProperty('draft-incident-plots-halo', 'circle-stroke-color', '#DC2626');
        }
        if (map.getLayer('selected-draft-pin-pulse')) {
          map.setPaintProperty('selected-draft-pin-pulse', 'circle-radius', 18 + pulse * 22);
          map.setPaintProperty('selected-draft-pin-pulse', 'circle-opacity', blinkerOpacity);
          map.setPaintProperty('selected-draft-pin-pulse', 'circle-stroke-width', blinkerStroke + 1);
          map.setPaintProperty('selected-draft-pin-pulse', 'circle-color', '#EF4444');
          map.setPaintProperty('selected-draft-pin-pulse', 'circle-stroke-color', '#DC2626');
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
      vehSource.setData(createVehiclesGeoJSON(vehicles, selectedVehicleId, activeMissions, selectedMissionId));
    }
    const sosSource = map.getSource('vehicle-sos') as maplibregl.GeoJSONSource;
    if (sosSource) {
      sosSource.setData(createVehicleSOSGeoJSON(vehicles));
    }

    // Update mission routes
    const routesSource = map.getSource('mission-routes') as maplibregl.GeoJSONSource;
    if (routesSource) {
      routesSource.setData(createMissionRoutesGeoJSON(activeMissions, FLEET_ROUTES, selectedMissionId, modelAPredictions, vehicles));
    }
    const selRouteSource = map.getSource('selected-mission-route') as maplibregl.GeoJSONSource;
    if (selRouteSource) {
      selRouteSource.setData(createSelectedMissionRouteGeoJSON(activeMission, FLEET_ROUTES, modelAPredictions, vehicles));
    }

    // Update Model B route options for mission (STRICTLY for SUGGESTED missions awaiting initial dispatch)
    const modelBSource = map.getSource('model-b-route-options') as maplibregl.GeoJSONSource;
    if (modelBSource) {
      const isSuggested = activeMission?.status === 'SUGGESTED';
      const opts = (isSuggested && !activeMission?.isRerouted)
        ? (activeMission.routeOptions || missionRouteOptionsByMissionId[activeMission.id] || [])
        : [];
      const selOptId = selectedRouteOptionByMissionId[activeMission?.id || ''] || activeMission?.selectedRouteOptionId;
      modelBSource.setData(createModelBRouteOptionsGeoJSON(
        opts,
        selOptId,
        modelAPredictions,
        false,
        activeMission?.originCoords,
        activeMission?.destinationEndpoint,
        selectedSpatialSegmentOrder
      ));
    }

    // Update Model A 5-equal-distance spatial milestone markers
    const spatialMarkersSource = map.getSource('model-a-spatial-markers') as maplibregl.GeoJSONSource;
    if (spatialMarkersSource) {
      const isSuggested = activeMission?.status === 'SUGGESTED';
      const opts = (isSuggested && !activeMission?.isRerouted)
        ? (activeMission.routeOptions || missionRouteOptionsByMissionId[activeMission.id] || [])
        : [];
      const selOptId = selectedRouteOptionByMissionId[activeMission?.id || ''] || activeMission?.selectedRouteOptionId;
      spatialMarkersSource.setData(createSpatialSegmentMarkersGeoJSON(
        opts,
        selOptId,
        selectedSpatialSegmentOrder
      ));
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
    const modelASource = map.getSource('model-a-risk') as maplibregl.GeoJSONSource;
    if (modelASource) {
      modelASource.setData(createModelARiskGeoJSON(NER_SEGMENTS, modelAPredictions, activeDisruptions, activeMissionCorridor, activeMission, FLEET_ROUTES));
    }
    const breakdownSource = map.getSource('road-breakdowns') as maplibregl.GeoJSONSource;
    if (breakdownSource) {
      breakdownSource.setData(createRoadBreakdownsGeoJSON(activeDisruptions, NER_SEGMENTS, incidents, activeMissions));
    }
    const groundIntelSource = map.getSource('ground-intel-incidents') as maplibregl.GeoJSONSource;
    if (groundIntelSource) {
      groundIntelSource.setData(createGroundIntelIncidentsGeoJSON(incidents));
    }
    const draftPlotsSource = map.getSource('draft-incident-plots') as maplibregl.GeoJSONSource;
    if (draftPlotsSource) {
      draftPlotsSource.setData(createDraftIncidentPlotsGeoJSON(allDraftPlots));
    }
    const selectedDraftRouteSource = map.getSource('selected-draft-route') as maplibregl.GeoJSONSource;
    if (selectedDraftRouteSource) {
      selectedDraftRouteSource.setData(createSelectedDraftRouteGeoJSON(selectedDraftPlot));
    }

    // Update disasters & hazard zones (Real-Time API Polygons)
    const disasterSource = map.getSource('disasters') as maplibregl.GeoJSONSource;
    if (disasterSource) {
      disasterSource.setData(createDisastersGeoJSON(hazardPolygons));
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

    // Update warehouses with dynamic store state
    const warehouseSource = map.getSource('warehouses') as maplibregl.GeoJSONSource;
    if (warehouseSource) {
      warehouseSource.setData(createWarehousesGeoJSON(hubs, inventory, vehicles));
    }
  }, [
    vehicles,
    hubs,
    inventory,
    selectedVehicleId,
    activeMissions,
    selectedMissionId,
    activeMission,
    activeDisruptions,
    communities,
    selectedCommunityId,
    incidents,
    hazardPolygons,
    draftPlots,
    approvedDraftPlots,
    allDraftPlots,
    selectedDraftPlot,
    modelAPredictions,
    activeMissionCorridor,
    selectedRouteOptionByMissionId,
    missionRouteOptionsByMissionId,
    selectedSpatialSegmentOrder,
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

    // MODEL A PREDICTIVE HAZARD OVERLAY: Strictly independent from operational status
    setVisibility('model-a-risk-glow', activeLayers.modelA);
    setVisibility('model-a-risk-line', activeLayers.modelA);
    setVisibility('model-a-spatial-markers-glow', activeLayers.modelA || activeLayers.routes);
    setVisibility('model-a-spatial-markers-circle', activeLayers.modelA || activeLayers.routes);
    setVisibility('model-a-spatial-markers-text', activeLayers.modelA || activeLayers.routes);

    // GROUND INTEL FEED INCIDENTS: Always visible live incident locations with pulsing warning dots
    setVisibility('ground-intel-incidents-pulse', true);
    setVisibility('ground-intel-incidents-core', true);
    setVisibility('ground-intel-incidents-symbol', true);

    // DRAFT INCIDENT PLOTS: Pulsing ghost preview pins for AI drafts
    setVisibility('draft-incident-plots-halo', true);
    setVisibility('draft-incident-plots-core', true);
    setVisibility('draft-incident-plots-label', true);

    // MISSION ROUTES & ENDPOINTS: Active routes and mission destination targets (solid markers only)
    setVisibility('mission-routes-glow', activeLayers.routes);
    setVisibility('mission-routes-line', activeLayers.routes);
    setVisibility('selected-mission-glow', activeLayers.routes);
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

  // Handler to smoothly fly to and inspect segment on map
  const handleSeeSegmentOnMap = useCallback((seg: Segment) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const coords = getSegmentCurvedCoordinates(seg.id, seg.coordinates);
    if (coords && coords.length > 0) {
      const midIdx = Math.floor(coords.length / 2);
      const [lat, lng] = coords[midIdx];
      map.flyTo({
        center: [lng, lat],
        zoom: 12.5,
        essential: true,
        pitch: 30,
      });
    }
  }, []);

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
        onSeeOnMap={handleSeeSegmentOnMap}
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
      <aside aria-label="Tactical Mission Control Sidebar" className={`w-full lg:w-96 bg-surface border-r border-border flex flex-col h-full overflow-hidden z-10 shadow-xs pb-16 lg:pb-0 shrink-0 ${compactMobileOnly ? 'hidden' : mobileViewTab === 'CONTROLS' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Navigation Tabs Header: Mission Operations, K-Shortest Paths, Reports for Review */}
        <div className="flex border-b border-border bg-surface-subtle p-1 shrink-0 gap-1">
          <button
            onClick={() => setSidebarTab('MISSIONS')}
            className={`flex-1 py-1.5 px-2 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              sidebarTab === 'MISSIONS'
                ? 'bg-surface text-primary shadow-xs border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="Mission Operations"
          >
            <Shield className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{t('missionOperations')}</span>
            <span className="font-mono text-[9px] px-1 py-0.2 rounded-xs bg-primary/10 text-primary shrink-0">
              {activeMissions.length}
            </span>
          </button>
          <button
            onClick={() => setSidebarTab('ROUTING')}
            className={`flex-1 py-1.5 px-2 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              sidebarTab === 'ROUTING'
                ? 'bg-surface text-sky-500 shadow-xs border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="K-Shortest Paths"
          >
            <Navigation className="w-3.5 h-3.5 text-sky-500 shrink-0" />
            <span className="truncate">{t('kShortestPaths')}</span>
          </button>
          <button
            onClick={() => setSidebarTab('REPORTS_REVIEW')}
            className={`flex-1 py-1.5 px-2 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              sidebarTab === 'REPORTS_REVIEW'
                ? 'bg-surface text-amber-500 shadow-xs border border-border'
                : 'text-text-secondary hover:text-text-primary'
            }`}
            title="Reports for Review"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Reports for Review</span>
            {draftPlots.length > 0 && (
              <span className="font-mono text-[9px] px-1 py-0.2 rounded-xs bg-amber-500/20 text-amber-400 font-bold shrink-0 animate-pulse">
                {draftPlots.length}
              </span>
            )}
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

                        {(() => {
                          const mProb = m.isRerouted
                            ? (m.reroutedDisruptionProbability ?? m.disruptionProbability ?? 0.05)
                            : (m.disruptionProbability ?? getAuthoritativeMissionExposure(m, modelAPredictions, NER_SEGMENTS).max_probability);
                          return (
                            <div className="flex items-center gap-1 shrink-0">
                              {m.isRerouted ? (
                                <span className="px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] bg-blue-500/20 text-blue-400 border border-blue-500/40">
                                  REROUTED • {(mProb * 100).toFixed(0)}%
                                </span>
                              ) : (
                                <span
                                  className={`px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] border ${
                                    mProb >= 0.8
                                      ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                      : mProb >= 0.5
                                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/40'
                                      : 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                                  }`}
                                >
                                  RISK: {(mProb * 100).toFixed(0)}%
                                </span>
                              )}
                              <span
                                className={`px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] border shrink-0 ${
                                  m.status === 'APPROVED'
                                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/50'
                                    : m.status === 'PENDING_ADMIN_CLOSEOUT'
                                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50 animate-pulse'
                                    : 'bg-status-open-tint text-status-open-text border-status-open-solid/40'
                                }`}
                              >
                                {m.status === 'APPROVED'
                                  ? 'APPROVED'
                                  : m.status === 'PENDING_ADMIN_CLOSEOUT'
                                  ? 'AWAITING SIGN-OFF'
                                  : veh?.speed_kmh
                                  ? `${veh.speed_kmh} km/h`
                                  : 'IN_TRANSIT'}
                              </span>
                            </div>
                          );
                        })()}
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
                              {m.status === 'APPROVED' ? '0' : m.status === 'PENDING_ADMIN_CLOSEOUT' ? '100' : (veh?.route_progress_pct ?? 45)}%
                            </strong>
                          </div>
                          <div>
                            <span>{t('dist')}:</span>{' '}
                            <strong className="text-text-primary font-mono">{m.routeDistanceKm || 60} km</strong>
                          </div>
                          <div>
                            <span>{t('eta')}:</span>{' '}
                            <strong className="text-text-primary font-mono">
                              {m.status === 'APPROVED' ? 'Ready' : m.status === 'PENDING_ADMIN_CLOSEOUT' ? 'Arrived' : `${m.routeDurationMinutes || 90} min`}
                            </strong>
                          </div>
                          <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between">
                            <span>{m.isRerouted ? 'Detour Disruption Risk:' : 'Disruption Probability:'}</span>
                            {(() => {
                              const mProb = m.isRerouted
                                ? (m.reroutedDisruptionProbability ?? m.disruptionProbability ?? 0.05)
                                : (m.disruptionProbability ?? getAuthoritativeMissionExposure(m, modelAPredictions, NER_SEGMENTS).max_probability);
                              return (
                                <strong
                                  className={`font-mono font-bold ${
                                    m.isRerouted
                                      ? 'text-blue-400'
                                      : mProb >= 0.8
                                      ? 'text-red-400'
                                      : mProb >= 0.5
                                      ? 'text-orange-400'
                                      : 'text-blue-400'
                                  }`}
                                >
                                  {(mProb * 100).toFixed(0)}%{m.isRerouted ? ' (Active Main Route)' : ''}
                                </strong>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Action buttons for Ongoing / Closeout */}
                        {m.status === 'APPROVED' ? (
                          <div className="pt-1 border-t border-border/40 space-y-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dispatchMission(m.id, m.assignedVehicleId);
                              }}
                              className="w-full py-1 px-2 bg-[#1B4B73] hover:bg-[#123A5A] text-white font-bold rounded-xs text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer shadow-xs"
                            >
                              <Send className="w-3 h-3" />
                              <span>{t('dispatchMission')}</span>
                            </button>
                          </div>
                        ) : m.status === 'PENDING_ADMIN_CLOSEOUT' ? (
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
                    const isFieldReq = m.source === 'FIELD_REQUISITION' || Boolean(m.isFieldRequisition) || Boolean(m.resourceRequestId);

                    return (
                      <div
                        key={m.id}
                        onClick={() => {
                          handleFocusMission(m);
                          setIsMissionDetailsOpen(true);
                        }}
                        className={`p-3 rounded-sm border transition-all space-y-2.5 text-xs shadow-xs cursor-pointer ${
                          isSelected
                            ? isFieldReq
                              ? 'bg-emerald-500/10 border-emerald-500 ring-1 ring-emerald-500'
                              : 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500'
                            : isFieldReq
                            ? 'bg-surface border-border hover:border-emerald-500/50'
                            : 'bg-surface border-border hover:border-amber-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs ${
                                isFieldReq ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-500'
                              }`}>
                                {m.id}
                              </span>
                              <span className="font-bold text-text-primary">{m.destinationName}</span>
                            </div>
                            {isFieldReq ? (
                              <div className="mt-1 px-1.5 py-0.5 rounded-xs bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-semibold flex items-center gap-1">
                                <span>★ Genuine Ground Need</span>
                                {m.requestedByOfficer && (
                                  <span className="text-emerald-300/80 font-normal">| Indented by {m.requestedByOfficer}</span>
                                )}
                              </div>
                            ) : null}
                            <span className="text-[10px] text-text-secondary block mt-0.5">
                              {t('origin')}: <strong>{m.originWarehouseName}</strong> ➔ {t('target')}:{' '}
                              <strong>{m.disasterZoneName}</strong>
                            </span>
                          </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {isFieldReq ? (
                            <span className="px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] border shrink-0 bg-emerald-500/20 text-emerald-400 border-emerald-500/40 flex items-center gap-1">
                              <ClipboardList className="w-2.5 h-2.5" />
                              FIELD REQUISITION
                            </span>
                          ) : (
                            <span
                              className={`px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] border shrink-0 ${
                                isApproved
                                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              }`}
                            >
                              {m.status}
                            </span>
                          )}
                        </div>
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
                            {(() => {
                              const opts = missionRouteOptionsByMissionId[m.id] || m.routeOptions;
                              const selectedOptId = selectedRouteOptionByMissionId[m.id] || m.selectedRouteOptionId;
                              const activeOpt = opts?.find((o) => o.id === selectedOptId) || opts?.[0];
                              const displayEta = activeOpt ? activeOpt.predictedEtaMinutes : (m.routeDurationMinutes || 100);
                              const displayDist = activeOpt ? activeOpt.distanceKm : (m.routeDistanceKm || 65);
                              return (
                                <>
                                  <span>{t('distance')}: <strong>{displayDist} km</strong></span>
                                  <span>{t('eta')}: <strong>{displayEta} min</strong></span>
                                </>
                              );
                            })()}
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

        {/* TAB 3: REPORTS FOR REVIEW (AI Verified Draft Incidents & Spam Quarantined) */}
        {sidebarTab === 'REPORTS_REVIEW' && (
          <div className="flex-1 flex flex-col overflow-hidden text-xs">
            {/* Sub-tab toggle: [ Pending Review (X) ] [ Approved (Y) ] [ Quarantined (Z) ] */}
            <div className="p-2 border-b border-border bg-surface-subtle shrink-0">
              <div className="flex bg-surface p-0.5 rounded-sm border border-border gap-0.5">
                <button
                  onClick={() => setReviewSubTab('PENDING')}
                  className={`flex-1 py-1.5 px-1.5 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    reviewSubTab === 'PENDING'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>Pending</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-xs font-mono text-[9px] font-bold ${
                      reviewSubTab === 'PENDING' ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {draftPlots.length}
                  </span>
                </button>

                <button
                  onClick={() => setReviewSubTab('APPROVED')}
                  className={`flex-1 py-1.5 px-1.5 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    reviewSubTab === 'APPROVED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-300 shrink-0" />
                  <span>Approved</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-xs font-mono text-[9px] font-bold ${
                      reviewSubTab === 'APPROVED' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {approvedDraftPlots.length}
                  </span>
                </button>

                <button
                  onClick={() => setReviewSubTab('REJECTED')}
                  className={`flex-1 py-1.5 px-1.5 rounded-xs text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    reviewSubTab === 'REJECTED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span>Quarantined</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-xs font-mono text-[9px] font-bold ${
                      reviewSubTab === 'REJECTED' ? 'bg-white/20 text-white' : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {rejectedReports.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Content for PENDING DRAFT REPORTS */}
            {reviewSubTab === 'PENDING' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5">
                <div className="p-2 rounded-xs bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Click any report to inspect its expected pin location & affected road corridor on the map before approving.</span>
                </div>

                {/* Direct AI Field Intel Ingest Box */}
                <form onSubmit={handleProcessIntel} className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] text-text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Direct Field Intel Ingest</span>
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">Neural AI Engine</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={intelInputText}
                      onChange={(e) => setIntelInputText(e.target.value)}
                      placeholder="Type or paste field report (e.g. NH-29 landslide near Zubza)..."
                      className="flex-1 px-2.5 py-1.5 text-xs bg-surface border border-border rounded-xs text-text-primary focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      disabled={isProcessingIntel || !intelInputText.trim()}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-xs text-[11px] flex items-center gap-1 cursor-pointer transition shrink-0"
                    >
                      {isProcessingIntel ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>Process AI</span>
                        </>
                      )}
                    </button>
                  </div>
                  {intelStatus && (
                    <div className="text-[10px] text-amber-400 font-medium animate-fadeIn">
                      {intelStatus}
                    </div>
                  )}
                </form>

                {draftPlots.length === 0 ? (
                  <div className="p-6 text-center bg-surface-subtle rounded-sm text-text-secondary text-[11px] space-y-2 border border-border">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-80" />
                    <p className="font-bold text-text-primary">All Ground Reports Reviewed</p>
                    <p className="text-[10px]">No pending citizen disaster plots waiting for administrative review.</p>
                  </div>
                ) : (
                  draftPlots.map((draft) => {
                    const isSelected = draft.id === selectedDraftPlotId;

                    return (
                      <div
                        key={draft.id}
                        onClick={() => {
                          setSelectedDraftPlotId(draft.id);
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo({
                              center: ensureLngLat(draft.coordinates),
                              zoom: 13.5,
                              speed: 1.4,
                              essential: true,
                            });
                          }
                        }}
                        className={`p-3 rounded-sm border transition-all cursor-pointer space-y-2.5 text-xs shadow-xs ${
                          isSelected
                            ? 'bg-amber-500/10 border-amber-500 ring-1 ring-amber-500 shadow-md'
                            : 'bg-surface border-border hover:border-amber-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                {draft.id}
                              </span>
                              <span className="font-bold text-text-primary">{draft.title}</span>
                            </div>
                            <span className="text-[10px] text-text-secondary block mt-0.5">
                              Corridor: <strong className="text-text-primary">{draft.corridor}</strong>
                            </span>
                            <span className="text-[9px] text-text-tertiary block font-mono">
                              Coords: [{draft.coordinates[0].toFixed(3)}, {draft.coordinates[1].toFixed(3)}]
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span
                              className={`px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] border ${
                                draft.severity === 'TOTAL_BLOCKAGE'
                                  ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                                  : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              }`}
                            >
                              {draft.severity}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-xs font-mono text-[9px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              +{draft.citationsCount} Cited
                            </span>
                          </div>
                        </div>

                        {/* Inspection indicator */}
                        {isSelected && (
                          <div className="px-2 py-1 rounded-xs bg-amber-500/20 border border-amber-500/40 text-[10px] text-amber-300 font-semibold flex items-center gap-1.5 animate-pulse">
                            <Radio className="w-3 h-3 text-amber-400" />
                            <span>Expected Map Pin & Corridor Preview Active</span>
                          </div>
                        )}

                        {/* AI Verification Snippet */}
                        <div className="p-2 rounded-xs bg-surface-subtle border border-border/70 text-[10px] space-y-1">
                          <div className="flex items-center justify-between text-text-secondary">
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Geo Check: Passed
                            </span>
                            <span className="font-mono text-indigo-300">
                              AI Verified
                            </span>
                            <span className="font-bold text-text-primary">
                              Score: {draft.aiValidation.confidenceScore}/10
                            </span>
                          </div>
                          <p className="text-text-primary italic pt-0.5 leading-tight">
                            "{draft.summary}"
                          </p>
                          <div className="text-[9px] text-text-tertiary pt-0.5 border-t border-border/40">
                            By <strong>{draft.sourceReport.reporterName}</strong> ({draft.sourceReport.role}) • Raw: "{draft.sourceReport.rawText}"
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="pt-1 border-t border-border/40 flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              dismissDraftPlot(draft.id);
                              if (selectedDraftPlotId === draft.id) setSelectedDraftPlotId(null);
                            }}
                            className="px-2.5 py-1 rounded-xs bg-surface hover:bg-surface-subtle text-text-secondary hover:text-text-primary text-[10px] font-semibold border border-border cursor-pointer transition"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              approveDraftPlot(draft.id);
                              if (selectedDraftPlotId === draft.id) setSelectedDraftPlotId(null);
                            }}
                            className="px-3 py-1 rounded-xs bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs flex items-center gap-1 cursor-pointer transition btn-press"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Approve & Plot to Live Map</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Content for APPROVED REPORTS */}
            {reviewSubTab === 'APPROVED' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2.5 text-xs">
                <div className="p-2 rounded-xs bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Approved reports are actively plotted to the live tactical network and applied to route penalties.</span>
                </div>

                {approvedDraftPlots.length === 0 ? (
                  <div className="p-6 text-center bg-surface-subtle rounded-sm text-text-secondary text-[11px] border border-border">
                    No approved reports recorded yet.
                  </div>
                ) : (
                  approvedDraftPlots.map((draft) => {
                    const isSelected = draft.id === selectedDraftPlotId;

                    return (
                      <div
                        key={draft.id}
                        onClick={() => {
                          setSelectedDraftPlotId(draft.id);
                          if (mapInstanceRef.current) {
                            mapInstanceRef.current.flyTo({
                              center: ensureLngLat(draft.coordinates),
                              zoom: 13.5,
                              speed: 1.4,
                              essential: true,
                            });
                          }
                        }}
                        className={`p-3 rounded-sm border transition-all cursor-pointer space-y-2.5 text-xs shadow-xs ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500 ring-1 ring-emerald-500 shadow-md'
                            : 'bg-surface border-emerald-500/30 hover:border-emerald-500/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                {draft.id}
                              </span>
                              <span className="font-bold text-text-primary">{draft.title}</span>
                            </div>
                            <span className="text-[10px] text-text-secondary block mt-0.5">
                              Corridor: <strong className="text-text-primary">{draft.corridor}</strong>
                            </span>
                            <span className="text-[9px] text-text-tertiary block font-mono">
                              Coords: [{draft.coordinates[0].toFixed(3)}, {draft.coordinates[1].toFixed(3)}]
                            </span>
                          </div>

                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="px-1.5 py-0.5 rounded-xs font-mono font-bold text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              APPROVED & PLOTTED
                            </span>
                            <span className="text-[9px] text-text-tertiary font-mono">
                              {formatTimeAgo(draft.submittedAt)}
                            </span>
                          </div>
                        </div>

                        {/* Inspection indicator */}
                        {isSelected && (
                          <div className="px-2 py-1 rounded-xs bg-emerald-500/20 border border-emerald-500/40 text-[10px] text-emerald-300 font-semibold flex items-center gap-1.5">
                            <Radio className="w-3 h-3 text-emerald-400" />
                            <span>Centering Live Incident Marker on Map</span>
                          </div>
                        )}

                        <div className="p-2 rounded-xs bg-surface-subtle border border-border/70 text-[10px] space-y-1">
                          <p className="text-text-primary italic leading-tight">
                            "{draft.summary}"
                          </p>
                          <div className="text-[9px] text-text-tertiary pt-0.5 border-t border-border/40 flex items-center justify-between">
                            <span>Reporter: <strong>{draft.sourceReport.reporterName}</strong> ({draft.sourceReport.role})</span>
                            <span className="font-mono text-emerald-400 font-semibold">AI Conf: {draft.aiValidation.confidenceScore}/10</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Content for QUARANTINED REPORTS */}
            {reviewSubTab === 'REJECTED' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 text-xs">
                {rejectedReports.length === 0 ? (
                  <div className="p-6 text-center bg-surface-subtle rounded-sm text-text-secondary text-[11px] border border-border">
                    No quarantined reports logged.
                  </div>
                ) : (
                  rejectedReports.map((rej) => (
                    <div
                      key={rej.id}
                      className="p-2.5 rounded-sm border border-rose-500/30 bg-surface space-y-1.5 text-[10px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold px-1.5 py-0.2 rounded-xs bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          {rej.flaggedAs}
                        </span>
                        <span className="text-text-tertiary font-mono">
                          {formatTimeAgo(rej.timestamp)}
                        </span>
                      </div>
                      <div className="p-1.5 rounded-xs bg-surface-subtle border border-border text-rose-400">
                        <strong>Reason:</strong> {rej.rejectionReason}
                      </div>
                      <div className="text-text-secondary">
                        Raw: "<span className="text-text-primary">{rej.rawText}</span>" — Reporter: {rej.reporterName}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
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
      <div className={`flex-1 relative flex flex-col h-full overflow-hidden isolate ${compactMobileOnly ? 'flex' : mobileViewTab === 'MAP' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Top Floating Controls Bar - Hide in compact mobile mode since mobile shell provides search and filter chips */}
        {!compactMobileOnly && (
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
              onClick={() => toggleLayer('modelA')}
              className={`px-2 py-1 rounded-xs border font-medium cursor-pointer transition flex items-center gap-1 ${
                activeLayers.modelA
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/60 shadow-xs'
                  : 'bg-surface text-text-secondary border-border'
              }`}
              title="Toggle Model A predictive road-disruption hazard overlay (Orange / Red-Orange)"
            >
              <span className={`w-2 h-2 rounded-full ${activeLayers.modelA ? 'bg-orange-500 shadow-xs' : 'bg-slate-400'}`} />
              <span>Model A Risk</span>
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
      )}

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
                {modelAPredictions[hoveredBreakdown.segment_id] && (
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Cpu className="w-3 h-3 text-indigo-400" />
                      <span>Model A Risk:</span>
                    </span>
                    <span className={`font-mono font-bold text-[10px] px-1.5 py-0.2 rounded border ${
                      modelAPredictions[hoveredBreakdown.segment_id].risk_band === 'HIGH'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : modelAPredictions[hoveredBreakdown.segment_id].risk_band === 'ELEVATED'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                        : modelAPredictions[hoveredBreakdown.segment_id].risk_band === 'MODERATE'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}>
                      {(modelAPredictions[hoveredBreakdown.segment_id].probability * 100).toFixed(0)}% ({modelAPredictions[hoveredBreakdown.segment_id].risk_band})
                    </span>
                  </div>
                )}
              </div>
              <div className="pt-1 text-[10px] text-slate-500 italic text-right">{t('clickForDetails')}</div>
            </div>
          )}

          {/* Model A Segment Risk Tactical Hover Tooltip */}
          {activeLayers.modelA && hoveredModelASegment && !hoveredBreakdown && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-orange-500/60 rounded-sm p-3 shadow-xl backdrop-blur-md text-xs w-68 space-y-2 text-slate-200 animate-fadeIn select-none"
              style={{
                left: Math.min(Math.max(12, hoveredModelASegment.x + 12), (mapContainerRef.current?.clientWidth || window.innerWidth) - 280),
                top: Math.min(Math.max(12, hoveredModelASegment.y - 20), (mapContainerRef.current?.clientHeight || window.innerHeight) - 190),
              }}
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
                <div className="pr-2 min-w-0">
                  <div className="font-bold text-sm text-orange-400 truncate">{hoveredModelASegment.segment_name}</div>
                  {hoveredModelASegment.highway && (
                    <div className="text-[11px] font-mono text-slate-400">{hoveredModelASegment.highway}</div>
                  )}
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 border ${
                    hoveredModelASegment.model_a_risk_band === 'HIGH'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                      : hoveredModelASegment.model_a_risk_band === 'ELEVATED'
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                      : hoveredModelASegment.model_a_risk_band === 'MODERATE'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                      : 'bg-slate-700/40 text-slate-300 border-slate-600'
                  }`}
                >
                  {hoveredModelASegment.model_a_risk_band} RISK
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Road Operational Status:</span>
                  <span
                    className={`font-semibold ${
                      hoveredModelASegment.operational_status === 'BLOCKED'
                        ? 'text-red-400'
                        : hoveredModelASegment.operational_status === 'DEGRADED'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {hoveredModelASegment.operational_status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Model A Disruption Prob:</span>
                  <span className="font-mono font-bold text-orange-400">
                    {(hoveredModelASegment.model_a_probability * 100).toFixed(0)}%
                  </span>
                </div>

                {hoveredModelASegment.is_active_mission_segment && (
                  <div className="px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/30 text-sky-300 text-[10px] font-medium text-center">
                    Active Mission Corridor Segment
                  </div>
                )}
              </div>

              <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 italic flex justify-between">
                <span>Click segment to view 17 features</span>
                <span className="text-orange-400 font-mono">XGBoost v3.4.1</span>
              </div>
            </div>
          )}

          {/* Model B Route Option Tactical Hover Tooltip */}
          {hoveredRouteOption && !hoveredModelASegment && !hoveredBreakdown && (
            <div
              className="absolute z-30 pointer-events-none bg-slate-900/95 border border-sky-500/60 rounded-sm p-3 shadow-xl backdrop-blur-md text-xs w-72 space-y-2 text-slate-200 animate-fadeIn select-none"
              style={{
                left: Math.min(Math.max(12, hoveredRouteOption.x + 12), (mapContainerRef.current?.clientWidth || window.innerWidth) - 300),
                top: Math.min(Math.max(12, hoveredRouteOption.y - 20), (mapContainerRef.current?.clientHeight || window.innerHeight) - 180),
              }}
            >
              <div className="flex items-start justify-between border-b border-slate-800 pb-1.5">
                <div className="pr-2 min-w-0">
                  <div className="font-bold text-sm text-sky-400 truncate">{hoveredRouteOption.route_name}</div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Route {hoveredRouteOption.route_number} &bull; {hoveredRouteOption.is_rank_1 ? 'Lowest Predicted ETA' : 'Alternative Bypass'}
                  </div>
                </div>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider shrink-0 border ${
                    hoveredRouteOption.is_selected
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                      : 'bg-slate-700/40 text-slate-300 border-slate-600'
                  }`}
                >
                  {hoveredRouteOption.is_selected ? 'SELECTED' : 'OPTION'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px]">Predicted ETA:</span>
                  <strong className="text-emerald-400">{Math.round(hoveredRouteOption.predicted_eta_minutes)} mins</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Distance:</span>
                  <strong className="text-slate-200">{hoveredRouteOption.distance_km} km</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Delay Factor:</span>
                  <strong className="text-amber-400">{hoveredRouteOption.predicted_delay_factor.toFixed(2)}×</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Action:</span>
                  <span className="text-sky-300 text-[10px] font-sans">Click line to select</span>
                </div>
              </div>

              <div className="pt-1 border-t border-slate-800 text-[10px] text-slate-400 italic flex justify-between">
                <span>Model B 21-Feature Inference</span>
                <span className="text-sky-400 font-mono">PRAVAH GIS</span>
              </div>
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

          {/* Hovered Logistics Hub Card */}
          {hoveredHub && (
            <div
              className="absolute z-30 pointer-events-auto bg-slate-900/95 border border-primary/40 rounded-lg p-3 shadow-2xl backdrop-blur-md text-xs w-64 animate-in fade-in zoom-in-95 duration-150"
              style={{
                left: Math.min(Math.max(12, hoveredHub.x + 12), (mapContainerRef.current?.clientWidth || window.innerWidth) - 270),
                top: Math.min(Math.max(12, hoveredHub.y - 20), (mapContainerRef.current?.clientHeight || window.innerHeight) - 180),
              }}
            >
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-1.5 mb-2">
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-1.5">
                    <span>{hoveredHub.name}</span>
                    <span className="font-mono text-[10px] text-slate-400">({hoveredHub.code})</span>
                  </div>
                  <div className="text-[11px] font-medium text-slate-400">{hoveredHub.state} • {hoveredHub.type.replace('_', ' ')}</div>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 border ${
                  hoveredHub.status === 'OPERATIONAL'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                    : hoveredHub.status === 'LIMITED'
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                    : 'bg-red-500/20 text-red-400 border-red-500/50'
                }`}>
                  {hoveredHub.status}
                </span>
              </div>
              <div className="space-y-1 mb-2.5">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Available Fleet:</span>
                  <span className="font-semibold text-emerald-400">{hoveredHub.available_vehicles_count} / {hoveredHub.vehicles_count}</span>
                </div>
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-400">Stock Commodities:</span>
                  <span className="font-semibold text-slate-200">{hoveredHub.resources_count}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedHubId(hoveredHub.hub_id);
                  setActiveView('HUBS_RESOURCES');
                }}
                className="w-full py-1.5 px-2 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 rounded text-[11px] font-bold tracking-wide flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>OPEN IN LOGISTICS CENTER</span>
                <span>→</span>
              </button>
            </div>
          )}
        </div>

        {/* Interactive GIS Legend */}
        <MapLegend />
      </div>

      {/* ========================================================================= */}
      {/* RIGHT SIDE: MISSION DETAILS PANEL OR VEHICLE INSPECTOR                    */}
      {/* ========================================================================= */}
      {/* 1. Right-side Mission Details Panel - Suppressed in compact mobile mode / Field Officer mode */}
      {isMissionDetailsOpen && activeMission && !compactMobileOnly && activeRole !== 'FIELD_OFFICER' && (
        <div className="w-full lg:w-[420px] xl:w-[460px] h-auto lg:h-full z-20 shrink-0">
          <MissionDetailsPanel
            mission={activeMission}
            vehicle={vehicles.find((v) => v.mission_id === activeMission.id || (activeMission.assignedVehicleId && v.vehicle_id === activeMission.assignedVehicleId)) || null}
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
            onSelectSegment={(segId) => {
              const seg = NER_SEGMENTS.find((s) => s.id === segId);
              if (seg) setInspectedSegment(seg);
            }}
            onSelectSpatialSegment={(seg, rName) => {
              setSelectedSpatialSegmentOrder(seg.order);
              setInspectedSpatialSegment({
                segment: seg,
                routeName: rName,
              });
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
                  Boolean(m.communityName && inspectedCommunity.name && (
                    m.communityName.toLowerCase().includes(inspectedCommunity.name.toLowerCase()) ||
                    inspectedCommunity.name.toLowerCase().includes(m.communityName.toLowerCase())
                  ))
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
          onSeeOnMap={handleSeeSegmentOnMap}
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
          onClose={() => {
            if (activeSOSVehicleId) {
              handleDismissSOS(activeSOSVehicleId);
            } else {
              setActiveSOSVehicleId(null);
            }
          }}
          onStandDown={(id) => {
            handleDismissSOS(id);
          }}
        />
      )}

      {/* 8. Model A 5-Equal-Distance Spatial Segment Modal */}
      {inspectedSpatialSegment && (
        <SpatialSegmentModal
          segment={inspectedSpatialSegment.segment}
          routeName={inspectedSpatialSegment.routeName}
          onClose={() => {
            setInspectedSpatialSegment(null);
            setSelectedSpatialSegmentOrder(null);
          }}
        />
      )}
    </div>
  );
};
