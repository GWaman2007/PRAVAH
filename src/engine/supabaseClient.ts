import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { Incident, SegmentIncident, AlertEvent, CommunityBase, ReliefMission, RealtimeHazardPolygon } from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_KEY ||
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
    const { data, error } = await supabase.from('missions').select('*').order('created_at', { ascending: false });
    if (error) {
      console.warn('⚠️ [Supabase] Failed to fetch missions:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
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
      routeDistanceKm: row.route_distance_km ? Number(row.route_distance_km) : undefined,
      routeDurationMinutes: row.route_duration_minutes ? Number(row.route_duration_minutes) : undefined,
      routeStatus: row.route_status || row.routeStatus,
      routeGeometry: Array.isArray(row.route_geometry) ? row.route_geometry : undefined,
    }));
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
      route_geometry: mission.routeGeometry || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('missions').upsert(row, { onConflict: 'id' });
    if (error) {
      console.warn('⚠️ [Supabase] Upsert mission error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('⚠️ [Supabase] Exception upserting mission:', err);
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

export function broadcastCloudMissionApproved(missionId: string): void {
  const channel = getRealtimeChannel();
  if (channel) {
    channel.send({
      type: 'broadcast',
      event: 'MISSION_APPROVED',
      payload: { missionId },
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


