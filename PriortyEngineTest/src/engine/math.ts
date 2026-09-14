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
    standardCapacity: 250,
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
 * Calculates per-commodity burn rates, current stock based on elapsed time,
 * hours to zero exhaustion, and the Supply Deficit Factor.
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
  
  // Supply Deficit Factor (S_def) per commodity:
  // - 1.00 if T_exhaust <= T_cutoff (Stock exhausts BEFORE road cuts off)
  // - 0.75 if T_cutoff < T_exhaust <= (T_cutoff + 48.0h) (Stock exhausts DURING 48h isolation window)
  // - 0.40 if T_exhaust <= Safety Buffer (72h)
  // - 0.00 otherwise
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
    hourlyBurn,
    lastStock,
    currentStock: Math.round(currentStock * 10) / 10,
    timeToExhaustHours: Math.round(timeToExhaustHours * 10) / 10,
    deficitFactor,
    deficitReason,
  };
}

/**
 * 2. Isolation Risk (R_iso) & Vulnerability (I_vuln)
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
 * 3. Composite Score & Actionable Dispatch Window
 */
export function calculateCompositePriority(
  community: CommunityBase
): CalculationResult {
  const commodityKeys: CommodityType[] = ['IV_FLUIDS', 'ANTIVENOM', 'GRAIN_RICE', 'DIESEL'];
  
  // Calculate depletions for each commodity
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

    // Determine critical commodity (highest deficit, lowest exhaust)
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
  const baseScore = 0.45 * isolationRisk + 0.35 * supplyDeficitFactor + 0.2 * vulnerabilityIndex;

  // Actionable Dispatch Window T_window = max(0, T_cutoff - T_transit)
  const actionableDispatchWindow = Math.max(0, community.cutoffTimeHours - community.transitTimeHours);

  // Emergency Urgency Boost: If S_def >= 0.75 and T_window <= 3.0 hours:
  // Final Score = min(1.0, Base Score + 0.20)
  const isUrgent = supplyDeficitFactor >= 0.75 && actionableDispatchWindow <= 3.0;
  const emergencyUrgencyBoost = isUrgent ? 0.2 : 0.0;
  const finalScore = Math.min(1.0, baseScore + emergencyUrgencyBoost);

  // Priority Tiers:
  // P1 (CRITICAL): Score >= 0.75
  // P2 (HIGH): 0.55 <= Score < 0.75
  // P3 (MODERATE): 0.35 <= Score < 0.55
  // P4 (NOMINAL): Score < 0.35
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

  // Generate explainability audit trail
  const auditTrail = generateAuditTrail(
    community,
    commodityDepletions,
    criticalCommodity,
    supplyDeficitFactor,
    isolationRisk,
    corridorFactor,
    vulnerabilityIndex,
    baseScore,
    actionableDispatchWindow,
    emergencyUrgencyBoost,
    finalScore,
    priorityTier
  );

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

/**
 * Generate human-readable explainability audit trail
 */
function generateAuditTrail(
  community: CommunityBase,
  depletions: Record<CommodityType, CommodityDepletionState>,
  criticalCommodity: CommodityType,
  sDef: number,
  rIso: number,
  cIso: number,
  iVuln: number,
  baseScore: number,
  tWindow: number,
  urgencyBoost: number,
  finalScore: number,
  tier: PriorityTier
): AuditTrailItem[] {
  const items: AuditTrailItem[] = [];
  const crit = depletions[criticalCommodity];

  // 1. Dispatch Window & Timeline
  if (tWindow <= 0) {
    items.push({
      id: 'window-closed',
      category: 'TIMELINE',
      level: 'critical',
      headline: 'Dispatch Window CLOSED (Transit Time Exceeds Cutoff)',
      detail: `Transit time (${community.transitTimeHours.toFixed(1)}h) exceeds road cutoff (${community.cutoffTimeHours.toFixed(1)}h). Ground transport cannot beat impending landslide. Preemptive dispatch window is 0.0h.`,
      factorImpact: 'T_window = 0.0h (Immediate Emergency)',
    });
  } else if (tWindow <= 3.0) {
    items.push({
      id: 'window-narrow',
      category: 'TIMELINE',
      level: 'critical',
      headline: `Urgent Dispatch Window: ${tWindow.toFixed(1)} Hours Remaining`,
      detail: `Cutoff in ${community.cutoffTimeHours.toFixed(1)}h minus ${community.transitTimeHours.toFixed(1)}h transit allows only ${tWindow.toFixed(1)}h to initiate field departure before corridor is severed.`,
      factorImpact: `T_window = ${tWindow.toFixed(1)}h (<= 3.0h cutoff)`,
    });
  } else {
    items.push({
      id: 'window-open',
      category: 'TIMELINE',
      level: 'positive',
      headline: `Dispatch Window Open: ${tWindow.toFixed(1)} Hours Viable`,
      detail: `Standard dispatch route viable from ${community.nearestDepotName}. Cutoff expected in ${community.cutoffTimeHours.toFixed(1)}h.`,
      factorImpact: `T_window = ${tWindow.toFixed(1)}h`,
    });
  }

  // 2. Supply Deficit
  if (sDef === 1.0) {
    items.push({
      id: 'supply-deficit-pre-cutoff',
      category: 'SUPPLY',
      level: 'critical',
      headline: `${crit.label} Depletes BEFORE Road Cutoff`,
      detail: `Current stock (${crit.currentStock} ${crit.unit}) burns out in ${crit.timeToExhaustHours.toFixed(1)}h, whereas road severance occurs at ${community.cutoffTimeHours.toFixed(1)}h. Community will exhaust stock while road is still passable unless dispatched now.`,
      factorImpact: 'S_def = 1.00 (Max Severity Factor)',
    });
  } else if (sDef === 0.75) {
    items.push({
      id: 'supply-deficit-isolation',
      category: 'SUPPLY',
      level: 'warning',
      headline: `${crit.label} Exhausts During 48h Isolation Window`,
      detail: `Remaining ${crit.label} lasts ${crit.timeToExhaustHours.toFixed(1)}h, which falls inside the vulnerable post-cutoff 48-hour recovery blackout period (${(community.cutoffTimeHours + 48).toFixed(1)}h window).`,
      factorImpact: 'S_def = 0.75 (Isolation Depletion Risk)',
    });
  } else if (sDef === 0.4) {
    items.push({
      id: 'supply-buffer-breach',
      category: 'SUPPLY',
      level: 'info',
      headline: 'Safety Buffer Depletion Notice (< 72h Reserve)',
      detail: `${crit.label} has ${crit.timeToExhaustHours.toFixed(1)}h remaining stock, breaching the national 72h pre-disaster safety buffer threshold.`,
      factorImpact: 'S_def = 0.40 (Buffer Warning)',
    });
  } else {
    items.push({
      id: 'supply-nominal',
      category: 'SUPPLY',
      level: 'positive',
      headline: 'Inventory Above 72-Hour Contingency Reserve',
      detail: `All 4 commodities maintain > 72 hours run-rate reserves under current burn trajectory.`,
      factorImpact: 'S_def = 0.00 (Sufficient Stock)',
    });
  }

  // 3. Monsoon Surge
  if (community.isMonsoonAlertActive) {
    items.push({
      id: 'monsoon-surge',
      category: 'SUPPLY',
      level: 'warning',
      headline: 'Monsoon Medical Surge Active (+40% Burn Rate)',
      detail: `Active monsoon alert triggers phi_surge = 1.4x for IV Fluids and Antivenom due to acute gastroenteritis and snakebite incidence.`,
      factorImpact: 'phi_surge = 1.40 for Medical items',
    });
  }

  // 4. Ingress & Isolation Risk
  if (cIso === 1.0) {
    items.push({
      id: 'single-corridor',
      category: 'RISK',
      level: 'critical',
      headline: 'Single-Access Arterial Corridor (Single Point of Failure)',
      detail: `Community relies on single route (${community.primaryCorridorName}). Disruption probability is ${(community.disruptionProbMax * 100).toFixed(0)}%, yielding R_iso = ${rIso.toFixed(2)}.`,
      factorImpact: `C_iso = 1.00, R_iso = ${rIso.toFixed(2)} (45% Weight)`,
    });
  } else {
    items.push({
      id: 'multi-corridor',
      category: 'RISK',
      level: 'info',
      headline: 'Multi-Corridor Ingress Redundancy Available',
      detail: `${community.ingressRouteCount} active ingress routes reduce isolation risk (C_iso = 0.40). Disruption probability: ${(community.disruptionProbMax * 100).toFixed(0)}%.`,
      factorImpact: `C_iso = 0.40, R_iso = ${rIso.toFixed(2)}`,
    });
  }

  // 5. Vulnerability & Indent
  if (community.hasActiveIndent) {
    items.push({
      id: 'active-indent',
      category: 'VULNERABILITY',
      level: 'warning',
      headline: 'Formal Emergency Requisition Indent Pending',
      detail: `District Medical Officer has logged an unfulfilled requisition indent. Population: ${community.population.toLocaleString()}, Facilities: ${community.healthcareFacilities} PHC/CHC.`,
      factorImpact: `I_vuln = ${iVuln.toFixed(2)} (+0.20 Indent Penalty)`,
    });
  }

  // 6. Emergency Urgency Boost
  if (urgencyBoost > 0) {
    items.push({
      id: 'urgency-boost',
      category: 'ACTION',
      level: 'critical',
      headline: 'Emergency Urgency Boost Triggered (+0.20 to Final Score)',
      detail: `S_def >= 0.75 combined with closing dispatch window (T_window = ${tWindow.toFixed(1)}h <= 3.0h) elevates priority from Base Score ${baseScore.toFixed(3)} to Final Score ${finalScore.toFixed(3)} [${tier}].`,
      factorImpact: '+0.20 Emergency Boost Applied',
    });
  }

  return items;
}
