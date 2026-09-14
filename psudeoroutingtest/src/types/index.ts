export interface GeoCoordinate {
  lat: number;
  lng: number;
}

export type LatLngTuple = [number, number];

export interface Node {
  id: string;
  name: string;
  state: string;
  coordinates: LatLngTuple;
  isHub: boolean;
  elevationMeters: number;
}

export type SurfaceType = 'paved' | 'unpaved' | 'under_construction';

export type DisruptionType = 'NORMAL' | 'SINGLE_LANE_PASSABLE' | 'TOTAL_BLOCKAGE';

export type DisruptionCause = 'NONE' | 'LANDSLIDE' | 'BRIDGE_DAMAGE' | 'MUDSLIDE' | 'TREE_FALL' | 'FLASH_FLOOD' | 'ROAD_COLLAPSE';

export interface SegmentIncident {
  status: DisruptionType;
  cause: DisruptionCause;
  description: string;
  reportedTime?: string;
  confidence?: number;
}

export interface Segment {
  id: string;
  name: string;
  highwayCode: string;
  fromNode: string;
  toNode: string;
  coordinates: LatLngTuple[];
  distance_km: number;
  base_speed_kmh: number;
  gradient_pct: number; // Slope percentage (e.g. 2% in plains to 14% in steep ghats)
  surface_type: SurfaceType;
  max_weight_limit: number; // Tonnes
  max_height_limit: number; // Meters
  max_width_limit: number; // Meters
  bhuvan_lhz_level: number; // 1 to 5 Landslide Hazard Zonation index
  description: string;
  bridgeName?: string;
  tunnelName?: string;
}

export interface VehicleProfile {
  id: string;
  name: string;
  category: 'heavy' | 'medium' | 'light' | 'custom';
  weight_tonnes: number;
  height_m: number;
  width_m: number;
  description: string;
  badge: string;
  iconName: string;
}

export interface SegmentEvaluation {
  segmentId: string;
  passHardConstraints: boolean;
  hardConstraintFailures: string[];
  rainfallFactor: number;
  lhzFactor: number;
  incidentPenalty: number;
  segmentRisk: number; // Formula: 0.40 * rain + 0.30 * lhz + 0.30 * incident
  slopePenalty: number;
  surfaceDegradation: number;
  delayMultiplier: number;
  effectiveSpeedKmh: number;
  travelTimeMinutes: number;
  isTotalBlockage: boolean;
}

export interface CandidateRoute {
  id: string;
  rank: number;
  rankLabel: 'Recommended Safe Route' | 'Alternative Route 1' | 'Alternative Route 2' | 'Alternative Route 3' | 'Alternative Route 4' | 'Impassable Corridor';
  color: string;
  dashArray?: string;
  pathNodeIds: string[];
  segmentIds: string[];
  segments: Segment[];
  evaluatedSegments: SegmentEvaluation[];
  totalDistanceKm: number;
  baseDurationMinutes: number;
  degradedDurationMinutes: number;
  compositeSafetyScore: number; // 0 to 100%
  compositeRiskScore: number; // 0 to 1
  isPassable: boolean;
  failureBottleneck?: {
    segmentId: string;
    segmentName: string;
    reason: string;
    coordinates: LatLngTuple;
    incidentCause?: DisruptionCause;
  };
  tags: string[];
  elevationGainMeters: number;
  maxGradientPct: number;
}
