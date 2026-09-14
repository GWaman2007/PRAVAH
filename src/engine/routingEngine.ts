import type {
  CandidateRoute,
  Segment,
  SegmentEvaluation,
  SegmentIncident,
  VehicleProfile,
} from '../types';

export interface RawPath {
  nodes: string[];
  segmentIds: string[];
  totalBaseDistanceKm: number;
}

/**
 * Stage 1 & Stage 2: Evaluate a single segment for a vehicle under weather and incident conditions
 */
export function evaluateSegment(
  segment: Segment,
  vehicle: VehicleProfile,
  rainfallMmHr: number,
  disruption?: SegmentIncident
): SegmentEvaluation {
  const hardConstraintFailures: string[] = [];

  // Stage 1: Hard Constraints Pruning
  if (vehicle.weight_tonnes > segment.max_weight_limit) {
    const bridgeNote = segment.bridgeName ? ` (${segment.bridgeName})` : '';
    hardConstraintFailures.push(
      `Exceeds Bridge Load Limit${bridgeNote}: Vehicle weighs ${vehicle.weight_tonnes}T but road is rated for max ${segment.max_weight_limit}T.`
    );
  }

  if (vehicle.height_m > segment.max_height_limit) {
    const tunnelNote = segment.tunnelName ? ` (${segment.tunnelName})` : '';
    hardConstraintFailures.push(
      `Exceeds Height Clearance${tunnelNote}: Vehicle height ${vehicle.height_m}m exceeds vertical clearance of ${segment.max_height_limit}m.`
    );
  }

  if (vehicle.width_m > segment.max_width_limit) {
    hardConstraintFailures.push(
      `Exceeds Road Width: Vehicle width ${vehicle.width_m}m exceeds narrow pass width of ${segment.max_width_limit}m.`
    );
  }

  const isTotalBlockage = disruption?.status === 'TOTAL_BLOCKAGE';
  if (isTotalBlockage) {
    hardConstraintFailures.push(
      `Active Roadblock: ${disruption?.cause || 'Major Landslide'} on ${segment.name} - ${disruption?.description || 'Road completely impassable'}.`
    );
  }

  const passHardConstraints = hardConstraintFailures.length === 0;

  // Stage 2: Multi-Factor ML Scoring Engine
  const rainfallFactor = Math.min(1.0, Math.max(0, rainfallMmHr / 50.0));
  const lhzFactor = Math.min(1.0, Math.max(0, (segment.bhuvan_lhz_level - 1) / 4.0));

  let incidentPenalty = 0.0;
  let fieldIncidentMultiplier = 1.0;

  if (disruption?.status === 'TOTAL_BLOCKAGE') {
    incidentPenalty = 1.0;
    fieldIncidentMultiplier = 6.0;
  } else if (disruption?.status === 'SINGLE_LANE_PASSABLE') {
    incidentPenalty = 0.65;
    fieldIncidentMultiplier = 1.95;
  }

  // Segment Risk Formula: (0.40 * Rainfall) + (0.30 * LHZ) + (0.30 * Incident)
  const segmentRisk = Math.min(
    1.0,
    Math.max(0, 0.4 * rainfallFactor + 0.3 * lhzFactor + 0.3 * incidentPenalty)
  );

  // Slope Penalty
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

  // Delay Multiplier
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
    effectiveSpeedKmh: Math.round(effectiveSpeedKmh * 10) / 10,
    travelTimeMinutes: Math.round(travelTimeMinutes),
    isTotalBlockage,
  };
}

/**
 * Dijkstra shortest path implementation
 */
function dijkstra(
  startNode: string,
  endNode: string,
  segments: Segment[],
  excludedEdges: Set<string>
): RawPath | null {
  const adjacency = new Map<string, { neighbor: string; segment: Segment }[]>();
  for (const seg of segments) {
    if (excludedEdges.has(seg.id)) continue;
    if (!adjacency.has(seg.fromNode)) adjacency.set(seg.fromNode, []);
    if (!adjacency.has(seg.toNode)) adjacency.set(seg.toNode, []);
    adjacency.get(seg.fromNode)!.push({ neighbor: seg.toNode, segment: seg });
    adjacency.get(seg.toNode)!.push({ neighbor: seg.fromNode, segment: seg });
  }

  const distances = new Map<string, number>();
  const previous = new Map<string, { node: string; segmentId: string } | null>();
  const unvisited = new Set<string>();

  adjacency.forEach((_, node) => {
    distances.set(node, Infinity);
    previous.set(node, null);
    unvisited.add(node);
  });

  if (!distances.has(startNode) || !distances.has(endNode)) return null;
  distances.set(startNode, 0);

  while (unvisited.size > 0) {
    let closestNode: string | null = null;
    let minDistance = Infinity;

    for (const node of unvisited) {
      const d = distances.get(node)!;
      if (d < minDistance) {
        minDistance = d;
        closestNode = node;
      }
    }

    if (!closestNode || minDistance === Infinity) break;
    if (closestNode === endNode) break;

    unvisited.delete(closestNode);

    const neighbors = adjacency.get(closestNode) || [];
    for (const { neighbor, segment } of neighbors) {
      if (!unvisited.has(neighbor)) continue;
      const alt = distances.get(closestNode)! + segment.distance_km;
      if (alt < distances.get(neighbor)!) {
        distances.set(neighbor, alt);
        previous.set(neighbor, { node: closestNode, segmentId: segment.id });
      }
    }
  }

  if (distances.get(endNode) === Infinity) return null;

  const pathNodes: string[] = [];
  const pathSegmentIds: string[] = [];
  let curr: string | null = endNode;

  while (curr && curr !== startNode) {
    pathNodes.unshift(curr);
    const prev = previous.get(curr);
    if (!prev) break;
    pathSegmentIds.unshift(prev.segmentId);
    curr = prev.node;
  }
  pathNodes.unshift(startNode);

  return {
    nodes: pathNodes,
    segmentIds: pathSegmentIds,
    totalBaseDistanceKm: distances.get(endNode)!,
  };
}

/**
 * Yen's K-Shortest Path algorithm to find Top K alternative paths
 */
export function findKShortestPaths(
  startNode: string,
  endNode: string,
  allSegments: Segment[],
  K: number = 5
): RawPath[] {
  const resultPaths: RawPath[] = [];
  const candidatePaths: RawPath[] = [];

  const initialPath = dijkstra(startNode, endNode, allSegments, new Set());
  if (!initialPath) return [];
  resultPaths.push(initialPath);

  for (let k = 1; k < K; k++) {
    const prevPath = resultPaths[k - 1];

    for (let i = 0; i < prevPath.nodes.length - 1; i++) {
      const spurNode = prevPath.nodes[i];
      const rootPathNodes = prevPath.nodes.slice(0, i + 1);
      const rootPathSegmentIds = prevPath.segmentIds.slice(0, i);

      const excludedEdges = new Set<string>();

      for (const p of resultPaths) {
        if (p.nodes.slice(0, i + 1).join('->') === rootPathNodes.join('->')) {
          if (p.segmentIds[i]) {
            excludedEdges.add(p.segmentIds[i]);
          }
        }
      }

      const spurPath = dijkstra(spurNode, endNode, allSegments, excludedEdges);
      if (spurPath) {
        const totalNodes = [...rootPathNodes.slice(0, -1), ...spurPath.nodes];
        const totalSegmentIds = [...rootPathSegmentIds, ...spurPath.segmentIds];

        let totalDist = 0;
        for (const sId of totalSegmentIds) {
          const seg = allSegments.find((s) => s.id === sId);
          if (seg) totalDist += seg.distance_km;
        }

        const candidate: RawPath = {
          nodes: totalNodes,
          segmentIds: totalSegmentIds,
          totalBaseDistanceKm: totalDist,
        };

        const signature = candidate.segmentIds.join('|');
        const alreadyExists =
          resultPaths.some((r) => r.segmentIds.join('|') === signature) ||
          candidatePaths.some((c) => c.segmentIds.join('|') === signature);

        if (!alreadyExists) {
          candidatePaths.push(candidate);
        }
      }
    }

    if (candidatePaths.length === 0) break;

    candidatePaths.sort((a, b) => a.totalBaseDistanceKm - b.totalBaseDistanceKm);
    resultPaths.push(candidatePaths.shift()!);
  }

  return resultPaths;
}

/**
 * Evaluates candidate paths against vehicle profile and ranks them
 */
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

    const tags: string[] = [];
    if (maxGrad >= 10) tags.push('Steep Ghat Section');
    if (rainfallMmHr >= 30) tags.push('Heavy Rain Surge');
    if (pathSegments.some((s) => s.surface_type === 'under_construction')) tags.push('Work Zones');
    if (pathSegments.some((s) => s.bhuvan_lhz_level >= 4)) tags.push('LHZ Zone 4/5');
    if (!isPassable) tags.push('Impassable Corridor');

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

  const passable = evaluatedRoutes.filter((r) => r.isPassable);
  const impassable = evaluatedRoutes.filter((r) => !r.isPassable);

  // Rank passable routes by balanced duration + risk + distance
  passable.sort((a, b) => {
    const costA = a.degradedDurationMinutes * 0.7 + (100 - a.compositeSafetyScore) * 4.0 + a.totalDistanceKm * 0.15;
    const costB = b.degradedDurationMinutes * 0.7 + (100 - b.compositeSafetyScore) * 4.0 + b.totalDistanceKm * 0.15;
    return costA - costB;
  });

  const finalOrdered = [...passable, ...impassable];

  const palette = [
    '#10B981', // Rank 1: Emerald Green (Recommended Safe Route)
    '#38BDF8', // Alt 1: Sky Blue
    '#818CF8', // Alt 2: Indigo
    '#A78BFA', // Alt 3: Violet
    '#F59E0B', // Alt 4: Amber
  ];

  let rankCounter = 1;
  return finalOrdered.map((r) => {
    if (r.isPassable) {
      const currentRank = rankCounter++;
      let label = 'Alternative Route 1';
      if (currentRank === 1) label = 'Recommended Safe Route';
      else if (currentRank === 2) label = 'Alternative Route 1';
      else if (currentRank === 3) label = 'Alternative Route 2';
      else if (currentRank === 4) label = 'Alternative Route 3';
      else label = 'Alternative Route 4';

      return {
        ...r,
        rank: currentRank,
        rankLabel: label,
        color: palette[currentRank - 1] || '#38BDF8',
      };
    } else {
      return {
        ...r,
        rank: 99,
        rankLabel: 'Impassable Corridor',
        color: '#D92D20', // Blocked Red per design.md
        dashArray: '8, 8',
      };
    }
  });
}
