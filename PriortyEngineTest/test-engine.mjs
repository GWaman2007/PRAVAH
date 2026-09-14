// Standalone test script for verifying mathematical formulations of PRAVAH Engine
import assert from 'node:assert/strict';

function calculateCommodityDepletion(commodity, isMedical, lastStock, baselineDailyBurn, elapsedHours, isMonsoonAlertActive, cutoffTimeHours) {
  const surgeMultiplier = isMedical && isMonsoonAlertActive ? 1.4 : 1.0;
  const hourlyBurn = (baselineDailyBurn / 24.0) * surgeMultiplier;
  const currentStock = Math.max(0, lastStock - hourlyBurn * elapsedHours);
  const timeToExhaustHours = hourlyBurn > 0 ? currentStock / hourlyBurn : 999.0;

  let deficitFactor = 0.0;
  if (timeToExhaustHours <= cutoffTimeHours) {
    deficitFactor = 1.0;
  } else if (timeToExhaustHours <= cutoffTimeHours + 48.0) {
    deficitFactor = 0.75;
  } else if (timeToExhaustHours <= 72.0) {
    deficitFactor = 0.40;
  } else {
    deficitFactor = 0.00;
  }

  return { surgeMultiplier, hourlyBurn, currentStock, timeToExhaustHours, deficitFactor };
}

function calculateIsolationRisk(ingressRouteCount, disruptionProbMax) {
  const corridorFactor = ingressRouteCount <= 1 ? 1.0 : 0.4;
  const isolationRisk = (0.6 * disruptionProbMax) + (0.4 * corridorFactor);
  return { corridorFactor, isolationRisk };
}

function calculateVulnerabilityIndex(population, healthcareFacilities, hasActiveIndent) {
  const popTerm = 0.4 * Math.min(1.0, population / 5000.0);
  const facilityTerm = 0.4 * Math.min(1.0, healthcareFacilities / 3.0);
  const indentTerm = 0.2 * (hasActiveIndent ? 1.0 : 0.0);
  return popTerm + facilityTerm + indentTerm;
}

function calculateComposite(isolationRisk, supplyDeficitFactor, vulnerabilityIndex, cutoffTimeHours, transitTimeHours) {
  const baseScore = (0.45 * isolationRisk) + (0.35 * supplyDeficitFactor) + (0.20 * vulnerabilityIndex);
  const actionableDispatchWindow = Math.max(0, cutoffTimeHours - transitTimeHours);
  const isUrgent = supplyDeficitFactor >= 0.75 && actionableDispatchWindow <= 3.0;
  const emergencyUrgencyBoost = isUrgent ? 0.20 : 0.00;
  const finalScore = Math.min(1.0, baseScore + emergencyUrgencyBoost);

  let tier = 'P4';
  if (finalScore >= 0.75) tier = 'P1';
  else if (finalScore >= 0.55) tier = 'P2';
  else if (finalScore >= 0.35) tier = 'P3';
  else tier = 'P4';

  return { baseScore, actionableDispatchWindow, emergencyUrgencyBoost, finalScore, tier };
}

console.log('--- RUNNING MATHEMATICAL INTEGRITY VERIFICATION ---');

// Test 1: Medical Monsoon Surge
const medAlert = calculateCommodityDepletion('IV_FLUIDS', true, 100, 24, 0, true, 10);
assert.equal(medAlert.surgeMultiplier, 1.4, 'Medical item must have 1.4 surge under monsoon alert');
assert.equal(medAlert.hourlyBurn, 1.4, 'Hourly burn for 24 baseline daily with 1.4 surge must be 1.4/h');

const nonMedAlert = calculateCommodityDepletion('DIESEL', false, 100, 24, 0, true, 10);
assert.equal(nonMedAlert.surgeMultiplier, 1.0, 'Non-medical item must NOT have surge under monsoon alert');
assert.equal(nonMedAlert.hourlyBurn, 1.0, 'Hourly burn for non-medical should remain 1.0/h');
console.log('✓ Test 1 Passed: Surge Multiplier logic is exact.');

// Test 2: S_def thresholds
// Case A: T_exhaust <= T_cutoff -> S_def = 1.00
const def100 = calculateCommodityDepletion('IV_FLUIDS', true, 20, 24, 10, false, 15);
// stock = 20 - 10*1.0 = 10; T_exhaust = 10 / 1.0 = 10h <= 15h cutoff
assert.equal(def100.deficitFactor, 1.0, 'Exhausting before cutoff must yield S_def = 1.00');

// Case B: T_cutoff < T_exhaust <= T_cutoff + 48h -> S_def = 0.75
const def075 = calculateCommodityDepletion('IV_FLUIDS', false, 30, 24, 0, false, 5);
// stock = 30; burn = 1.0/h; T_exhaust = 30h. 5 < 30 <= (5 + 48 = 53h)
assert.equal(def075.deficitFactor, 0.75, 'Exhausting during 48h isolation must yield S_def = 0.75');

// Case C: T_exhaust <= 72h safety buffer -> S_def = 0.40
const def040 = calculateCommodityDepletion('GRAIN_RICE', false, 65, 24, 0, false, 5);
// stock = 65; burn = 1.0/h; T_exhaust = 65h. Cutoff=5, 5+48=53 < 65 <= 72.
assert.equal(def040.deficitFactor, 0.40, 'Exhausting within 72h buffer must yield S_def = 0.40');

// Case D: T_exhaust > 72h -> S_def = 0.00
const def000 = calculateCommodityDepletion('DIESEL', false, 100, 24, 0, false, 5);
// stock = 100; T_exhaust = 100h > 72h
assert.equal(def000.deficitFactor, 0.00, 'Exhausting > 72h must yield S_def = 0.00');
console.log('✓ Test 2 Passed: S_def piecewise intervals are exact.');

// Test 3: Isolation Risk & Single Route Corridor
const singleRoute = calculateIsolationRisk(1, 0.85);
assert.equal(singleRoute.corridorFactor, 1.0, 'Single route must have C_iso = 1.0');
assert.equal(singleRoute.isolationRisk, 0.6 * 0.85 + 0.4 * 1.0, 'R_iso formula must match');

const dualRoute = calculateIsolationRisk(2, 0.85);
assert.equal(dualRoute.corridorFactor, 0.4, 'Dual routes must have C_iso = 0.4');
console.log('✓ Test 3 Passed: C_iso & R_iso formulas are exact.');

// Test 4: Vulnerability Index & Indent
const vulnWithIndent = calculateVulnerabilityIndex(6400, 2, true);
// Pop: 0.4 * min(1, 6400/5000) = 0.4 * 1.0 = 0.4
// Fac: 0.4 * min(1, 2/3) = 0.2666...
// Indent: 0.2 * 1.0 = 0.2
const expectedVuln = 0.4 + (0.4 * (2 / 3)) + 0.2;
assert.ok(Math.abs(vulnWithIndent - expectedVuln) < 1e-6, 'I_vuln must match formula');
console.log('✓ Test 4 Passed: Vulnerability Index formulation is exact.');

// Test 5: Composite Score & Emergency Urgency Boost (+0.20)
// With S_def >= 0.75 and T_window <= 3.0h
const compUrgent = calculateComposite(0.91, 1.0, 0.866, 4.5, 2.5);
// T_window = 4.5 - 2.5 = 2.0h <= 3.0h
// baseScore = 0.45 * 0.91 + 0.35 * 1.0 + 0.20 * 0.866 = 0.4095 + 0.35 + 0.1732 = 0.9327
// With +0.20 boost -> clamped to 1.0
assert.equal(compUrgent.emergencyUrgencyBoost, 0.20, 'Urgency boost must be 0.20');
assert.equal(compUrgent.finalScore, 1.0, 'Clamped final score must be 1.0');
assert.equal(compUrgent.tier, 'P1', 'Must be P1 CRITICAL');

// Without boost (T_window = 8.0h > 3.0h)
const compNonUrgent = calculateComposite(0.5, 0.4, 0.5, 12.0, 4.0);
assert.equal(compNonUrgent.emergencyUrgencyBoost, 0.00, 'Urgency boost must be 0.00');
assert.equal(compNonUrgent.tier, 'P3', 'Must evaluate to P3 MODERATE');
console.log('✓ Test 5 Passed: Composite Score, Urgency Boost and Priority Tiers are exact.');

console.log('ALL MATHEMATICAL LOGIC CHECKS PASSED SUCCESSFULLY!');
