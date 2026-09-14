import type { Segment } from '../types';

export interface GraphEdge {
  segment: Segment;
  from: string;
  to: string;
  weight: number; // distance in km
}

export interface RawPath {
  nodes: string[];
  segmentIds: string[];
  totalDistanceKm: number;
}

/**
 * Builds adjacency list for North East India road graph.
 * Road segments are bidirectional unless specified.
 */
export function buildAdjacencyList(segments: Segment[], excludedEdges: Set<string> = new Set()): Map<string, GraphEdge[]> {
  const adj = new Map<string, GraphEdge[]>();

  for (const seg of segments) {
    if (excludedEdges.has(seg.id)) continue;

    if (!adj.has(seg.fromNode)) adj.set(seg.fromNode, []);
    if (!adj.has(seg.toNode)) adj.set(seg.toNode, []);

    // Forward edge
    adj.get(seg.fromNode)!.push({
      segment: seg,
      from: seg.fromNode,
      to: seg.toNode,
      weight: seg.distance_km,
    });

    // Reverse edge (bidirectional road)
    adj.get(seg.toNode)!.push({
      segment: seg,
      from: seg.toNode,
      to: seg.fromNode,
      weight: seg.distance_km,
    });
  }

  return adj;
}

/**
 * Standard Dijkstra shortest path algorithm with node exclusions.
 */
export function dijkstra(
  adj: Map<string, GraphEdge[]>,
  startNode: string,
  targetNode: string,
  excludedNodes: Set<string> = new Set()
): RawPath | null {
  const distances = new Map<string, number>();
  const previous = new Map<string, { node: string; segmentId: string } | null>();
  const visited = new Set<string>();

  distances.set(startNode, 0);

  // Priority queue simulated via array
  const pq: { node: string; dist: number }[] = [{ node: startNode, dist: 0 }];

  while (pq.length > 0) {
    // Extract min distance
    pq.sort((a, b) => a.dist - b.dist);
    const { node: u, dist: d } = pq.shift()!;

    if (visited.has(u)) continue;
    visited.add(u);

    if (u === targetNode) break;

    const neighbors = adj.get(u) || [];
    for (const edge of neighbors) {
      const v = edge.to;
      if (visited.has(v) || excludedNodes.has(v)) continue;

      const alt = d + edge.weight;
      if (!distances.has(v) || alt < distances.get(v)!) {
        distances.set(v, alt);
        previous.set(v, { node: u, segmentId: edge.segment.id });
        pq.push({ node: v, dist: alt });
      }
    }
  }

  if (!distances.has(targetNode)) {
    return null;
  }

  // Reconstruct path
  const pathNodes: string[] = [];
  const pathSegmentIds: string[] = [];
  let curr: string | null = targetNode;

  while (curr && curr !== startNode) {
    pathNodes.unshift(curr);
    const prevEntry = previous.get(curr);
    if (!prevEntry) break;
    pathSegmentIds.unshift(prevEntry.segmentId);
    curr = prevEntry.node;
  }

  if (curr === startNode) {
    pathNodes.unshift(startNode);
    return {
      nodes: pathNodes,
      segmentIds: pathSegmentIds,
      totalDistanceKm: distances.get(targetNode)!,
    };
  }

  return null;
}

/**
 * Yen's K-Shortest Loopless Paths Algorithm.
 * Computes up to K distinct paths from startNode to targetNode.
 */
export function findKShortestPaths(
  segments: Segment[],
  startNode: string,
  targetNode: string,
  K: number = 5
): RawPath[] {
  const fullAdj = buildAdjacencyList(segments);
  const initialPath = dijkstra(fullAdj, startNode, targetNode);

  if (!initialPath) {
    return [];
  }

  const A: RawPath[] = [initialPath]; // Determined shortest paths
  const B: RawPath[] = []; // Candidate paths pool

  for (let k = 1; k < K; k++) {
    const prevPath = A[k - 1];

    // Iterate through all nodes in the previous path except the destination
    for (let i = 0; i < prevPath.nodes.length - 1; i++) {
      const spurNode = prevPath.nodes[i];
      const rootPathNodes = prevPath.nodes.slice(0, i + 1);
      const rootPathSegmentIds = prevPath.segmentIds.slice(0, i);

      const excludedEdges = new Set<string>();

      // Remove edges that are part of previous paths that share the same root path
      for (const p of A) {
        if (p.nodes.length > i && p.nodes.slice(0, i + 1).every((n, idx) => n === rootPathNodes[idx])) {
          if (p.segmentIds[i]) {
            excludedEdges.add(p.segmentIds[i]);
          }
        }
      }

      // Exclude nodes in root path except spur node to ensure loopless paths
      const excludedNodes = new Set<string>();
      for (let j = 0; j < i; j++) {
        excludedNodes.add(rootPathNodes[j]);
      }

      const spurAdj = buildAdjacencyList(segments, excludedEdges);
      const spurPath = dijkstra(spurAdj, spurNode, targetNode, excludedNodes);

      if (spurPath) {
        const totalNodes = [...rootPathNodes.slice(0, -1), ...spurPath.nodes];
        const totalSegmentIds = [...rootPathSegmentIds, ...spurPath.segmentIds];

        // Compute actual total distance
        let totalDist = 0;
        for (const segId of totalSegmentIds) {
          const seg = segments.find(s => s.id === segId);
          if (seg) totalDist += seg.distance_km;
        }

        const candidate: RawPath = {
          nodes: totalNodes,
          segmentIds: totalSegmentIds,
          totalDistanceKm: totalDist,
        };

        // Add to B if not already present
        const isDuplicate = B.some(
          b => b.nodes.length === candidate.nodes.length && b.nodes.every((n, idx) => n === candidate.nodes[idx])
        ) || A.some(
          a => a.nodes.length === candidate.nodes.length && a.nodes.every((n, idx) => n === candidate.nodes[idx])
        );

        if (!isDuplicate) {
          B.push(candidate);
        }
      }
    }

    if (B.length === 0) {
      break;
    }

    // Sort B by distance and pick the shortest
    B.sort((a, b) => a.totalDistanceKm - b.totalDistanceKm);
    const shortestCandidate = B.shift()!;
    A.push(shortestCandidate);
  }

  return A;
}
