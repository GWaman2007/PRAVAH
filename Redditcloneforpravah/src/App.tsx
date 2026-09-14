import { useState } from 'react';
import { useIncidentStore } from './store/useIncidentStore';
import { Navbar } from './components/Navbar';
import { CorridorFilterBar } from './components/CorridorFilterBar';
import { IncidentFeed } from './components/IncidentFeed';
import { IncidentMap } from './components/IncidentMap';
import { CreateReportModal } from './components/CreateReportModal';
import { OfflineQueueDrawer } from './components/OfflineQueueDrawer';
import { SyncNotificationToast } from './components/SyncNotificationToast';
import { LightboxModal } from './components/LightboxModal';
import { Plus } from 'lucide-react';
import type { Incident } from './types/incident';

export function App() {
  const {
    incidents,
    filteredIncidents,
    offlineQueue,
    isSimulatedOffline,
    isEffectiveOnline,
    activeFilter,
    sortBy,
    searchQuery,
    selectedIncidentId,
    isCreateModalOpen,
    isQueueDrawerOpen,
    lightboxImage,
    isPickingLocation,
    pickedCoordinates,
    syncNotifications,
    setActiveFilter,
    setSortBy,
    setSearchQuery,
    setSelectedIncidentId,
    setIsCreateModalOpen,
    setIsQueueDrawerOpen,
    setLightboxImage,
    setIsPickingLocation,
    setPickedCoordinates,
    toggleSimulatedOffline,
    handleVote,
    createIncident,
    addGroundUpdate,
    flushQueue,
    resetToSeedData,
    dismissNotification,
  } = useIncidentStore();

  // Mobile layout tab toggle: 'feed' or 'map'
  const [currentMobileTab, setCurrentMobileTab] = useState<'feed' | 'map'>('feed');

  // Locate on map handler
  const handleLocateOnMap = (incident: Incident) => {
    setSelectedIncidentId(incident.id);
    // On mobile, automatically switch to map view
    if (window.innerWidth < 1024) {
      setCurrentMobileTab('map');
    }
  };

  // Start map picking mode
  const handleStartMapPick = () => {
    setIsPickingLocation(true);
    if (window.innerWidth < 1024) {
      setCurrentMobileTab('map');
    }
  };

  // Coordinates picked on map
  const handleCoordinatesPicked = (coords: { lat: number; lng: number }) => {
    setPickedCoordinates(coords);
    setIsPickingLocation(false);
    setIsCreateModalOpen(true);
  };

  // Critical blockages count
  const criticalCount = incidents.filter((i) => i.severity === 'Total Blockage').length;

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-text">
      
      {/* Top Navbar */}
      <Navbar
        isEffectiveOnline={isEffectiveOnline}
        isSimulatedOffline={isSimulatedOffline}
        toggleSimulatedOffline={toggleSimulatedOffline}
        pendingCount={offlineQueue.length}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        onOpenCreateModal={() => setIsCreateModalOpen(true)}
        onOpenQueueDrawer={() => setIsQueueDrawerOpen(true)}
        onResetData={resetToSeedData}
        currentMobileTab={currentMobileTab}
        setCurrentMobileTab={setCurrentMobileTab}
      />

      {/* Main Dual-View Body */}
      <main className="flex-1 flex overflow-hidden relative">
        
        {/* Left / Top Panel: Subreddit Incident Feed */}
        <section
          className={`flex flex-col border-r border-slate-800/80 bg-slate-950 w-full lg:w-[500px] xl:w-[540px] 2xl:w-[580px] shrink-0 h-full overflow-hidden ${
            currentMobileTab === 'feed' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Subreddit Header / Filter & Sort Bar */}
          <CorridorFilterBar
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            totalCount={filteredIncidents.length}
            criticalCount={criticalCount}
          />

          {/* Incident Feed List */}
          <IncidentFeed
            incidents={filteredIncidents}
            onVote={handleVote}
            onLocateOnMap={handleLocateOnMap}
            onAddUpdate={addGroundUpdate}
            onOpenLightbox={(url) => setLightboxImage(url)}
            selectedIncidentId={selectedIncidentId}
            onOpenCreateModal={() => setIsCreateModalOpen(true)}
            onResetFilters={() => {
              setActiveFilter('All');
              setSearchQuery('');
            }}
          />
        </section>

        {/* Right / Bottom Panel: Interactive Leaflet Map */}
        <section
          className={`flex-1 h-full relative overflow-hidden ${
            currentMobileTab === 'map' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <IncidentMap
            incidents={incidents}
            selectedIncidentId={selectedIncidentId}
            onSelectIncident={(id) => setSelectedIncidentId(id)}
            onVote={handleVote}
            isPickingLocation={isPickingLocation}
            onCoordinatesPicked={handleCoordinatesPicked}
            pickedCoordinates={pickedCoordinates}
          />
        </section>

      </main>

      {/* Floating Action Button (FAB) for "+ Report Disruption" on mobile */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        aria-label="Report Disruption"
        className="lg:hidden fixed bottom-6 right-5 z-40 p-4 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 text-white shadow-2xl shadow-orange-600/50 border border-orange-400/40 flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus className="w-6 h-6 stroke-[3]" />
      </button>

      {/* Create Ground Report Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={createIncident}
        isEffectiveOnline={isEffectiveOnline}
        onStartMapPick={handleStartMapPick}
        pickedCoordinates={pickedCoordinates}
      />

      {/* Offline Queue Inspector Drawer */}
      <OfflineQueueDrawer
        isOpen={isQueueDrawerOpen}
        onClose={() => setIsQueueDrawerOpen(false)}
        queue={offlineQueue}
        pendingIncidents={incidents.filter((i) => i.sync_status === 'PENDING')}
        isEffectiveOnline={isEffectiveOnline}
        isSimulatedOffline={isSimulatedOffline}
        onToggleSimulatedOffline={toggleSimulatedOffline}
        onFlushQueue={flushQueue}
      />

      {/* Photo Lightbox Modal */}
      <LightboxModal
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* Auto-Flush Diagnostic Reconnect Notifications */}
      <SyncNotificationToast
        notifications={syncNotifications}
        onDismiss={dismissNotification}
      />

    </div>
  );
}

export default App;
