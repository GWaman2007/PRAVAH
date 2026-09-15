import React from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { ActiveView } from '../../types';
import {
  Map,
  Zap,
  Building2,
  MessageSquare,
  Radio,
  Smartphone,
} from 'lucide-react';

interface NavItem {
  id: ActiveView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const Navigation: React.FC = () => {
  const { activeView, setActiveView, activeRole, communities, alerts, incidents } = usePravahStore();

  const p1Count = communities.filter((c) => c.metrics.priorityTier === 'P1').length;
  const criticalAlertsCount = alerts.filter((a) => !a.acknowledged && (a.severity === 'CRITICAL' || a.severity === 'WARNING')).length;

  const navItems: NavItem[] = [
    {
      id: 'GIS_COMMAND',
      label: 'Tactical GIS Command',
      icon: Map,
    },
    {
      id: 'COMMUNITY_PRIORITY',
      label: 'Community Priority Engine',
      icon: Zap,
      badge: p1Count > 0 ? `${p1Count} P1` : undefined,
    },
    {
      id: 'EXECUTIVE_INFRA',
      label: 'Infrastructure & BRO Board',
      icon: Building2,
    },
    {
      id: 'GROUND_FEED',
      label: 'Ground Intel Feed',
      icon: MessageSquare,
      badge: incidents.length,
    },
    {
      id: 'BROADCAST_CENTER',
      label: 'Emergency Broadcasts',
      icon: Radio,
    },
    {
      id: 'MOBILE_COCKPIT',
      label: 'Field Mission Cockpit',
      icon: Smartphone,
      badge: activeRole === 'DRIVER' || activeRole === 'FIELD_OFFICER' ? 'ACTIVE' : undefined,
    },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (activeRole === 'DRIVER') {
      return item.id === 'MOBILE_COCKPIT';
    }
    if (activeRole === 'FIELD_OFFICER') {
      return item.id === 'MOBILE_COCKPIT' || item.id === 'GROUND_FEED' || item.id === 'GIS_COMMAND';
    }
    return true; // SUPER_ADMIN & FLEET_DISPATCHER have full operational access
  });

  return (
    <nav className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 no-scrollbar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2.5 rounded-sm text-sm font-medium whitespace-nowrap transition-colors btn-press ${
                  isActive
                    ? 'bg-[#1B4B73] text-white shadow-xs dark:bg-[#2E6B9E]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-text-secondary'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-xs font-bold rounded-sm ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : item.id === 'COMMUNITY_PRIORITY'
                        ? 'bg-status-blocked-tint text-status-blocked-text'
                        : 'bg-primary-tint text-primary'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
