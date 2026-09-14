import { useState, useMemo, useCallback } from 'react';
import { INITIAL_COMMUNITIES } from './data/mockCommunities';
import { calculateCompositePriority, COMMODITY_CONFIG } from './engine/math';
import type { CommunityBase, EnrichedCommunity, PriorityTier } from './types';
import { Header } from './components/Header';
import { TopMetricDeck } from './components/TopMetricDeck';
import { CommunityQueue } from './components/CommunityQueue';
import { CommunityDeepDive } from './components/CommunityDeepDive';
import { ExplainabilityPanel } from './components/ExplainabilityPanel';
import { RestockToast } from './components/RestockToast';

export function App() {
  const [communities, setCommunities] = useState<CommunityBase[]>(INITIAL_COMMUNITIES);
  const [selectedId, setSelectedId] = useState<string>('MZ-KOL-004');
  const [filterTier, setFilterTier] = useState<'ALL' | PriorityTier>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [toast, setToast] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Audio synthesize function for alerts and success chimes
  const playSound = useCallback((type: 'success' | 'alert') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'success') {
        // High pleasant major chord chime
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.2); // D6
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else {
        // Warning dual buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio context might be restricted before user interaction
    }
  }, [soundEnabled]);

  // Reactive engine evaluation for all communities
  const enrichedCommunities: EnrichedCommunity[] = useMemo(() => {
    const list = communities.map((comm) => {
      const result = calculateCompositePriority(comm);
      return {
        ...comm,
        ...result,
      };
    });

    // Ranked by Final Score descending
    return list.sort((a, b) => b.finalScore - a.finalScore);
  }, [communities]);

  // Currently selected community object
  const selectedCommunity = useMemo(() => {
    const found = enrichedCommunities.find((c) => c.id === selectedId);
    return found || enrichedCommunities[0];
  }, [enrichedCommunities, selectedId]);

  // Update selected community attributes
  const handleUpdateCommunity = useCallback(
    (updated: Partial<EnrichedCommunity>) => {
      setCommunities((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, ...updated } : c))
      );
    },
    [selectedId]
  );

  // Closed-loop simulation: Field delivery restock completed
  const handleSimulateRestock = useCallback(() => {
    if (!selectedCommunity) return;

    setCommunities((prev) =>
      prev.map((c) => {
        if (c.id === selectedId) {
          return {
            ...c,
            elapsedTimeHours: 0, // Reset elapsed clock to 0
            cutoffTimeHours: Math.max(18.0, c.cutoffTimeHours), // Emergency relief road stabilized
            disruptionProbMax: Math.min(0.25, c.disruptionProbMax), // Landslide debris cleared
            hasActiveIndent: false, // Indent fulfilled
            inventories: {
              IV_FLUIDS: {
                lastStock: COMMODITY_CONFIG.IV_FLUIDS.standardCapacity,
                baselineDailyBurn: c.inventories.IV_FLUIDS.baselineDailyBurn,
              },
              ANTIVENOM: {
                lastStock: COMMODITY_CONFIG.ANTIVENOM.standardCapacity,
                baselineDailyBurn: c.inventories.ANTIVENOM.baselineDailyBurn,
              },
              GRAIN_RICE: {
                lastStock: COMMODITY_CONFIG.GRAIN_RICE.standardCapacity,
                baselineDailyBurn: c.inventories.GRAIN_RICE.baselineDailyBurn,
              },
              DIESEL: {
                lastStock: COMMODITY_CONFIG.DIESEL.standardCapacity,
                baselineDailyBurn: c.inventories.DIESEL.baselineDailyBurn,
              },
            },
          };
        }
        return c;
      })
    );

    playSound('success');

    setToast({
      visible: true,
      title: 'Restock Mission Completed!',
      message: `Ground convoy has successfully reached ${selectedCommunity.name} (${selectedCommunity.id}). All 4 critical commodities replenished to full standard capacity. Priority score dropped to P4 NOMINAL.`,
      type: 'success',
    });
  }, [selectedCommunity, selectedId, playSound]);

  // Scenario presets
  const handleApplyScenario = useCallback((scenario: 'monsoon' | 'flood' | 'restocked') => {
    if (scenario === 'monsoon') {
      setCommunities((prev) =>
        prev.map((c) => ({
          ...c,
          isMonsoonAlertActive: true,
          disruptionProbMax: Math.min(0.95, c.disruptionProbMax + 0.25),
        }))
      );
      setToast({
        visible: true,
        title: 'Monsoon Medical Surge Triggered',
        message: 'Active monsoon alert enabled across grid: 1.4x burn surge applied to IV Fluids & Antivenom. Landslide disruption probabilities heightened.',
        type: 'warning',
      });
      playSound('alert');
    } else if (scenario === 'flood') {
      setCommunities((prev) =>
        prev.map((c) => ({
          ...c,
          cutoffTimeHours: Math.max(1.5, c.cutoffTimeHours * 0.5),
          disruptionProbMax: Math.min(0.98, c.disruptionProbMax + 0.3),
        }))
      );
      setToast({
        visible: true,
        title: 'Imminent Flash Flood Landslides',
        message: 'Road cutoff timelines compressed by 50%. Preemptive dispatch windows have narrowed dramatically across all monitored corridors.',
        type: 'warning',
      });
      playSound('alert');
    } else if (scenario === 'restocked') {
      setCommunities((prev) =>
        prev.map((c) => ({
          ...c,
          elapsedTimeHours: 0,
          cutoffTimeHours: 24.0,
          disruptionProbMax: 0.2,
          hasActiveIndent: false,
          isMonsoonAlertActive: false,
          inventories: {
            IV_FLUIDS: {
              lastStock: COMMODITY_CONFIG.IV_FLUIDS.standardCapacity,
              baselineDailyBurn: c.inventories.IV_FLUIDS.baselineDailyBurn,
            },
            ANTIVENOM: {
              lastStock: COMMODITY_CONFIG.ANTIVENOM.standardCapacity,
              baselineDailyBurn: c.inventories.ANTIVENOM.baselineDailyBurn,
            },
            GRAIN_RICE: {
              lastStock: COMMODITY_CONFIG.GRAIN_RICE.standardCapacity,
              baselineDailyBurn: c.inventories.GRAIN_RICE.baselineDailyBurn,
            },
            DIESEL: {
              lastStock: COMMODITY_CONFIG.DIESEL.standardCapacity,
              baselineDailyBurn: c.inventories.DIESEL.baselineDailyBurn,
            },
          },
        }))
      );
      setToast({
        visible: true,
        title: 'Grid-Wide Restock Achieved',
        message: 'All 6 communities fully provisioned with >72h safety buffers. All nodes now in P4 NOMINAL state.',
        type: 'success',
      });
      playSound('success');
    }
  }, [playSound]);

  // Reset baseline
  const handleResetAll = useCallback(() => {
    setCommunities(INITIAL_COMMUNITIES);
    setSelectedId('MZ-KOL-004');
    setFilterTier('ALL');
    setSearchQuery('');
    setToast({
      visible: true,
      title: 'Baseline Operational State Restored',
      message: 'Initial mathematical baseline parameters for all 6 North-East nodes reloaded.',
      type: 'info',
    });
  }, []);

  const p1Count = enrichedCommunities.filter((c) => c.priorityTier === 'P1').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        onApplyScenario={handleApplyScenario}
        onResetAll={handleResetAll}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((prev) => !prev)}
        p1Count={p1Count}
      />

      {/* Top Metric Deck */}
      <TopMetricDeck communities={enrichedCommunities} />

      {/* Main Operational Intelligence Dashboard Grid */}
      <main className="flex-1 px-4 lg:px-6 pb-6 grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Panel: Ranked Community Priority Queue (Col 1 to 4 on large screens) */}
        <section className="lg:col-span-3 h-[calc(100vh-210px)] min-h-[600px]">
          <CommunityQueue
            communities={enrichedCommunities}
            selectedId={selectedCommunity.id}
            onSelectCommunity={(id) => setSelectedId(id)}
            filterTier={filterTier}
            onFilterTierChange={setFilterTier}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </section>

        {/* Center Panel: Community Deep-Dive & Depletion Gauges (Col 5 to 8 on large screens) */}
        <section className="lg:col-span-5 h-[calc(100vh-210px)] min-h-[600px]">
          <CommunityDeepDive community={selectedCommunity} />
        </section>

        {/* Right Panel: AI Explainability Audit & Interactive Controls (Col 9 to 12) */}
        <section className="lg:col-span-4 h-[calc(100vh-210px)] min-h-[600px]">
          <ExplainabilityPanel
            community={selectedCommunity}
            onUpdateCommunity={handleUpdateCommunity}
            onSimulateRestock={handleSimulateRestock}
          />
        </section>
      </main>

      {/* Celebratory Feedback Toast */}
      <RestockToast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}

export default App;
