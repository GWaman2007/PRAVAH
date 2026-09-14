import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import IncidentSelector from './components/IncidentSelector';
import TranslationEditor from './components/TranslationEditor';
import AudienceAndChannels from './components/AudienceAndChannels';
import DriverMobilePreview from './components/DriverMobilePreview';
import DispatchTelemetryConsole from './components/DispatchTelemetryConsole';

import { PRESET_INCIDENTS } from './data/incidents';
import { generateLocalizedAlerts } from './data/translations';
import { 
  playEmergencyAlertSound, 
  playDispatchPacketSound, 
  playAckChime, 
  playTextToSpeech,
  stopTextToSpeech 
} from './utils/audioAlert';

export default function App() {
  // 1. Incident Selection State
  const [activeIncident, setActiveIncident] = useState(PRESET_INCIDENTS[0]);
  const [customIncident, setCustomIncident] = useState(null);

  // 2. Multilingual Translations State
  const [preferMeiteiMayek, setPreferMeiteiMayek] = useState(true);
  const [translations, setTranslations] = useState(() => 
    generateLocalizedAlerts(PRESET_INCIDENTS[0], true)
  );

  // 3. Target Audience & Channels State
  const [targetGroups, setTargetGroups] = useState({
    commercialDrivers: true,
    districtAdmins: true,
    broQrt: true,
  });
  const [geofenceRadius, setGeofenceRadius] = useState(50);
  const [channels, setChannels] = useState({
    sms: true,
    whatsapp: true,
    audioVoice: true,
    pushSiren: true,
  });

  // Sound Settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  // 4. Driver Terminal State (for simulation feedback)
  const [driverState, setDriverState] = useState({
    acknowledged: false,
    detourAccepted: false,
    sosRequested: false,
  });

  // 5. Dispatch Queue & Telemetry State
  const [dispatchState, setDispatchState] = useState('idle'); // 'idle' | 'dispatching' | 'completed'
  const [logs, setLogs] = useState([]);
  
  // Calculate Target Reach dynamically
  const calculatedDrivers = Math.round(geofenceRadius * 2.84);
  const calculatedAdmins = activeIncident.targetAudience?.districtAdmins || 8;
  const calculatedBroUnits = activeIncident.targetAudience?.qrtBroUnits || 14;

  const totalAudienceCount = 
    (targetGroups.commercialDrivers ? calculatedDrivers : 0) +
    (targetGroups.districtAdmins ? calculatedAdmins : 0) +
    (targetGroups.broQrt ? calculatedBroUnits : 0);

  const [metrics, setMetrics] = useState({
    totalTargets: totalAudienceCount,
    totalDrivers: calculatedDrivers,
    totalAdmins: calculatedAdmins,
    smsDelivered: 0,
    smsQueued: 0,
    whatsappDelivered: 0,
    whatsappRead: 0,
    voicePings: 0,
    adminAck: 0,
  });

  // Update translations when incident changes
  const handleSelectIncident = (incident) => {
    setActiveIncident(incident);
    setGeofenceRadius(incident.geofenceRadiusKm || 50);
    const newTranslations = generateLocalizedAlerts(incident, preferMeiteiMayek);
    setTranslations(newTranslations);
    
    // Reset driver response state for new incident
    setDriverState({
      acknowledged: false,
      detourAccepted: false,
      sosRequested: false,
    });
  };

  const handleToggleMeiteiScript = () => {
    const nextPref = !preferMeiteiMayek;
    setPreferMeiteiMayek(nextPref);
    setTranslations(prev => ({
      ...prev,
      mn: nextPref ? prev.mn_mayek : prev.mn_bengali
    }));
  };

  const handleUpdateTranslation = (langId, text) => {
    setTranslations(prev => ({
      ...prev,
      [langId]: text
    }));
  };

  const handleResetTranslations = (langId) => {
    const fresh = generateLocalizedAlerts(activeIncident, preferMeiteiMayek);
    if (langId) {
      setTranslations(prev => ({
        ...prev,
        [langId]: fresh[langId]
      }));
    } else {
      setTranslations(fresh);
    }
  };

  const handleToggleTargetGroup = (groupKey) => {
    setTargetGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const handleToggleChannel = (channelKey) => {
    setChannels(prev => ({
      ...prev,
      [channelKey]: !prev[channelKey]
    }));
  };

  // Helper to append log entries with timestamp
  const appendLog = (channel, message) => {
    const now = new Date();
    const ts = now.toLocaleTimeString('en-IN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    setLogs(prev => [
      ...prev,
      {
        id: 'log-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        timestamp: ts,
        channel,
        message,
      }
    ]);
  };

  // 6. Asynchronous Dispatch Simulation Engine
  const timeoutsRef = useRef([]);

  // Clear pending timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(t => clearTimeout(t));
      stopTextToSpeech();
    };
  }, []);

  const handleTriggerBroadcast = () => {
    // Clear any previous scheduled runs
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    setDispatchState('dispatching');
    setLogs([]);

    if (soundEnabled) {
      playEmergencyAlertSound();
    }

    const totalTargets = totalAudienceCount;
    const targetDrivers = targetGroups.commercialDrivers ? calculatedDrivers : 0;
    const targetAdmins = targetGroups.districtAdmins ? calculatedAdmins : 0;
    const targetBro = targetGroups.broQrt ? calculatedBroUnits : 0;

    // Reset metrics for fresh run
    setMetrics({
      totalTargets,
      totalDrivers: targetDrivers,
      totalAdmins: targetAdmins,
      smsDelivered: 0,
      smsQueued: 0,
      whatsappDelivered: 0,
      whatsappRead: 0,
      voicePings: 0,
      adminAck: 0,
    });

    // Sequence Step 1: Initial Handshake & Geofence Target Resolution
    timeoutsRef.current.push(setTimeout(() => {
      if (soundEnabled) playDispatchPacketSound();
      appendLog(
        'DISPATCH', 
        `Triggering high-priority multi-protocol alert broadcast for ${activeIncident.highway} (${activeIncident.state})`
      );
      appendLog(
        'TARGET', 
        `Target Resolution: ${targetDrivers} Commercial Drivers, ${targetAdmins} District Magistrates/SDMA, ${targetBro} BRO/PWD units within ${geofenceRadius} km radius.`
      );
    }, 400));

    // Sequence Step 2: SMS Gateway GSM 2G Fallback
    if (channels.sms) {
      timeoutsRef.current.push(setTimeout(() => {
        if (soundEnabled) playDispatchPacketSound();
        const delivered = Math.max(0, targetDrivers - 4);
        const queued = 4;
        setMetrics(m => ({ ...m, smsDelivered: delivered, smsQueued: queued }));
        appendLog(
          'SMS',
          `SMS Gateway: ${delivered} delivered via GSM cell broadcast. ${queued} buffered for dead-zone hill transit (retry interval: 90s).`
        );
      }, 1200));
    }

    // Sequence Step 3: WhatsApp Rich Cards
    if (channels.whatsapp) {
      timeoutsRef.current.push(setTimeout(() => {
        if (soundEnabled) playDispatchPacketSound();
        const waDelivered = Math.round(targetDrivers * 0.85);
        setMetrics(m => ({ ...m, whatsappDelivered: waDelivered }));
        appendLog(
          'WHATSAPP',
          `WhatsApp Cloud Gateway: Dispatched ${waDelivered} interactive rich cards with detour bypass map links.`
        );
      }, 2000));

      // WhatsApp Read Receipts follow
      timeoutsRef.current.push(setTimeout(() => {
        const waRead = Math.round(targetDrivers * 0.68);
        setMetrics(m => ({ ...m, whatsappRead: waRead }));
        appendLog(
          'WHATSAPP',
          `Read-Receipt Telemetry: ${waRead} blue ticks received. 34 drivers opened alternate routing instructions.`
        );
      }, 3100));
    }

    // Sequence Step 4: Cabin Audio Voice Prompt
    if (channels.audioVoice) {
      timeoutsRef.current.push(setTimeout(() => {
        if (soundEnabled) playDispatchPacketSound();
        const voiceUnits = Math.round(targetDrivers * 0.32);
        setMetrics(m => ({ ...m, voicePings: voiceUnits }));
        appendLog(
          'VOICE',
          `Cabin Audio Prompt: Broadcasted synthesized TTS speech alert to ${voiceUnits} registered on-board telematics units.`
        );
      }, 2600));
    }

    // Sequence Step 5: Administration SDMA & BRO Ack
    if (targetGroups.districtAdmins || targetGroups.broQrt) {
      timeoutsRef.current.push(setTimeout(() => {
        const adminAcks = targetAdmins;
        setMetrics(m => ({ ...m, adminAck: adminAcks }));
        appendLog(
          'ADMIN',
          `Priority ACK: District Emergency Operations Centre (${activeIncident.district.split('(')[0].trim()}) and BRO confirmed alert reception.`
        );
      }, 3800));
    }

    // Sequence Step 6: Public Emergency Push / Siren
    if (channels.pushSiren) {
      timeoutsRef.current.push(setTimeout(() => {
        appendLog(
          'PUSH',
          `Emergency Push: High-decibel audible warning triggered across connected vehicle GPS terminals.`
        );
      }, 4300));
    }

    // Final Completion Step
    timeoutsRef.current.push(setTimeout(() => {
      setDispatchState('completed');
      appendLog(
        'DISPATCH',
        `Broadcast queue completed. Multi-channel delivery rate: 97.2%. Live telemetry monitor active.`
      );
    }, 4800));
  };

  // 7. Interactive Driver Cabin Response Handler
  const handleDriverAction = (actionType) => {
    if (actionType === 'acknowledge') {
      setDriverState(prev => ({ ...prev, acknowledged: true }));
      appendLog(
        'DRIVER',
        `Driver AS-01-EC-9482 (HP Tanker Convoy) clicked 'Acknowledge Alert' via WhatsApp. Telemetry logged.`
      );
    } else if (actionType === 'acceptDetour') {
      setDriverState(prev => ({ ...prev, detourAccepted: true, acknowledged: true }));
      appendLog(
        'DRIVER',
        `Driver AS-01-EC-9482 accepted '${activeIncident.detourRoute}'. Vehicle GPS waypoint updated to Bypass corridor.`
      );
    } else if (actionType === 'sos') {
      setDriverState(prev => ({ ...prev, sosRequested: true }));
      appendLog(
        'DRIVER',
        `EMERGENCY SOS: Driver AS-01-EC-9482 triggered DISTRESS BEACON at Km 144. BRO QRT and nearest PCR dispatched!`
      );
    }
  };

  // Reset entire simulation
  const handleResetSimulation = () => {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    setDispatchState('idle');
    setLogs([]);
    setDriverState({
      acknowledged: false,
      detourAccepted: false,
      sosRequested: false,
    });
    setMetrics({
      totalTargets: totalAudienceCount,
      totalDrivers: calculatedDrivers,
      totalAdmins: calculatedAdmins,
      smsDelivered: 0,
      smsQueued: 0,
      whatsappDelivered: 0,
      whatsappRead: 0,
      voicePings: 0,
      adminAck: 0,
    });
    stopTextToSpeech();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200 radar-grid">
      
      {/* 1. Header */}
      <Header
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled(!soundEnabled)}
        onResetSimulation={handleResetSimulation}
        dispatchState={dispatchState}
        activeIncident={activeIncident}
      />

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Row 1: Incident Selector */}
        <IncidentSelector
          activeIncident={activeIncident}
          onSelectIncident={handleSelectIncident}
          customIncident={customIncident}
          onSaveCustomIncident={(updated) => setCustomIncident(updated)}
        />

        {/* Row 2: Grid Layout - Left: Translation Matrix + Channels | Right: Driver Mobile Preview */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8 cols on large screens): Translation Engine & Audience Targeting */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Translation Engine */}
            <TranslationEditor
              translations={translations}
              onUpdateTranslation={handleUpdateTranslation}
              onResetTranslations={handleResetTranslations}
              preferMeiteiMayek={preferMeiteiMayek}
              onToggleMeiteiScript={handleToggleMeiteiScript}
              activeIncident={activeIncident}
            />

            {/* Audience & Channel Matrix */}
            <AudienceAndChannels
              activeIncident={activeIncident}
              targetGroups={targetGroups}
              onToggleTargetGroup={handleToggleTargetGroup}
              geofenceRadius={geofenceRadius}
              onChangeGeofenceRadius={setGeofenceRadius}
              channels={channels}
              onToggleChannel={handleToggleChannel}
              totalAudienceCount={totalAudienceCount}
            />

          </div>

          {/* Right Column (4 cols on large screens): Driver Cabin Mobile Preview Device */}
          <div className="lg:col-span-4 sticky top-20">
            <DriverMobilePreview
              activeIncident={activeIncident}
              translations={translations}
              driverState={driverState}
              onDriverAction={handleDriverAction}
              soundEnabled={soundEnabled}
              preferMeiteiMayek={preferMeiteiMayek}
            />
          </div>

        </div>

        {/* Row 3: Dispatch Simulator & Streaming Telemetry Console */}
        <DispatchTelemetryConsole
          dispatchState={dispatchState}
          onTriggerBroadcast={handleTriggerBroadcast}
          logs={logs}
          onClearLogs={() => setLogs([])}
          metrics={metrics}
          activeIncident={activeIncident}
          channels={channels}
        />

      </main>

      {/* Modern Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-4 py-4 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>PRAVAH NER Multilingual Emergency Broadcast Dispatcher • Mission-Critical Logistics Architecture</span>
          <span className="text-slate-400">Supported: English • हिन्दी • অসমীয়া • বাংলা • মৈতৈলোন্ (Meitei Mayek)</span>
        </div>
      </footer>

    </div>
  );
}
