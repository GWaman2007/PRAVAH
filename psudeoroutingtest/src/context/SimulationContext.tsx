import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import type { CandidateRoute, DisruptionCause, DisruptionType, Node, Segment, SegmentIncident, VehicleProfile } from '../types';
import { NER_NODES, NER_SEGMENTS, VEHICLE_PROFILES } from '../data/nerGraphData';
import { findKShortestPaths } from '../engine/kShortestPaths';
import { evaluateAndRankPaths } from '../engine/constraintEvaluator';

interface SimulationContextType {
  // State
  originId: string;
  destinationId: string;
  selectedVehicle: VehicleProfile;
  customSpecs: { weight_tonnes: number; height_m: number; width_m: number };
  rainfallMmHr: number;
  disruptions: Record<string, SegmentIncident>;
  selectedRouteId: string | null;
  inspectedSegmentId: string | null;
  mapTileLayer: 'dark' | 'satellite' | 'street';

  // Derived Data
  originNode: Node;
  destinationNode: Node;
  candidateRoutes: CandidateRoute[];
  selectedRoute: CandidateRoute | null;
  inspectedSegment: Segment | null;
  inspectedSegmentIncident: SegmentIncident | undefined;
  activeDisruptionCount: number;

  // Actions
  setOriginId: (id: string) => void;
  setDestinationId: (id: string) => void;
  setCorridorPreset: (origin: string, dest: string) => void;
  setSelectedVehicleId: (id: string) => void;
  updateCustomSpecs: (specs: Partial<{ weight_tonnes: number; height_m: number; width_m: number }>) => void;
  setRainfallMmHr: (val: number) => void;
  setMapTileLayer: (layer: 'dark' | 'satellite' | 'street') => void;
  setSelectedRouteId: (id: string | null) => void;
  setInspectedSegmentId: (id: string | null) => void;
  
  // Disruption Actions
  setSegmentDisruption: (segmentId: string, status: DisruptionType, cause?: DisruptionCause, description?: string) => void;
  clearAllDisruptions: () => void;
  triggerScenarioNH6Landslide: () => void;
  triggerScenarioNH29FlashFlood: () => void;
  triggerScenarioHaflongBridgeRisk: () => void;
}

const SimulationContext = createContext<SimulationContextType | null>(null);

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [originId, setOriginId] = useState<string>('guwahati');
  const [destinationId, setDestinationId] = useState<string>('silchar');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('heavy-cargo');
  const [customSpecs, setCustomSpecs] = useState({
    weight_tonnes: 28,
    height_m: 3.8,
    width_m: 2.6,
  });
  const [rainfallMmHr, setRainfallMmHr] = useState<number>(22);
  const [disruptions, setDisruptions] = useState<Record<string, SegmentIncident>>({});
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [inspectedSegmentId, setInspectedSegmentId] = useState<string | null>(null);
  const [mapTileLayer, setMapTileLayer] = useState<'dark' | 'satellite' | 'street'>('dark');

  // Origin and destination nodes
  const originNode = NER_NODES[originId] || NER_NODES.guwahati;
  const destinationNode = NER_NODES[destinationId] || NER_NODES.silchar;

  // Effective vehicle profile
  const selectedVehicle = useMemo(() => {
    if (selectedVehicleId === 'custom') {
      return {
        id: 'custom',
        name: 'Custom Heavy / Specialty Rig',
        category: 'custom' as const,
        weight_tonnes: customSpecs.weight_tonnes,
        height_m: customSpecs.height_m,
        width_m: customSpecs.width_m,
        description: 'User-specified axle load and dimensions',
        badge: `${customSpecs.weight_tonnes}T • ${customSpecs.height_m}m • ${customSpecs.width_m}m`,
        iconName: 'Settings2',
      };
    }
    const found = VEHICLE_PROFILES.find(v => v.id === selectedVehicleId);
    return found || VEHICLE_PROFILES[0];
  }, [selectedVehicleId, customSpecs]);

  // Compute K-Shortest Paths & Multi-Factor Evaluations
  const candidateRoutes = useMemo(() => {
    if (originId === destinationId) return [];

    // Find up to 5 loopless shortest paths on graph
    const rawPaths = findKShortestPaths(NER_SEGMENTS, originId, destinationId, 5);

    // Evaluate hard constraints and stage 2 ML risk & delay scoring
    const evaluated = evaluateAndRankPaths(
      rawPaths,
      NER_SEGMENTS,
      selectedVehicle,
      rainfallMmHr,
      disruptions
    );

    return evaluated;
  }, [originId, destinationId, selectedVehicle, rainfallMmHr, disruptions]);

  // Auto-select rank 1 route if current selectedRoute is null or invalid
  const selectedRoute = useMemo(() => {
    if (candidateRoutes.length === 0) return null;
    if (selectedRouteId) {
      const match = candidateRoutes.find(r => r.id === selectedRouteId);
      if (match) return match;
    }
    // Default to the highest rank passable route or first route
    const firstPassable = candidateRoutes.find(r => r.isPassable);
    return firstPassable || candidateRoutes[0];
  }, [candidateRoutes, selectedRouteId]);

  // Inspected segment
  const inspectedSegment = useMemo(() => {
    if (!inspectedSegmentId) return null;
    return NER_SEGMENTS.find(s => s.id === inspectedSegmentId) || null;
  }, [inspectedSegmentId]);

  const inspectedSegmentIncident = inspectedSegmentId ? disruptions[inspectedSegmentId] : undefined;

  const activeDisruptionCount = useMemo(() => {
    return Object.values(disruptions).filter(d => d.status !== 'NORMAL').length;
  }, [disruptions]);

  // Actions
  const setCorridorPreset = useCallback((orig: string, dest: string) => {
    setOriginId(orig);
    setDestinationId(dest);
    setSelectedRouteId(null);
    setInspectedSegmentId(null);
  }, []);

  const updateCustomSpecs = useCallback((specs: Partial<{ weight_tonnes: number; height_m: number; width_m: number }>) => {
    setCustomSpecs(prev => ({ ...prev, ...specs }));
  }, []);

  const setSegmentDisruption = useCallback((
    segmentId: string,
    status: DisruptionType,
    cause: DisruptionCause = 'NONE',
    description: string = ''
  ) => {
    setDisruptions(prev => {
      if (status === 'NORMAL') {
        const next = { ...prev };
        delete next[segmentId];
        return next;
      }
      return {
        ...prev,
        [segmentId]: {
          status,
          cause,
          description: description || `${cause} on road segment`,
          reportedTime: 'Just now by Control Center',
          confidence: 0.95,
        },
      };
    });
  }, []);

  const clearAllDisruptions = useCallback(() => {
    setDisruptions({});
  }, []);

  const triggerScenarioNH6Landslide = useCallback(() => {
    setDisruptions(prev => ({
      ...prev,
      'seg-jowai-ratacherra': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'LANDSLIDE',
        description: 'Major hillside slope failure near Lubha bridge cutting NH-6. 4,000 cu.m debris across both lanes.',
        reportedTime: '10 mins ago by Meghalaya PWD',
        confidence: 0.98,
      },
    }));
  }, []);

  const triggerScenarioNH29FlashFlood = useCallback(() => {
    setDisruptions(prev => ({
      ...prev,
      'seg-dimapur-kohima': {
        status: 'TOTAL_BLOCKAGE',
        cause: 'FLASH_FLOOD',
        description: 'Pagla Pahar river swell washed out 80m of road base. All traffic halted.',
        reportedTime: '25 mins ago by Nagaland Traffic Police',
        confidence: 0.95,
      },
    }));
  }, []);

  const triggerScenarioHaflongBridgeRisk = useCallback(() => {
    setDisruptions(prev => ({
      ...prev,
      'seg-lumding-haflong': {
        status: 'SINGLE_LANE_PASSABLE',
        cause: 'BRIDGE_DAMAGE',
        description: 'Pier scouring detected on railway viaduct crossing. Heavy vehicles limited to single convoy.',
        reportedTime: '1 hour ago by N.F. Railway & NHAI',
        confidence: 0.92,
      },
    }));
  }, []);

  const value = {
    originId,
    destinationId,
    selectedVehicle,
    customSpecs,
    rainfallMmHr,
    disruptions,
    selectedRouteId,
    inspectedSegmentId,
    mapTileLayer,
    originNode,
    destinationNode,
    candidateRoutes,
    selectedRoute,
    inspectedSegment,
    inspectedSegmentIncident,
    activeDisruptionCount,
    setOriginId,
    setDestinationId,
    setCorridorPreset,
    setSelectedVehicleId,
    updateCustomSpecs,
    setRainfallMmHr,
    setMapTileLayer,
    setSelectedRouteId,
    setInspectedSegmentId,
    setSegmentDisruption,
    clearAllDisruptions,
    triggerScenarioNH6Landslide,
    triggerScenarioNH29FlashFlood,
    triggerScenarioHaflongBridgeRisk,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};

export const useSimulation = () => {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error('useSimulation must be used within a SimulationProvider');
  return ctx;
};
