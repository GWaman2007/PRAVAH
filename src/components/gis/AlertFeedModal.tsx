import React, { useState } from 'react';
import type { AlertEvent } from '../../types';
import { playAckChime } from '../../utils/audioAlert';
import {
  AlertTriangle,
  Radio,
  Wifi,
  ShieldAlert,
  CheckCircle2,
  X,
  Bell,
  Clock,
} from 'lucide-react';

interface AlertFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertEvent[];
  onAcknowledge: (alertId: string) => void;
  onSelectVehicle: (vehicleId: string) => void;
}

export const AlertFeedModal: React.FC<AlertFeedModalProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledge,
  onSelectVehicle,
}) => {
  if (!isOpen) return null;

  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'INFO'>('ALL');

  const filtered = alerts.filter((a) => {
    if (filter === 'ALL') return true;
    if (filter === 'CRITICAL') return a.severity === 'CRITICAL';
    if (filter === 'WARNING') return a.severity === 'WARNING' || a.severity === 'HIGH RISK';
    if (filter === 'INFO') return a.severity === 'INFO';
    return true;
  });

  const handleAck = (id: string) => {
    onAcknowledge(id);
    playAckChime();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="bg-surface border border-border rounded-md w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-text-primary text-xs max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-surface-subtle border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Fleet Telemetry & Watchdog Alert Feed
              </h3>
              <p className="text-[11px] text-text-secondary">
                Dead-reckoning timeouts, route deviations, and emergency beacon logs
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent hover:border-border cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Severity Tabs */}
        <div className="p-3 border-b border-border bg-surface-subtle/40 flex items-center gap-2">
          {(['ALL', 'CRITICAL', 'WARNING', 'INFO'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 rounded-xs text-[11px] font-semibold transition-colors cursor-pointer ${
                filter === tab
                  ? 'bg-[#1B4B73] dark:bg-[#2E6B9E] text-white shadow-xs'
                  : 'bg-surface border border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
          <span className="ml-auto font-mono text-[11px] text-text-secondary">
            {filtered.length} alert{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-text-secondary space-y-2">
              <CheckCircle2 className="w-8 h-8 text-status-open-solid mx-auto" />
              <p className="font-semibold text-text-primary">No Active Alerts</p>
              <p className="text-[11px]">All convoy telemetry within nominal parameters.</p>
            </div>
          ) : (
            filtered.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-sm border transition-colors ${
                  alert.acknowledged
                    ? 'bg-surface-subtle/30 border-border opacity-70'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-status-blocked-tint/40 border-status-blocked-solid/60'
                    : alert.severity === 'WARNING' || alert.severity === 'HIGH RISK'
                    ? 'bg-status-highrisk-tint/40 border-status-highrisk-solid/60'
                    : 'bg-surface border-border'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {alert.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-4 h-4 text-status-blocked-solid mt-0.5 shrink-0" />
                    ) : alert.severity === 'WARNING' || alert.severity === 'HIGH RISK' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                    ) : (
                      <Radio className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-text-primary">{alert.title}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded-xs border font-bold ${
                            alert.severity === 'CRITICAL'
                              ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                              : alert.severity === 'WARNING' || alert.severity === 'HIGH RISK'
                              ? 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
                              : 'bg-primary-tint text-primary border-primary/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-1">{alert.message}</p>
                    </div>
                  </div>

                  {!alert.acknowledged && (
                    <button
                      onClick={() => handleAck(alert.id)}
                      className="px-2.5 py-1 text-[10px] font-semibold rounded-xs bg-[#1B4B73] hover:bg-[#123A5A] text-white shrink-0 btn-press cursor-pointer shadow-xs"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono pt-2 mt-2 border-t border-border/50">
                  <button
                    onClick={() => {
                      onSelectVehicle(alert.vehicle_id);
                      onClose();
                    }}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    Focus Vehicle #{alert.vehicle_id}
                  </button>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
