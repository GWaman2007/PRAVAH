import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useSimulation } from '../context/SimulationContext';
import { NER_NODES, NER_SEGMENTS } from '../data/nerGraphData';
import { Maximize2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from 'lucide-react';

interface MapViewProps {
  showLeftPanel?: boolean;
  onToggleLeftPanel?: () => void;
  showRightPanel?: boolean;
  onToggleRightPanel?: () => void;
}

export const MapView: React.FC<MapViewProps> = ({
  showLeftPanel = true,
  onToggleLeftPanel,
  showRightPanel = true,
  onToggleRightPanel,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups refs to easily clear and re-render without recreating the entire map
  const baseRoadsLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const nodesLayerRef = useRef<L.LayerGroup | null>(null);
  const incidentsLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const {
    originNode,
    destinationNode,
    candidateRoutes,
    selectedRoute,
    setSelectedRouteId,
    setInspectedSegmentId,
    mapTileLayer,
    setMapTileLayer,
    disruptions,
  } = useSimulation();

  // 1. Initialize Map with ResizeObserver
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [25.8, 92.5],
      zoom: 7,
      minZoom: 5,
      maxZoom: 15,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    baseRoadsLayerRef.current = L.layerGroup().addTo(map);
    routesLayerRef.current = L.layerGroup().addTo(map);
    nodesLayerRef.current = L.layerGroup().addTo(map);
    incidentsLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    // Attach ResizeObserver so map automatically shrinks/expands with zero glitching
    const ro = new ResizeObserver(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    });
    ro.observe(mapContainerRef.current);

    return () => {
      ro.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Tile Layer Update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    let url = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
    let attribution = '&copy; Esri &mdash; Esri, DeLorme, NAVTEQ';

    if (mapTileLayer === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Earthstar Geographics';
    } else if (mapTileLayer === 'street') {
      url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      attribution = '&copy; OpenStreetMap contributors';
    }

    const tileLayer = L.tileLayer(url, {
      attribution,
      maxZoom: 18,
      subdomains: 'abcd',
    }).addTo(map);

    tileLayerRef.current = tileLayer;
  }, [mapTileLayer]);

  // 3. Render Background Road Network
  useEffect(() => {
    const map = mapInstanceRef.current;
    const baseLayer = baseRoadsLayerRef.current;
    if (!map || !baseLayer) return;

    baseLayer.clearLayers();

    for (const seg of NER_SEGMENTS) {
      const polyline = L.polyline(seg.coordinates, {
        color: '#334155',
        weight: 3,
        opacity: 0.45,
        smoothFactor: 1.0,
      });

      polyline.bindTooltip(
        `<div class="text-[11px] font-sans">
          <strong>${seg.highwayCode}</strong>: ${seg.name}<br/>
          <span class="text-slate-400">LHZ Level: ${seg.bhuvan_lhz_level} | Grade: ${seg.gradient_pct}%</span>
        </div>`,
        { sticky: true, className: 'leaflet-tactical-tooltip' }
      );

      polyline.on('click', () => {
        setInspectedSegmentId(seg.id);
      });

      baseLayer.addLayer(polyline);
    }
  }, [setInspectedSegmentId]);

  // 4. Render Candidate Routes Polylines & Bottlenecks
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routesLayer = routesLayerRef.current;
    const incidentsLayer = incidentsLayerRef.current;
    if (!map || !routesLayer || !incidentsLayer) return;

    routesLayer.clearLayers();
    incidentsLayer.clearLayers();

    // Render routes from bottom to top so selected and Rank 1 are on top
    const sortedToRender = [...candidateRoutes].sort((a, b) => {
      if (a.id === selectedRoute?.id) return 1;
      if (b.id === selectedRoute?.id) return -1;
      if (a.rank === 1) return 1;
      if (b.rank === 1) return -1;
      return a.rank - b.rank;
    });

    const allRouteLatLngs: L.LatLngExpression[] = [];

    sortedToRender.forEach(route => {
      const isSelected = selectedRoute?.id === route.id;
      const isRank1 = route.rank === 1;

      const coords: [number, number][] = [];
      route.segments.forEach(seg => {
        coords.push(...seg.coordinates);
      });

      if (coords.length > 0) {
        allRouteLatLngs.push(...coords);
      }

      // Outer glow for selected or rank 1 route
      if (isSelected || isRank1) {
        const glowColor = isRank1 ? '#10B981' : route.isPassable ? '#38BDF8' : '#EF4444';
        const glowPoly = L.polyline(coords, {
          color: glowColor,
          weight: isSelected ? 12 : 9,
          opacity: isSelected ? 0.35 : 0.2,
          lineCap: 'round',
          lineJoin: 'round',
        });
        routesLayer.addLayer(glowPoly);
      }

      // Main Route Polyline
      const mainPoly = L.polyline(coords, {
        color: route.color,
        weight: isSelected ? 6 : isRank1 ? 5 : 4,
        opacity: isSelected ? 1.0 : 0.8,
        dashArray: route.dashArray || undefined,
        lineCap: 'round',
        lineJoin: 'round',
      });

      mainPoly.bindTooltip(
        `<div class="p-1 text-xs">
          <div class="font-bold flex items-center gap-1" style="color: ${route.color}">
            ${route.rankLabel}
          </div>
          <div class="text-slate-200 mt-1">
            <strong>${route.totalDistanceKm} km</strong> • ${Math.floor(route.degradedDurationMinutes / 60)}h ${route.degradedDurationMinutes % 60}m
          </div>
          <div class="text-[11px] text-slate-300">
            Safety Index: <strong class="${route.compositeSafetyScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}">${route.compositeSafetyScore}%</strong>
          </div>
          ${!route.isPassable ? `<div class="text-[10px] text-rose-400 mt-1 font-semibold">⚠️ ${route.failureBottleneck?.reason || 'Impassable'}</div>` : ''}
        </div>`,
        { sticky: true }
      );

      mainPoly.on('click', () => {
        setSelectedRouteId(route.id);
      });

      routesLayer.addLayer(mainPoly);

      // If route is blocked, place Hazard Bottleneck Marker
      if (!route.isPassable && route.failureBottleneck) {
        const bn = route.failureBottleneck;
        const hazardIcon = L.divIcon({
          className: 'custom-hazard-marker',
          html: `
            <div class="relative flex items-center justify-center cursor-pointer group">
              <span class="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-ping"></span>
              <div class="relative w-7 h-7 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
                ⚠️
              </div>
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const bottleneckMarker = L.marker(bn.coordinates, { icon: hazardIcon });
        bottleneckMarker.bindPopup(`
          <div class="p-2 max-w-[260px] text-xs">
            <div class="font-bold text-rose-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
              <span>⛔</span> Route Constraint Failure
            </div>
            <div class="font-semibold text-white mt-1 text-sm">${bn.segmentName}</div>
            <div class="p-2 rounded bg-rose-950/60 border border-rose-800/80 text-rose-200 mt-2 text-[11px] leading-relaxed">
              ${bn.reason}
            </div>
          </div>
        `);

        incidentsLayer.addLayer(bottleneckMarker);
      }
    });

    // Render active disruption badges
    Object.entries(disruptions).forEach(([segId, inc]) => {
      if (inc.status === 'NORMAL') return;
      const seg = NER_SEGMENTS.find(s => s.id === segId);
      if (!seg || seg.coordinates.length === 0) return;

      const midIdx = Math.floor(seg.coordinates.length / 2);
      const pt = seg.coordinates[midIdx];

      const isBlockage = inc.status === 'TOTAL_BLOCKAGE';
      const disIcon = L.divIcon({
        className: 'disruption-marker',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer">
            <span class="absolute w-6 h-6 rounded-full ${isBlockage ? 'bg-rose-500/50' : 'bg-amber-500/50'} animate-pulse"></span>
            <div class="relative px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isBlockage ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
            } border border-white shadow-md flex items-center gap-1">
              <span>${isBlockage ? '🛑' : '⚠️'}</span>
              <span>${inc.cause?.replace('_', ' ') || 'INCIDENT'}</span>
            </div>
          </div>
        `,
        iconSize: [80, 24],
        iconAnchor: [40, 12],
      });

      const mark = L.marker(pt, { icon: disIcon });
      mark.bindPopup(`
        <div class="p-2 max-w-[260px] text-xs">
          <div class="font-bold ${isBlockage ? 'text-rose-400' : 'text-amber-400'} uppercase text-[10px]">
            ${isBlockage ? '🛑 Total Blockage' : '⚠️ Single Lane Passable'}
          </div>
          <div class="font-semibold text-white mt-0.5">${seg.name}</div>
          <p class="text-[11px] text-slate-300 mt-1">${inc.description}</p>
        </div>
      `);
      incidentsLayer.addLayer(mark);
    });

    // Auto-fit bounds strictly within North East India corridor
    const validCoords = (allRouteLatLngs as [number, number][]).filter(
      pt => Array.isArray(pt) && pt[0] >= 22 && pt[0] <= 30 && pt[1] >= 87 && pt[1] <= 98
    );

    if (validCoords.length > 0) {
      try {
        const bounds = L.latLngBounds(validCoords);
        map.fitBounds(bounds, { padding: [35, 35], maxZoom: 10 });
      } catch (err) {
        console.error('Error fitting bounds:', err);
      }
    }
  }, [candidateRoutes, selectedRoute, disruptions, setSelectedRouteId]);

  // 5. Render Hub and Strategic Junction Node Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const nodesLayer = nodesLayerRef.current;
    if (!map || !nodesLayer) return;

    nodesLayer.clearLayers();

    Object.values(NER_NODES).forEach(node => {
      const isOrigin = node.id === originNode.id;
      const isDest = node.id === destinationNode.id;

      let markerHtml = '';
      let iconSize: [number, number] = [12, 12];
      let iconAnchor: [number, number] = [6, 6];

      if (isOrigin) {
        iconSize = [34, 34];
        iconAnchor = [17, 17];
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-emerald-500/40 animate-ping"></span>
            <div class="relative w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
              📍
            </div>
          </div>
        `;
      } else if (isDest) {
        iconSize = [34, 34];
        iconAnchor = [17, 17];
        markerHtml = `
          <div class="relative flex items-center justify-center">
            <span class="absolute w-8 h-8 rounded-full bg-rose-500/40 animate-ping"></span>
            <div class="relative w-7 h-7 rounded-full bg-rose-600 border-2 border-white flex items-center justify-center shadow-lg text-white font-bold text-xs">
              🎯
            </div>
          </div>
        `;
      } else if (node.isHub) {
        iconSize = [18, 18];
        iconAnchor = [9, 9];
        markerHtml = `
          <div class="w-4 h-4 rounded-full bg-slate-800 border-2 border-sky-400 flex items-center justify-center shadow-md">
            <div class="w-1.5 h-1.5 rounded-full bg-sky-300"></div>
          </div>
        `;
      } else {
        iconSize = [10, 10];
        iconAnchor = [5, 5];
        markerHtml = `
          <div class="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-500"></div>
        `;
      }

      const icon = L.divIcon({
        className: 'custom-node-pin',
        html: markerHtml,
        iconSize,
        iconAnchor,
      });

      const marker = L.marker(node.coordinates, { icon });
      marker.bindTooltip(
        `<div class="text-xs font-semibold">
          ${node.name}<br/>
          <span class="text-[10px] text-slate-400 font-normal">${node.state} • ${node.elevationMeters}m</span>
        </div>`,
        { direction: 'top', offset: [0, -10] }
      );

      nodesLayer.addLayer(marker);
    });
  }, [originNode, destinationNode]);

  const fitAllRoutes = () => {
    const map = mapInstanceRef.current;
    if (!map || candidateRoutes.length === 0) return;
    const allCoords: [number, number][] = [];
    candidateRoutes.forEach(r => r.segments.forEach(s => allCoords.push(...s.coordinates)));
    if (allCoords.length > 0) {
      map.fitBounds(L.latLngBounds(allCoords), { padding: [30, 30] });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 h-full w-full bg-slate-950">
      {/* Dedicated Map Sub-Header Toolbar (Positioned ABOVE the map canvas, NOT floating over it) */}
      <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2 shrink-0 z-20 flex-wrap">
        {/* Left: Corridor Info & Panel Toggle */}
        <div className="flex items-center gap-2">
          {onToggleLeftPanel && (
            <button
              onClick={onToggleLeftPanel}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 border border-slate-700 transition"
              title={showLeftPanel ? 'Collapse Controls Panel' : 'Expand Controls Panel'}
            >
              {showLeftPanel ? <PanelLeftClose className="w-3.5 h-3.5 text-slate-400" /> : <PanelLeftOpen className="w-3.5 h-3.5 text-emerald-400" />}
              <span className="hidden sm:inline font-medium">{showLeftPanel ? 'Hide Controls' : 'Show Controls'}</span>
            </button>
          )}

          {/* Inline Legend (Clean & Horizontal, off the map) */}
          <div className="hidden md:flex items-center gap-3 text-[11px] pl-2 border-l border-slate-800">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-emerald-300 font-medium">Rank 1 Safe</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1.5 rounded-full bg-sky-400"></span>
              <span className="text-slate-300">Alt Corridors</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 border-b-2 border-dashed border-rose-500"></span>
              <span className="text-rose-400 font-medium">Blocked</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs">⚠️</span>
              <span className="text-slate-400 text-[10px]">Bottleneck</span>
            </div>
          </div>
        </div>

        {/* Right: Layer Switcher & Fit & Right Panel Toggle */}
        <div className="flex items-center gap-2">
          {/* Tile Switcher */}
          <div className="flex bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setMapTileLayer('dark')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                mapTileLayer === 'dark' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setMapTileLayer('satellite')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                mapTileLayer === 'satellite' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapTileLayer('street')}
              className={`px-2 py-0.5 text-xs font-medium rounded transition ${
                mapTileLayer === 'street' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Terrain
            </button>
          </div>

          {/* Fit Corridor */}
          <button
            onClick={fitAllRoutes}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-xs flex items-center gap-1 transition"
            title="Fit map view to all candidate routes"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline font-medium">Fit</span>
          </button>

          {/* Toggle Right Panel */}
          {onToggleRightPanel && (
            <button
              onClick={onToggleRightPanel}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 border border-slate-700 transition"
              title={showRightPanel ? 'Collapse Candidate Routes Panel' : 'Expand Candidate Routes Panel'}
            >
              <span className="hidden sm:inline font-medium">{showRightPanel ? 'Hide Routes' : 'Show Routes'}</span>
              {showRightPanel ? <PanelRightClose className="w-3.5 h-3.5 text-slate-400" /> : <PanelRightOpen className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Pure Clean Map Viewport (Takes 100% of remaining area, shrinkable to any dimension) */}
      <div className="flex-1 min-h-0 min-w-0 w-full relative">
        <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
      </div>
    </div>
  );
};
