import React, { useState } from 'react';
import { 
  Smartphone, 
  Wifi, 
  Battery, 
  MessageSquare, 
  Navigation, 
  AlertTriangle, 
  CheckCircle2, 
  Siren, 
  ShieldAlert, 
  Phone, 
  ExternalLink,
  ChevronRight,
  Radio,
  Clock,
  Compass,
  Volume2
} from 'lucide-react';

import { SUPPORTED_LANGUAGES } from '../data/translations';
import { playAckChime, playEmergencyAlertSound, playTextToSpeech, stopTextToSpeech } from '../utils/audioAlert';

export default function DriverMobilePreview({
  activeIncident,
  translations,
  driverState,
  onDriverAction,
  soundEnabled,
  preferMeiteiMayek
}) {
  const [phoneMode, setPhoneMode] = useState('whatsapp'); // 'whatsapp' | 'sms'
  const [previewLang, setPreviewLang] = useState('hi'); // Default Hindi for long-haul drivers, can switch to any of 5
  const [isCabinPlaying, setIsCabinPlaying] = useState(false);

  const langObj = SUPPORTED_LANGUAGES.find(l => l.id === previewLang) || SUPPORTED_LANGUAGES[0];
  const messageText = translations[previewLang] || translations.en;

  const handleAction = (actionType) => {
    if (soundEnabled) {
      if (actionType === 'sos') {
        playEmergencyAlertSound();
      } else {
        playAckChime();
      }
    }
    onDriverAction(actionType);
  };

  const handleToggleCabinAudio = () => {
    if (isCabinPlaying) {
      stopTextToSpeech();
      setIsCabinPlaying(false);
    } else {
      setIsCabinPlaying(true);
      playTextToSpeech(
        messageText,
        previewLang,
        activeIncident,
        {
          speed: 0.82,
          onStart: () => setIsCabinPlaying(true),
          onEnd: () => setIsCabinPlaying(false),
          onError: () => setIsCabinPlaying(false)
        }
      );
    }
  };


  const getFontClass = (langId) => {
    switch (langId) {
      case 'hi': return 'font-devanagari';
      case 'as': return 'font-bengali';
      case 'bn': return 'font-bengali';
      case 'mn': return preferMeiteiMayek ? 'font-meitei' : 'font-bengali';
      default: return 'font-sans';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl flex flex-col items-center">
      {/* Header & Mode Toggles */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">Driver Cabin Mobile Preview</h3>
            <p className="text-[11px] text-slate-400">On-board telemetry device simulation</p>
          </div>
        </div>

        {/* WhatsApp vs SMS Toggle */}
        <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700 p-0.5">
          <button
            onClick={() => setPhoneMode('whatsapp')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              phoneMode === 'whatsapp'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            WhatsApp
          </button>
          <button
            onClick={() => setPhoneMode('sms')}
            className={`px-2 py-1 rounded text-[11px] font-semibold transition-all ${
              phoneMode === 'sms'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            GSM SMS
          </button>
        </div>
      </div>

      {/* Language Selector for Driver Terminal */}
      <div className="w-full flex items-center justify-between mb-3 text-xs">
        <span className="text-slate-400 text-[11px]">Driver Preferred Language:</span>
        <div className="flex items-center gap-1">
          {SUPPORTED_LANGUAGES.map((l) => (
            <button
              key={l.id}
              onClick={() => setPreviewLang(l.id)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                previewLang === l.id
                  ? 'bg-slate-700 text-amber-300 font-bold border border-amber-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {l.code}
            </button>
          ))}
        </div>
      </div>

      {/* Realistic Smartphone Shell */}
      <div className="relative w-[320px] sm:w-[340px] rounded-[36px] bg-slate-950 p-3.5 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700">
        
        {/* Dynamic Island / Speaker Notch */}
        <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-950 border border-slate-800" />
          <div className="w-1.5 h-1.5 rounded-full bg-blue-950/60" />
        </div>

        {/* Phone Screen */}
        <div className="rounded-[28px] overflow-hidden bg-slate-900 border border-slate-800/80 flex flex-col h-[520px]">
          
          {/* Status Bar */}
          <div className="px-4 py-1.5 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="font-semibold text-white">19:46</span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-emerald-400 font-bold">4G/2G</span>
              <Wifi className="w-3 h-3 text-slate-300" />
              <Battery className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </div>

          {/* App Header */}
          {phoneMode === 'whatsapp' ? (
            <div className="px-3 py-2 bg-emerald-900/40 border-b border-emerald-800/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs">
                  P
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>PRAVAH NER Dispatch</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="text-[10px] text-emerald-300/80">Disaster Emergency Gateway</div>
                </div>
              </div>
              <Phone className="w-3.5 h-3.5 text-emerald-300" />
            </div>
          ) : (
            <div className="px-3 py-2 bg-blue-900/30 border-b border-blue-800/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-white font-bold text-xs">
                  SMS
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Govt Alert (TD-NERDISP)</div>
                  <div className="text-[10px] text-blue-300/80">Priority Commercial Broadcast</div>
                </div>
              </div>
              <Radio className="w-3.5 h-3.5 text-blue-300" />
            </div>
          )}

          {/* Chat / Message Stream */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 bg-gradient-to-b from-slate-900 via-slate-920 to-slate-950">
            
            {/* Timestamp Pill */}
            <div className="text-center">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                TODAY • EMERGENCY DISPATCH
              </span>
            </div>

            {/* Message Bubble */}
            <div className={`p-3 rounded-2xl border text-xs shadow-lg ${
              phoneMode === 'whatsapp'
                ? 'bg-slate-850 border-emerald-500/30 rounded-tl-none'
                : 'bg-slate-850 border-blue-500/30'
            }`}>
              
              {/* Alert Badge */}
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-700/60">
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/20 px-2 py-0.5 rounded border border-red-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {activeIncident.severity} ALERT
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Just Now</span>
              </div>

              {/* Message Content */}
              <p className={`text-slate-100 text-[12px] leading-relaxed mb-3 ${getFontClass(previewLang)}`}>
                {messageText}
              </p>

              {/* Detour Map & Route Card */}
              <div className="rounded-xl bg-slate-900/90 border border-slate-700/80 p-2.5 mb-3">
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="text-cyan-400 font-semibold flex items-center gap-1">
                    <Navigation className="w-3 h-3" />
                    Recommended Detour Route
                  </span>
                  <span className="text-amber-400 font-mono text-[10px]">
                    +{activeIncident.delayHours}h Delay
                  </span>
                </div>
                
                {/* Visual Route Mini-Graphic */}
                <div className="space-y-1 text-[11px] font-mono">
                  <div className="flex items-center gap-2 text-red-400">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span className="truncate line-through text-slate-400">{activeIncident.stretch || activeIncident.highway} (BLOCKED)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="truncate font-semibold">{activeIncident.detourRoute}</span>
                  </div>
                </div>
              </div>

              {/* Interactive Driver Action Buttons */}
              <div className="space-y-1.5 pt-1">
                {/* Action 1: Acknowledge */}
                <button
                  onClick={() => handleAction('acknowledge')}
                  className={`w-full py-2 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    driverState.acknowledged
                      ? 'bg-emerald-600/30 border border-emerald-500 text-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-900/30'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{driverState.acknowledged ? 'Alert Acknowledged ✓' : 'Acknowledge Alert'}</span>
                </button>

                {/* Action 2: Accept Detour Route */}
                <button
                  onClick={() => handleAction('acceptDetour')}
                  className={`w-full py-2 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    driverState.detourAccepted
                      ? 'bg-cyan-600/30 border border-cyan-500 text-cyan-300'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-900/30'
                  }`}
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{driverState.detourAccepted ? 'Route B Active (Navigating) ✓' : 'Accept Detour Route'}</span>
                </button>

                {/* Action 3: Request Emergency Assistance */}
                <button
                  onClick={() => handleAction('sos')}
                  className={`w-full py-2 px-3 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 ${
                    driverState.sosRequested
                      ? 'bg-red-600 border border-red-400 text-white animate-pulse'
                      : 'bg-slate-800 hover:bg-red-950/60 text-red-400 border border-red-500/30'
                  }`}
                >
                  <Siren className="w-3.5 h-3.5 text-red-400" />
                  <span>{driverState.sosRequested ? 'SOS TRANSMITTING (QRT Notified)' : 'Request Emergency Assistance'}</span>
                </button>
              </div>

              {/* Footer Meta */}
              <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-1.5 border-t border-slate-800">
                <span>Ref: NER-{activeIncident.highway}-{Date.now().toString().slice(-4)}</span>
                <span className="text-emerald-400 font-mono">
                  {driverState.acknowledged ? 'ACK Recorded' : 'Pending ACK'}
                </span>
              </div>
            </div>

            {/* In-Cabin Voice Prompt Simulation Indicator */}
            <button
              onClick={handleToggleCabinAudio}
              className={`w-full text-left p-2.5 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
                isCabinPlaying
                  ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-950/50'
                  : 'bg-amber-950/30 hover:bg-amber-950/50 border-amber-500/30 text-amber-200 cursor-pointer'
              }`}
              title={`Tap to play audio broadcast in ${langObj.name} (${langObj.nativeName})`}
            >
              <div className={`p-1.5 rounded-lg text-amber-400 ${isCabinPlaying ? 'bg-amber-500 text-slate-950 font-bold animate-pulse' : 'bg-amber-500/20'}`}>
                <Volume2 className="w-4 h-4" />
              </div>
              <div className="flex-1 text-[11px]">
                <div className="font-bold text-amber-300 flex items-center justify-between">
                  <span>Cabin Voice Audio Prompt</span>
                  <span className="text-[10px] font-mono text-amber-400">
                    {isCabinPlaying ? 'PLAYING...' : 'TAP TO PLAY'}
                  </span>
                </div>
                <div className="text-amber-200/70">
                  {isCabinPlaying 
                    ? `Broadcasting in ${langObj.name} (${langObj.nativeName})... Tap to stop`
                    : `Simulate audio prompt in ${langObj.name} (${langObj.nativeName})`}
                </div>
              </div>
            </button>


          </div>

          {/* Phone Bottom Home Bar */}
          <div className="p-2 bg-slate-950 flex justify-center">
            <div className="w-28 h-1 bg-slate-700 rounded-full" />
          </div>

        </div>

      </div>

      {/* Driver Status State Summary */}
      <div className="w-full mt-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span>Driver Vehicle:</span>
          <span className="font-mono text-white">AS-01-EC-9482 (Tanker)</span>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <span>Status Feedback:</span>
          <span className="font-mono font-bold text-cyan-300">
            {driverState.sosRequested
              ? '🚨 EMERGENCY SOS ACTIVE'
              : driverState.detourAccepted
              ? '🛣️ Rerouted via Bypass'
              : driverState.acknowledged
              ? '✓ Alert Acknowledged'
              : '⏳ Standing by'}
          </span>
        </div>
      </div>
    </div>
  );
}
