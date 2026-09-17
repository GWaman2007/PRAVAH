import { createClient, type RealtimeChannel, type SupabaseClient } from '@supabase/supabase-js';
import type { Incident, SegmentIncident, AlertEvent, CommunityBase } from '../types';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const supabasePublishableKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '').trim();

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabasePublishableKey &&
  supabaseUrl.startsWith('https://') &&
  supabasePublishableKey.length > 20
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
