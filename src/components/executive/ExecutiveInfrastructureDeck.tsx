import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { useTranslation } from '../../data/uiTranslations';
import type { BROBottleneck, DistrictHealth } from '../../types';
import { DistrictDetailModal } from './DistrictDetailModal';
import { EmergencyBriefingModal } from './EmergencyBriefingModal';
import { SupplyForecaster } from './SupplyForecaster';
import {
  Building2,
  TrendingDown,
  Wrench,
  AlertTriangle,
  Clock,
  Car,
  Activity,
  CheckCircle,
  HardHat,
  X,
  FileText,
  ExternalLink,
} from 'lucide-react';

export const ExecutiveInfrastructureDeck: React.FC = () => {
  const { districtsHealth, broBottlenecks, deployBROAsset } = usePravahStore();
  const { t } = useTranslation();
  const [selectedBottleneck, setSelectedBottleneck] = useState<BROBottleneck | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictHealth | null>(null);
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [briefingModalOpen, setBriefingModalOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState('BRO Quick Reaction Earthmover Unit');

  const assetsList = [
    'BRO Quick Reaction Earthmover Unit (Project Vartak)',
    'Heavy Rock Breaker & Excavator Plant (Project Swastik)',
    'Pre-Fab Bailey Bridge 140ft Kit (Project Pushpak)',
    'Gabion Wall & Culvert Reinforcement Team (Project Sewak)',
    'Hydraulic Crane & Mud Pump Vehicle (Project Setuk)',
  ];

  const handleDeploy = () => {
    if (!selectedBottleneck) return;
    deployBROAsset(selectedBottleneck.id, selectedAsset);
    setDeployModalOpen(false);
  };

  const handleDeployFromDistrict = (districtName: string) => {
    const match = broBottlenecks.find((b) => b.chokePointName.toLowerCase().includes(districtName.toLowerCase()));
    if (match) {
      setSelectedBottleneck(match);
      setDeployModalOpen(true);
    } else if (broBottlenecks.length > 0) {
      setSelectedBottleneck(broBottlenecks[0]);
      setDeployModalOpen(true);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* District Detail Modal */}
      <DistrictDetailModal
        district={selectedDistrict}
        onClose={() => setSelectedDistrict(null)}
        onDeployBRO={handleDeployFromDistrict}
      />

      {/* Emergency Briefing Modal */}
      <EmergencyBriefingModal
        isOpen={briefingModalOpen}
        onClose={() => setBriefingModalOpen(false)}
        districtsHealth={districtsHealth}
        broBottlenecks={broBottlenecks}
      />

      {/* Top Header Banner */}
      <div className="bg-surface border border-border p-5 rounded-md shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-primary" />
              <h1 className="text-lg font-semibold text-text-primary">
                {t('executiveDeckTitle')}
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-secondary max-w-3xl">
              High-level decision deck for MDoNER / State Command: District-level accessibility health
              indices across all 8 states, Days-of-Supply (DoS) exhaustion buffers, and Border Roads Organisation (BRO) engineering asset deployment queues.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setBriefingModalOpen(true)}
              className="px-3.5 py-2 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold flex items-center gap-1.5 btn-press shadow-xs cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{t('generateMemo')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Supply Forecaster Component */}
      <SupplyForecaster
        districtsHealth={districtsHealth}
        onSelectDistrict={(id) => {
          const found = districtsHealth.find((d) => d.id === id);
          if (found) setSelectedDistrict(found);
        }}
      />

      {/* Grid: District Accessibility Matrix (Left 6) + BRO Strategic Repair Board (Right 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (6 cols): District Accessibility Health Scores */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center space-x-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>{t('districtHealthIndex')}</span>
            </h2>
            <span className="text-xs text-text-secondary font-mono">{t('clickDistrictInspect')}</span>
          </div>

          <div className="space-y-3">
            {districtsHealth.map((d) => {
              const score = d.accessibilityScore;
              let barColor = 'bg-status-open-solid';
              let badgeStyle = 'bg-status-open-tint text-status-open-text border-status-open-solid';
              if (score < 40) {
                barColor = 'bg-status-blocked-solid';
                badgeStyle = 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid';
              } else if (score < 60) {
                barColor = 'bg-status-highrisk-solid';
                badgeStyle = 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid';
              }

              return (
                <div
                  key={d.id}
                  onClick={() => setSelectedDistrict(d)}
                  className="p-4 rounded-md border border-border bg-surface hover:bg-surface-subtle transition-colors shadow-xs space-y-2.5 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-sm text-text-primary hover:underline">{d.name}</h3>
                        <span className="text-xs text-text-secondary">({d.state})</span>
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm border ${badgeStyle}`}>
                          {d.connectivityCategory}
                        </span>
                      </div>
                      <p className="text-xs text-text-secondary mt-0.5">{d.statusNote}</p>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-lg font-bold text-text-primary">{score}%</span>
                      <div className="text-[10px] text-text-secondary">{t('healthIndex')}</div>
                    </div>
                  </div>

                  {/* Accessibility Score Progress Bar */}
                  <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
                  </div>

                  {/* Days-of-Supply Buffer Gauges */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-[11px] text-text-secondary">
                    <div>
                      <span>{t('minDaysSupply')}</span>{' '}
                      <strong className={`font-bold ${d.minSupplyDays <= 3 ? 'text-status-blocked-text' : 'text-text-primary'}`}>
                        {d.minSupplyDays.toFixed(1)} {t('days')}
                      </strong>
                    </div>
                    <div>
                      <span>{t('openCorridors')}</span>{' '}
                      <strong className="text-text-primary font-bold">
                        {d.openCorridorsCount} / {d.totalCorridorsCount}
                      </strong>
                    </div>
                    <div className="text-right text-primary flex items-center justify-end gap-1 font-medium">
                      <span>{t('viewRunway')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col (6 cols): Strategic BRO Bottlenecks Board */}
        <div className="lg:col-span-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary flex items-center space-x-2">
              <HardHat className="w-4 h-4 text-primary" />
              <span>{t('strategicChokePoints')}</span>
            </h2>
            <span className="text-xs text-text-secondary font-mono">Project Vartak • Swastik • Pushpak • Sewak</span>
          </div>

          <div className="space-y-3">
            {broBottlenecks.map((btnk) => (
              <div
                key={btnk.id}
                className="p-4 rounded-md border border-border bg-surface hover:bg-surface-subtle transition-colors shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-text-secondary">
                        Rank #{btnk.rank || btnk.priorityRank || 1}
                      </span>
                      <h3 className="font-semibold text-sm text-text-primary">
                        {btnk.chokePointName}
                      </h3>
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Highway: <strong className="text-text-primary">{btnk.highway}</strong> ({btnk.state})
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-sm border ${
                      btnk.status === 'TOTAL_BLOCKAGE'
                        ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                        : btnk.status === 'REPAIR_UNDERWAY'
                        ? 'bg-primary-tint text-primary border-primary/30'
                        : 'bg-status-open-tint text-status-open-text border-status-open-solid'
                    }`}
                  >
                    {btnk.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-text-secondary">
                  <div>
                    <span>{t('disruption')}</span>{' '}
                    <strong className="text-text-primary">{btnk.disruptionType}</strong>
                  </div>
                  <div>
                    <span>{t('estimatedClearance')}</span>{' '}
                    <strong className="text-text-primary">{btnk.estimatedClearanceHours} hours</strong>
                  </div>
                </div>

                {btnk.assignedAsset ? (
                  <div className="p-2.5 rounded-sm bg-surface-subtle border border-border flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-status-open-solid" />
                      <span className="text-text-primary">
                        {t('deployed')} <strong>{btnk.assignedAsset}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-status-open-text">{t('clearanceUnderway')}</span>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-status-blocked-text font-medium flex items-center space-x-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{t('noHeavyPlant')}</span>
                    </span>

                    <button
                      onClick={() => {
                        setSelectedBottleneck(btnk);
                        setDeployModalOpen(true);
                      }}
                      className="px-3 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold btn-press shadow-xs flex items-center space-x-1 cursor-pointer"
                    >
                      <Wrench className="w-3 h-3" />
                      <span>{t('deployBroAsset')}</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Deployment Modal */}
      {deployModalOpen && selectedBottleneck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-surface border border-border rounded-md max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center space-x-2">
                <HardHat className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-base text-text-primary">
                  Deploy BRO Engineering Asset
                </h3>
              </div>
              <button
                onClick={() => setDeployModalOpen(false)}
                className="p-1 rounded-sm text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-text-secondary">
                Assign heavy earthmoving, rock-clearing, or pre-fab Bailey bridging kit to{' '}
                <strong className="text-text-primary">{selectedBottleneck.chokePointName}</strong> on{' '}
                <strong className="text-text-primary">{selectedBottleneck.highway}</strong>.
              </p>

              <div>
                <label className="font-medium text-text-secondary block mb-1">
                  Select Engineering Unit / Equipment Fleet:
                </label>
                <select
                  value={selectedAsset}
                  onChange={(e) => setSelectedAsset(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
                >
                  {assetsList.map((asset) => (
                    <option key={asset} value={asset}>
                      {asset}
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-surface-subtle border border-border rounded-sm space-y-1 text-[11px] text-text-secondary">
                <div>
                  <strong>Target Highway:</strong> {selectedBottleneck.highway} ({selectedBottleneck.state})
                </div>
                <div>
                  <strong>Disruption Category:</strong> {selectedBottleneck.disruptionType}
                </div>
                <div>
                  <strong>Expedited ETA:</strong> ~{Math.max(4, Math.round(selectedBottleneck.estimatedClearanceHours / 2))}h post-mobilization
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border flex justify-end space-x-2">
              <button
                onClick={() => setDeployModalOpen(false)}
                className="px-3 py-1.5 rounded-sm border border-border text-text-secondary hover:bg-surface-subtle btn-press cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeploy}
                className="px-4 py-1.5 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold btn-press shadow-xs cursor-pointer"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
