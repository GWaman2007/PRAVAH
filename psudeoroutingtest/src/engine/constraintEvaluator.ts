import type { CandidateRoute, Segment, SegmentEvaluation, SegmentIncident, VehicleProfile } from '../types';
import type { RawPath } from './kShortestPaths';

export function evaluateSegment(
  segment: Segment,
  vehicle: VehicleProfile,
  rainfallMmHr: number,
  disruption?: SegmentIncident
): SegmentEvaluation {
  const hardConstraintFailures: string[] = [];

  // Stage 1: Hard Constraints
  // 1. Vehicle Weight vs Max Weight Limit (bridges/viaducts)
  if (vehicle.weight_tonnes > segment.max_weight_limit) {
    const bridgeNote = segment.bridgeName ? ` (${segment.bridgeName})` : '';
    hardConstraintFailures.push(
      `Exceeds Bridge Load Limit${bridgeNote}: Vehicle weighs ${vehicle.weight_tonnes}T but road is rated for max ${segment.max_weight_limit}T.`
    );
  }

  // 2. Vehicle Height vs Tunnel/Overhang Clearance
  if (vehicle.height_m > segment.max_height_limit) {
    const tunnelNote = segment.tunnelName ? ` (${segment.tunnelName})` : '';
    hardConstraintFailures.push(
      `Exceeds Height Clearance${tunnelNote}: Vehicle height ${vehicle.height_m}m exceeds vertical clearance of ${segment.max_height_limit}m.`
    );
  }

  // 3. Vehicle Width vs Narrow Mountain Cut
  if (vehicle.width_m > segment.max_width_limit) {
    hardConstraintFailures.push(
      `Exceeds Road Width: Vehicle width ${vehicle.width_m}m exceeds narrow pass width of ${segment.max_width_limit}m.`
    );
  }

  // 4. Ground Officer Total Blockage
  const isTotalBlockage = disruption?.status === 'TOTAL_BLOCKAGE';
  if (isTotalBlockage) {
    const causeLabel = disruption?.cause?.replace('_', ' ') || 'Major Landslide';
    hardConstraintFailures.push(
      `Active Ground Blockage: ${causeLabel} reported on ${segment.name} - ${disruption?.description || 'Road completely impassable'}.`
    );
  }

  const passHardConstraints = hardConstraintFailures.length === 0;

  // Stage 2: Multi-Factor ML Scoring Engine
  // Factor 1: Rainfall Factor (normalized 0 to 1 based on 50 mm/hr ceiling)
  const rainfallFactor = Math.min(1.0, Math.max(0, rainfallMmHr / 50));

  // Factor 2: LHZ Factor (Bhuvan Landslide Hazard Zonation 1-5 -> 0.0 to 1.0)
  const lhzFactor = Math.min(1.0, Math.max(0, (segment.bhuvan_lhz_level - 1) / 4));

  // Factor 3: Field Incident Penalty
  let incidentPenalty = 0.0;
  let fieldIncidentMultiplier = 1.0;

  if (disruption?.status === 'TOTAL_BLOCKAGE') {
    incidentPenalty = 1.0;
    fieldIncidentMultiplier = 6.0;
  } else if (disruption?.status === 'SINGLE_LANE_PASSABLE') {
    incidentPenalty = 0.65;
    fieldIncidentMultiplier = 1.95; // Alternating one-way traffic convoy delay
  }

  // Segment Risk Formula: (0.40 * Rainfall Factor) + (0.30 * LHZ Factor) + (0.30 * Field Incident Penalty)
  const segmentRisk = Math.min(1.0, Math.max(0, (0.40 * rainfallFactor) + (0.30 * lhzFactor) + (0.30 * incidentPenalty)));

  // Slope Penalty: Flat to slight gradient has penalty 1.0, steep gradients increase delay
  const slopePenalty = segment.gradient_pct > 3.0
    ? 1.0 + (segment.gradient_pct - 3.0) * 0.065
    : 1.0;

  // Surface Degradation Factor
  let surfaceDegradation = 1.0;
  if (segment.surface_type === 'under_construction') {
    surfaceDegradation = 1.40;
  } else if (segment.surface_type === 'unpaved') {
    surfaceDegradation = 1.85;
  }

  // Delay Multiplier Formula:
  // 1.0 * Slope Penalty * Surface Degradation * Field Incident Penalty Multiplier * (1 + Rainfall Factor * 0.5)
  const delayMultiplier = slopePenalty * surfaceDegradation * fieldIncidentMultiplier * (1.0 + rainfallFactor * 0.5);

  const effectiveSpeedKmh = Math.max(8, segment.base_speed_kmh / delayMultiplier);
  const travelTimeMinutes = (segment.distance_km / effectiveSpeedKmh) * 60;

  return {
    segmentId: segment.id,
    passHardConstraints,
    hardConstraintFailures,
    rainfallFactor,
    lhzFactor,
    incidentPenalty,
    segmentRisk,
    slopePenalty,
    surfaceDegradation,
    delayMultiplier,
    effectiveSpeedKmh,
    travelTimeMinutes,
    isTotalBlockage,
  };
}

export function evaluateAndRankPaths(
  rawPaths: RawPath[],
  allSegments: Segment[],
  vehicle: VehicleProfile,
  rainfallMmHr: number,
  disruptions: Record<string, SegmentIncident>
): CandidateRoute[] {
  const segmentMap = new Map<string, Segment>();
  for (const s of allSegments) {
    segmentMap.set(s.id, s);
  }

  const evaluatedRoutes: Omit<CandidateRoute, 'rank' | 'rankLabel' | 'color' | 'dashArray'>[] = [];

  for (let pIdx = 0; pIdx < rawPaths.length; pIdx++) {
    const rawPath = rawPaths[pIdx];
    const pathSegments: Segment[] = [];
    const evaluations: SegmentEvaluation[] = [];

    let isPassable = true;
    let bottleneckInfo: CandidateRoute['failureBottleneck'] = undefined;

    let totalDistKm = 0;
    let baseTimeMinutes = 0;
    let degradedTimeMinutes = 0;
    let weightedRiskSum = 0;
    let maxGrad = 0;
    let totalElevationGain = 0;

    for (const segId of rawPath.segmentIds) {
      const seg = segmentMap.get(segId);
      if (!seg) continue;
      pathSegments.push(seg);

      const disruption = disruptions[segId];
      const evaluation = evaluateSegment(seg, vehicle, rainfallMmHr, disruption);
      evaluations.push(evaluation);

      totalDistKm += seg.distance_km;
      baseTimeMinutes += (seg.distance_km / seg.base_speed_kmh) * 60;
      degradedTimeMinutes += evaluation.travelTimeMinutes;
      weightedRiskSum += evaluation.segmentRisk * seg.distance_km;

      if (seg.gradient_pct > maxGrad) {
        maxGrad = seg.gradient_pct;
      }
      totalElevationGain += Math.round((seg.distance_km * 1000 * (seg.gradient_pct / 100)) * 0.4);

      // Check first failing segment
      if (!evaluation.passHardConstraints && isPassable) {
        isPassable = false;
        const midIdx = Math.floor(seg.coordinates.length / 2);
        bottleneckInfo = {
          segmentId: seg.id,
          segmentName: seg.name,
          reason: evaluation.hardConstraintFailures[0],
          coordinates: seg.coordinates[midIdx] || seg.coordinates[0],
          incidentCause: disruption?.cause,
        };
      }
    }

    const compositeRiskScore = totalDistKm > 0 ? weightedRiskSum / totalDistKm : 0;
    const compositeSafetyScore = Math.round(Math.max(5, Math.min(99, (1.0 - compositeRiskScore) * 100)));

    // Generate contextual tags
    const tags: string[] = [];
    if (maxGrad >= 11) tags.push('Steep Ghat Section');
    if (rainfallMmHr >= 30) tags.push('Heavy Rain Surge');
    if (pathSegments.some(s => s.surface_type === 'under_construction')) tags.push('Work Zones');
    if (pathSegments.some(s => s.surface_type === 'unpaved')) tags.push('Unpaved Stretch');
    if (pathSegments.some(s => s.bhuvan_lhz_level >= 4)) tags.push('LHZ Zone 4/5');
    if (pathSegments.some(s => disruptions[s.id]?.status === 'SINGLE_LANE_PASSABLE')) tags.push('Single Lane Congestion');
    if (!isPassable) tags.push('Impassable Bottleneck');

    evaluatedRoutes.push({
      id: `route-candidate-${pIdx + 1}`,
      pathNodeIds: rawPath.nodes,
      segmentIds: rawPath.segmentIds,
      segments: pathSegments,
      evaluatedSegments: evaluations,
      totalDistanceKm: Math.round(totalDistKm * 10) / 10,
      baseDurationMinutes: Math.round(baseTimeMinutes),
      degradedDurationMinutes: Math.round(degradedTimeMinutes),
      compositeSafetyScore,
      compositeRiskScore: Math.round(compositeRiskScore * 100) / 100,
      isPassable,
      failureBottleneck: bottleneckInfo,
      tags,
      elevationGainMeters: totalElevationGain,
      maxGradientPct: maxGrad,
    });
  }

  // Split into passable and impassable
  const passableRoutes = evaluatedRoutes.filter(r => r.isPassable);
  const impassableRoutes = evaluatedRoutes.filter(r => !r.isPassable);

  // Rank passable routes by composite optimization score:
  // Lower is better: balanced ETA + risk penalty + distance
  passableRoutes.sort((a, b) => {
    const costA = a.degradedDurationMinutes * 0.7 + (100 - a.compositeSafetyScore) * 4.0 + a.totalDistanceKm * 0.15;
    const costB = b.degradedDurationMinutes * 0.7 + (100 - b.compositeSafetyScore) * 4.0 + b.totalDistanceKm * 0.15;
    return costA - costB;
  });

  // Keep impassable routes sorted by distance
  impassableRoutes.sort((a, b) => a.totalDistanceKm - b.totalDistanceKm);

  // Combine together: passable first, then blocked
  const finalOrdered = [...passableRoutes, ...impassableRoutes];

  const candidatePalette = [
    '#10B981', // Rank 1: Emerald Green (Recommended)
    '#38BDF8', // Alt 1: Sky Blue
    '#818CF8', // Alt 2: Indigo
    '#A78BFA', // Alt 3: Violet
    '#F59E0B', // Alt 4: Amber
  ];

  let passableRankCounter = 1;

  const result: CandidateRoute[] = finalOrdered.map((r) => {
    if (r.isPassable) {
      const currentRank = passableRankCounter++;
      let label: CandidateRoute['rankLabel'] = 'Alternative Route 1';
      if (currentRank === 1) label = 'Recommended Safe Route';
      else if (currentRank === 2) label = 'Alternative Route 1';
      else if (currentRank === 3) label = 'Alternative Route 2';
      else if (currentRank === 4) label = 'Alternative Route 3';
      else label = 'Alternative Route 4';

      return {
        ...r,
        rank: currentRank,
        rankLabel: label,
        color: candidatePalette[currentRank - 1] || '#38BDF8',
      };
    } else {
      return {
        ...r,
        rank: 99,
        rankLabel: 'Impassable Corridor',
        color: '#EF4444',
        dashArray: '8, 8',
      };
    }
  });

  return result;
}
