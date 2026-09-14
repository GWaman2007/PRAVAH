import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Download, 
  Trash2, 
  Pause, 
  Play, 
  Radio, 
  MessageSquare, 
  Volume2, 
  Building2, 
  Truck, 
  Activity,
  Filter,
  CheckCheck,
  WifiOff,
  RefreshCw
} from 'lucide-react';

export default function DispatchTelemetryConsole({
  dispatchState, // 'idle' | 'dispatching' | 'completed'
  onTriggerBroadcast,
  logs,
  onClearLogs,
  metrics,
  activeIncident,
  channels
}) {
  const [filterChannel, setFilterChannel] = useState('ALL');
  const [isPaused, setIsPaused] = useState(false);
  const logContainerRef = useRef(null);

  // Auto-scroll to bottom as new logs stream in (unless paused)
  useEffect(() => {
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const filteredLogs = logs.filter(log => {
    if (filterChannel === 'ALL') return true;
    return log.channel === filterChannel;
  });

  const handleExportLogs = () => {
    const logText = logs.map(l => `[${l.timestamp}] [${l.channel}] ${l.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PRAVAH_Dispatch_Log_${activeIncident.highway}_${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLogBadge = (channel) => {
    switch (channel) {
      case 'SMS':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'WHATSAPP':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'VOICE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'ADMIN':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'DRIVER':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      case 'BUFFER':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4">
      {/* Header & Main Broadcast Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>4. Interactive Dispatch Simulator & Telemetry Log</span>
              {dispatchState === 'dispatching' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono border border-red-500/40 animate-pulse">
                  TRANSMITTING
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              High-throughput async protocol queue with delivery confirmation and dead-zone buffer retries
            </p>
          </div>
        </div>

        {/* The Primary Broadcast Button */}
        <button
          onClick={onTriggerBroadcast}
          disabled={dispatchState === 'dispatching'}
          className={`relative px-6 py-3 rounded-xl font-extrabold text-xs sm:text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2.5 shadow-2xl ${
            dispatchState === 'dispatching'
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-red-600 via-red-500 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-red-900/50 border border-red-400/40 active:scale-[0.98]'
          }`}
        >
          {dispatchState === 'dispatching' ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              <span>Broadcasting Multi-Channel Alert...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Broadcast Alert to NER Sector</span>
            </>
          )}
          {dispatchState === 'idle' && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>
          )}
        </button>
      </div>

      {/* Real-time Telemetry Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Metric 1: Total Targets */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Total Targets</span>
            <Activity className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-lg font-bold font-mono text-white mt-1">
            {metrics.totalTargets}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            100% Geofenced
          </div>
        </div>

        {/* Metric 2: SMS Gateway */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>SMS Gateway</span>
            <Radio className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold font-mono text-blue-400 mt-1">
            {metrics.smsDelivered} <span className="text-xs text-slate-500">/ {metrics.totalDrivers}</span>
          </div>
          <div className="text-[10px] font-mono text-orange-400 flex items-center gap-1 mt-0.5">
            <WifiOff className="w-2.5 h-2.5" />
            <span>{metrics.smsQueued} Hill Dead-Zone Buffer</span>
          </div>
        </div>

        {/* Metric 3: WhatsApp Rich Cards */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>WhatsApp Delivered</span>
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
            {metrics.whatsappDelivered}
          </div>
          <div className="text-[10px] font-mono text-cyan-400 flex items-center gap-1 mt-0.5">
            <CheckCheck className="w-3 h-3" />
            <span>{metrics.whatsappRead} Read Receipts</span>
          </div>
        </div>

        {/* Metric 4: Cabin Audio Units */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Cabin Voice Pings</span>
            <Volume2 className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-400 mt-1">
            {metrics.voicePings}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            Registered Cabin Units
          </div>
        </div>

        {/* Metric 5: Administration ACK */}
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>DMs / BRO ACK</span>
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold font-mono text-purple-300 mt-1">
            {metrics.adminAck} <span className="text-xs text-slate-500">/ {metrics.totalAdmins}</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
            Priority ACK Received
          </div>
        </div>
      </div>

      {/* Console Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
        {/* Channel Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <span className="text-slate-500 text-[11px] flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3" />
            Filter:
          </span>
          {['ALL', 'SMS', 'WHATSAPP', 'VOICE', 'ADMIN', 'DRIVER', 'BUFFER'].map((ch) => (
            <button
              key={ch}
              onClick={() => setFilterChannel(ch)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                filterChannel === ch
                  ? 'bg-slate-700 text-white border border-slate-500 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ch}
            </button>
          ))}
        </div>

        {/* Action Buttons: Pause/Resume, Export, Clear */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            title={isPaused ? 'Resume live auto-scroll' : 'Pause auto-scroll'}
          >
            {isPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={handleExportLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors disabled:opacity-40"
            title="Download full telemetry transmission log"
          >
            <Download className="w-3 h-3" />
            <span>Export Log</span>
          </button>

          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors disabled:opacity-40"
            title="Clear console output"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Streaming Terminal Window */}
      <div 
        ref={logContainerRef}
        className="h-64 sm:h-72 rounded-xl bg-slate-950 border border-slate-800/90 p-3 font-mono text-xs overflow-y-auto space-y-1.5 shadow-inner"
      >
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-1">
            <Terminal className="w-8 h-8 opacity-40" />
            <p>Transmission queue idle. Click "Broadcast Alert" to initiate dispatch.</p>
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div 
              key={log.id} 
              className="flex items-start gap-2 hover:bg-slate-900/60 p-1 rounded transition-colors"
            >
              {/* Timestamp */}
              <span className="text-slate-500 shrink-0 select-none">
                [{log.timestamp}]
              </span>

              {/* Protocol Badge */}
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border uppercase shrink-0 ${getLogBadge(log.channel)}`}>
                {log.channel}
              </span>

              {/* Log Message */}
              <span className={`text-slate-300 leading-relaxed ${
                log.channel === 'ADMIN' ? 'text-purple-300 font-semibold' :
                log.channel === 'DRIVER' ? 'text-cyan-300 font-semibold' :
                log.channel === 'BUFFER' ? 'text-amber-300' : ''
              }`}>
                {log.message}
              </span>
            </div>
          ))
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Gateway: Dispatched via Guwahati Hub & NavIC Downlink</span>
        </div>
        <div>
          <span>Total Stream Events: {logs.length}</span>
        </div>
      </div>
    </div>
  );
}
