import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { Incident, SegmentIncident, AlertEvent, CommunityBase, ReliefMission, MissionRouteOption, RealtimeHazardPolygon, DraftIncidentPlot, ResponseHub, HubInventory, InventoryTransaction, ModelAPrediction, ModelARiskBand, ResourceRequest } from '../types';

const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};
const procEnv = typeof globalThis !== 'undefined' && (globalThis as any).process?.env ? (globalThis as any).process.env : {};

const supabaseUrl = (metaEnv.VITE_SUPABASE_URL || procEnv.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = (
  metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  procEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
  metaEnv.VITE_SUPABASE_ANON_KEY ||
  procEnv.VITE_SUPABASE_ANON_KEY ||
  metaEnv.VITE_SUPABASE_KEY ||
  procEnv.VITE_SUPABASE_KEY ||
  ''
).trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl.startsWith('https://') &&
  supabasePublishableKey.length > 10
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabasePublishableKey, {
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  : null;

let globalChannel: RealtimeChannel | null = null;

/**
 * Initialize / fetch the global real-time broadcast channel
 */
export function getRealtimeChannel(): RealtimeChannel | null {
  if (!supabase) return null;
  if (!globalChannel) {
    globalChannel = supabase.channel('pravah-global-bus', {
      config: {
        broadcast: { ack: true },
      },
    });
  }
  return globalChannel;
}

/**
 * Cloud Incidents API
 */
export async function fetchCloudIncidents(): Promise<Incident[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch cloud incidents:', error.message);
      return null;
    }

    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      corridorFlair: row.corridor_flair || row.corridorFlair,
      incidentType: row.incident_type || row.incidentType,
      severity: row.severity,
      location: row.location || {
        lat: row.lat ?? 25.75,
        lng: row.lng ?? 93.98,
        placeName: row.place_name || row.placeName || 'NH Corridor',
        state: row.state || 'Nagaland',
        corridorId: row.corridor_id || row.corridorId || 'SEG-DIM-KOH-MAIN',
      },
      author: row.author || {
        name: row.author_name || 'Field Reporter',
        role: row.author_role || 'Citizen Driver',
      },
      timestamp: row.timestamp,
      mediaUrl: row.media_url || row.mediaUrl || '',
      votes: row.votes || { upvotes: row.upvotes ?? 1, downvotes: row.downvotes ?? 0, userVote: null },
      confidenceScore: row.confidence_score ?? row.confidenceScore ?? 1,
      hasOfficerVerified: Boolean(row.has_officer_verified ?? row.hasOfficerVerified),
      sync_status: 'SYNCED',
      updates: Array.isArray(row.updates) ? row.updates : [],
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching incidents:', err);
    return null;
  }
}

export async function upsertCloudIncident(incident: Incident): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: incident.id,
      title: incident.title,
      corridor_flair: incident.corridorFlair,
      incident_type: incident.incidentType,
      severity: incident.severity,
      location: incident.location,
      author: incident.author,
      timestamp: incident.timestamp,
      media_url: incident.mediaUrl,
      votes: {
        upvotes: incident.votes?.upvotes ?? 1,
        downvotes: incident.votes?.downvotes ?? 0,
      },
      confidence_score: incident.confidenceScore,
      has_officer_verified: incident.hasOfficerVerified,
      updates: incident.updates,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('incidents').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert incident error:', error.message);
      return false;
    }

    // Broadcast in real-time to all connected browser windows
    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'INCIDENT_ADDED',
        payload: { incident },
      });
    }

    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting incident:', err);
    return false;
  }
}

export async function voteCloudIncident(
  incidentId: string,
  votes: { upvotes: number; downvotes: number },
  confidenceScore: number,
  hasOfficerVerified: boolean
): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('incidents')
      .update({
        votes: { upvotes: votes.upvotes, downvotes: votes.downvotes },
        confidence_score: confidenceScore,
        has_officer_verified: hasOfficerVerified,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.warn('⚠️ [Supabase] Vote update error:', error.message);
      return false;
    }

    // Broadcast vote change to all devices
    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'INCIDENT_VOTED',
        payload: {
          incidentId,
          votes,
          confidenceScore,
          hasOfficerVerified,
        },
      });
    }

    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception voting incident:', err);
    return false;
  }
}

export async function addCloudIncidentUpdate(incidentId: string, update: any, allUpdates: any[]): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('incidents')
      .update({
        updates: allUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', incidentId);

    if (error) {
      console.warn('⚠️ [Supabase] Add update error:', error.message);
      return false;
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'INCIDENT_UPDATE_ADDED',
        payload: {
          incidentId,
          update,
          updates: allUpdates,
        },
      });
    }

    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception adding update:', err);
    return false;
  }
}

/**
 * Cloud Disruptions API
 */
export async function fetchCloudDisruptions(): Promise<Record<string, SegmentIncident> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('disruptions').select('*');
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch disruptions:', error.message);
      return null;
    }
    const result: Record<string, SegmentIncident> = {};
    if (data) {
      data.forEach((row: any) => {
        result[row.corridor_id] = {
          status: row.status,
          cause: row.cause,
          description: row.description,
          reportedBy: row.reported_by || row.reportedBy,
        };
      });
    }
    return result;
  } catch {
    return null;
  }
}

export async function upsertCloudDisruption(corridorId: string, disruption: SegmentIncident | null): Promise<boolean> {
  if (!supabase) return false;
  try {
    if (!disruption) {
      await supabase.from('disruptions').delete().eq('corridor_id', corridorId);
    } else {
      await supabase.from('disruptions').upsert({
        corridor_id: corridorId,
        status: disruption.status,
        cause: disruption.cause,
        description: disruption.description,
        reported_by: disruption.reportedBy,
        updated_at: new Date().toISOString(),
      });
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'DISRUPTION_UPDATED',
        payload: { corridorId, disruption },
      });
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Cloud Emergency SOS Broadcast
 */
export function broadcastCloudSOS(vehicleId: string, alert: AlertEvent): void {
  const channel = getRealtimeChannel();
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'DRIVER_SOS_SIGNAL',
      payload: { vehicleId, alert },
    });
  }
}

export function cancelCloudSOS(vehicleId: string): void {
  const channel = getRealtimeChannel();
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'DRIVER_SOS_CANCELLED',
      payload: { vehicleId },
    });
  }
}

/**
 * Cloud Communities API
 */
export async function fetchCloudCommunities(): Promise<CommunityBase[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('communities').select('*');
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch communities:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      state: row.state,
      district: row.district,
      coordinates: Array.isArray(row.coordinates)
        ? row.coordinates
        : [row.coordinates?.lat ?? 24.22, row.coordinates?.lng ?? 92.67],
      boundary: row.boundary || undefined,
      population: Number(row.population),
      healthcareFacilities: Number(row.healthcare_facilities ?? row.healthcareFacilities ?? 2),
      ingressRouteCount: Number(row.ingress_route_count ?? row.ingressRouteCount ?? 1),
      primaryCorridor: row.primary_corridor || row.primaryCorridor,
      nearestDepotName: row.nearest_depot_name || row.nearestDepotName,
      transitTimeHours: Number(row.transit_time_hours ?? row.transitTimeHours ?? 2.5),
      cutoffTimeHours: Number(row.cutoff_time_hours ?? row.cutoffTimeHours ?? 4.0),
      disruptionProbMax: Number(row.disruption_prob_max ?? row.disruptionProbMax ?? 0.85),
      elapsedTimeHours: Number(row.elapsed_time_hours ?? row.elapsedTimeHours ?? 0),
      isMonsoonAlertActive: Boolean(row.is_monsoon_alert_active ?? row.isMonsoonAlertActive ?? true),
      hasActiveIndent: Boolean(row.has_active_indent ?? row.hasActiveIndent ?? true),
      inventories: row.inventories || {},
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching communities:', err);
    return null;
  }
}

export async function upsertCloudCommunity(community: CommunityBase): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: community.id,
      name: community.name,
      state: community.state,
      district: community.district,
      coordinates: community.coordinates,
      boundary: community.boundary,
      population: community.population,
      healthcare_facilities: community.healthcareFacilities,
      ingress_route_count: community.ingressRouteCount,
      primary_corridor: community.primaryCorridor,
      nearest_depot_name: community.nearestDepotName,
      transit_time_hours: community.transitTimeHours,
      cutoff_time_hours: community.cutoffTimeHours,
      disruption_prob_max: community.disruptionProbMax,
      elapsed_time_hours: community.elapsedTimeHours,
      is_monsoon_alert_active: community.isMonsoonAlertActive,
      has_active_indent: community.hasActiveIndent,
      inventories: community.inventories,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('communities').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert community error:', error.message);
      return false;
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'COMMUNITY_UPDATED',
        payload: { community },
      });
    }

    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting community:', err);
    return false;
  }
}

/**
 * Cloud Relief Missions API
 */
export async function fetchCloudMissions(): Promise<ReliefMission[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('missions')
      .select('*')
      .neq('status', 'ARCHIVED')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch missions:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    // Fetch associated route options from mission_route_options table
    const { data: routeOptionsData } = await supabase
      .from('mission_route_options')
      .select('*')
      .order('route_rank', { ascending: true });

    const routeOptionsByMissionId = new Map<string, MissionRouteOption[]>();
    if (routeOptionsData && routeOptionsData.length > 0) {
      routeOptionsData.forEach((r: any) => {
        const opt: MissionRouteOption = {
          id: r.id,
          missionId: r.mission_id,
          routeNumber: r.route_number,
          routeRank: r.route_rank,
          routeId: r.route_id,
          routeName: r.route_name || undefined,
          corridorSegmentIds: Array.isArray(r.corridor_segment_ids) ? r.corridor_segment_ids : undefined,
          geometry: r.geometry,
          distanceKm: Number(r.distance_km),
          osrmDurationMinutes: Number(r.osrm_duration_minutes),
          predictedDelayFactor: Number(r.predicted_delay_factor),
          predictedEtaMinutes: Number(r.predicted_eta_minutes),
          etaOverheadMinutes: Number(r.eta_overhead_minutes),
          predictedPreferredRoute: Boolean(r.predicted_preferred_route),
          modelVersion: r.model_version,
          disruptionProbability: r.disruption_probability ? Number(r.disruption_probability) : (r.route_rank === 1 ? 0.18 : 0.78),
        };
        const list = routeOptionsByMissionId.get(r.mission_id) || [];
        list.push(opt);
        routeOptionsByMissionId.set(r.mission_id, list);
      });
    }

    return data.map((row: any) => {
      const opts = routeOptionsByMissionId.get(row.id) || undefined;
      return {
        id: row.id,
        communityId: row.community_id || row.communityId,
        communityName: row.community_name || row.communityName,
        recommendedVehicleType: row.recommended_vehicle_type || row.recommendedVehicleType,
        cargoAllocations: Array.isArray(row.cargo_allocations) ? row.cargo_allocations : (row.cargoAllocations || []),
        assignedRouteId: row.assigned_route_id || row.assignedRouteId,
        suggestedDetour: row.suggested_detour || row.suggestedDetour || '',
        status: row.status,
        urgency: row.urgency,
        createdAt: row.created_at || row.createdAt || new Date().toISOString(),
        dispatchedAt: row.dispatched_at || row.dispatchedAt,
        deliveredAt: row.delivered_at || row.deliveredAt,
        assignedDriver: row.assigned_driver || row.assignedDriver,
        assignedOfficer: row.assigned_officer || row.assignedOfficer,
        originWarehouseId: row.origin_warehouse_id || row.originWarehouseId || 'silchar',
        originWarehouseName: row.origin_warehouse_name || row.originWarehouseName || 'Silchar Strategic Depot',
        originCoords: Array.isArray(row.origin_coords) ? row.origin_coords : [24.8333, 92.7789],
        disasterZoneId: row.disaster_zone_id || row.disasterZoneId || 'LHZ-MZ-01',
        disasterZoneName: row.disaster_zone_name || row.disasterZoneName || 'Disaster Operational Target',
        destinationEndpoint: Array.isArray(row.destination_endpoint) ? row.destination_endpoint : [24.257, 92.729],
        destinationName: row.destination_name || row.destinationName || 'Relief Target',
        assignedVehicleId: row.assigned_vehicle_id || row.assignedVehicleId,
        routeDistanceKm: row.route_distance_km ? Number(row.route_distance_km) : (opts?.[0]?.distanceKm || undefined),
        routeDurationMinutes: row.route_duration_minutes ? Number(row.route_duration_minutes) : (opts?.[0]?.predictedEtaMinutes || undefined),
        routeStatus: row.route_status || row.routeStatus,
        routeGeometry: Array.isArray(row.route_geometry) ? row.route_geometry : (opts?.[0]?.geometry || undefined),
        selectedRouteOptionId: opts?.[0]?.id || undefined,
        routeOptions: opts,
        isRerouted: Boolean(row.is_rerouted),
        rerouteReason: row.reroute_reason || undefined,
        reroutedAt: row.rerouted_at || undefined,
        reroutedFromCoords: Array.isArray(row.rerouted_from_coords) ? row.rerouted_from_coords : undefined,
        corridorSegmentIds: Array.isArray(row.corridor_segment_ids) ? row.corridor_segment_ids : (row.corridorSegmentIds || undefined),
        previousRouteGeometry: Array.isArray(row.previous_route_geometry) ? row.previous_route_geometry : undefined,
        source: row.source || (row.is_field_requisition ? 'FIELD_REQUISITION' : (row.resource_request_id ? 'FIELD_REQUISITION' : undefined)),
        isFieldRequisition: Boolean(row.is_field_requisition ?? row.isFieldRequisition ?? (row.source === 'FIELD_REQUISITION')),
        requestedByOfficer: row.requested_by_officer || row.requestedByOfficer,
        resourceRequestId: row.resource_request_id || row.resourceRequestId,
        notes: row.notes,
      };
    });
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching missions:', err);
    return null;
  }
}

export async function upsertCloudMission(mission: ReliefMission): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: mission.id,
      community_id: mission.communityId,
      community_name: mission.communityName,
      recommended_vehicle_type: mission.recommendedVehicleType,
      cargo_allocations: mission.cargoAllocations,
      assigned_route_id: mission.assignedRouteId,
      suggested_detour: mission.suggestedDetour,
      status: mission.status,
      urgency: mission.urgency,
      created_at: mission.createdAt,
      dispatched_at: mission.dispatchedAt || null,
      delivered_at: mission.deliveredAt || null,
      assigned_driver: mission.assignedDriver || null,
      assigned_officer: mission.assignedOfficer || null,
      origin_warehouse_id: mission.originWarehouseId,
      origin_warehouse_name: mission.originWarehouseName,
      origin_coords: mission.originCoords,
      disaster_zone_id: mission.disasterZoneId,
      disaster_zone_name: mission.disasterZoneName,
      destination_endpoint: mission.destinationEndpoint,
      destination_name: mission.destinationName,
      assigned_vehicle_id: mission.assignedVehicleId || null,
      route_distance_km: mission.routeDistanceKm || null,
      route_duration_minutes: mission.routeDurationMinutes || null,
      route_status: mission.routeStatus || null,
      route_geometry: mission.routeGeometry && mission.routeGeometry.length > 0 ? mission.routeGeometry : null,
      is_rerouted: Boolean(mission.isRerouted),
      reroute_reason: mission.rerouteReason || null,
      rerouted_at: mission.reroutedAt || null,
      rerouted_from_coords: mission.reroutedFromCoords || null,
      corridor_segment_ids: mission.corridorSegmentIds && mission.corridorSegmentIds.length > 0 ? mission.corridorSegmentIds : null,
      previous_route_geometry: mission.previousRouteGeometry || null,
      source: mission.source || null,
      is_field_requisition: Boolean(mission.isFieldRequisition),
      requested_by_officer: mission.requestedByOfficer || null,
      resource_request_id: mission.resourceRequestId || null,
      notes: mission.notes || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('missions').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert mission error:', error.message);
      return false;
    }

    if (mission.routeOptions && mission.routeOptions.length > 0) {
      await upsertCloudMissionRouteOptions(mission.routeOptions);
    }

    console.log('✅ [Supabase] Successfully upserted cloud mission:', mission.id, mission.status);
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting mission:', err);
    return false;
  }
}

/**
 * Cloud Resource Requests API
 */
export async function fetchCloudResourceRequests(): Promise<ResourceRequest[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('resource_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch resource requests:', error.message);
      return null;
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      communityId: row.community_id || row.communityId,
      communityName: row.community_name || row.communityName,
      officerId: row.officer_id || row.officerId,
      officerName: row.officer_name || row.officerName,
      officerRole: row.officer_role || row.officerRole,
      resourceType: row.resource_type || row.resourceType,
      quantity: Number(row.quantity),
      unit: row.unit || 'units',
      urgency: row.urgency,
      reason: row.reason || '',
      notes: row.notes || '',
      evidencePhoto: row.evidence_photo || row.evidencePhoto,
      status: row.status,
      suggestedMissionId: row.suggested_mission_id || row.suggestedMissionId,
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching resource requests:', err);
    return null;
  }
}

export async function upsertCloudResourceRequest(req: ResourceRequest): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: req.id,
      community_id: req.communityId,
      community_name: req.communityName,
      officer_id: req.officerId,
      officer_name: req.officerName,
      officer_role: req.officerRole,
      resource_type: req.resourceType,
      quantity: req.quantity,
      unit: req.unit,
      urgency: req.urgency,
      reason: req.reason,
      notes: req.notes,
      evidence_photo: req.evidencePhoto,
      status: req.status,
      suggested_mission_id: req.suggestedMissionId,
      created_at: req.createdAt,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('resource_requests').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert resource request error:', error.message);
      return false;
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'RESOURCE_REQUEST_ADDED',
        payload: { request: req },
      });
    }

    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting resource request:', err);
    return false;
  }
}

export function broadcastCloudMissionDispatched(mission: ReliefMission, vehicleId?: string): void {
  const channel = getRealtimeChannel();
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'MISSION_DISPATCHED',
      payload: { mission, vehicleId: vehicleId || mission.assignedVehicleId },
    });
  }
}

export function broadcastCloudMissionApproved(mission: ReliefMission | string, communityId?: string): void {
  const channel = getRealtimeChannel();
  if (channel) {
    const isObj = typeof mission === 'object' && mission !== null;
    const mId = isObj ? mission.id : mission;
    const commId = isObj ? mission.communityId : communityId;
    channel.send({
      type: 'broadcast',
      event: 'MISSION_APPROVED',
      payload: { missionId: mId, communityId: commId, mission: isObj ? mission : undefined },
    });
  }
}

export function broadcastCloudMissionDelivered(missionId: string, vehicleId?: string, deliveredAt?: string): void {
  const channel = getRealtimeChannel();
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'MISSION_DELIVERED',
      payload: { missionId, vehicleId, deliveredAt: deliveredAt || new Date().toISOString() },
    });
  }
}

export function broadcastCloudMissionPendingCloseout(missionId: string, vehicleId?: string, reportedBy?: string): void {
  const channel = getRealtimeChannel();
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'MISSION_PENDING_CLOSEOUT',
      payload: { missionId, vehicleId, reportedBy, reportedAt: new Date().toISOString() },
    });
  }
}

export function broadcastCloudMissionClosedOut(missionId: string, communityId: string, vehicleId?: string): void {
  const channel = getRealtimeChannel();
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'MISSION_CLOSED_OUT',
      payload: { missionId, communityId, vehicleId, closedAt: new Date().toISOString() },
    });
  }
}

export async function upsertCloudMissionRouteOptions(options: MissionRouteOption[]): Promise<boolean> {
  if (!supabase || !options || options.length === 0) return false;
  try {
    const rows = options.map((opt) => ({
      id: opt.id,
      mission_id: opt.missionId,
      route_number: opt.routeNumber,
      route_rank: opt.routeRank,
      route_id: opt.routeId,
      route_name: opt.routeName || null,
      corridor_segment_ids: opt.corridorSegmentIds || [],
      geometry: opt.geometry,
      distance_km: opt.distanceKm,
      osrm_duration_minutes: opt.osrmDurationMinutes,
      predicted_delay_factor: opt.predictedDelayFactor,
      predicted_eta_minutes: opt.predictedEtaMinutes,
      eta_overhead_minutes: opt.etaOverheadMinutes,
      predicted_preferred_route: opt.predictedPreferredRoute,
      model_version: opt.modelVersion,
    }));
    const { error } = await supabase.from('mission_route_options').upsert(rows, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert mission_route_options error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting mission_route_options:', err);
    return false;
  }
}

export async function fetchCloudMissionRouteOptions(missionId: string): Promise<MissionRouteOption[]> {
  if (!supabase || !missionId) return [];
  try {
    const { data, error } = await supabase
      .from('mission_route_options')
      .select('*')
      .eq('mission_id', missionId)
      .order('route_rank', { ascending: true });
    if (error || !data) return [];
    return data.map((r: any) => ({
      id: r.id,
      missionId: r.mission_id,
      routeNumber: r.route_number,
      routeRank: r.route_rank,
      routeId: r.route_id,
      routeName: r.route_name || undefined,
      corridorSegmentIds: Array.isArray(r.corridor_segment_ids) ? r.corridor_segment_ids : undefined,
      geometry: r.geometry,
      distanceKm: Number(r.distance_km),
      osrmDurationMinutes: Number(r.osrm_duration_minutes),
      predictedDelayFactor: Number(r.predicted_delay_factor),
      predictedEtaMinutes: Number(r.predicted_eta_minutes),
      etaOverheadMinutes: Number(r.eta_overhead_minutes),
      predictedPreferredRoute: Boolean(r.predicted_preferred_route),
      modelVersion: r.model_version,
    }));
  } catch {
    return [];
  }
}

/**
 * Cloud Hazard Zones API
 */
export async function fetchCloudHazardZones(): Promise<RealtimeHazardPolygon[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('hazard_zones').select('*');
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch hazard zones:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;
    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      source: row.source || 'SUPABASE_CLOUD',
      hazardType: row.hazard_type || row.hazardType || 'LANDSLIDE',
      severity: row.severity || 'High',
      hazardScore: Number(row.hazard_score ?? row.hazardScore ?? 8.0),
      advisory: row.advisory || '',
      state: row.state,
      district: row.district,
      coordinates: Array.isArray(row.coordinates) ? row.coordinates : [],
      updatedAt: row.updated_at || new Date().toISOString(),
      url: row.url,
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching hazard zones:', err);
    return null;
  }
}

export async function upsertCloudHazardZone(zone: RealtimeHazardPolygon): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: zone.id,
      name: zone.name,
      source: zone.source,
      hazard_type: zone.hazardType,
      severity: zone.severity,
      hazard_score: zone.hazardScore,
      advisory: zone.advisory,
      state: zone.state,
      district: zone.district,
      coordinates: zone.coordinates,
      updated_at: new Date().toISOString(),
      url: zone.url,
    };
    const { error } = await supabase.from('hazard_zones').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert hazard zone error:', error.message);
      return false;
    }
    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'HAZARD_ZONE_UPDATED',
        payload: { zone },
      });
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting hazard zone:', err);
    return false;
  }
}

/**
 * Cloud Draft Incident Reports API (Pending AI Review)
 */
export async function fetchCloudDraftReports(): Promise<DraftIncidentPlot[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('draft_reports')
      .select('*')
      .order('submitted_at', { ascending: false });
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch draft reports:', error.message);
      return null;
    }
    if (!data) return null;
    return data.map((row: any) => ({
      id: row.id,
      title: row.title,
      corridor: row.corridor,
      coordinates: Array.isArray(row.coordinates) ? row.coordinates : [25.712, 93.998],
      hazardType: row.hazard_type || row.hazardType || 'Landslide',
      severity: row.severity || 'TOTAL_BLOCKAGE',
      estimatedCutoffHours: Number(row.estimated_cutoff_hours ?? 6),
      summary: row.summary || '',
      citationsCount: Number(row.citations_count ?? 1),
      sourceReport: row.source_report || { reporterName: 'Citizen', role: 'Local Citizen', rawText: '', timestamp: row.submitted_at },
      aiValidation: row.ai_validation || { isGeographicallyConsistent: true, confidenceScore: 8, landmarkVerified: row.corridor, geminiModelUsed: 'gemini-3.5-flash-lite' },
      status: row.status || 'PENDING_APPROVAL',
      submittedAt: row.submitted_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching draft reports:', err);
    return null;
  }
}

export async function upsertCloudDraftReport(draft: DraftIncidentPlot): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: draft.id,
      title: draft.title,
      corridor: draft.corridor,
      coordinates: draft.coordinates,
      hazard_type: draft.hazardType,
      severity: draft.severity,
      estimated_cutoff_hours: draft.estimatedCutoffHours,
      summary: draft.summary,
      citations_count: draft.citationsCount,
      source_report: draft.sourceReport,
      ai_validation: draft.aiValidation,
      status: draft.status,
      submitted_at: draft.submittedAt,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('draft_reports').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert draft report error:', error.message);
      return false;
    }
    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'DRAFT_REPORT_UPDATED',
        payload: { draft },
      });
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting draft report:', err);
    return false;
  }
}

export async function deleteCloudDraftReport(draftId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('draft_reports').delete().eq('id', draftId);
    if (error) {
      console.warn('⚠️ [Supabase] Delete draft report error:', error.message);
      return false;
    }
    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'DRAFT_REPORT_DELETED',
        payload: { draftId },
      });
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception deleting draft report:', err);
    return false;
  }
}

/**
 * -------------------------------------------------------------
 * 7. Response Hubs, Hub Inventory & Transactions API
 * -------------------------------------------------------------
 */
export async function fetchCloudHubs(): Promise<ResponseHub[] | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('response_hubs')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch response hubs:', error.message);
      return null;
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      state: row.state,
      district: row.district,
      city: row.city || undefined,
      address: row.address || undefined,
      coordinates: Array.isArray(row.coordinates) ? (row.coordinates as [number, number]) : [26.14, 91.73],
      type: row.type || 'REGIONAL',
      status: row.status || 'OPERATIONAL',
      storageCapacityKg: Number(row.storage_capacity_kg ?? 50000),
      coldStorageCapacityKg: Number(row.cold_storage_capacity_kg ?? 10000),
      fuelStorageCapacityLitres: Number(row.fuel_storage_capacity_litres ?? 25000),
      sourceType: row.source_type || 'OFFICIAL_REFERENCE',
      sourceNote: row.source_note || undefined,
      routingNodeId: row.routing_node_id || undefined,
      routingSegmentId: row.routing_segment_id || undefined,
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching response hubs:', err);
    return null;
  }
}

export async function upsertCloudHub(hub: ResponseHub): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: hub.id,
      name: hub.name,
      code: hub.code,
      state: hub.state,
      district: hub.district,
      city: hub.city || null,
      address: hub.address || null,
      coordinates: hub.coordinates,
      type: hub.type,
      status: hub.status,
      storage_capacity_kg: hub.storageCapacityKg,
      cold_storage_capacity_kg: hub.coldStorageCapacityKg,
      fuel_storage_capacity_litres: hub.fuelStorageCapacityLitres,
      source_type: hub.sourceType || 'OFFICIAL_REFERENCE',
      source_note: hub.sourceNote || null,
      routing_node_id: hub.routingNodeId || null,
      routing_segment_id: hub.routingSegmentId || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('response_hubs').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert hub error:', error.message);
      return false;
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'HUB_UPDATED',
        payload: { hub },
      });
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting hub:', err);
    return false;
  }
}

export async function fetchCloudInventory(hubId?: string): Promise<HubInventory[] | null> {
  if (!supabase) return null;
  try {
    let query = supabase.from('hub_inventory').select('*').order('priority', { ascending: false });
    if (hubId) {
      query = query.eq('hub_id', hubId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch hub inventory:', error.message);
      return null;
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      hubId: row.hub_id,
      resourceType: row.resource_type,
      resourceName: row.resource_name,
      quantity: Number(row.quantity),
      unit: row.unit,
      minimumStock: Number(row.minimum_stock ?? 0),
      maximumCapacity: row.maximum_capacity != null ? Number(row.maximum_capacity) : undefined,
      reservedQuantity: Number(row.reserved_quantity ?? 0),
      priority: row.priority || 'MEDIUM',
      expiryDate: row.expiry_date || undefined,
      lastUpdated: row.last_updated || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching hub inventory:', err);
    return null;
  }
}

export async function upsertCloudInventory(item: HubInventory): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: item.id,
      hub_id: item.hubId,
      resource_type: item.resourceType,
      resource_name: item.resourceName,
      quantity: item.quantity,
      unit: item.unit,
      minimum_stock: item.minimumStock,
      maximum_capacity: item.maximumCapacity ?? null,
      reserved_quantity: item.reservedQuantity,
      priority: item.priority || 'MEDIUM',
      expiry_date: item.expiryDate || null,
      last_updated: new Date().toISOString(),
    };

    const { error } = await supabase.from('hub_inventory').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert hub inventory error:', error.message);
      return false;
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'HUB_INVENTORY_UPDATED',
        payload: { item },
      });
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting hub inventory:', err);
    return false;
  }
}

export async function fetchCloudTransactions(hubId?: string): Promise<InventoryTransaction[] | null> {
  if (!supabase) return null;
  try {
    let query = supabase.from('inventory_transactions').select('*').order('timestamp', { ascending: false }).limit(100);
    if (hubId) {
      query = query.eq('hub_id', hubId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch inventory transactions:', error.message);
      return null;
    }
    if (!data) return [];

    return data.map((row: any) => ({
      id: row.id,
      hubId: row.hub_id,
      inventoryId: row.inventory_id,
      missionId: row.mission_id || undefined,
      type: row.type,
      quantity: Number(row.quantity),
      previousQuantity: Number(row.previous_quantity),
      newQuantity: Number(row.new_quantity),
      previousReserved: Number(row.previous_reserved),
      newReserved: Number(row.new_reserved),
      performedBy: row.performed_by || undefined,
      note: row.note || undefined,
      timestamp: row.timestamp,
    }));
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching transactions:', err);
    return null;
  }
}

export async function insertCloudTransaction(tx: InventoryTransaction): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: tx.id,
      hub_id: tx.hubId,
      inventory_id: tx.inventoryId,
      mission_id: tx.missionId || null,
      type: tx.type,
      quantity: tx.quantity,
      previous_quantity: tx.previousQuantity,
      new_quantity: tx.newQuantity,
      previous_reserved: tx.previousReserved,
      new_reserved: tx.newReserved,
      performed_by: tx.performedBy || null,
      note: tx.note || null,
      timestamp: tx.timestamp || new Date().toISOString(),
    };

    const { error } = await supabase.from('inventory_transactions').insert(row);
    if (error) {
      console.warn('⚠️ [Supabase] Insert inventory transaction error:', error.message);
      return false;
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'INVENTORY_TRANSACTION_CREATED',
        payload: { transaction: tx },
      });
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception inserting transaction:', err);
    return false;
  }
}

/**
 * Model A Road Disruption Risk Predictions Persistence
 */
export async function fetchCloudModelAPredictions(): Promise<Record<string, ModelAPrediction> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('model_a_predictions')
      .select('*')
      .order('prediction_time', { ascending: false });

    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch Model A predictions:', error.message);
      return null;
    }
    if (!data) return {};

    const map: Record<string, ModelAPrediction> = {};
    for (const row of data) {
      if (!map[row.segment_id]) {
        map[row.segment_id] = {
          id: row.id,
          segment_id: row.segment_id,
          prediction_time: row.prediction_time,
          horizon_time: row.horizon_time,
          probability: Number(row.probability),
          prediction: Number(row.prediction) as 0 | 1,
          threshold: Number(row.threshold || 0.5),
          risk_band: row.risk_band as ModelARiskBand,
          interpretation: row.interpretation || `Road disruption risk: ${(Number(row.probability) * 100).toFixed(1)}%`,
          feature_snapshot: row.feature_snapshot,
          model_version: row.model_version || 'model_a_baseline_xgb_v1',
          source: (row.source as any) || 'MODEL_A_INFERENCE',
          created_at: row.created_at,
        };
      }
    }
    return map;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception fetching Model A predictions:', err);
    return null;
  }
}

export async function upsertCloudModelAPrediction(pred: ModelAPrediction): Promise<boolean> {
  if (!supabase) return false;
  try {
    const row = {
      id: pred.id || `${pred.segment_id}_${new Date(pred.prediction_time).getTime() || Date.now()}`,
      segment_id: pred.segment_id,
      prediction_time: pred.prediction_time,
      horizon_time: pred.horizon_time || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      probability: pred.probability,
      prediction: pred.prediction,
      threshold: pred.threshold,
      risk_band: pred.risk_band,
      feature_snapshot: pred.feature_snapshot,
      model_version: pred.model_version,
      source: pred.source,
      created_at: pred.created_at || new Date().toISOString(),
    };
    const { error } = await supabase
      .from('model_a_predictions')
      .upsert(row, { onConflict: 'id' });

    if (error) {
      console.warn('⚠️ [Supabase] Upsert Model A prediction error:', error.message);
      return false;
    }

    const channel = getRealtimeChannel();
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'MODEL_A_PREDICTION_UPDATED',
        payload: { prediction: pred },
      });
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting Model A prediction:', err);
    return false;
  }
}
