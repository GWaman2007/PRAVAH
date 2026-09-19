import React from 'react';
import { PravahStoreProvider, usePravahStore } from './store/usePravahStore';
import { useTranslation } from './data/uiTranslations';
import { Header } from './components/layout/Header';
import { Navigation } from './components/layout/Navigation';
import { TacticalMapDeck } from './components/gis/TacticalMapDeck';
import { MissionsDeck } from './components/missions/MissionsDeck';
import { CommunitiesDeck } from './components/communities/CommunitiesDeck';
import { ExecutiveInfrastructureDeck } from './components/executive/ExecutiveInfrastructureDeck';
import { GroundIntelligenceFeed } from './components/feed/GroundIntelligenceFeed';
import { MultilingualBroadcastCenter } from './components/broadcast/MultilingualBroadcastCenter';
import { MobileMissionCockpit } from './components/cockpit/MobileMissionCockpit';
import { GlobalSOSInterceptModal } from './components/admin/GlobalSOSInterceptModal';
import { InteractiveWalkthroughToolbar } from './components/layout/InteractiveWalkthroughToolbar';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { AlertOctagon, X } from 'lucide-react';

const AppContent: React.FC = () => {
  const { t } = useTranslation();
  const {
    activeView,
    activeRole,
    alerts,
    vehicles,
    acknowledgeAlert,
    pendingSOSAlert,
    setPendingSOSAlert,
  } = usePravahStore();

  const unacknowledgedCriticalAlert = alerts.find(
    (a) => !a.acknowledged && (a.severity === 'CRITICAL' || a.severity === 'HIGH RISK')
  );

  const sosVehicle = vehicles.find(
    (v) => v.vehicle_id === (pendingSOSAlert?.vehicle_id || 'Medic-01')
  ) || null;

  return (
    <div className={`min-h-screen bg-page-bg flex flex-col ${activeView === 'GIS_COMMAND' ? 'pb-16 lg:pb-0' : 'pb-28 sm:pb-24'}`}>
      {/* Global Header */}
      <Header />

      {/* Global Navigation Tabs */}
      <Navigation />

      {/* High-Priority Floating Alert Banner (GIGW / Section 7.4) */}
      {unacknowledgedCriticalAlert && !pendingSOSAlert && (
        <div className="bg-status-blocked-solid text-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md z-30 animate-siren">
          <div className="flex items-start sm:items-center space-x-2 max-w-5xl">
            <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 animate-pulse mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold uppercase tracking-wider mr-2">
                [{unacknowledgedCriticalAlert.severity}] {unacknowledgedCriticalAlert.title}:
              </span>
              <span className="leading-snug">{unacknowledgedCriticalAlert.message}</span>
            </div>
          </div>
          <button
            onClick={() => acknowledgeAlert(unacknowledgedCriticalAlert.id)}
            className="w-full sm:w-auto px-3 py-1.5 rounded-sm bg-white/20 hover:bg-white/30 text-white font-medium sm:ml-4 shrink-0 transition-colors btn-press cursor-pointer text-center text-xs"
          >
            {t('acknowledge')}
          </button>
        </div>
      )}

      {/* Master View Routing */}
      <main className="flex-1 min-h-0 relative w-full overflow-hidden">
        {activeView === 'GIS_COMMAND' && <TacticalMapDeck />}
        {activeView === 'MISSIONS' && (
          <div className="h-full overflow-y-auto pb-16">
            <MissionsDeck />
          </div>
        )}
        {activeView === 'COMMUNITIES' && (
          <div className="h-full overflow-y-auto pb-16">
            <CommunitiesDeck />
          </div>
        )}
        {activeView === 'EXECUTIVE_INFRA' && (
          <div className="h-full overflow-y-auto pb-16">
            <ExecutiveInfrastructureDeck />
          </div>
        )}
        {activeView === 'GROUND_FEED' && (
          <div className="h-full overflow-y-auto pb-16">
            <GroundIntelligenceFeed />
          </div>
        )}
        {activeView === 'BROADCAST_CENTER' && (
          <div className="h-full overflow-y-auto pb-16">
            <MultilingualBroadcastCenter />
          </div>
        )}
        {activeView === 'MOBILE_COCKPIT' && (
          <div className="h-full overflow-y-auto pb-24">
            <MobileMissionCockpit />
          </div>
        )}
      </main>

      {/* Global SOS Distress Signal Intercept Modal - Command Roles (Super Admin / Dispatcher) Only */}
      {pendingSOSAlert && (activeRole === 'SUPER_ADMIN' || activeRole === 'FLEET_DISPATCHER') && (
        <GlobalSOSInterceptModal
          alert={pendingSOSAlert}
          vehicle={sosVehicle}
          onClose={() => setPendingSOSAlert(null)}
          onAcknowledge={(alertId) => acknowledgeAlert(alertId)}
        />
      )}

      {/* Persistent 1-Click Interactive Resilience Walkthrough Bar */}
      <InteractiveWalkthroughToolbar />
    </div>
  );
};

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PRAVAH Uncaught Component Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-page-bg flex flex-col items-center justify-center p-6 text-text-primary text-center">
          <div className="max-w-md w-full bg-surface border border-status-blocked-solid/50 rounded-md p-6 shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-full bg-status-blocked-tint text-status-blocked-solid flex items-center justify-center mx-auto border border-status-blocked-solid/30">
              <AlertOctagon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-text-primary">PRAVAH Resilience Catch</h2>
            <p className="text-xs text-text-secondary">
              A UI component encountered an unexpected error:
            </p>
            <div className="p-3 rounded-sm bg-surface-subtle font-mono text-xs text-status-blocked-text text-left break-all border border-border">
              {this.state.error?.message || 'Unknown render error'}
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="w-full py-2 px-4 rounded-sm bg-[#1B4B73] hover:bg-[#123A5A] text-white text-xs font-semibold btn-press shadow-xs cursor-pointer"
            >
              Reload Platform Console
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function App() {
  return (
    <ErrorBoundary>
      <PravahStoreProvider>
        <AppContent />
        <SpeedInsights />
        <Analytics />
      </PravahStoreProvider>
    </ErrorBoundary>
  );
}

export default App;
