import type {
  CommodityType,
  CommodityDepletionState,
  CommunityBase,
  CalculationResult,
  PriorityTier,
  AuditTrailItem,
} from '../types';

export const COMMODITY_CONFIG: Record<
  CommodityType,
  { label: string; unit: string; isMedical: boolean; standardCapacity: number }
> = {
  IV_FLUIDS: {
    label: 'IV Fluids (Ringer Lactate)',
    unit: 'bottles',
    isMedical: true,
    standardCapacity: 400,
  },
  ANTIVENOM: {
    label: 'Polyvalent Snake Antivenom',
    unit: 'vials',
    isMedical: true,
    standardCapacity: 120,
  },
  GRAIN_RICE: {
    label: 'Subsistence Rice / Rations',
    unit: 'kg',
    isMedical: false,
    standardCapacity: 1500,
  },
  DIESEL: {
    label: 'Backup Generator Diesel',
    unit: 'litres',
    isMedical: false,
    standardCapacity: 800,
  },
};

/**
 * 1. Commodity Depletion & Run-Rate Engine
 */
export function calculateCommodityDepletion(
  commodity: CommodityType,
  lastStock: number,
  baselineDailyBurn: number,
  elapsedHours: number,
  isMonsoonAlertActive: boolean,
  cutoffTimeHours: number
): CommodityDepletionState {
  const meta = COMMODITY_CONFIG[commodity];

  // Surge multiplier phi_surge = 1.4 for medical items during monsoon alert, else 1.0
  const surgeMultiplier = meta.isMedical && isMonsoonAlertActive ? 1.4 : 1.0;

  // Hourly Burn = (Baseline Daily Burn / 24.0) * phi_surge
  const hourlyBurn = (baselineDailyBurn / 24.0) * surgeMultiplier;

  // Current Stock = max(0, S_last - (Hourly Burn * Delta t_hours))
  const currentStock = Math.max(0, lastStock - hourlyBurn * elapsedHours);

  // T_exhaust = Current Stock / Hourly Burn
  const timeToExhaustHours = hourlyBurn > 0 ? currentStock / hourlyBurn : 999.0;

  // Supply Deficit Factor (S_def) per commodity
  let deficitFactor = 0.0;
  let deficitReason: CommodityDepletionState['deficitReason'] = 'NOMINAL';

  if (timeToExhaustHours <= cutoffTimeHours) {
    deficitFactor = 1.0;
    deficitReason = 'BEFORE_CUTOFF';
  } else if (timeToExhaustHours <= cutoffTimeHours + 48.0) {
    deficitFactor = 0.75;
    deficitReason = 'DURING_ISOLATION';
  } else if (timeToExhaustHours <= 72.0) {
    deficitFactor = 0.4;
    deficitReason = 'SAFETY_BUFFER';
  } else {
    deficitFactor = 0.0;
    deficitReason = 'NOMINAL';
  }

  return {
    type: commodity,
    label: meta.label,
    unit: meta.unit,
    isMedical: meta.isMedical,
    baselineDailyBurn,
    surgeMultiplier,
    hourlyBurn: Math.round(hourlyBurn * 100) / 100,
    lastStock,
    currentStock: Math.round(currentStock * 10) / 10,
    timeToExhaustHours: Math.round(timeToExhaustHours * 10) / 10,
    deficitFactor,
    deficitReason,
  };
}

/**
 * 2. Isolation Risk (R_iso)
 */
export function calculateIsolationRisk(
  ingressRouteCount: number,
  disruptionProbMax: number
): { corridorFactor: number; isolationRisk: number } {
  // C_iso = 1.0 if Ingress Route Count <= 1 (single point of failure), else 0.4
  const corridorFactor = ingressRouteCount <= 1 ? 1.0 : 0.4;

  // R_iso = (0.6 * P_disrupt_max) + (0.4 * C_iso)
  const isolationRisk = 0.6 * disruptionProbMax + 0.4 * corridorFactor;

  return {
    corridorFactor,
    isolationRisk: Math.min(1.0, Math.max(0, isolationRisk)),
  };
}

/**
 * 3. Vulnerability Index (I_vuln)
 */
export function calculateVulnerabilityIndex(
  population: number,
  healthcareFacilities: number,
  hasActiveIndent: boolean
): number {
  // I_vuln = 0.4 * min(1.0, Pop / 5000) + 0.4 * min(1.0, Facilities / 3) + 0.2 * I_active_indent
  const popTerm = 0.4 * Math.min(1.0, population / 5000.0);
  const facilityTerm = 0.4 * Math.min(1.0, healthcareFacilities / 3.0);
  const indentTerm = 0.2 * (hasActiveIndent ? 1.0 : 0.0);

  const vuln = popTerm + facilityTerm + indentTerm;
  return Math.min(1.0, Math.max(0, vuln));
}

/**
 * 4. Composite Priority Score & Actionable Dispatch Window
 */
export function calculateCompositePriority(
  community: CommunityBase
): CalculationResult {
  const commodityKeys: CommodityType[] = ['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'];

  const commodityDepletions: Record<CommodityType, CommodityDepletionState> = {} as any;
  let maxDeficit = 0.0;
  let criticalCommodity: CommodityType = 'IV_FLUIDS';
  let minExhaustHours = 9999.0;

  for (const c of commodityKeys) {
    const inv = community.inventories[c];
    const depletion = calculateCommodityDepletion(
      c,
      inv.lastStock,
      inv.baselineDailyBurn,
      community.elapsedTimeHours,
      community.isMonsoonAlertActive,
      community.cutoffTimeHours
    );
    commodityDepletions[c] = depletion;

    if (
      depletion.deficitFactor > maxDeficit ||
      (depletion.deficitFactor === maxDeficit && depletion.timeToExhaustHours < minExhaustHours)
    ) {
      maxDeficit = depletion.deficitFactor;
      criticalCommodity = c;
      minExhaustHours = depletion.timeToExhaustHours;
    }
  }

  // Supply Deficit Factor S_def = max deficit across monitored items
  const supplyDeficitFactor = maxDeficit;

  // Isolation Risk
  const { corridorFactor, isolationRisk } = calculateIsolationRisk(
    community.ingressRouteCount,
    community.disruptionProbMax
  );

  // Vulnerability Index
  const vulnerabilityIndex = calculateVulnerabilityIndex(
    community.population,
    community.healthcareFacilities,
    community.hasActiveIndent
  );

  // Base Score = (0.45 * R_iso) + (0.35 * S_def) + (0.20 * I_vuln)
  const baseScore = 0.45 * isolationRisk + 0.35 * supplyDeficitFactor + 0.20 * vulnerabilityIndex;

  // Actionable Dispatch Window T_window = max(0, T_cutoff - T_transit)
  const actionableDispatchWindow = Math.max(0, community.cutoffTimeHours - community.transitTimeHours);

  // Emergency Urgency Boost: If S_def >= 0.75 and T_window <= 3.0 hours:
  const isUrgent = supplyDeficitFactor >= 0.75 && actionableDispatchWindow <= 3.0;
  const emergencyUrgencyBoost = isUrgent ? 0.20 : 0.0;
  const finalScore = Math.min(1.0, baseScore + emergencyUrgencyBoost);

  // Priority Tiers
  let priorityTier: PriorityTier = 'P4';
  if (finalScore >= 0.75) {
    priorityTier = 'P1';
  } else if (finalScore >= 0.55) {
    priorityTier = 'P2';
  } else if (finalScore >= 0.35) {
    priorityTier = 'P3';
  } else {
    priorityTier = 'P4';
  }

  // Explainability Audit Trail
  const auditTrail: AuditTrailItem[] = [
    {
      id: 'window-audit',
      category: 'TIMELINE',
      level: actionableDispatchWindow <= 0 ? 'critical' : actionableDispatchWindow <= 3.0 ? 'warning' : 'positive',
      headline: actionableDispatchWindow <= 0
        ? 'Dispatch Window CLOSED (Transit exceeds cutoff)'
        : `Actionable Dispatch Window: ${actionableDispatchWindow.toFixed(1)} Hours Remaining`,
      detail: `Cutoff in ${community.cutoffTimeHours.toFixed(1)}h minus ${community.transitTimeHours.toFixed(1)}h transit time leaves ${actionableDispatchWindow.toFixed(1)}h to initiate ground convoy departure.`,
      factorImpact: `T_window = ${actionableDispatchWindow.toFixed(1)}h`,
    },
    {
      id: 'supply-audit',
      category: 'SUPPLY',
      level: supplyDeficitFactor >= 0.75 ? 'critical' : supplyDeficitFactor >= 0.4 ? 'warning' : 'positive',
      headline: `Critical Deficit: ${COMMODITY_CONFIG[criticalCommodity].label}`,
      detail: `Current stock (${commodityDepletions[criticalCommodity].currentStock} ${COMMODITY_CONFIG[criticalCommodity].unit}) exhausts in ${minExhaustHours.toFixed(1)}h under ${commodityDepletions[criticalCommodity].surgeMultiplier}x monsoon burn rate.`,
      factorImpact: `S_def = ${supplyDeficitFactor.toFixed(2)} (${commodityDepletions[criticalCommodity].deficitReason})`,
    },
    {
      id: 'isolation-audit',
      category: 'ISOLATION',
      level: isolationRisk >= 0.7 ? 'critical' : 'warning',
      headline: community.ingressRouteCount <= 1 ? 'Single Point of Failure Corridor' : 'Multiple Alternate Corridors',
      detail: `Disruption probability P(disrupt) = ${(community.disruptionProbMax * 100).toFixed(0)}% with ${community.ingressRouteCount} ingress path(s).`,
      factorImpact: `R_iso = ${isolationRisk.toFixed(2)}`,
    },
    {
      id: 'formula-audit',
      category: 'FORMULA',
      level: emergencyUrgencyBoost > 0 ? 'critical' : 'neutral',
      headline: emergencyUrgencyBoost > 0 ? 'Urgency Boost Triggered (+0.20)' : 'Standard Composite Scoring',
      detail: emergencyUrgencyBoost > 0
        ? `Base Score (${baseScore.toFixed(3)}) received +0.20 emergency boost because S_def >= 0.75 and T_window <= 3.0h.`
        : `Base Score = (0.45 * ${isolationRisk.toFixed(2)}) + (0.35 * ${supplyDeficitFactor.toFixed(2)}) + (0.20 * ${vulnerabilityIndex.toFixed(2)}) = ${baseScore.toFixed(3)}.`,
      factorImpact: `Final Priority Score: ${finalScore.toFixed(3)} [${priorityTier}]`,
    },
  ];

  return {
    commodityDepletions,
    criticalCommodity,
    criticalExhaustHours: Math.round(minExhaustHours * 10) / 10,
    supplyDeficitFactor: Math.round(supplyDeficitFactor * 100) / 100,
    isolationCorridorFactor: corridorFactor,
    isolationRisk: Math.round(isolationRisk * 100) / 100,
    vulnerabilityIndex: Math.round(vulnerabilityIndex * 100) / 100,
    baseScore: Math.round(baseScore * 1000) / 1000,
    actionableDispatchWindow: Math.round(actionableDispatchWindow * 10) / 10,
    emergencyUrgencyBoost,
    finalScore: Math.round(finalScore * 1000) / 1000,
    priorityTier,
    auditTrail,
  };
}
