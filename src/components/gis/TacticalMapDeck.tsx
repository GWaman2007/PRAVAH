import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { usePravahStore } from '../../store/usePravahStore';
import { LANDSLIDE_HAZARD_GEOJSON, NER_DISTRICTS_GEOJSON, NER_CHOKE_POINTS } from '../../data/nerGeoJSON';
import { NER_NODES, VEHICLE_PROFILES, NER_SEGMENTS } from '../../data/routingNetwork';
import { BLACKOUT_ZONES } from '../../data/fleetData';
import {
  fetchLiveChokePointWeather,
  generateSimulatedMonsoonTelemetry,
  type StationWeatherTelemetry,
} from '../../engine/openMeteoService';
import { SegmentModal } from './SegmentModal';
import { VehicleInspector } from './VehicleInspector';
import { AlertFeedModal } from './AlertFeedModal';
import { SOSModal } from './SOSModal';
import { MapLegend } from './MapLegend';
import type { Segment, VehicleProfile } from '../../types';
import {
  CloudRain,
  Navigation,
  Truck,
  AlertTriangle,
  Play,
  Pause,
  AlertOctagon,
  Shield,
  RotateCcw,
  FastForward,
  Bell,
  Radio,
  Sliders,
  Maximize2,
  ExternalLink,
} from 'lucide-react';

export const TacticalMapDeck: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups refs
  const lhzLayerRef = useRef<L.GeoJSON | null>(null);
  const imdLayerRef = useRef<L.GeoJSON | null>(null);
  const chokePointsLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const vehiclesLayerRef = useRef<L.LayerGroup | null>(null);
  const blackoutLayerRef = useRef<L.LayerGroup | null>(null);

  const {
    activeLayers,
    toggleLayer,
    imdFilter,
    setImdFilter,
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
  } = usePravahStore();

  // Modals & Drawers state
  const [inspectedSegment, setInspectedSegment] = useState<Segment | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState<boolean>(true);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [activeSOSVehicleId, setActiveSOSVehicleId] = useState<string | null>(null);
  const [mobileViewTab, setMobileViewTab] = useState<'MAP' | 'CONTROLS'>('MAP');

  // Custom vehicle specifications state
  const [isCustomSpecsActive, setIsCustomSpecsActive] = useState<boolean>(false);
  const [customWeight, setCustomWeight] = useState<number>(32.0);
  const [customHeight, setCustomHeight] = useState<number>(4.2);
  const [customWidth, setCustomWidth] = useState<number>(2.9);

  // Station weather telemetry state
  const [stationTelemetry, setStationTelemetry] = useState<StationWeatherTelemetry[]>([]);
  const [weatherSource, setWeatherSource] = useState<'LIVE' | 'SIMULATED'>('LIVE');

  // Selected vehicle object
  const activeVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find((v) => v.vehicle_id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Unacknowledged alerts count
  const unackAlertsCount = useMemo(() => {
    return alerts.filter((a) => !a.acknowledged).length;
  }, [alerts]);

  // Handle custom vehicle profile updates
  const handleApplyCustomSpecs = () => {
    const customProfile: VehicleProfile = {
      id: 'CUSTOM_AXLE_SPEC',
      name: `Custom Rig (${customWeight}T, ${customHeight}m H)`,
      type: 'Custom User Specification',
      height_m: customHeight,
      width_m: customWidth,
      weight_tonnes: customWeight,
      turn_radius_m: 14.0,
      fuel_efficiency_km_l: 3.0,
      max_speed_kmh: 60,
      icon: 'truck',
    };
    setSelectedVehicle(customProfile);
    setIsCustomSpecsActive(true);
  };

  // 1. Fetch live Open-Meteo weather on mount
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

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered on North East India: [26.2006, 92.9376], zoom 7
    const map = L.map(mapContainerRef.current, {
      center: [26.2006, 92.9376],
      zoom: 7,
      zoomControl: true,
      attributionControl: false,
    });

    // Base Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
    }).addTo(map);

    // Initialize layer groups
    chokePointsLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    vehiclesLayerRef.current = L.layerGroup().addTo(map);
    blackoutLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Render ISRO Bhuvan Landslide Hazard Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (lhzLayerRef.current) {
      map.removeLayer(lhzLayerRef.current);
      lhzLayerRef.current = null;
    }

    if (activeLayers.lhz) {
      const layer = L.geoJSON(LANDSLIDE_HAZARD_GEOJSON, {
        style: (feature) => {
          const sev = feature?.properties?.severity;
          const color =
            sev === 'Very High' ? '#D92D20' : sev === 'High' ? '#D2691E' : '#B8860B';
          return {
            fillColor: color,
            fillOpacity: 0.35,
            color: color,
            weight: 2,
            dashArray: sev === 'Very High' ? '4, 4' : undefined,
          };
        },
        onEachFeature: (feature, l) => {
          const p = feature.properties;
          l.bindPopup(`
            <div style="font-family: sans-serif; min-width: 200px;">
              <div style="font-weight: bold; color: #1B4B73; font-size: 13px; margin-bottom: 4px;">${p.name}</div>
              <div style="font-size: 11px; margin-bottom: 2px;"><strong>Bhuvan Code:</strong> ${p.bhuvan_code}</div>
              <div style="font-size: 11px; margin-bottom: 2px;"><strong>Severity:</strong> <span style="color: #D92D20; font-weight: bold;">${p.severity}</span></div>
              <div style="font-size: 11px; margin-bottom: 2px;"><strong>Slope:</strong> ${p.slope_gradient}</div>
              <div style="font-size: 11px; color: #555; margin-top: 4px;">${p.advisory}</div>
            </div>
          `);
        },
      }).addTo(map);
      lhzLayerRef.current = layer;
    }
  }, [activeLayers.lhz]);

  // 4. Render IMD Weather Alert Choropleth
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (imdLayerRef.current) {
      map.removeLayer(imdLayerRef.current);
      imdLayerRef.current = null;
    }

    if (activeLayers.imd) {
      const layer = L.geoJSON(NER_DISTRICTS_GEOJSON, {
        filter: (feature) => {
          if (imdFilter === 'ALL') return true;
          return feature.properties.default_alert === imdFilter;
        },
        style: (feature) => {
          const alert = feature?.properties?.default_alert;
          let color = '#2E7D46'; // Green
          if (alert === 'Red') color = '#D92D20';
          else if (alert === 'Orange') color = '#D2691E';
          else if (alert === 'Yellow') color = '#B8860B';

          return {
            fillColor: color,
            fillOpacity: 0.25,
            color: color,
            weight: 1.5,
          };
        },
        onEachFeature: (feature, l) => {
          const p = feature.properties;
          l.bindPopup(`
            <div style="font-family: sans-serif; min-width: 220px;">
              <div style="font-weight: bold; color: #1B4B73; font-size: 13px;">${p.district_name} (${p.state_name})</div>
              <div style="margin: 4px 0; font-size: 11px;"><strong>IMD Bulletin:</strong> <span style="font-weight: bold;">${p.warning_title}</span></div>
              <div style="font-size: 11px; margin-bottom: 2px;"><strong>24h Forecast:</strong> ${p.rainfall_forecast_24h}</div>
              <div style="font-size: 11px; color: #444; margin-top: 4px;">${p.weather_summary}</div>
            </div>
          `);
        },
      }).addTo(map);
      imdLayerRef.current = layer;
    }
  }, [activeLayers.imd, imdFilter]);

  // 5. Render Cellular Blackout Polygons & Open-Meteo Choke Point Pins
  useEffect(() => {
    const group = chokePointsLayerRef.current;
    if (!group) return;
    group.clearLayers();

    // Render Blackout Polygons
    BLACKOUT_ZONES.forEach((zone) => {
      L.polygon(zone.polygon, {
        color: '#8A8F94',
        weight: 2,
        dashArray: '5, 5',
        fillColor: '#5B6066',
        fillOpacity: 0.2,
      })
        .bindPopup(`
          <div style="font-family: sans-serif;">
            <div style="font-weight: bold; color: #D92D20;">📵 Cellular Blackout Zone</div>
            <div style="font-size: 12px; margin-top: 4px;">${zone.name}</div>
            <div style="font-size: 11px; color: #555;">Expected Transit: ${zone.expectedTransitMinutes}m (Watchdog Buffer: +${zone.bufferMultiplier * 100}%)</div>
          </div>
        `)
        .addTo(group);
    });

    // Render Open-Meteo Live Station Markers ported from HeatMapTesting
    const sourcePoints = stationTelemetry.length > 0 ? stationTelemetry : NER_CHOKE_POINTS;

    sourcePoints.forEach((cp: any) => {
      const mm = cp.precipitation_mm ?? 0.0;
      let badgeColor = '#2E7D46';
      let pulseAnim = '';

      if (mm > 15.0) {
        badgeColor = '#D92D20';
        pulseAnim = 'animation: pulse 1.5s infinite;';
      } else if (mm >= 5.0) {
        badgeColor = '#D2691E';
      } else if (mm > 0.0) {
        badgeColor = '#2E7D46';
      } else {
        badgeColor = '#5B6066';
      }

      const icon = L.divIcon({
        className: 'choke-weather-marker',
        html: `
          <div style="
            background: ${badgeColor};
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.4);
            ${pulseAnim}
          ">
            ${mm > 0 ? mm.toFixed(0) : '0'}
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const marker = L.marker([cp.lat, cp.lng], { icon });

      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 220px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-family: monospace; color: #666;">${cp.id}</span>
            <span style="background: ${badgeColor}; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">
              ${mm.toFixed(1)} mm/h
            </span>
          </div>
          <div style="font-weight: bold; font-size: 12px; color: #1B4B73;">${cp.name}</div>
          <div style="font-size: 11px; margin-top: 2px;"><strong>Highway:</strong> ${cp.highway} (${cp.state})</div>
          <div style="font-size: 11px;"><strong>Condition:</strong> ${cp.weather_desc || 'Nominal Precipitation'}</div>
          <div style="font-size: 11px;"><strong>Elevation:</strong> ${cp.elevation_m}m ${cp.temperature_c ? `| ${cp.temperature_c}°C` : ''}</div>
          <div style="font-size: 11px; color: #D2691E; margin-top: 3px;"><strong>BRO Support:</strong> ${cp.nearest_bro_base}</div>
          <div style="font-size: 9px; color: #888; margin-top: 4px; border-top: 1px solid #eee; padding-top: 2px;">
            Source: Open-Meteo ${weatherSource === 'SIMULATED' ? '(Simulated Orographic)' : '(Live Satellite)'}
          </div>
        </div>
      `);

      marker.bindTooltip(`${cp.name}: ${mm.toFixed(1)} mm`, { direction: 'top', offset: [0, -12] });
      marker.addTo(group);
    });
  }, [stationTelemetry, weatherSource]);

  // 6. Render Candidate Routes
  useEffect(() => {
    const group = routesLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!activeLayers.routes) return;

    candidateRoutes.forEach((route, idx) => {
      const isSelected = idx === selectedRouteIndex;

      // Extract all segment coordinates
      const allCoords: [number, number][] = [];
      route.segments.forEach((seg) => {
        allCoords.push(...seg.coordinates);
      });

      if (allCoords.length < 2) return;

      const polyline = L.polyline(allCoords, {
        color: route.color,
        weight: isSelected ? 6 : 3,
        opacity: isSelected ? 0.95 : 0.45,
        dashArray: route.dashArray,
      });

      polyline.on('click', () => setSelectedRouteIndex(idx));

      polyline.bindPopup(`
        <div style="font-family: sans-serif; min-width: 220px;">
          <div style="font-weight: bold; color: ${route.color}; font-size: 13px;">
            Rank ${route.rank}: ${route.rankLabel}
          </div>
          <div style="font-size: 11px; margin-top: 4px;">
            <strong>Distance:</strong> ${route.totalDistanceKm} km | <strong>ETA:</strong> ${route.degradedDurationMinutes} min
          </div>
          <div style="font-size: 11px;">
            <strong>Composite Safety:</strong> ${route.compositeSafetyScore}%
          </div>
          ${
            route.failureBottleneck
              ? `<div style="color: #D92D20; font-size: 11px; margin-top: 4px; font-weight: bold;">
                  ❌ Bottleneck: ${route.failureBottleneck.reason}
                 </div>`
              : ''
          }
        </div>
      `);

      polyline.addTo(group);

      // If impassable, render failure pin at bottleneck
      if (!route.isPassable && route.failureBottleneck) {
        const icon = L.divIcon({
          className: 'custom-bottleneck-icon',
          html: `<div style="background-color: #D92D20; color: white; width: 22px; height: 22px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">✕</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });

        L.marker(route.failureBottleneck.coordinates, { icon })
          .bindPopup(`
            <div style="font-family: sans-serif;">
              <div style="font-weight: bold; color: #D92D20;">Impassable Constraint Violation</div>
              <div style="font-size: 11px; margin-top: 2px;">${route.failureBottleneck.reason}</div>
            </div>
          `)
          .addTo(group);
      }
    });
  }, [candidateRoutes, selectedRouteIndex, activeLayers.routes]);

  // 7. Render Fleet Vehicles & Telemetry
  useEffect(() => {
    const group = vehiclesLayerRef.current;
    if (!group) return;
    group.clearLayers();

    if (!activeLayers.fleet) return;

    vehicles.forEach((veh) => {
      if (activeRole === 'DRIVER' && veh.vehicle_id !== 'Medic-01') return;

      const isDeadReckon = veh.status === 'DEAD_ZONE_EXTRAPOLATING';
      const isSOS = veh.status === 'SOS_ALERT';
      const isOverdue = veh.is_watchdog_amber || veh.is_watchdog_red;

      const markerColor = isSOS ? '#D92D20' : isOverdue ? '#D2691E' : isDeadReckon ? '#8A8F94' : '#1B4B73';

      const iconHtml = `
        <div style="
          width: 32px;
          height: 32px;
          background: ${markerColor};
          border: 2px solid #FFFFFF;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 3px 6px rgba(0,0,0,0.35);
          transform: rotate(${veh.heading_deg}deg);
        ">
          ➤
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'veh-marker',
        html: iconHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker(veh.current_coords, { icon: customIcon });

      marker.on('click', () => {
        setSelectedVehicleId(veh.vehicle_id);
        setIsInspectorOpen(true);
      });

      marker.addTo(group);

      // Render Breadcrumbs
      if (veh.breadcrumbs.length > 1) {
        const breadcrumbCoords = veh.breadcrumbs.map((b) => b.coords);
        L.polyline(breadcrumbCoords, {
          color: isDeadReckon ? '#8A8F94' : '#1B4B73',
          weight: 2,
          opacity: 0.6,
          dashArray: isDeadReckon ? '4, 4' : undefined,
        }).addTo(group);
      }
    });
  }, [vehicles, selectedVehicleId, activeLayers.fleet, activeRole]);

  const selectedRoute = candidateRoutes[selectedRouteIndex] || candidateRoutes[0];

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-112px)] sm:h-[calc(100vh-105px)] overflow-hidden bg-page-bg relative">
      {/* Mobile View Switcher Tab Bar (< lg) */}
      <div className="lg:hidden flex items-center bg-surface border-b border-border p-1.5 shrink-0 z-20">
        <button
          onClick={() => {
            setMobileViewTab('MAP');
            setTimeout(() => {
              mapInstanceRef.current?.invalidateSize();
            }, 100);
          }}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileViewTab === 'MAP'
              ? 'bg-[#1B4B73] text-white shadow-xs dark:bg-[#2E6B9E]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
          }`}
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Tactical Map Deck</span>
        </button>
        <button
          onClick={() => setMobileViewTab('CONTROLS')}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            mobileViewTab === 'CONTROLS'
              ? 'bg-[#1B4B73] text-white shadow-xs dark:bg-[#2E6B9E]'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>K-Routing & Controls</span>
          {Object.keys(activeDisruptions).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-xs bg-status-blocked-solid text-white text-[9px] font-mono font-bold">
              {Object.keys(activeDisruptions).length}
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

      {/* Left Sidebar: Controls & Predictive Routing */}
      <div className={`w-full lg:w-96 bg-surface border-r border-border flex flex-col h-full overflow-y-auto z-10 shadow-xs custom-scrollbar ${mobileViewTab === 'CONTROLS' ? 'block' : 'hidden lg:flex'}`}>
        {/* Route Selector Header */}
        <div className="p-4 border-b border-border bg-surface-subtle space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm text-text-primary flex items-center space-x-2">
              <Navigation className="w-4 h-4 text-primary" />
              <span>Predictive K-Shortest Routing</span>
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-primary/10 text-primary">
              Top 5 Paths
            </span>
          </div>

          {/* Origin & Destination */}
          <div className="space-y-2">
            <div>
              <label className="text-[11px] font-medium text-text-secondary uppercase">
                Origin Logistics Hub
              </label>
              <select
                value={originHub}
                onChange={(e) => setOriginHub(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
              >
                {Object.values(NER_NODES).map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-medium text-text-secondary uppercase">
                Destination Target Community
              </label>
              <select
                value={destinationHub}
                onChange={(e) => setDestinationHub(e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 text-xs bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
              >
                {Object.values(NER_NODES).map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Profile Selector */}
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-medium text-text-secondary uppercase">
                  Vehicle Profile & Hard Constraints
                </label>
                <button
                  onClick={() => setIsCustomSpecsActive(!isCustomSpecsActive)}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>{isCustomSpecsActive ? 'Preset Models' : 'Custom Specs'}</span>
                </button>
              </div>

              {!isCustomSpecsActive ? (
                <select
                  value={selectedVehicle.id}
                  onChange={(e) => {
                    const v = VEHICLE_PROFILES.find((p) => p.id === e.target.value);
                    if (v) setSelectedVehicle(v);
                  }}
                  className="w-full mt-1 px-2.5 py-1.5 text-xs bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                >
                  {VEHICLE_PROFILES.map((vp) => (
                    <option key={vp.id} value={vp.id}>
                      {vp.name} — {vp.weight_tonnes}T, {vp.height_m}m H
                    </option>
                  ))}
                </select>
              ) : (
                <div className="mt-2 p-2.5 bg-surface rounded-sm border border-border space-y-2 text-[11px]">
                  <div>
                    <div className="flex justify-between text-text-secondary mb-0.5">
                      <span>Gross Weight:</span>
                      <span className="font-mono font-bold text-text-primary">{customWeight} Tonnes</span>
                    </div>
                    <input
                      type="range"
                      min={2}
                      max={50}
                      step={1}
                      value={customWeight}
                      onChange={(e) => setCustomWeight(Number(e.target.value))}
                      className="w-full accent-primary h-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-text-secondary mb-0.5">
                      <span>Height Clearance:</span>
                      <span className="font-mono font-bold text-text-primary">{customHeight} Meters</span>
                    </div>
                    <input
                      type="range"
                      min={1.8}
                      max={5.0}
                      step={0.1}
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      className="w-full accent-primary h-1.5"
                    />
                  </div>

                  <button
                    onClick={handleApplyCustomSpecs}
                    className="w-full py-1 text-[10px] font-semibold bg-primary text-white rounded-xs btn-press"
                  >
                    Apply Custom Axle Load
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Rainfall mm/hr Slider ported from psudeoroutingtest */}
        <div className="p-4 border-b border-border bg-surface space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-sky-500" />
              <span>Live Rainfall Degradation</span>
            </span>
            <span className="font-mono text-xs font-bold text-text-primary bg-surface-subtle px-2 py-0.5 rounded border border-border">
              {rainfallMmHr} mm/h
            </span>
          </div>

          <input
            type="range"
            min={0}
            max={50}
            step={1}
            value={rainfallMmHr}
            onChange={(e) => setRainfallMmHr(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-2"
          />

          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => setRainfallMmHr(0)}
              className="py-1 text-[10px] rounded-xs bg-surface-subtle hover:bg-border/60 border border-border text-text-secondary transition btn-press cursor-pointer"
            >
              ☀️ Clear (0mm)
            </button>
            <button
              onClick={() => setRainfallMmHr(24)}
              className="py-1 text-[10px] rounded-xs bg-surface-subtle hover:bg-border/60 border border-border text-text-secondary transition btn-press cursor-pointer"
            >
              🌧️ Rain (24mm)
            </button>
            <button
              onClick={() => setRainfallMmHr(46)}
              className="py-1 text-[10px] rounded-xs bg-surface-subtle hover:bg-border/60 border border-border text-status-blocked-text transition btn-press cursor-pointer"
            >
              ⛈️ Surge (46mm)
            </button>
          </div>
        </div>

        {/* Quick Field Disruption Injectors from psudeoroutingtest */}
        <div className="p-4 border-b border-border bg-surface space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-status-blocked-solid" />
              <span>Field Disruption Scenarios</span>
            </span>
            {Object.keys(activeDisruptions).length > 0 && (
              <button
                onClick={clearAllDisruptions}
                className="text-[10px] text-status-blocked-text hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-1.5 text-left text-xs">
            <button
              onClick={triggerScenarioNH6Landslide}
              className="p-2 rounded-xs border border-status-blocked-solid/40 bg-status-blocked-tint/30 text-status-blocked-text hover:bg-status-blocked-tint/60 text-left transition btn-press cursor-pointer"
            >
              <div className="font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-blocked-solid animate-ping" />
                NH-6 Landslide (Lubha Bridge)
              </div>
              <span className="text-[10px] text-text-secondary block mt-0.5">Total road blockage at Jowai-Silchar</span>
            </button>

            <button
              onClick={triggerScenarioNH29FlashFlood}
              className="p-2 rounded-xs border border-status-blocked-solid/40 bg-status-blocked-tint/30 text-status-blocked-text hover:bg-status-blocked-tint/60 text-left transition btn-press cursor-pointer"
            >
              <div className="font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-status-blocked-solid animate-ping" />
                NH-29 Flash Flood (Paglapahar)
              </div>
              <span className="text-[10px] text-text-secondary block mt-0.5">Dimapur-Kohima mudflow impassable</span>
            </button>

            <button
              onClick={triggerScenarioHaflongBridgeRisk}
              className="p-2 rounded-xs border border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 text-left transition btn-press cursor-pointer"
            >
              <div className="font-semibold">Haflong Bridge Risk (18T Limit)</div>
              <span className="text-[10px] text-text-secondary block mt-0.5">Barail Pass structural foundation scour</span>
            </button>
          </div>
        </div>

        {/* Candidate Routes List */}
        <div className="p-4 border-b border-border flex-1 overflow-y-auto space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary">Evaluated Routes</span>
            {selectedRoute && (
              <button
                onClick={() => {
                  const firstSeg = selectedRoute.segments[0];
                  if (firstSeg) setInspectedSegment(firstSeg);
                }}
                className="text-[10px] text-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Inspect Segments</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {candidateRoutes.map((route, idx) => {
              const isSelected = idx === selectedRouteIndex;
              return (
                <div
                  key={route.id}
                  onClick={() => setSelectedRouteIndex(idx)}
                  className={`p-3 rounded-sm border transition-colors cursor-pointer text-xs ${
                    isSelected
                      ? 'border-primary bg-primary-tint/30 dark:bg-primary-tint/20'
                      : 'border-border bg-surface hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: route.color }}
                      />
                      <span className="font-semibold text-text-primary">
                        Rank {route.rank}: {route.rankLabel}
                      </span>
                    </div>
                    <span
                      className={`font-mono font-bold ${
                        route.isPassable ? 'text-status-open-text' : 'text-status-blocked-text'
                      }`}
                    >
                      {route.isPassable ? `${route.compositeSafetyScore}% Safe` : 'BLOCKED'}
                    </span>
                  </div>

                  <div className="mt-2 grid grid-cols-2 gap-2 text-text-secondary text-[11px]">
                    <div>
                      <span>Distance:</span>{' '}
                      <span className="font-medium text-text-primary">{route.totalDistanceKm} km</span>
                    </div>
                    <div>
                      <span>Transit ETA:</span>{' '}
                      <span className="font-medium text-text-primary">{route.degradedDurationMinutes} min</span>
                    </div>
                  </div>

                  {!route.isPassable && route.failureBottleneck && (
                    <div className="mt-2 p-2 rounded-sm bg-status-blocked-tint border border-status-blocked-solid/30 text-status-blocked-text">
                      <div className="font-semibold flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Pruned by Constraint:</span>
                      </div>
                      <p className="mt-0.5 text-[11px] leading-tight">
                        {route.failureBottleneck.reason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Telemetry Scrubber & Speed Controls ported from vehicletracking */}
        <div className="p-4 bg-surface-subtle border-t border-border space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary flex items-center space-x-1.5">
              <Truck className="w-3.5 h-3.5 text-primary" />
              <span>Fleet Telemetry Scrubber</span>
            </span>

            {/* Alert Feed Trigger */}
            <button
              onClick={() => setIsAlertModalOpen(true)}
              className="relative p-1.5 rounded-xs border border-border bg-surface text-text-secondary hover:text-text-primary cursor-pointer"
              title="Open Watchdog Alert Feed"
            >
              <Bell className="w-3.5 h-3.5" />
              {unackAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-status-blocked-solid text-[9px] font-bold text-white">
                  {unackAlertsCount}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={toggleSimulation}
              className="flex-1 py-1.5 text-xs font-medium rounded-sm border border-border bg-surface text-text-primary hover:bg-surface-subtle transition-colors flex items-center justify-center space-x-1 btn-press cursor-pointer"
            >
              {isSimulationRunning ? (
                <>
                  <Pause className="w-3 h-3 text-status-highrisk-solid" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 text-status-open-solid" />
                  <span>Resume</span>
                </>
              )}
            </button>

            {/* Speed Multiplier Scrubber: 1x, 2x, 5x */}
            <div className="flex items-center gap-1 bg-surface p-1 rounded-sm border border-border text-xs">
              {[1, 2, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setSimulationSpeed(spd)}
                  className={`px-2 py-0.5 rounded-xs font-mono font-bold transition-all cursor-pointer ${
                    simulationSpeed === spd
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Leaflet Tactical Map Deck */}
      <div className={`flex-1 relative flex flex-col h-full ${mobileViewTab === 'MAP' ? 'flex' : 'hidden lg:flex'}`}>
        {/* Top HUD Controls Bar */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-auto right-2 sm:right-3 z-20 flex items-center gap-1.5 sm:gap-2 bg-surface/92 dark:bg-slate-900/92 backdrop-blur-md p-1.5 sm:p-2 rounded-sm border border-border shadow-md overflow-x-auto no-scrollbar max-w-[calc(100vw-16px)]">
          {/* Layer Toggles */}
          <div className="flex items-center space-x-1 text-[11px] sm:text-xs shrink-0">
            <button
              onClick={() => toggleLayer('lhz')}
              className={`px-2 sm:px-2.5 py-1 rounded-sm border font-medium transition-colors cursor-pointer ${
                activeLayers.lhz
                  ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                  : 'bg-surface text-text-secondary border-border'
              }`}
            >
              ISRO LHZ
            </button>

            <button
              onClick={() => toggleLayer('imd')}
              className={`px-2 sm:px-2.5 py-1 rounded-sm border font-medium transition-colors cursor-pointer ${
                activeLayers.imd
                  ? 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
                  : 'bg-surface text-text-secondary border-border'
              }`}
            >
              IMD Alerts
            </button>

            <button
              onClick={() => toggleLayer('routes')}
              className={`px-2 sm:px-2.5 py-1 rounded-sm border font-medium transition-colors cursor-pointer ${
                activeLayers.routes
                  ? 'bg-primary-tint text-primary border-primary'
                  : 'bg-surface text-text-secondary border-border'
              }`}
            >
              K-Routes
            </button>

            <button
              onClick={() => toggleLayer('fleet')}
              className={`px-2 sm:px-2.5 py-1 rounded-sm border font-medium transition-colors cursor-pointer ${
                activeLayers.fleet
                  ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
                  : 'bg-surface text-text-secondary border-border'
              }`}
            >
              Telemetry
            </button>
          </div>

          {/* Monsoon Simulation Toggle */}
          <button
            onClick={toggleMonsoonDownpourSimulation}
            className={`flex items-center space-x-1 px-2 sm:px-2.5 py-1 rounded-sm text-[11px] sm:text-xs font-medium border transition-colors btn-press cursor-pointer shrink-0 ${
              isMonsoonDownpourSimulated
                ? 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid animate-pulse'
                : 'bg-surface text-text-secondary border-border'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">{isMonsoonDownpourSimulated ? 'Monsoon Surge (58 mm/h)' : 'Simulate Monsoon'}</span>
            <span className="xs:hidden">{isMonsoonDownpourSimulated ? '58 mm/h' : 'Monsoon'}</span>
          </button>
        </div>

        {/* Map Container */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Interactive Tactical GIS Map Legend */}
        <MapLegend />
      </div>

      {/* Vehicle Inspector: Side panel on desktop, slide-up sheet on mobile */}
      {isInspectorOpen && activeVehicle && (
        <>
          {/* Mobile Backdrop */}
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-2xs"
            onClick={() => setIsInspectorOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-x-0 bottom-0 max-h-[82vh] lg:relative lg:inset-auto lg:max-h-none w-full lg:w-80 h-auto lg:h-full z-30 lg:z-10 shadow-2xl lg:shadow-none animate-fadeIn lg:animate-none">
            <VehicleInspector
              vehicle={activeVehicle}
              onClose={() => setIsInspectorOpen(false)}
              onToggleHalt={(id) => toggleVehicleHalt(id)}
              onToggleDeviation={(id) => toggleVehicleDeviation(id)}
              onTriggerSOS={(id) => triggerVehicleSOS(id)}
            />
          </div>
        </>
      )}
    </div>
  );
};
