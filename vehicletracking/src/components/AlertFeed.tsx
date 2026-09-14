import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import type { AlertEvent, AlertSeverity } from '../types/fleet';
import {
  AlertTriangle,
  Radio,
  Wifi,
  ShieldAlert,
  MapPin,
  Check,
  X,
  Trash2,
  Bell,
  Clock,
} from 'lucide-react';

export const AlertFeed: React.FC = () => {
  const { alerts, dismissAlert, acknowledgeAlert, clearAllAlerts, focusVehicle, setPanTarget } =
    useSimulation();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredAlerts = alerts.filter((alert) => {
    if (filterSeverity === 'ALL') return true;
    if (filterSeverity === 'CRITICAL')
      return alert.severity === 'CRITICAL' || alert.severity === 'EMERGENCY';
    if (filterSeverity === 'HIGH RISK') return alert.severity === 'HIGH RISK';
    if (filterSeverity === 'INFO') return alert.severity === 'INFO';
    return true;
  });

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'EMERGENCY':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-600 text-white border border-rose-400 animate-pulse">
            EMERGENCY SOS
          </span>
        );
      case 'CRITICAL':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-500">
            CRITICAL DEVIATION
          </span>
        );
      case 'HIGH RISK':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-500">
            HAZARD RISK
          </span>
        );
      case 'INFO':
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950 text-cyan-300 border border-cyan-500/40">
            TELEMETRY INFO
          </span>
        );
    }
  };

  const getAlertIcon = (type: string, severity: AlertSeverity) => {
    if (severity === 'EMERGENCY') {
      return <ShieldAlert className="w-4 h-4 text-rose-400 animate-bounce" />;
    }
    if (severity === 'CRITICAL') {
      return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    }
    if (severity === 'HIGH RISK') {
      return <AlertTriangle className="w-4 h-4 text-amber-400" />;
    }
    if (type === 'BLACKOUT_ENTER') {
      return <Radio className="w-4 h-4 text-amber-400" />;
    }
    return <Wifi className="w-4 h-4 text-cyan-400" />;
  };

  return (
    <div className="bg-slate-900 border-t border-slate-800 flex flex-col h-full text-slate-100 select-none">
      {/* Alert Header & Filter Bar */}
      <div className="p-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
            Live Anomaly Feed ({alerts.length})
          </h3>
        </div>

        {alerts.length > 0 && (
          <button
            onClick={clearAllAlerts}
            title="Clear all alerts"
            className="text-[11px] text-slate-400 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/60 text-[11px] overflow-x-auto">
        {['ALL', 'CRITICAL', 'HIGH RISK', 'INFO'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterSeverity(cat)}
            className={`px-2 py-0.5 rounded font-mono transition cursor-pointer whitespace-nowrap ${
              filterSeverity === cat
                ? 'bg-slate-700 text-white font-bold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Alert Cards List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Check className="w-8 h-8 mx-auto mb-1.5 text-emerald-500/60" />
            <p className="text-xs font-medium text-slate-400">All Corridors Clear</p>
            <p className="text-[11px] text-slate-600 mt-0.5">
              No active anomalies or geofence breaches detected.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert, idx) => {
            return (
              <div
                key={`${alert.id}-${idx}`}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  alert.acknowledged
                    ? 'bg-slate-950/40 border-slate-800/60 opacity-70'
                    : alert.severity === 'EMERGENCY'
                    ? 'bg-rose-950/30 border-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-rose-950/20 border-rose-500/50'
                    : alert.severity === 'HIGH RISK'
                    ? 'bg-amber-950/20 border-amber-500/40'
                    : 'bg-slate-950/50 border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type, alert.severity)}
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <div className="font-semibold text-slate-100 text-xs mb-1">
                  {alert.title}
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
                  {alert.message}
                </p>

                {/* Card Action Toolbar */}
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/60">
                  <button
                    onClick={() => {
                      focusVehicle(alert.vehicle_id);
                      setPanTarget(alert.coords);
                    }}
                    className="flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition cursor-pointer"
                  >
                    <MapPin className="w-3 h-3" />
                    <span>Jump to Vehicle</span>
                  </button>

                  <div className="flex items-center gap-2">
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        title="Acknowledge Alert"
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 transition cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      title="Dismiss Alert"
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-rose-400 transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
