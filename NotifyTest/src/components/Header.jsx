import React, { useState, useEffect } from 'react';
import { 
  Radio, 
  Satellite, 
  Volume2, 
  VolumeX, 
  Clock, 
  ShieldAlert, 
  Activity, 
  Wifi, 
  Sparkles,
  RefreshCw
} from 'lucide-react';

export default function Header({ 
  soundEnabled, 
  onToggleSound, 
  onResetSimulation, 
  dispatchState, 
  activeIncident 
}) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }) + ' IST');
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 shadow-xl shadow-black/40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Logo & Operational Sector */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 via-amber-600 to-red-700 shadow-lg shadow-red-900/30 ring-1 ring-red-400/40">
              <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
              <div className="absolute -inset-0.5 rounded-xl border border-red-400/30 animate-ping opacity-20 pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-white flex items-center gap-1.5">
                  PRAVAH <span className="text-amber-400 text-xs px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 font-mono tracking-normal">NER</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  DISPATCH CONSOLE ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 tracking-tight">
                North East Emergency Alert & Multilingual Broadcast Dispatcher
              </p>
            </div>
          </div>

          {/* Mobile Sound & Reset */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onToggleSound}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                soundEnabled 
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
              title={soundEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Status Indicators & Live Telemetry Bar */}
        <div className="flex items-center flex-wrap gap-2.5 sm:gap-3 w-full md:w-auto justify-end">
          
          {/* NavIC Satellite Status */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Satellite className="w-3.5 h-3.5 text-cyan-400" />
            <span>NavIC / IRNSS:</span>
            <span className="text-cyan-300 font-mono font-medium">99.4% Link</span>
          </div>

          {/* 2G GSM Fallback */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
            <Radio className="w-3.5 h-3.5 text-amber-400" />
            <span>Hill GSM:</span>
            <span className="text-emerald-400 font-mono font-medium">Buffer Ready</span>
          </div>

          {/* Live IST Clock */}
          <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900/90 border border-slate-700/80 text-xs text-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-mono font-medium tracking-wide text-slate-200">{time || '19:45:00 IST'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
              soundEnabled 
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25' 
                : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
            }`}
            title={soundEnabled ? 'Audio tones enabled (Click to mute)' : 'Audio tones muted (Click to unmute)'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio Alert: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5" />
                <span>Audio Alert: MUTED</span>
              </>
            )}
          </button>

          {/* Reset Simulation */}
          <button
            onClick={onResetSimulation}
            disabled={dispatchState === 'dispatching'}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Reset telemetry counters and dispatch queue"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Sim</span>
          </button>
        </div>

      </div>
    </header>
  );
}
