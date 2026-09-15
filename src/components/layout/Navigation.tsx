import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { ActiveView } from '../../types';
import {
  Map,
  Zap,
  Building2,
  MessageSquare,
  Radio,
  Smartphone,
  Menu,
  X,
  ChevronDown,
} from 'lucide-react';

interface NavItem {
  id: ActiveView;
  label: string;
  shortLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const Navigation: React.FC = () => {
  const { activeView, setActiveView, activeRole, communities, alerts, incidents } = usePravahStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const p1Count = communities.filter((c) => c.metrics.priorityTier === 'P1').length;

  const navItems: NavItem[] = [
    {
      id: 'GIS_COMMAND',
      label: 'Tactical GIS Command',
      shortLabel: 'GIS Map',
      icon: Map,
    },
    {
      id: 'COMMUNITY_PRIORITY',
      label: 'Community Priority Engine',
      shortLabel: 'Priority',
      icon: Zap,
      badge: p1Count > 0 ? `${p1Count} P1` : undefined,
    },
    {
      id: 'EXECUTIVE_INFRA',
      label: 'Infrastructure & BRO Board',
      shortLabel: 'Infra & BRO',
      icon: Building2,
    },
    {
      id: 'GROUND_FEED',
      label: 'Ground Intel Feed',
      shortLabel: 'Intel Feed',
      icon: MessageSquare,
      badge: incidents.length,
    },
    {
      id: 'BROADCAST_CENTER',
      label: 'Emergency Broadcasts',
      shortLabel: 'Broadcasts',
      icon: Radio,
    },
    {
      id: 'MOBILE_COCKPIT',
      label: 'Field Mission Cockpit',
      shortLabel: 'Cockpit',
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
    // SUPER_ADMIN & FLEET_DISPATCHER have full central command access; cockpit is dedicated to field roles
    return item.id !== 'MOBILE_COCKPIT';
  });

  const currentItem = filteredNavItems.find((item) => item.id === activeView) || filteredNavItems[0];
  const CurrentIcon = currentItem?.icon || Map;

  return (
    <nav className="bg-surface border-b border-border relative z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Mobile Header Bar (< md) */}
        <div className="flex md:hidden items-center justify-between py-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center space-x-2 text-left cursor-pointer focus:outline-none"
            aria-label="Current operational view. Tap to toggle view selector."
          >
            <div className="w-8 h-8 rounded-sm bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <CurrentIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-text-primary truncate">
                  {currentItem?.label}
                </span>
                {currentItem?.badge && (
                  <span className="px-1.5 py-0.2 text-[9px] font-bold rounded-sm bg-status-blocked-tint text-status-blocked-text border border-status-blocked-solid/40 shrink-0">
                    {currentItem.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-text-secondary block">
                Tap to switch operational view
              </span>
            </div>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-border bg-surface-subtle text-text-primary text-xs font-semibold hover:bg-surface transition-colors cursor-pointer btn-press shrink-0 ml-2"
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle navigation menu"
          >
            <span>{mobileMenuOpen ? 'Close' : 'Views'}</span>
            {mobileMenuOpen ? (
              <X className="w-4 h-4 text-text-secondary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-secondary" />
            )}
          </button>
        </div>

        {/* Mobile Dropdown Backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-[115px] sm:top-[125px] bg-black/40 z-20 md:hidden backdrop-blur-2xs"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* Mobile Dropdown Sheet (< md) */}
        {mobileMenuOpen && (
          <div className="relative z-30 md:hidden border-t border-border py-2 space-y-1 animate-fadeIn bg-surface shadow-lg">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#1B4B73] text-white shadow-xs dark:bg-[#2E6B9E]'
                      : 'text-text-primary hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-primary'}`} />
                    <span className="font-semibold">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm ${
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
        )}

        {/* Tablet & Desktop Navigation Tabs (>= md) */}
        <div className="hidden md:flex space-x-1.5 lg:space-x-3 overflow-x-auto py-2 no-scrollbar">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`flex items-center space-x-2 px-3 lg:px-3.5 py-2.5 rounded-sm text-xs lg:text-sm font-medium whitespace-nowrap transition-colors btn-press cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#1B4B73] text-white shadow-xs dark:bg-[#2E6B9E]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-subtle'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-text-secondary'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 text-[10px] lg:text-xs font-bold rounded-sm ${
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
