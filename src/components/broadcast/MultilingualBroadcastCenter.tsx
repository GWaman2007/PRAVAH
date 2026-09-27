import React, { useState, useEffect, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  SUPPORTED_LANGUAGES,
  calculateSmsMetrics,
  getMissionDriverAlertTranslations,
} from '../../data/translationsData';
import {
  playTextToSpeech,
  stopTextToSpeech,
  playEmergencyAlertSound,
  playDispatchPacketSound,
} from '../../utils/audioAlert';
import type { LanguageId, DriverEmergencyRouteAlert, ReliefMission } from '../../types';
import {
  Radio,
  Volume2,
  VolumeX,
  Send,
  MessageSquare,
  Smartphone,
  Bell,
  CheckCircle2,
  Languages,
  Sparkles,
  Globe2,
  BookA,
  Navigation2,
  MountainSnow,
  AlertTriangle,
  Truck,
  MapPin,
  Route,
  Clock,
  ShieldAlert,
  ArrowRight,
  Compass,
} from 'lucide-react';

export const MultilingualBroadcastCenter: React.FC = () => {
  const {
    activeMissions,
    vehicles,
    incidents,
    activeDisruptions,
    activeBroadcastLanguage,
    setActiveBroadcastLanguage,
    activeDriverEmergencyAlert,
    dispatchDriverEmergencyAlert,
  } = usePravahStore();

  // 1. Filter ongoing missions strictly (excluding suggested)
  const ongoingMissions = useMemo(() => {
    return activeMissions.filter(
      (m) =>
        m.status === 'IN_TRANSIT' ||
        m.status === 'PENDING_ADMIN_CLOSEOUT' ||
        m.status === 'APPROVED' ||
        m.id.startsWith('MSN-ONGOING-')
    );
  }, [activeMissions]);

  const [selectedMissionId, setSelectedMissionId] = useState<string>(
    ongoingMissions[0]?.id || 'MSN-ONGOING-SK01'
  );

  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingLangId, setPlayingLangId] = useState<LanguageId | null>(null);
  const [speechPacing, setSpeechPacing] = useState<number>(0.80);
  const [preferMeiteiMayek, setPreferMeiteiMayek] = useState<boolean>(true);
  const [dispatchSuccess, setDispatchSuccess] = useState<boolean>(false);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopTextToSpeech();
    };
  }, []);

  // Update selected mission if current is not found
  useEffect(() => {
    if (!ongoingMissions.some((m) => m.id === selectedMissionId) && ongoingMissions.length > 0) {
      setSelectedMissionId(ongoingMissions[0].id);
    }
  }, [ongoingMissions, selectedMissionId]);

  const selectedMission: ReliefMission | undefined = useMemo(() => {
    return ongoingMissions.find((m) => m.id === selectedMissionId) || ongoingMissions[0];
  }, [ongoingMissions, selectedMissionId]);

  // Resolve assigned vehicle and driver telemetry
  const assignedVehicle = useMemo(() => {
    if (!selectedMission) return undefined;
    return vehicles.find(
      (v) => v.mission_id === selectedMission.id || v.vehicle_id === selectedMission.assignedVehicleId
    );
  }, [vehicles, selectedMission]);

  // Resolve incident associated with this mission or corridor
  const associatedIncident = useMemo(() => {
    if (!selectedMission) return undefined;
    const segIds = selectedMission.corridorSegmentIds || [];

    // Match by corridor segment ID
    const byCorridor = incidents.find((inc) =>
      segIds.includes(inc.location?.corridorId || '')
    );
    if (byCorridor) return byCorridor;

    // Match by mission specific targets
    if (selectedMission.id === 'MSN-ONGOING-SK01' || selectedMission.communityId === 'SK-MAN-002') {
      return incidents.find((i) => i.id === 'inc-04' || i.location?.corridorId === 'SEG-SK-TEESTA') || incidents[3];
    }
    if (selectedMission.id === 'MSN-ONGOING-NL01') {
      return incidents.find((i) => i.id === 'inc-01' || i.location?.corridorId === 'SEG-DIM-KOH-MAIN') || incidents[0];
    }
    if (selectedMission.id === 'MSN-ONGOING-AS01') {
      return incidents.find((i) => i.id === 'inc-03' || i.location?.corridorId === 'SEG-NOW-HAF-SIL') || incidents[2];
    }
    if (selectedMission.id === 'MSN-ONGOING-MZ01') {
      return incidents.find((i) => i.id === 'inc-02' || i.location?.corridorId === 'SEG-SIL-KOL') || incidents[1];
    }

    return incidents[0];
  }, [selectedMission, incidents]);

  // Compute operational details for the selected route
  const routeStatusBrief = useMemo(() => {
    if (!selectedMission) {
      return {
        incidentTitle: 'Severe Road Disruption',
        incidentLocation: 'Active Corridor Sector',
        incidentType: 'Hazard',
        affectedRoute: 'Lifeline Corridor',
        alternateRoute: 'Designated Bypass Corridor',
        modelARiskPct: 50,
        currentGps: [27.3314, 88.6138] as [number, number],
        isRerouted: false,
        updatedEtaMinutes: 105,
        baselineEtaMinutes: 90,
        etaOverheadMinutes: 15,
        distanceKm: 80,
      };
    }

    const driverName = selectedMission.assignedDriver || assignedVehicle?.driver_name || 'Designated Driver';
    const vehicleId = selectedMission.assignedVehicleId || assignedVehicle?.vehicle_id || 'Convoy Unit';
    const modelARiskPct = Math.round((selectedMission.disruptionProbability ?? 0.64) * 100);

    const currentGps: [number, number] =
      assignedVehicle?.current_coords ||
      selectedMission.reroutedFromCoords ||
      selectedMission.originCoords ||
      [27.3314, 88.6138];

    const isRerouted = Boolean(selectedMission.isRerouted);

    const affectedRoute =
      selectedMission.routeOptions?.[0]?.routeName ||
      (selectedMission.id === 'MSN-ONGOING-SK01'
        ? 'NH-10 Teesta Canyon Lifeline (Severed at 29th Mile)'
        : selectedMission.assignedRouteId || 'Primary Corridor');

    const alternateRoute =
      selectedMission.suggestedDetour ||
      selectedMission.routeOptions?.[1]?.routeName ||
      (selectedMission.id === 'MSN-ONGOING-SK01'
        ? 'NH-717A Pakyong - Lava Ridge Bypass (Safe Mountain Corridor)'
        : 'Designated Strategic Bypass');

    const baselineEtaMinutes = selectedMission.routeOptions?.[0]?.osrmDurationMinutes || selectedMission.routeDurationMinutes || 105;
    const updatedEtaMinutes = selectedMission.routeOptions?.[1]?.predictedEtaMinutes || (isRerouted ? 108 : baselineEtaMinutes);
    const etaOverheadMinutes = Math.max(0, updatedEtaMinutes - baselineEtaMinutes);
    const distanceKm = selectedMission.routeOptions?.[1]?.distanceKm || selectedMission.routeDistanceKm || 83.8;

    return {
      driverName,
      vehicleId,
      incidentTitle: associatedIncident?.title || 'Severe Landslide & Blockage',
      incidentLocation: associatedIncident?.location.placeName || selectedMission.destinationName,
      incidentType: associatedIncident?.incidentType || 'Geological Hazard',
      affectedRoute,
      alternateRoute,
      modelARiskPct,
      currentGps,
      isRerouted,
      updatedEtaMinutes,
      baselineEtaMinutes,
      etaOverheadMinutes,
      distanceKm,
    };
  }, [selectedMission, assignedVehicle, associatedIncident]);

  // Driver-specific alert translations
  const driverAlertBundle = useMemo(() => {
    if (!selectedMission) {
      return getMissionDriverAlertTranslations('MSN-ONGOING-SK01');
    }
    return getMissionDriverAlertTranslations(
      selectedMission.id,
      routeStatusBrief.driverName,
      routeStatusBrief.vehicleId,
      routeStatusBrief.incidentTitle,
      routeStatusBrief.affectedRoute,
      routeStatusBrief.alternateRoute,
      routeStatusBrief.updatedEtaMinutes,
      routeStatusBrief.modelARiskPct
    );
  }, [selectedMission, routeStatusBrief]);

  // Resolve current text based on script preference for Manipuri
  const getCurrentText = (langId: LanguageId): string => {
    if (!driverAlertBundle) return '';
    if (langId === 'mn') {
      return preferMeiteiMayek ? driverAlertBundle.mn_mayek : driverAlertBundle.mn_bengali;
    }
    return driverAlertBundle.translations[langId] || '';
  };

  const currentText = getCurrentText(activeBroadcastLanguage);
  const activeLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.id === activeBroadcastLanguage) ||
    SUPPORTED_LANGUAGES[0];
  const smsMetrics = calculateSmsMetrics(currentText, activeLangConfig.isUnicode);

  const handleSpeak = (text: string, langId: LanguageId) => {
    if (isPlayingAudio && playingLangId === langId) {
      stopTextToSpeech();
      setIsPlayingAudio(false);
      setPlayingLangId(null);
      return;
    }

    stopTextToSpeech();
    setIsPlayingAudio(true);
    setPlayingLangId(langId);

    const incidentContext = {
      id: selectedMission?.id,
      highway: routeStatusBrief.affectedRoute,
      location: routeStatusBrief.incidentLocation,
      district: routeStatusBrief.incidentLocation,
      disruptionType: routeStatusBrief.incidentTitle,
      detourRoute: routeStatusBrief.alternateRoute,
      estimatedDelay: `${routeStatusBrief.updatedEtaMinutes} min`,
    };

    playTextToSpeech(text, langId, incidentContext, {
      speed: speechPacing,
      onStart: () => {
        setIsPlayingAudio(true);
        setPlayingLangId(langId);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setPlayingLangId(null);
      },
      onError: (err) => {
        console.warn('TTS playback error:', err);
        setIsPlayingAudio(false);
        setPlayingLangId(null);
      },
    });
  };

  // Dispatch emergency alert to Driver's dashboard
  const handleDispatchToDriver = () => {
    if (!selectedMission) return;

    playEmergencyAlertSound();
    setTimeout(() => {
      playDispatchPacketSound();
    }, 450);

    const alertPayload: DriverEmergencyRouteAlert = {
      id: `driver-alert-${selectedMission.id}-${Date.now()}`,
      missionId: selectedMission.id,
      vehicleId: routeStatusBrief.vehicleId || 'Convoy Unit',
      driverName: routeStatusBrief.driverName || 'Designated Driver',
      incidentTitle: routeStatusBrief.incidentTitle,
      incidentLocation: routeStatusBrief.incidentLocation,
      incidentType: routeStatusBrief.incidentType,
      affectedRoute: routeStatusBrief.affectedRoute,
      newRouteName: routeStatusBrief.alternateRoute,
      disruptionRiskPct: routeStatusBrief.modelARiskPct,
      updatedEtaMinutes: routeStatusBrief.updatedEtaMinutes,
      routeDistanceKm: routeStatusBrief.distanceKm,
      currentGps: routeStatusBrief.currentGps,
      isRerouted: routeStatusBrief.isRerouted,
      audioBroadcastText: currentText,
      language: activeBroadcastLanguage,
      multilingualTexts: driverAlertBundle.translations,
      timestamp: new Date().toISOString(),
      acknowledged: false,
    };

    dispatchDriverEmergencyAlert(alertPayload);
    setDispatchSuccess(true);
    setTimeout(() => setDispatchSuccess(false), 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-surface border border-border p-5 rounded-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">
              Emergency Broadcast Center &amp; Tactical Driver Alert Dispatcher
            </h1>
          </div>
          <p className="mt-1 text-xs text-text-secondary max-w-3xl">
            Select an ongoing relief mission to fetch live route status, incident reports, Model A hazard risk, and GPS detour anchors. Synthesizes driver-specific alerts in English, Hindi, Assamese, Bengali, and Manipuri with neural voice previews and direct driver cockpit telemetry dispatch.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-sm bg-primary-tint text-primary font-semibold">
            {ongoingMissions.length} Ongoing Missions Active
          </span>
          <span className="px-2.5 py-1 rounded-sm bg-blue-500/15 text-blue-400 border border-blue-500/30 font-semibold">
            5 Regional Languages
          </span>
        </div>
      </div>

      {/* Main Grid: Ongoing Missions Queue (Left 4 cols) + Route Intelligence & Script Reviewer (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (4 cols): Active Ongoing Missions Queue */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-primary" />
              <span>Ongoing Relief Missions ({ongoingMissions.length})</span>
            </h2>
            <span className="text-[10px] font-mono text-text-secondary uppercase">Live Convoys</span>
          </div>

          <div className="space-y-2.5">
            {ongoingMissions.map((mission) => {
              const isSelected = mission.id === selectedMissionId;
              const veh = vehicles.find(
                (v) => v.mission_id === mission.id || v.vehicle_id === mission.assignedVehicleId
              );
              const riskPct = Math.round((mission.disruptionProbability ?? 0.5) * 100);
              const isHighRisk = riskPct >= 60;
              const isModerateRisk = riskPct >= 40 && riskPct < 60;

              return (
                <div
                  key={mission.id}
                  onClick={() => {
                    setSelectedMissionId(mission.id);
                    stopTextToSpeech();
                    setIsPlayingAudio(false);
                    setPlayingLangId(null);
                    setDispatchSuccess(false);
                  }}
                  className={`p-3 rounded-md border transition-all cursor-pointer text-xs space-y-2 ${
                    isSelected
                      ? 'border-primary bg-primary-tint/25 dark:bg-primary-tint/15 shadow-sm ring-1 ring-primary/40'
                      : 'border-border bg-surface hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary flex items-center gap-1">
                      <span>{mission.id}</span>
                      {mission.isRerouted && (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/40">
                          REROUTED
                        </span>
                      )}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm border ${
                        isHighRisk
                          ? 'bg-red-500/15 text-red-400 border-red-500/40'
                          : isModerateRisk
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                          : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                      }`}
                    >
                      {riskPct}% Risk
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-text-primary text-[12px] truncate">
                      {mission.destinationName || mission.communityName}
                    </h3>
                    <div className="flex items-center justify-between text-[11px] text-text-secondary mt-0.5">
                      <span className="truncate">
                        Driver: <strong>{mission.assignedDriver || veh?.driver_name || 'Convoy Lead'}</strong>
                      </span>
                      <span className="font-mono text-text-tertiary">
                        {mission.assignedVehicleId || veh?.vehicle_id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-border/50 text-text-secondary">
                    <span>ETA: {mission.routeDurationMinutes || 90}m</span>
                    <span>Distance: {mission.routeDistanceKm || 80} km</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col (8 cols): Selected Mission Route Intelligence & Multilingual Voice Studio */}
        <div className="lg:col-span-8 space-y-5">
          {selectedMission && (
            <>
              {/* ── CARD 1: COMPLETE ROUTE & OPERATIONAL STATUS FETCH ── */}
              <div className="bg-surface border border-border rounded-md shadow-xs p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border pb-2.5">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-primary" />
                    <h2 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Route Operational Intelligence Briefing: {selectedMission.id}
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-subtle border border-border text-text-secondary">
                    Live GPS Synchronized
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Metric 1: Reported Incident */}
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold block flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                      Reported Ground Incident
                    </span>
                    <p className="font-bold text-text-primary text-[11px] line-clamp-2">
                      {routeStatusBrief.incidentTitle}
                    </p>
                    <span className="text-[10px] text-text-tertiary block">
                      Location: {routeStatusBrief.incidentLocation}
                    </span>
                  </div>

                  {/* Metric 2: Route Affected / Blocked */}
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold block flex items-center gap-1">
                      <Route className="w-3.5 h-3.5 text-orange-400" />
                      Affected Corridor
                    </span>
                    <p className="font-bold text-text-primary text-[11px] truncate">
                      {routeStatusBrief.affectedRoute}
                    </p>
                    <span className="text-[10px] font-mono text-red-400 font-semibold block">
                      Status: {selectedMission.routeStatus === 'UNAVAILABLE' ? 'TOTAL SEVERANCE / IMPASSABLE' : 'HIGH DISRUPTION HAZARD'}
                    </span>
                  </div>

                  {/* Metric 3: Model A Disruption Risk */}
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold block flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Model A Disruption Risk
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono text-red-400">
                        {routeStatusBrief.modelARiskPct}%
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold uppercase bg-red-500/15 text-red-300 border border-red-500/30">
                        v3.4.1 XGBoost
                      </span>
                    </div>
                    <span className="text-[10px] text-text-tertiary block">
                      Elevated risk exceeds 50% threshold
                    </span>
                  </div>

                  {/* Metric 4: Alternate Bypass Route */}
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold block flex items-center gap-1">
                      <Navigation2 className="w-3.5 h-3.5 text-emerald-400" />
                      Designated Alternate Bypass
                    </span>
                    <p className="font-bold text-emerald-400 text-[11px] truncate">
                      {routeStatusBrief.alternateRoute}
                    </p>
                    <span className="text-[10px] font-mono text-text-secondary block">
                      Distance: {routeStatusBrief.distanceKm} km
                    </span>
                  </div>

                  {/* Metric 5: Current GPS & Reroute Status */}
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold block flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-blue-400" />
                      Live Driver GPS Anchor
                    </span>
                    <p className="font-mono font-bold text-text-primary text-[11px]">
                      [{routeStatusBrief.currentGps[0].toFixed(4)}, {routeStatusBrief.currentGps[1].toFixed(4)}]
                    </p>
                    <span className={`text-[10px] font-bold block ${routeStatusBrief.isRerouted ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {routeStatusBrief.isRerouted ? '✓ Rerouted from Current GPS' : '⚡ Ready to Reroute from Current GPS'}
                    </span>
                  </div>

                  {/* Metric 6: ETA Change & Impact */}
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border space-y-1">
                    <span className="text-[10px] text-text-secondary uppercase font-semibold block flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      ETA Impact &amp; Delay Factor
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold font-mono text-text-primary">
                        {routeStatusBrief.updatedEtaMinutes} min
                      </span>
                      {routeStatusBrief.etaOverheadMinutes > 0 && (
                        <span className="text-[10px] font-mono text-amber-400 font-semibold">
                          (+{routeStatusBrief.etaOverheadMinutes}m detour)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-text-tertiary block">
                      Avoids ~90 min road blockage gridlock
                    </span>
                  </div>
                </div>
              </div>

              {/* ── CARD 2: REGIONAL SCRIPT REVIEWER & NEURAL VOICE STUDIO ── */}
              <div className="bg-surface border border-border rounded-md shadow-xs p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <Languages className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-text-primary">
                      Regional Script Reviewer &amp; Neural Voice Studio (Driver Alert)
                    </span>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center space-x-2">
                    {/* Script Toggle for Manipuri */}
                    {activeBroadcastLanguage === 'mn' && (
                      <button
                        onClick={() => setPreferMeiteiMayek(!preferMeiteiMayek)}
                        className="px-2 py-1 text-[11px] font-medium rounded-sm border border-border bg-surface-subtle hover:bg-surface text-text-primary btn-press cursor-pointer"
                        title="Switch between native Meitei Mayek and Eastern Nagari / Bengali script"
                      >
                        Script: {preferMeiteiMayek ? 'Meitei Mayek (ꯃꯤꯇꯩ)' : 'Bengali Script (মৈতৈ)'}
                      </button>
                    )}

                    {/* Cadence Selector */}
                    <div className="flex items-center rounded-sm bg-surface-subtle border border-border p-0.5 text-[11px] font-mono">
                      <button
                        onClick={() => setSpeechPacing(0.80)}
                        className={`px-2 py-0.5 rounded-xs transition-all cursor-pointer ${
                          speechPacing === 0.80
                            ? 'bg-[#1B4B73] dark:bg-[#2E6B9E] text-white font-bold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title="Calm, coherent, well-spaced broadcast cadence"
                      >
                        0.8x Calm
                      </button>
                      <button
                        onClick={() => setSpeechPacing(0.90)}
                        className={`px-2 py-0.5 rounded-xs transition-all cursor-pointer ${
                          speechPacing === 0.90
                            ? 'bg-[#1B4B73] dark:bg-[#2E6B9E] text-white font-bold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title="Standard dispatch cadence"
                      >
                        0.9x
                      </button>
                      <button
                        onClick={() => setSpeechPacing(1.0)}
                        className={`px-2 py-0.5 rounded-xs transition-all cursor-pointer ${
                          speechPacing === 1.0
                            ? 'bg-[#1B4B73] dark:bg-[#2E6B9E] text-white font-bold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title="Normal speed"
                      >
                        1.0x
                      </button>
                    </div>

                    {/* Speech Synthesis Playback */}
                    <button
                      onClick={() => handleSpeak(currentText, activeBroadcastLanguage)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border transition-all btn-press cursor-pointer ${
                        isPlayingAudio && playingLangId === activeBroadcastLanguage
                          ? 'border-status-blocked-solid bg-status-blocked-tint text-status-blocked-text animate-pulse'
                          : 'border-primary bg-primary-tint/30 text-primary hover:bg-primary-tint/50'
                      }`}
                      title={`Listen to alert message spoken calmly in ${activeLangConfig.name}`}
                    >
                      {isPlayingAudio && playingLangId === activeBroadcastLanguage ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-status-blocked-solid" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-primary" />
                          <span>Play Audio ({activeLangConfig.code})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 5 Language Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = activeBroadcastLanguage === lang.id;
                    const isVoicePlayingThis = isPlayingAudio && playingLangId === lang.id;

                    const renderLanguageIcon = (langId: LanguageId) => {
                      const iconClass = `w-5 h-5 ${isSelected ? 'text-white' : 'text-sky-500 dark:text-sky-400'}`;
                      switch (langId) {
                        case 'en':
                          return <Globe2 className={iconClass} strokeWidth={1.75} />;
                        case 'hi':
                          return <BookA className={iconClass} strokeWidth={1.75} />;
                        case 'as':
                          return <Navigation2 className={iconClass} strokeWidth={1.75} />;
                        case 'bn':
                          return <Radio className={iconClass} strokeWidth={1.75} />;
                        case 'mn':
                          return <MountainSnow className={iconClass} strokeWidth={1.75} />;
                        default:
                          return <Languages className={iconClass} strokeWidth={1.75} />;
                      }
                    };

                    return (
                      <button
                        key={lang.id}
                        onClick={() => {
                          setActiveBroadcastLanguage(lang.id);
                          if (isPlayingAudio) {
                            stopTextToSpeech();
                            setIsPlayingAudio(false);
                            setPlayingLangId(null);
                          }
                        }}
                        className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1.5 transition-all btn-press cursor-pointer ${
                          isSelected
                            ? 'border-primary bg-[#1B4B73] dark:bg-[#2E6B9E] text-white shadow-xs'
                            : 'border-border bg-surface-subtle hover:bg-surface text-text-primary'
                        } ${isVoicePlayingThis ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                      >
                        <div className="flex items-center justify-center h-6 w-6">
                          {renderLanguageIcon(lang.id)}
                        </div>
                        <span className="font-semibold text-xs">{lang.name}</span>
                        <span className="text-[10px] opacity-80">{lang.nativeName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Displayed Translation Card */}
                <div className="p-4 rounded-sm bg-surface-subtle border border-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono">
                    <span>
                      Target Driver: <strong className="text-text-primary">{routeStatusBrief.driverName} ({routeStatusBrief.vehicleId})</strong>
                    </span>
                    <span>Language: <strong>{activeLangConfig.name} ({activeLangConfig.scriptName})</strong></span>
                  </div>

                  <div className="p-3 bg-surface rounded-sm border border-border text-sm font-medium leading-relaxed text-text-primary">
                    {currentText}
                  </div>

                  {/* Phonetic Pronunciation for Drivers & English Voice Engines */}
                  <div className="text-[11px] text-text-secondary pt-1 font-mono space-y-0.5">
                    <div className="flex items-center space-x-1 text-primary font-semibold">
                      <Sparkles className="w-3 h-3" />
                      <span>Phonetic Pronunciation Guide:</span>
                    </div>
                    <div className="text-text-primary bg-surface p-2 rounded-xs border border-border text-[11px]">
                      {driverAlertBundle.phonetics[activeBroadcastLanguage] || driverAlertBundle.phonetics.en}
                    </div>
                  </div>

                  {/* Telecom GSM/Unicode Metrics */}
                  <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono pt-1">
                    <span>
                      SMS Length:{' '}
                      <strong className="text-text-primary">{smsMetrics.totalChars}</strong> chars (
                      {smsMetrics.segments} {smsMetrics.segments === 1 ? 'Segment' : 'Segments'})
                    </span>
                    <span>
                      Encoding:{' '}
                      <strong className="text-text-primary">
                        {smsMetrics.isUnicode ? 'UCS-2 Unicode (70 chars/seg)' : 'GSM-7 Standard (160 chars/seg)'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Broadcast Action Button & Dispatch */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-text-secondary">
                    {dispatchSuccess ? (
                      <span className="text-status-open-text font-bold flex items-center space-x-1 animate-pulse">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Dispatched to Driver {routeStatusBrief.driverName}&apos;s Cockpit ({routeStatusBrief.vehicleId})</span>
                      </span>
                    ) : (
                      <span>Ready to transmit driver-specific emergency route alert</span>
                    )}
                  </div>

                  <button
                    onClick={handleDispatchToDriver}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white rounded-sm text-xs font-bold btn-press shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Emergency Route Alert to Driver</span>
                  </button>
                </div>
              </div>

              {/* ── CARD 3: REAL-TIME TELEMETRY CHANNELS ── */}
              <div className="bg-surface border border-border rounded-md shadow-xs p-4 space-y-3">
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Driver Alert Delivery Receipts &amp; Satellite Telemetry
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3 rounded-sm border border-border bg-surface-subtle space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-semibold text-text-primary">
                      <Smartphone className="w-4 h-4 text-primary" />
                      <span>Driver Mobile In-App Alert</span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Pop-up banner on Driver Cockpit for {routeStatusBrief.driverName}
                    </p>
                    <div className="pt-2 border-t border-border flex items-center justify-between font-mono text-[11px]">
                      <span className="text-text-secondary">Status:</span>
                      <span className="font-bold text-emerald-400">
                        {dispatchSuccess || activeDriverEmergencyAlert?.missionId === selectedMission.id ? 'ACTIVE ON COCKPIT' : 'STANDBY'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-sm border border-border bg-surface-subtle space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-semibold text-text-primary">
                      <MessageSquare className="w-4 h-4 text-emerald-400" />
                      <span>Emergency GSM/SMS Gateway</span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Multi-carrier cellular dispatch (Jio/Airtel BSNL North East)
                    </p>
                    <div className="pt-2 border-t border-border flex items-center justify-between font-mono text-[11px]">
                      <span className="text-text-secondary">Encoding:</span>
                      <span className="font-bold text-text-primary">{activeLangConfig.code} &bull; {smsMetrics.segments} Seg</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-sm border border-border bg-surface-subtle space-y-2 text-xs">
                    <div className="flex items-center space-x-2 font-semibold text-text-primary">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span>BRO Tactical VHF Radio Channel</span>
                    </div>
                    <p className="text-[11px] text-text-secondary">
                      Repeater network for blind valley zones without cellular link
                    </p>
                    <div className="pt-2 border-t border-border flex items-center justify-between font-mono text-[11px]">
                      <span className="text-text-secondary">Encryption:</span>
                      <span className="font-bold text-sky-400">AES-256 VHF</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
