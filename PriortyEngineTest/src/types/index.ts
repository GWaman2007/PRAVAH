export type CommodityType = 'IV_FLUIDS' | 'ANTIVENOM' | 'GRAIN_RICE' | 'DIESEL';

export type PriorityTier = 'P1' | 'P2' | 'P3' | 'P4';

export interface CommodityMeta {
  type: CommodityType;
  label: string;
  unit: string;
  category: 'medical' | 'subsistence' | 'energy';
  color: string;
  lightBg: string;
  icon: string;
  standardCapacity: number;
}

export interface CommodityInventoryInput {
  lastStock: number; // S_last
  baselineDailyBurn: number; // Daily burn under normal conditions
}

export interface CommodityDepletionState {
  type: CommodityType;
  label: string;
  unit: string;
  isMedical: boolean;
  baselineDailyBurn: number;
  surgeMultiplier: number; // phi_surge
  hourlyBurn: number;
  lastStock: number;
  currentStock: number;
  timeToExhaustHours: number; // T_exhaust
  deficitFactor: number; // S_def for this commodity
  deficitReason: 'BEFORE_CUTOFF' | 'DURING_ISOLATION' | 'SAFETY_BUFFER' | 'NOMINAL';
}

export interface CommunityBase {
  id: string; // e.g. "MZ-KOL-004"
  name: string; // "Kolasib East"
  district: string;
  state: 'Mizoram' | 'Sikkim' | 'Assam';
  population: number;
  healthcareFacilities: number; // PHCs/CHCs
  ingressRouteCount: number; // 1 = Single corridor
  nearestDepotName: string;
  nearestDepotDistanceKm: number;
  transitTimeHours: number; // T_transit
  cutoffTimeHours: number; // T_cutoff (dynamic slider)
  disruptionProbMax: number; // P_disrupt_max (0 to 1.0)
  isMonsoonAlertActive: boolean;
  hasActiveIndent: boolean;
  elapsedTimeHours: number; // Delta t (hours elapsed since last survey/restock)
  inventories: Record<CommodityType, CommodityInventoryInput>;
  terrain: string;
  primaryCorridorName: string;
}

export interface AuditTrailItem {
  id: string;
  category: 'RISK' | 'SUPPLY' | 'VULNERABILITY' | 'TIMELINE' | 'ACTION';
  level: 'critical' | 'warning' | 'info' | 'positive';
  headline: string;
  detail: string;
  factorImpact: string;
}

export interface CalculationResult {
  commodityDepletions: Record<CommodityType, CommodityDepletionState>;
  criticalCommodity: CommodityType;
  criticalExhaustHours: number;
  supplyDeficitFactor: number; // S_def
  isolationCorridorFactor: number; // C_iso
  isolationRisk: number; // R_iso
  vulnerabilityIndex: number; // I_vuln
  baseScore: number;
  actionableDispatchWindow: number; // T_window
  emergencyUrgencyBoost: number; // +0.20 or 0.00
  finalScore: number;
  priorityTier: PriorityTier;
  auditTrail: AuditTrailItem[];
}

export type EnrichedCommunity = CommunityBase & CalculationResult;

export interface SimulationState {
  selectedCommunityId: string;
  globalMonsoonSurge: boolean;
  filterTier: 'ALL' | PriorityTier;
  searchQuery: string;
  autoTick: boolean;
  toast: {
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null;
}
