import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useSimulation } from '../context/SimulationContext';
import type { VehicleTelemetry } from '../types/fleet';
import { haversineDistanceKm } from '../engine/gisMath';
import { Maximize2, Crosshair, Truck } from 'lucide-react';

export const MapView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const vehicleMarkersRef = useRef<Record<string, L.Marker>>({});
  const breadcrumbLayersRef = useRef<Record<string, L.FeatureGroup>>({});
  const routeLayersRef = useRef<L.FeatureGroup | null>(null);
  const zoneLayersRef = useRef<L.FeatureGroup | null>(null);

  const {
    vehicles,
    routes,
    blackoutZones,
    hazardZones,
    selectedVehicleId,
    focusVehicle,
    panTarget,
    setPanTarget,
  } = useSimulation();

  // Helper: Get marker SVG icon for a vehicle
  const createVehicleIcon = (vehicle: VehicleTelemetry, isSelected: boolean) => {
    const isDR = vehicle.status === 'DEAD_ZONE_EXTRAPOLATING';
    const isDeviated = vehicle.status === 'DEVIATED';
    const isSOS = vehicle.status === 'SOS_ALERT';
    const isStationary = vehicle.status === 'CRITICAL_STATIONARY';

    // Status colors and styling
    let borderColor = 'border-emerald-400';
    let bgColor = 'bg-slate-900';
    let ringHtml = '';
    let statusPillText = `${vehicle.speed_kmh} km/h`;
    let statusPillBg = 'bg-slate-900 text-slate-200 border-slate-700';

    if (isSOS) {
      borderColor = 'border-rose-500 ring-4 ring-rose-500/50';
      bgColor = 'bg-rose-950';
      statusPillText = '🚨 SOS DISTRESS';
      statusPillBg = 'bg-rose-600 text-white font-bold border-rose-400 animate-bounce';
      ringHtml = `
        <div class="absolute -inset-4 rounded-full border-2 border-rose-500/80 animate-ping pointer-events-none"></div>
        <div class="absolute -inset-7 rounded-full border border-rose-500/40 animate-pulse pointer-events-none"></div>
      `;
    } else if (isStationary) {
      borderColor = 'border-red-500 ring-2 ring-red-500/40';
      bgColor = 'bg-red-950';
      statusPillText = `⚠️ STOPPED (${Math.round(vehicle.stationary_timer_sec)}s)`;
      statusPillBg = 'bg-red-900 text-red-200 border-red-500';
      ringHtml = `
        <div class="absolute -inset-3 rounded-full border-2 border-red-500/80 animate-ping pointer-events-none"></div>
      `;
    } else if (isDeviated) {
      borderColor = 'border-rose-400 border-dashed ring-2 ring-rose-400/40';
      bgColor = 'bg-slate-900';
      statusPillText = `DEV +${vehicle.deviation_distance_m}m`;
      statusPillBg = 'bg-rose-950 text-rose-300 border-rose-500';
      ringHtml = `
        <div class="absolute -inset-3 rounded-full border-2 border-rose-500/60 animate-ping pointer-events-none"></div>
      `;
    } else if (isDR) {
      // Requirement: Orange dashed outline with pulsating radar ring indicating "Position Estimated via Dead-Reckoning (Offline)"
      borderColor = 'border-amber-400 border-dashed ring-4 ring-amber-400/30';
      bgColor = 'bg-amber-950';
      statusPillText = 'DR OFFLINE';
      statusPillBg = 'bg-amber-950 text-amber-300 border-amber-500 animate-pulse';
      ringHtml = `
        <div class="absolute -inset-4 rounded-full border-2 border-amber-400/90 animate-ping pointer-events-none"></div>
        <div class="absolute -inset-7 rounded-full border border-amber-400/40 animate-pulse pointer-events-none"></div>
        <div class="absolute -inset-2 rounded-full border border-amber-300 border-dashed animate-[spin_4s_linear_infinite] pointer-events-none"></div>
      `;
    } else if (isSelected) {
      borderColor = 'border-cyan-400 ring-4 ring-cyan-400/40';
      ringHtml = `
        <div class="absolute -inset-3 rounded-full border-2 border-cyan-400/60 animate-pulse pointer-events-none"></div>
      `;
    } else {
      // Normal online subtle radar ping
      ringHtml = `
        <div class="absolute -inset-2 rounded-full border border-emerald-400/40 animate-pulse pointer-events-none"></div>
      `;
    }

    // SVG icon by cargo
    let cargoSvg = '';
    if (vehicle.cargo_type === 'Medical Supplies') {
      cargoSvg = `<svg class="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12m-6-6h12"/></svg>`;
    } else if (vehicle.cargo_type === 'Liquid Oxygen (Hazardous)') {
      cargoSvg = `<svg class="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M8.5 7.5a3.5 3.5 0 0 0 7 0M8.5 16.5a3.5 3.5 0 0 0 7 0"/></svg>`;
    } else {
      cargoSvg = `<svg class="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
    }

    const shortName = vehicle.vehicle_name.split(' ')[0];

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer select-none" style="width: 72px; height: 72px;">
        ${ringHtml}
        
        <!-- Rotating Directional Pointer -->
        <div class="absolute inset-0 flex items-center justify-center transition-transform duration-300" style="transform: rotate(${vehicle.heading_deg}deg)">
          <div class="w-0 h-0 border-x-4 border-x-transparent border-b-[10px] ${
            isDR ? 'border-b-amber-400 shadow-[0_0_8px_#fbbf24]' : isSOS || isDeviated ? 'border-b-rose-400 shadow-[0_0_8px_#f43f5e]' : 'border-b-cyan-400 shadow-[0_0_8px_#22d3ee]'
          } -translate-y-7"></div>
        </div>

        <!-- Vehicle Identification Tag Above -->
        <div class="absolute -top-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.2 rounded text-[10px] font-bold font-mono tracking-tight shadow-md border ${
          isSelected ? 'bg-cyan-950 text-cyan-200 border-cyan-400' : 'bg-slate-900/90 text-slate-200 border-slate-700'
        }">
          ${shortName}
        </div>

        <!-- Central Vehicle Hub -->
        <div class="relative z-10 flex items-center justify-center w-9 h-9 rounded-full ${bgColor} border-2 ${borderColor} shadow-xl">
          ${cargoSvg}
        </div>

        <!-- Float Telemetry Pill Below -->
        <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.2 rounded text-[9px] font-mono shadow-md border ${statusPillBg}">
          ${statusPillText}
        </div>
      </div>
    `;

    return L.divIcon({
      className: 'vehicle-custom-marker',
      html,
      iconSize: [72, 72],
      iconAnchor: [36, 36],
    });
  };

  // Fit all routes in camera
  const fitAllRoutes = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const allCoords: [number, number][] = [];
    Object.values(routes).forEach((r) => {
      allCoords.push(...r.coordinates);
    });
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Centered over North East India
    const map = L.map(mapContainerRef.current, {
      center: [26.1, 91.8],
      zoom: 8,
      minZoom: 6,
      maxZoom: 18,
      zoomControl: true,
    });

    // High-contrast Dark Matter tactical tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://carto.com/">CARTO</a> | NER Logistics Command',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Feature group layers
    const routeLayers = L.featureGroup().addTo(map);
    const zoneLayers = L.featureGroup().addTo(map);

    routeLayersRef.current = routeLayers;
    zoneLayersRef.current = zoneLayers;
    mapInstanceRef.current = map;

    // Render Routes
    const allCoords: [number, number][] = [];
    Object.values(routes).forEach((route) => {
      allCoords.push(...route.coordinates);

      // Glow underlay
      L.polyline(route.coordinates, {
        color: route.color,
        weight: 8,
        opacity: 0.25,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayers);

      // Core route polyline
      L.polyline(route.coordinates, {
        color: route.color,
        weight: 3.5,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayers);

      // Waypoint pins
      route.waypoints.forEach((wp, idx) => {
        const isEnd = idx === 0 || idx === route.waypoints.length - 1;
        const pinIcon = L.divIcon({
          className: 'waypoint-pin',
          html: `
            <div class="flex items-center gap-1 bg-slate-900/90 border border-slate-700 px-1.5 py-0.5 rounded shadow text-[10px] font-mono text-slate-300 whitespace-nowrap">
              <span class="w-1.5 h-1.5 rounded-full ${isEnd ? 'bg-emerald-400' : 'bg-slate-400'}"></span>
              ${wp.name.split(' ')[0]}
            </div>
          `,
          iconSize: [80, 20],
          iconAnchor: [40, 10],
        });
        L.marker(wp.coords, { icon: pinIcon, interactive: false }).addTo(routeLayers);
      });
    });

    // Auto-fit bounds of all 3 corridors
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Render Blackout Zones (Striped/Faded dark grey zones)
    blackoutZones.forEach((zone) => {
      const polygon = L.polygon(zone.polygon, {
        color: '#f59e0b',
        weight: 2,
        dashArray: '6, 8',
        fillColor: '#1e293b',
        fillOpacity: 0.7,
      }).addTo(zoneLayers);

      polygon.bindPopup(`
        <div class="p-2 text-xs font-sans">
          <div class="flex items-center gap-1.5 text-amber-400 font-bold uppercase tracking-wider mb-1">
            <span>⚠️ GPS & CELLULAR BLACKOUT ZONE</span>
          </div>
          <div class="text-sm font-semibold text-white mb-1">${zone.name}</div>
          <p class="text-slate-300 text-[11px] mb-2">${zone.description}</p>
          <div class="grid grid-cols-2 gap-1 text-[10px] font-mono bg-slate-950 p-1.5 rounded border border-slate-800">
            <div><span class="text-slate-400">CORRIDOR:</span> <span class="text-slate-200">${zone.highway}</span></div>
            <div><span class="text-slate-400">GORGE DEPTH:</span> <span class="text-amber-400">${zone.depthMeters}m</span></div>
          </div>
        </div>
      `);

      // Zone Center Label
      const bounds = polygon.getBounds();
      const center = bounds.getCenter();
      L.marker(center, {
        icon: L.divIcon({
          className: 'zone-label',
          html: `
            <div class="flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-950/80 border border-amber-500/50 text-amber-400 text-[10px] font-mono uppercase shadow-md pointer-events-none whitespace-nowrap">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
              DEAD-RECKONING ZONE
            </div>
          `,
          iconSize: [140, 20],
          iconAnchor: [70, 10],
        }),
        interactive: false,
      }).addTo(zoneLayers);
    });

    // Render Landslide Hazard Zones
    hazardZones.forEach((hz) => {
      const polygon = L.polygon(hz.polygon, {
        color: '#ef4444',
        weight: 2,
        dashArray: '4, 4',
        fillColor: '#7f1d1d',
        fillOpacity: 0.45,
      }).addTo(zoneLayers);

      polygon.bindPopup(`
        <div class="p-2 text-xs font-sans">
          <div class="flex items-center gap-1.5 text-rose-400 font-bold uppercase tracking-wider mb-1">
            <span>🚨 HIGH-RISK LANDSLIDE HAZARD ZONE</span>
          </div>
          <div class="text-sm font-semibold text-white mb-1">${hz.name}</div>
          <p class="text-slate-300 text-[11px] mb-2">${hz.description}</p>
          <div class="text-[10px] font-mono bg-slate-950 p-1.5 rounded border border-slate-800 text-rose-300">
            STATIONARY RULE: Speed = 0 km/h for >10s triggers CRITICAL_STATIONARY Alert.
          </div>
        </div>
      `);
    });

    return () => {
      try {
        map.stop();
        map.remove();
      } catch (e) {
        // Ignore Leaflet animation teardown during HMR
      }
      mapInstanceRef.current = null;
      vehicleMarkersRef.current = {};
      breadcrumbLayersRef.current = {};
    };
  }, [routes, blackoutZones, hazardZones]);

  // Handle Pan Target Camera Fly-to
  useEffect(() => {
    if (!mapInstanceRef.current || !panTarget) return;
    try {
      mapInstanceRef.current.stop();
      mapInstanceRef.current.flyTo(panTarget, Math.max(mapInstanceRef.current.getZoom(), 11), {
        duration: 1.0,
        easeLinearity: 0.25,
      });
    } catch (e) {
      // Map may be unmounting
    }
    setPanTarget(null);
  }, [panTarget, setPanTarget]);

  // Update Moving Vehicle Markers and Breadcrumbs on Telemetry Ticks
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    Object.values(vehicles).forEach((vehicle) => {
      const isSelected = selectedVehicleId === vehicle.vehicle_id;
      const icon = createVehicleIcon(vehicle, isSelected);

      // 1. Vehicle Marker Update (always guarantee attachment to current map)
      let marker = vehicleMarkersRef.current[vehicle.vehicle_id];
      if (!marker) {
        marker = L.marker(vehicle.current_coords, {
          icon,
          zIndexOffset: isSelected ? 2000 : 1000,
        }).addTo(map);

        marker.on('click', () => {
          focusVehicle(vehicle.vehicle_id);
        });

        vehicleMarkersRef.current[vehicle.vehicle_id] = marker;
      } else {
        if (!map.hasLayer(marker)) {
          marker.addTo(map);
        }
        marker.setLatLng(vehicle.current_coords);
        marker.setIcon(icon);
        marker.setZIndexOffset(isSelected ? 2000 : 1000);
      }

      // 2. Breadcrumbs Polyline Update
      let breadcrumbGroup = breadcrumbLayersRef.current[vehicle.vehicle_id];
      if (!breadcrumbGroup) {
        breadcrumbGroup = L.featureGroup().addTo(map);
        breadcrumbLayersRef.current[vehicle.vehicle_id] = breadcrumbGroup;
      } else if (!map.hasLayer(breadcrumbGroup)) {
        breadcrumbGroup.addTo(map);
      }

      breadcrumbGroup.clearLayers();

      const bcList = vehicle.breadcrumbs;
      if (bcList.length >= 2) {
        for (let i = 0; i < bcList.length - 1; i++) {
          const p1 = bcList[i];
          const p2 = bcList[i + 1];

          // Skip drawing straight chords if points jumped across the map (> 2.5 km)
          if (haversineDistanceKm(p1.coords, p2.coords) > 2.5) {
            continue;
          }

          let segColor = vehicle.color;
          let dashArray: string | undefined = undefined;
          let weight = 3;

          if (p2.status === 'DEAD_ZONE_EXTRAPOLATING') {
            segColor = '#f59e0b'; // Amber for dead-reckoning extrapolation
            dashArray = '5, 5';
            weight = 3.5;
          } else if (p2.status === 'DEVIATED') {
            segColor = '#f43f5e'; // Red for unapproved off-route path
            dashArray = '4, 4';
            weight = 4;
          }

          L.polyline([p1.coords, p2.coords], {
            color: segColor,
            dashArray,
            weight,
            opacity: 0.85,
            lineCap: 'round',
          }).addTo(breadcrumbGroup);
        }
      }
    });
  }, [vehicles, selectedVehicleId, focusVehicle]);

  return (
    <div className="relative w-full h-full min-h-[500px] overflow-hidden bg-slate-950">
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Tactical Compass Rose / Coordinate HUD */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 pointer-events-none">
        <div className="bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono shadow-lg flex items-center gap-2 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>NER FLEET GIS MONITORING GRID</span>
          <span className="text-slate-500">|</span>
          <span className="text-emerald-400">EPSG:4326 WGS84</span>
        </div>
      </div>

      {/* Floating Tactical Camera Focus Bar */}
      <div className="absolute top-4 right-14 lg:right-4 z-20 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-800 shadow-xl">
        <button
          onClick={fitAllRoutes}
          title="Fit entire North East fleet in camera view"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Fit Entire Fleet</span>
        </button>

        <div className="w-px h-4 bg-slate-800" />

        {Object.values(vehicles).map((v) => (
          <button
            key={v.vehicle_id}
            onClick={() => focusVehicle(v.vehicle_id)}
            title={`Center camera on ${v.vehicle_name}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
              selectedVehicleId === v.vehicle_id
                ? 'bg-slate-800 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: v.color }}
            />
            <span>{v.vehicle_name.split(' ')[0]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
