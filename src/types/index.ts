/**
 * PRAVAH Comprehensive Type Definitions
 * Unifies all 7 platform domains and access-control scopes.
 */

// ==========================================
// 1. User Access Control & ABAC
// ==========================================
export type UserRole =
  | 'SUPER_ADMIN'        // MDoNER / State Command
  | 'FLEET_DISPATCHER'   // Fleet Logistics Dispatcher
  | 'FIELD_OFFICER'      // Convoy Lead Officer (Mission-Scoped)
  | 'DRIVER';            // Assigned Truck Driver (Mission-Scoped)

export interface UserContext {
  role: UserRole;
  name: string;
  department: string;
  badgeId: string;
  activeMissionId?: string;       // e.g. 'MZ-04'
  assignedVehicleId?: string;     // e.g. 'Medic-01'
  jurisdictionState?: string;     // e.g. 'All NER' or 'Mizoram'
}

export type ActiveView =
  | 'GIS_COMMAND'
  | 'COMMUNITY_PRIORITY'
  | 'EXECUTIVE_INFRA'
  | 'GROUND_FEED'
  | 'BROADCAST_CENTER'
  | 'MOBILE_COCKPIT';

// ==========================================
// 2. Hazard GIS & Weather Layers (Module 1)
// ==========================================
export type AlertSeverityLevel = 'Red' | 'Orange' | 'Yellow' | 'Green';

export interface IMDDistrictAlert {
  district_id: string;
  district_name: string;
  state: string;
  alert: AlertSeverityLevel;
  warning_title: string;
  rainfall_forecast_24h: string;
  weather_summary: string;
  emergency_contact: string;
  issued_at: string;
  valid_until: string;
}

export interface ChokePoint {
  id: string;
  name: string;
  highway: string;
  state: string;
  lat: number;
  lng: number;
  vulnerability: 'Very High' | 'High' | 'Moderate';
  elevation_m: number;
  nearest_bro_base: string;
  precipitation_mm?: number;
  rain_mm?: number;
  temperature_c?: number | null;
  weather_code?: number;
  timestamp?: string;
}

// ==========================================
// 3. Reddit-Style Field Incident Verification (Module 2)
// ==========================================
export type CorridorFlair =
  | 'r/NH-29-Nagaland'
  | 'r/NH-10-Sikkim'
  | 'r/East-Khasi-Hills'
  | 'r/Assam-DimaHasao'
  | 'r/Arunachal-Tawang'
  | 'r/Manipur-NH-37'
  | 'r/Mizoram-NH-306'
  | 'r/Tripura-NH-08';

export type IncidentType =
  | 'Landslide'
  | 'Flash Flood'
  | 'Bridge Washout'
  | 'Tree Fall'
  | 'Road Subsidence';

export type IncidentSeverity =
  | 'Total Blockage'
  | 'Single Lane Passable'
  | 'Caution/Hazard';

export type AuthorRole =
  | 'Field Officer (BRO/Police)'
  | 'Registered Driver'
  | 'Local Citizen';

export interface LocationData {
  lat: number;
  lng: number;
  placeName: string;
  state?: string;
  corridorId?: string;
}

export interface GroundUpdate {
  id: string;
  author: string;
  role: AuthorRole;
  message: string;
  timestamp: string;
}

export interface VoteData {
  upvotes: number;
  downvotes: number;
  userVote: null | 'up' | 'down';
}

export type SyncStatus = 'SYNCED' | 'PENDING';

export interface Incident {
  id: string;
  title: string;
  corridorFlair: CorridorFlair | string;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  location: LocationData;
  author: {
    name: string;
    role: AuthorRole;
  };
  timestamp: string;
  mediaUrl: string;
  votes: VoteData;
  confidenceScore: number;
  updates: GroundUpdate[];
  sync_status: SyncStatus;
  offlineQueuedAt?: string;
  hasOfficerVerified?: boolean;
}

export type FeedSortOption = 'Hot' | 'New' | 'Critical';

export interface OfflineQueueItem {
  id: string;
  action: 'CREATE_INCIDENT' | 'VOTE_INCIDENT' | 'ADD_UPDATE';
  timestamp: string;
  payload: any;
}

// ==========================================
// 4. Vehicle-Aware Routing & K-Shortest (Module 3)
// ==========================================
export interface VehicleProfile {
  id: string;
  name: string;
  type: string;
  height_m: number;
  width_m: number;
  weight_tonnes: number;
  turn_radius_m: number;
  fuel_efficiency_km_l: number;
  max_speed_kmh: number;
  icon: string;
}

export interface Segment {
  id: string;
  name: string;
  highway: string;
  fromNode: string;
  toNode: string;
  distance_km: number;
  base_speed_kmh: number;
  max_weight_limit: number;
  max_height_limit: number;
  max_width_limit: number;
  bhuvan_lhz_level: number; // 1 (Low) to 5 (Very High)
  gradient_pct: number;
  surface_type: 'paved' | 'under_construction' | 'unpaved';
  coordinates: [number, number][];
  bridgeName?: string;
  tunnelName?: string;
}

export interface SegmentIncident {
  status: 'TOTAL_BLOCKAGE' | 'SINGLE_LANE_PASSABLE';
  cause?: string;
  description?: string;
  reportedBy?: string;
  location?: { lat: number; lng: number };
  incidentId?: string;
  severity?: string;
  reportedTime?: string;
  estimatedClearanceHours?: number;
}

export interface SegmentEvaluation {
  segmentId: string;
  passHardConstraints: boolean;
  hardConstraintFailures: string[];
  rainfallFactor: number;
  lhzFactor: number;
  incidentPenalty: number;
  segmentRisk: number;
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
  rankLabel: string;
  color: string;
  dashArray?: string;
  pathNodeIds: string[];
  segmentIds: string[];
  segments: Segment[];
  evaluatedSegments: SegmentEvaluation[];
  totalDistanceKm: number;
  baseDurationMinutes: number;
  degradedDurationMinutes: number;
  compositeSafetyScore: number;
  compositeRiskScore: number;
  isPassable: boolean;
  failureBottleneck?: {
    segmentId: string;
    segmentName: string;
    reason: string;
    coordinates: [number, number];
    incidentCause?: string;
  };
  tags: string[];
  elevationGainMeters: number;
  maxGradientPct: number;
}

// ==========================================
// 5. GPS Telemetry & Watchdog Engine (Module 4)
// ==========================================
export type VehicleStatus =
  | 'ON_ROUTE'
  | 'DEAD_ZONE_EXTRAPOLATING'
  | 'DEVIATED'
  | 'CRITICAL_STATIONARY'
  | 'SOS_ALERT'
  | 'DELIVERED_COMPLETED';

export interface Breadcrumb {
  coords: [number, number];
  status: VehicleStatus;
  timestamp: string;
  speed_kmh: number;
}

export interface VehicleTelemetry {
  vehicle_id: string;
  vehicle_name: string;
  driver_name: string;
  driver_phone: string;
  convoy_lead_officer: string;
  mission_id: string;
  cargo_type: string;
  cargo_manifest: {
    item: string;
    quantity: number;
    unit: string;
  }[];
  destination_community_id: string;
  destination_name: string;
  current_coords: [number, number];
  nominal_speed_kmh: number;
  speed_kmh: number;
  heading_deg: number;
  status: VehicleStatus;
  battery_pct: number;
  last_ping_time: string;
  route_progress_pct: number;
  signal_strength_dbm: number;
  satellite_count: number;
  stationary_timer_sec: number;
  traveled_distance_km: number;
  deviation_distance_m: number;
  breadcrumbs: Breadcrumb[];
  dead_reckoning_distance_m: number;
  assigned_route_id: string;
  
  // Watchdog SLA properties
  entry_blackout_time?: string;
  expected_blackout_exit_time?: string;
  overdue_duration_min?: number;
  is_watchdog_amber?: boolean;
  is_watchdog_red?: boolean;

  // Manual interactive overrides for simulation demonstration
  is_stopped_manual?: boolean;
  is_deviated_manual?: boolean;
  is_sos_manual?: boolean;

  // Display telemetry helpers
  color?: string;
  license_plate?: string;
  corridor_name?: string;
  elevation_m?: number;
  current_speed_kmh?: number;
  grade_pct?: number;
  fuel_level_pct?: number;
}

export interface RouteDefinition {
  id: string;
  name: string;
  startHub: string;
  endHub: string;
  distanceKm: number;
  expectedDurationMinutes: number;
  coordinates: [number, number][];
  deviationPath: [number, number][];
}

export interface BlackoutZone {
  id: string;
  name: string;
  corridor: string;
  polygon: [number, number][];
  expectedTransitMinutes: number;
  bufferMultiplier: number; // e.g. 0.25 (25% buffer)
}

export interface HazardZone {
  id: string;
  name: string;
  hazardType: string;
  polygon: [number, number][];
}

export interface AlertEvent {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  cargo_type: string;
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'HIGH RISK' | 'CRITICAL';
  type:
    | 'BLACKOUT_ENTER'
    | 'BLACKOUT_EXIT'
    | 'WATCHDOG_OVERDUE_AMBER'
    | 'WATCHDOG_OVERDUE_RED'
    | 'ROUTE_DEVIATION'
    | 'STATIONARY_HAZARD'
    | 'SOS_TRIGGERED'
    | 'DELIVERY_COMPLETED';
  title: string;
  message: string;
  coords: [number, number];
  acknowledged: boolean;
  extraDetails?: Record<string, any>;
}

// ==========================================
// 6. Multilingual Emergency Broadcasts (Module 5)
// ==========================================
export type LanguageId = 'en' | 'hi' | 'as' | 'bn' | 'mn';

export interface LanguageConfig {
  id: LanguageId;
  code: string;
  name: string;
  nativeName: string;
  scriptName: string;
  flag: string;
  targetRegion: string;
  ttsLang: string;
  ttsGoogleLang?: string;
  voiceFallbacks?: string[];
  isUnicode?: boolean;
}

export interface BroadcastChannelDelivery {
  channel: 'DRIVER_SMS' | 'WHATSAPP_CARD' | 'DISTRICT_SIREN';
  targetAudience: string;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  status: 'QUEUED' | 'TRANSMITTING' | 'DELIVERED';
}

export interface BroadcastDraft {
  id: string;
  incidentId: string;
  highway: string;
  location: string;
  disruptionType: string;
  translations: Record<LanguageId, string>;
  phoneticFallback: string;
  channels: BroadcastChannelDelivery[];
  createdAt: string;
  dispatchedAt?: string;
  status: 'DRAFT' | 'BROADCASTING' | 'SENT';
}

// ==========================================
// 7. Preemptive Community Depletion Engine (Module 6)
// ==========================================
export type CommodityType = 'IV_FLUIDS' | 'ANTIVENOM' | 'GRAIN_RICE' | 'DIESEL';
export type PriorityTier = 'P1' | 'P2' | 'P3' | 'P4';

export interface CommodityDepletionState {
  type: CommodityType;
  label: string;
  unit: string;
  isMedical: boolean;
  baselineDailyBurn: number;
  surgeMultiplier: number;
  hourlyBurn: number;
  lastStock: number;
  currentStock: number;
  timeToExhaustHours: number;
  deficitFactor: number;
  deficitReason: 'BEFORE_CUTOFF' | 'DURING_ISOLATION' | 'SAFETY_BUFFER' | 'NOMINAL';
}

export interface CommunityBase {
  id: string;
  name: string;
  state: string;
  district: string;
  coordinates: [number, number];
  population: number;
  healthcareFacilities: number;
  ingressRouteCount: number;
  primaryCorridor: string;
  nearestDepotName: string;
  transitTimeHours: number;
  cutoffTimeHours: number;
  disruptionProbMax: number;
  elapsedTimeHours: number;
  isMonsoonAlertActive: boolean;
  hasActiveIndent: boolean;
  inventories: Record<
    CommodityType,
    {
      lastStock: number;
      baselineDailyBurn: number;
      standardCapacity: number;
    }
  >;
}

export interface AuditTrailItem {
  id: string;
  category: 'TIMELINE' | 'SUPPLY' | 'ISOLATION' | 'VULNERABILITY' | 'FORMULA';
  level: 'critical' | 'warning' | 'positive' | 'neutral';
  headline: string;
  detail: string;
  factorImpact: string;
}

export interface CalculationResult {
  commodityDepletions: Record<CommodityType, CommodityDepletionState>;
  criticalCommodity: CommodityType;
  criticalExhaustHours: number;
  supplyDeficitFactor: number;
  isolationCorridorFactor: number;
  isolationRisk: number;
  vulnerabilityIndex: number;
  baseScore: number;
  actionableDispatchWindow: number;
  emergencyUrgencyBoost: number;
  finalScore: number;
  priorityTier: PriorityTier;
  auditTrail: AuditTrailItem[];
}

export interface CommunityWithCalculation extends CommunityBase {
  metrics: CalculationResult;
}

export interface ReliefMission {
  id: string;
  communityId: string;
  communityName: string;
  recommendedVehicleType: string;
  cargoAllocations: { item: string; quantity: number; unit: string }[];
  assignedRouteId: string;
  suggestedDetour: string;
  status: 'SUGGESTED' | 'APPROVED' | 'IN_TRANSIT' | 'DELIVERED';
  urgency: 'P1_CRITICAL' | 'P2_ELEVATED';
  createdAt: string;
  dispatchedAt?: string;
  deliveredAt?: string;
  assignedDriver?: string;
  assignedOfficer?: string;

  // Real Logistics & GIS Mission Flow (Warehouse Origin -> Disaster Destination)
  originWarehouseId: string;
  originWarehouseName: string;
  originCoords: [number, number];
  disasterZoneId: string;
  disasterZoneName: string;
  destinationEndpoint: [number, number];
  destinationName: string;
  assignedVehicleId?: string;
  routeGeometry?: [number, number][]; // [lat, lng] road-following coordinates
  routeDistanceKm?: number;
  routeDurationMinutes?: number;
  routeStatus?: 'OPTIMAL' | 'DEGRADED' | 'UNAVAILABLE' | 'COMPUTED';
}

// ==========================================
// 8. Executive Macro Analytics & BRO Board (Module 7)
// ==========================================
export interface DistrictHealth {
  id: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
  population: number;
  elevationMeters: number;
  accessibilityScore: number; // 0 to 100%
  connectivityCategory: 'CRITICAL' | 'AT_RISK' | 'STABLE';
  openCorridorsCount: number;
  totalCorridorsCount: number;
  minSupplyDays: number;
  isStockoutRisk: boolean;
  statusNote: string;
  historicalDepletion: {
    day: string;
    medical: number;
    food: number;
    fuel: number;
  }[];
  daysOfSupply?: {
    oxygen: number;
    rations: number;
    fuel: number;
  };
  lifelineHighway?: string;
  alternateRoute?: string;
  nearestBroHQ?: string;
}

export interface BROBottleneck {
  id: string;
  rank: number;
  priorityRank?: number;
  chokePointName: string;
  corridorId: string;
  districtId: string;
  state: string;
  highway: string;
  disruptionType: string;
  strandedVehicleCount: number;
  economicLifelineScore: number;
  status: 'ACTIVE_CRITICAL' | 'CREW_DEPLOYED' | 'CLEARED' | 'TOTAL_BLOCKAGE' | 'REPAIR_UNDERWAY' | 'REPAIRED_CLEAR';
  recommendedAsset: string;
  assignedAsset?: string;
  estimatedClearanceHours: number;
  reportedTime: string;
  lastUpdated: string;
}
