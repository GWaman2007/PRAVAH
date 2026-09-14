export type CargoType = 'Medical Supplies' | 'Liquid Oxygen (Hazardous)' | 'Food Rations';

export type VehicleStatus = 
  | 'ON_ROUTE' 
  | 'DEAD_ZONE_EXTRAPOLATING' 
  | 'DEVIATED' 
  | 'CRITICAL_STATIONARY' 
  | 'SOS_ALERT';

export interface BreadcrumbPoint {
  coords: [number, number];
  status: VehicleStatus;
  timestamp: string;
  speed_kmh: number;
}

export interface VehicleTelemetry {
  vehicle_id: string;
  vehicle_name: string;
  cargo_type: CargoType;
  cargo_details: string;
  driver_name: string;
  license_plate: string;
  vehicle_model: string;
  current_coords: [number, number];
  speed_kmh: number;
  nominal_speed_kmh: number;
  heading_deg: number; // 0 to 360
  status: VehicleStatus;
  battery_pct: number;
  last_ping_time: string; // ISO
  assigned_route_id: string;
  route_progress_pct: number; // 0 to 100
  elevation_m: number;
  signal_strength_dbm: number;
  satellite_count: number;
  stationary_timer_sec: number;
  
  // Distances and tracking
  traveled_distance_km: number;
  total_route_distance_km: number;
  deviation_distance_m: number;
  breadcrumbs: BreadcrumbPoint[];
  
  // Route metadata
  corridor_name: string;
  origin_name: string;
  destination_name: string;
  color: string;
  accent_color: string;
  
  // Anomaly simulation flags
  is_deviated_manual: boolean;
  is_stopped_manual: boolean;
  is_sos_manual: boolean;
  dead_reckoning_distance_m: number;
}

export interface RouteDefinition {
  id: string;
  name: string;
  highwayCode: string;
  origin: string;
  destination: string;
  totalDistanceKm: number;
  waypoints: Array<{
    name: string;
    coords: [number, number];
    elevationM: number;
  }>;
  coordinates: [number, number][]; // High-density polyline
  color: string;
  deviationPath: [number, number][]; // Pre-calculated realistic detour for anomaly trigger
}

export interface BlackoutZone {
  id: string;
  name: string;
  highway: string;
  region: string;
  polygon: [number, number][];
  description: string;
  attenuationLevel: 'TOTAL_GPS_LOSS' | 'DEGRADED';
  depthMeters: number;
}

export interface HazardZone {
  id: string;
  name: string;
  highway: string;
  hazardType: 'Landslide Sinking Zone' | 'Rockfall / Debris Flow' | 'Severe Slope Failure';
  riskLevel: 'EXTREME' | 'HIGH' | 'MODERATE';
  polygon: [number, number][];
  description: string;
  bhuvanHazardScale: number; // 1-5
}

export type AlertSeverity = 'CRITICAL' | 'HIGH RISK' | 'EMERGENCY' | 'INFO';

export type AlertType = 
  | 'ROUTE_DEVIATION' 
  | 'STATIONARY_HAZARD' 
  | 'SOS_PANIC' 
  | 'BLACKOUT_ENTER' 
  | 'BLACKOUT_EXIT';

export interface AlertEvent {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  cargo_type: CargoType;
  timestamp: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  message: string;
  coords: [number, number];
  acknowledged: boolean;
  extraDetails?: {
    distance_m?: number;
    duration_sec?: number;
    zone_name?: string;
  };
}

export interface SimulationStats {
  activeCount: number;
  deadReckoningCount: number;
  anomalyCount: number;
  totalBreadcrumbs: number;
}
