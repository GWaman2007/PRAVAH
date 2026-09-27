import React, { useState, useMemo } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { useTranslation } from '../../data/uiTranslations';
import {
  getAvailableInventory,
  isInventoryItemLow,
  getConnectedCommunitiesForHub,
} from '../../engine/hubLogisticsService';
import type {
  ResponseHub,
  HubInventory,
  HubStatus,
  CommodityCategory,
  VehicleTelemetry,
} from '../../types';
import { HubStockAdjustModal } from './HubStockAdjustModal';
import { HubAddResourceModal } from './HubAddResourceModal';
import { HubEditModal } from './HubEditModal';
import {
  Building2,
  Package,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
  Search,
  SlidersHorizontal,
  Plus,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Fuel,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';

export const HubsResourcesDeck: React.FC = () => {
  const {
    hubs,
    selectedHubId,
    setSelectedHubId,
    inventory,
    transactions,
    vehicles,
    activeMissions,
    communities,
    setActiveView,
    assignVehicleToHub,
    setSelectedMissionId,
    setSelectedVehicleId,
    setPendingMapFocus,
  } = usePravahStore();

  const { t } = useTranslation();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedState, setSelectedState] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'FLEET' | 'AUDIT_LEDGER' | 'COMMUNITIES'>('INVENTORY');

  // Modals state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTargetItem, setAdjustTargetItem] = useState<HubInventory | null>(null);
  const [isAddResourceModalOpen, setIsAddResourceModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedReassignVehicleId, setSelectedReassignVehicleId] = useState<string>('');

  // Filtered Hubs
  const filteredHubs = useMemo(() => {
    return hubs.filter((hub) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        hub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hub.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        hub.state.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (hub.contactPerson && hub.contactPerson.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;
      if (selectedState !== 'ALL' && hub.state !== selectedState) return false;
      if (selectedStatus !== 'ALL' && hub.status !== selectedStatus) return false;

      return true;
    });
  }, [hubs, searchQuery, selectedState, selectedStatus]);

  // Active selected hub
  const activeHub: ResponseHub = useMemo(() => {
    if (selectedHubId) {
      const found = hubs.find((h) => h.id === selectedHubId);
      if (found) return found;
    }
    return filteredHubs[0] || hubs[0];
  }, [selectedHubId, hubs, filteredHubs]);

  // Inventory items for active hub
  const activeHubInventory = useMemo(() => {
    if (!activeHub) return [];
    return inventory.filter((item) => item.hubId === activeHub.id);
  }, [activeHub, inventory]);

  // Vehicles assigned to active hub
  const activeHubVehicles = useMemo(() => {
    if (!activeHub) return [];
    return vehicles.filter((v) => v.hub_id === activeHub.id);
  }, [activeHub, vehicles]);

  // Vehicles available to be reassigned to active hub (vehicles not currently at this hub)
  const otherVehicles = useMemo(() => {
    if (!activeHub) return [];
    return vehicles.filter((v) => v.hub_id !== activeHub.id && v.status === 'AVAILABLE');
  }, [activeHub, vehicles]);

  // Transactions ledger for active hub
  const activeHubTransactions = useMemo(() => {
    if (!activeHub) return [];
    return transactions
      .filter((tx) => tx.hubId === activeHub.id)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [activeHub, transactions]);

  // Connected communities for active hub
  const connectedCommunities = useMemo(() => {
    if (!activeHub) return [];
    return getConnectedCommunitiesForHub(activeHub.id, communities);
  }, [activeHub, communities]);

  // Global KPIs
  const totalHubsCount = hubs.length;
  const operationalHubsCount = hubs.filter((h) => h.status === 'OPERATIONAL').length;
  const limitedHubsCount = hubs.filter((h) => h.status === 'LIMITED').length;
  const totalVehiclesCount = vehicles.length;
  const availableVehiclesCount = vehicles.filter((v) => v.status === 'AVAILABLE').length;

  const lowStockCount = useMemo(() => {
    return inventory.filter((item) => isInventoryItemLow(item)).length;
  }, [inventory]);

  // Actions
  const handleOpenAdjustModal = (item: HubInventory) => {
    setAdjustTargetItem(item);
    setIsAdjustModalOpen(true);
  };

  const handleReassignVehicle = async () => {
    if (!selectedReassignVehicleId || !activeHub) return;
    await assignVehicleToHub(selectedReassignVehicleId, activeHub.id);
    setSelectedReassignVehicleId('');
  };

  const handleOpenOnTacticalGIS = (hub: ResponseHub) => {
    setSelectedHubId(hub.id);
    setPendingMapFocus({
      coords: [hub.coordinates[1], hub.coordinates[0]],
      zoom: 12,
    });
    setActiveView('GIS_COMMAND');
  };

  // Helper for status badge styling
  const getStatusBadge = (status: HubStatus) => {
    switch (status) {
      case 'OPERATIONAL':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40';
      case 'LIMITED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/40';
      case 'CLOSED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/40';
      default:
        return 'bg-slate-500/15 text-slate-300 border-slate-500/40';
    }
  };

  // Helper for commodity category styling
  const getCategoryBadge = (cat: CommodityCategory) => {
    switch (cat) {
      case 'FOOD':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MEDICAL':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'WATER':
        return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'FUEL':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'SHELTER':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-500/10 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Top Banner: Logistics Command & Operational KPIs */}
      <div className="bg-surface border border-border p-4 sm:p-5 rounded-md shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Building2 className="w-5 h-5 text-primary shrink-0" />
              <h1 className="text-base sm:text-lg font-semibold text-text-primary tracking-wide">
                Logistics Command — Hubs & Stockpile Readiness
              </h1>
            </div>
            <p className="mt-1 text-xs text-text-secondary max-w-3xl leading-relaxed">
              Strategic response depots, forward staging posts, deterministic stock ledger with
              live mission reservations, and vehicle fleet base allocations across the North Eastern Region.
            </p>
          </div>

          {/* Operational KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-sm bg-surface-subtle border border-border text-left">
              <span className="text-[10px] text-text-secondary block font-medium uppercase tracking-wider">
                Strategic Hubs
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-text-primary font-mono">{totalHubsCount}</span>
                <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                  ({operationalHubsCount} Ops)
                </span>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-sm bg-surface-subtle border border-border text-left">
              <span className="text-[10px] text-text-secondary block font-medium uppercase tracking-wider">
                Fleet Ready
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-base font-bold text-emerald-400 font-mono">
                  {availableVehiclesCount}
                </span>
                <span className="text-[10px] text-text-secondary font-mono">/ {totalVehiclesCount} Total</span>
              </div>
            </div>

            <div
              className={`px-3 py-1.5 rounded-sm border text-left ${
                lowStockCount > 0
                  ? 'bg-amber-500/10 border-amber-500/30'
                  : 'bg-surface-subtle border-border'
              }`}
            >
              <span className="text-[10px] text-text-secondary block font-medium uppercase tracking-wider">
                Low Stock Alerts
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span
                  className={`text-base font-bold font-mono ${
                    lowStockCount > 0 ? 'text-amber-400' : 'text-text-primary'
                  }`}
                >
                  {lowStockCount}
                </span>
                <span className="text-[10px] text-text-secondary">Triggers</span>
              </div>
            </div>

            <div className="px-3 py-1.5 rounded-sm bg-surface-subtle border border-border text-left">
              <span className="text-[10px] text-text-secondary block font-medium uppercase tracking-wider">
                Ledger Status
              </span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-text-primary font-mono">Real-Time Sync</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-surface border border-border p-3 rounded-md shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search depot by name, code, state..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface-subtle border border-border rounded-sm pl-8 pr-3 py-1.5 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* State Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-secondary uppercase font-semibold">State:</span>
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-surface-subtle border border-border rounded-sm px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="ALL">All States (NER)</option>
              <option value="Assam">Assam</option>
              <option value="Nagaland">Nagaland</option>
              <option value="Sikkim">Sikkim</option>
              <option value="Meghalaya">Meghalaya</option>
              <option value="Manipur">Manipur</option>
              <option value="Mizoram">Mizoram</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-text-secondary uppercase font-semibold">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-surface-subtle border border-border rounded-sm px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="LIMITED">Limited</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Left Roster + Right Detail Hub Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* ========================================================================= */}
        {/* LEFT PANE: HUB ROSTER (4 cols on lg)                                      */}
        {/* ========================================================================= */}
        <div className="lg:col-span-4 space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
              Strategic Depots ({filteredHubs.length})
            </h2>
            <span className="text-[11px] text-text-secondary">Select to inspect</span>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {filteredHubs.map((hub) => {
              const isSelected = activeHub?.id === hub.id;
              const hubInv = inventory.filter((i) => i.hubId === hub.id);
              const hubVeh = vehicles.filter((v) => v.hub_id === hub.id);
              const readyVeh = hubVeh.filter((v) => v.status === 'AVAILABLE').length;
              const hasLowStock = hubInv.some((i) => isInventoryItemLow(i));

              return (
                <div
                  key={hub.id}
                  onClick={() => setSelectedHubId(hub.id)}
                  className={`p-3 rounded-md border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-surface border-primary ring-1 ring-primary/40 shadow-md'
                      : 'bg-surface border-border hover:border-slate-600 hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-text-primary">{hub.name}</span>
                        <span className="font-mono text-[10px] text-text-secondary font-semibold">
                          ({hub.code})
                        </span>
                      </div>
                      <div className="text-[11px] text-text-secondary mt-0.5">
                        {hub.state} • {hub.type.replace('_', ' ')}
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider shrink-0 border ${getStatusBadge(
                        hub.status
                      )}`}
                    >
                      {hub.status}
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      <span>
                        <strong className="text-text-primary font-mono">{readyVeh}</strong>/{hubVeh.length} Fleet
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-text-secondary">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      <span>
                        <strong className="text-text-primary font-mono">{hubInv.length}</strong> Stocked
                      </span>
                      {hasLowStock && (
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Low stock warning" />
                      )}
                    </div>

                    <div className="text-[10px] text-text-secondary font-mono">
                      {hub.elevationMeters}m MSL
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredHubs.length === 0 && (
              <div className="p-8 text-center bg-surface border border-border rounded-md text-text-secondary text-xs">
                No logistics hubs match current filter criteria.
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: SELECTED HUB DETAILS & MULTI-TAB COMMAND PANEL (8 cols on lg) */}
        {/* ========================================================================= */}
        <div className="lg:col-span-8 space-y-4">
          {activeHub ? (
            <>
              {/* Hub Profile Banner */}
              <div className="bg-surface border border-border rounded-md p-4 sm:p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-text-primary">{activeHub.name}</h2>
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-subtle border border-border text-text-primary font-bold">
                        {activeHub.code}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                          activeHub.status
                        )}`}
                      >
                        {activeHub.status}
                      </span>
                    </div>

                    <div className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>
                        State: <strong className="text-text-primary">{activeHub.state}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Type: <strong className="text-text-primary">{activeHub.type.replace('_', ' ')}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Coordinates:{' '}
                        <strong className="text-text-primary font-mono">
                          {activeHub.coordinates[0].toFixed(3)}°N, {activeHub.coordinates[1].toFixed(3)}°E
                        </strong>
                      </span>
                      <span>•</span>
                      <span>
                        Elevation: <strong className="text-text-primary font-mono">{activeHub.elevationMeters}m</strong>
                      </span>
                    </div>

                    {/* Operational Notes / Advisory */}
                    {activeHub.notes && (
                      <div className="mt-2.5 p-2 rounded bg-surface-subtle/80 border border-border/70 text-xs text-text-secondary leading-snug">
                        <span className="font-semibold text-text-primary mr-1">Logistics Advisory:</span>
                        {activeHub.notes}
                      </div>
                    )}
                  </div>

                  {/* Top Hub Buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setIsEditModalOpen(true)}
                      className="px-3 py-1.5 rounded-sm bg-surface-subtle hover:bg-surface border border-border text-xs text-text-primary font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary" />
                      <span>Edit Hub</span>
                    </button>

                    <button
                      onClick={() => handleOpenOnTacticalGIS(activeHub)}
                      className="px-3 py-1.5 rounded-sm bg-primary/20 hover:bg-primary/30 border border-primary/40 text-xs text-primary font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MapPin className="w-3.5 h-3.5" />
                      <span>Tactical GIS</span>
                    </button>
                  </div>
                </div>

                {/* Storage & Fleet Capabilities Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                  <div className="bg-surface-subtle p-2.5 rounded border border-border/60">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                      Base Officer
                    </span>
                    <span className="text-xs font-bold text-text-primary block truncate">
                      {activeHub.contactPerson || 'Logistics Incharge'}
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono truncate block">
                      {activeHub.contactPhone || '+91-361-XXXXXXX'}
                    </span>
                  </div>

                  <div className="bg-surface-subtle p-2.5 rounded border border-border/60">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                      Payload Capacity
                    </span>
                    <span className="text-sm font-bold text-text-primary font-mono">
                      {(((activeHub.totalCapacityKg || activeHub.storageCapacityKg || 50000)) / 1000).toFixed(0)} MT
                    </span>
                    <span className="text-[10px] text-text-secondary block">
                      {activeHub.totalStorageM3 || 1200} m³ Covered
                    </span>
                  </div>

                  <div className="bg-surface-subtle p-2.5 rounded border border-border/60">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                      Fuel Reserves
                    </span>
                    <span className="text-sm font-bold text-amber-400 font-mono">
                      {(activeHub.fuelReserveLitres || activeHub.fuelStorageCapacityLitres || 15000).toLocaleString()} L
                    </span>
                    <span className="text-[10px] text-text-secondary block">High Cetane Diesel</span>
                  </div>

                  <div className="bg-surface-subtle p-2.5 rounded border border-border/60">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider block font-medium">
                      Operating Window
                    </span>
                    <span className="text-xs font-bold text-text-primary block truncate">
                      {activeHub.operatingHours || '24/7 Active'}
                    </span>
                    <span className="text-[10px] text-emerald-400 block font-semibold">
                      Dispatch Runway Ready
                    </span>
                  </div>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div className="flex border-b border-border bg-surface rounded-t-md px-3 pt-2 gap-2">
                {[
                  {
                    id: 'INVENTORY',
                    label: 'Stockpile & Reserves',
                    icon: Package,
                    count: activeHubInventory.length,
                  },
                  {
                    id: 'FLEET',
                    label: 'Assigned Fleet',
                    icon: Truck,
                    count: activeHubVehicles.length,
                  },
                  {
                    id: 'AUDIT_LEDGER',
                    label: 'Transaction Ledger',
                    icon: Layers,
                    count: activeHubTransactions.length,
                  },
                  {
                    id: 'COMMUNITIES',
                    label: 'Connected Hill Sectors',
                    icon: Building2,
                    count: connectedCommunities.length,
                  },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex items-center gap-2 py-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                        isActive
                          ? 'border-primary text-primary bg-primary/5'
                          : 'border-transparent text-text-secondary hover:text-text-primary hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface-subtle border border-border text-text-secondary">
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Area */}
              <div className="bg-surface border-x border-b border-border rounded-b-md p-4 sm:p-5 shadow-xs">
                {/* ================================================================= */}
                {/* TAB 1: INVENTORY STOCKPILE                                        */}
                {/* ================================================================= */}
                {activeTab === 'INVENTORY' && (
                  <div className="space-y-4">
                    {/* Demo / Simulated Inventory Banner */}
                    <div className="p-3 rounded bg-primary/10 border border-primary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <Info className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-xs text-text-primary font-medium">
                          <strong>SIMULATED STOCKPILE ACTIVE:</strong> Live reservations deduct from available balance
                          in real-time during mission dispatch.
                        </span>
                      </div>
                      <button
                        onClick={() => setIsAddResourceModalOpen(true)}
                        className="px-3 py-1.5 rounded-sm bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs shrink-0 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register Commodity</span>
                      </button>
                    </div>

                    {/* Inventory Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-border">
                        <thead className="bg-surface-subtle text-text-secondary uppercase text-[10px] tracking-wider border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3">Commodity &amp; Category</th>
                            <th className="py-2.5 px-3 text-right">Total Stock</th>
                            <th className="py-2.5 px-3 text-right text-amber-400">Reserved (Missions)</th>
                            <th className="py-2.5 px-3 text-right text-emerald-400">Available to Dispatch</th>
                            <th className="py-2.5 px-3 text-right">Threshold</th>
                            <th className="py-2.5 px-3 text-center">Stock Health</th>
                            <th className="py-2.5 px-3 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activeHubInventory.map((item) => {
                            const avail = getAvailableInventory(item);
                            const isLow = isInventoryItemLow(item);
                            const thresh = item.lowStockThreshold ?? item.minimumStock ?? 0;
                            const isCritical = avail < thresh * 0.4;

                            return (
                              <tr key={item.id} className="hover:bg-surface-subtle/50 transition-colors">
                                <td className="py-3 px-3">
                                  <div className="font-semibold text-text-primary text-xs">
                                    {item.commodityName || item.resourceName}
                                  </div>
                                  <span
                                    className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-bold uppercase tracking-wider border ${getCategoryBadge(
                                      (item.category || item.resourceType) as CommodityCategory
                                    )}`}
                                  >
                                    {item.category || item.resourceType}
                                  </span>
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-semibold text-text-primary">
                                  {item.quantity.toLocaleString()} {item.unit}
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-semibold text-amber-400">
                                  {item.reservedQuantity.toLocaleString()} {item.unit}
                                </td>

                                <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                                  {avail.toLocaleString()} {item.unit}
                                </td>

                                <td className="py-3 px-3 text-right font-mono text-text-secondary">
                                  {thresh.toLocaleString()} {item.unit}
                                </td>

                                <td className="py-3 px-3 text-center">
                                  {isCritical ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40">
                                      CRITICAL
                                    </span>
                                  ) : isLow ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/40">
                                      LOW STOCK
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      HEALTHY
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-center">
                                  <button
                                    onClick={() => handleOpenAdjustModal(item)}
                                    className="px-2.5 py-1 rounded bg-surface-subtle hover:bg-surface border border-border text-[11px] font-semibold text-text-primary hover:text-primary transition-colors cursor-pointer"
                                  >
                                    Adjust Stock
                                  </button>
                                </td>
                              </tr>
                            );
                          })}

                          {activeHubInventory.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-text-secondary">
                                No commodities registered in this depot stockpile. Click "Register Commodity" to add.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* TAB 2: ASSIGNED FLEET & TELEMETRY                                */}
                {/* ================================================================= */}
                {activeTab === 'FLEET' && (
                  <div className="space-y-4">
                    {/* Fleet Reassignment Toolbar */}
                    <div className="p-3 rounded bg-surface-subtle border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-text-secondary">
                        Vehicles home-based at <strong className="text-text-primary">{activeHub.name}</strong>.{' '}
                        Telemetry reflects live GPS coordinates and mission assignments.
                      </div>

                      {otherVehicles.length > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={selectedReassignVehicleId}
                            onChange={(e) => setSelectedReassignVehicleId(e.target.value)}
                            className="bg-surface border border-border rounded-sm px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-primary"
                          >
                            <option value="">Reassign vehicle to this depot...</option>
                            {otherVehicles.map((v) => (
                              <option key={v.vehicle_id} value={v.vehicle_id}>
                                {v.vehicle_name} ({v.vehicle_id})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleReassignVehicle}
                            disabled={!selectedReassignVehicleId}
                            className="px-3 py-1 rounded-sm bg-primary hover:bg-primary-hover disabled:opacity-50 text-white text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Transfer Base
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Fleet Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {activeHubVehicles.map((veh) => {
                        const isAvailable = veh.status === 'AVAILABLE';
                        const inTransit = veh.status === 'IN_TRANSIT' || veh.status === 'ON_ROUTE';
                        const halted = veh.status === 'HALTED' || veh.status === 'CRITICAL_STATIONARY';

                        return (
                          <div
                            key={veh.vehicle_id}
                            className="p-3.5 rounded-md border border-border bg-surface-subtle/60 space-y-2.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm text-text-primary flex items-center gap-1.5">
                                  <span>{veh.vehicle_name}</span>
                                  <span className="font-mono text-[10px] text-text-secondary">
                                    ({veh.vehicle_id})
                                  </span>
                                </div>
                                <div className="text-[11px] text-primary font-medium">
                                  {veh.vehicle_type || veh.cargo_type}
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                  isAvailable
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                                    : inTransit
                                    ? 'bg-sky-500/15 text-sky-400 border-sky-500/40 animate-pulse'
                                    : halted
                                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                                }`}
                              >
                                {veh.status.replace('_', ' ')}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 text-xs pt-1 border-t border-border/70">
                              <div>
                                <span className="text-[10px] text-text-secondary block">Capacity</span>
                                <span className="font-mono font-semibold text-text-primary">
                                  {veh.capacity_kg ? `${veh.capacity_kg.toLocaleString()} kg` : '3,500 kg'}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-secondary block">Fuel Level</span>
                                <span className="font-mono font-semibold text-amber-400">
                                  {veh.fuel_level_litres
                                    ? `${veh.fuel_level_litres} L`
                                    : `${Math.round(veh.fuel_level_pct || veh.fuel_level || 80)}%`}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-secondary block">Driver / Crew</span>
                                <span className="font-semibold text-text-primary truncate block">
                                  {veh.driver_name}
                                </span>
                              </div>
                            </div>

                            {/* Active Mission Link */}
                            {veh.mission_id && (
                              <div className="p-2 rounded bg-surface border border-border/80 flex items-center justify-between text-xs">
                                <span className="text-text-secondary">
                                  Assigned Mission: <strong className="text-primary font-mono">{veh.mission_id}</strong>
                                </span>
                                <button
                                  onClick={() => {
                                    setSelectedMissionId(veh.mission_id!);
                                    setSelectedVehicleId(veh.vehicle_id);
                                    setActiveView('MISSIONS');
                                  }}
                                  className="text-[11px] text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                                >
                                  <span>Inspect Mission</span>
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {activeHubVehicles.length === 0 && (
                        <div className="col-span-2 p-8 text-center bg-surface-subtle border border-border rounded-md text-text-secondary text-xs">
                          No vehicles currently based at this hub. Use the dropdown above to transfer a vehicle.
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* TAB 3: TRANSACTION AUDIT LEDGER                                   */}
                {/* ================================================================= */}
                {activeTab === 'AUDIT_LEDGER' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>
                        Immutable audit entries recorded for <strong className="text-text-primary">{activeHub.name}</strong>.
                      </span>
                      <span className="font-mono text-[11px]">{activeHubTransactions.length} entries recorded</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border border-border">
                        <thead className="bg-surface-subtle text-text-secondary uppercase text-[10px] tracking-wider border-b border-border">
                          <tr>
                            <th className="py-2 px-3">Timestamp</th>
                            <th className="py-2 px-3">Type</th>
                            <th className="py-2 px-3">Commodity</th>
                            <th className="py-2 px-3 text-right">Delta</th>
                            <th className="py-2 px-3 text-right">Prior Avail</th>
                            <th className="py-2 px-3 text-right text-emerald-400">Result Avail</th>
                            <th className="py-2 px-3">Reference / Mission Note</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {activeHubTransactions.map((tx) => {
                            const delta = tx.quantityDelta ?? tx.quantity ?? 0;
                            const isPositive = delta > 0;
                            const prevAvail = tx.previousAvailable ?? (tx.previousQuantity - tx.previousReserved);
                            const resAvail = tx.resultingAvailable ?? (tx.newQuantity - tx.newReserved);
                            const comm = tx.commodityName || 'Consignment Resource';
                            const ref = tx.referenceNote || tx.note || (tx.missionId ? `Mission: ${tx.missionId}` : '—');

                            return (
                              <tr key={tx.id} className="hover:bg-surface-subtle/50 transition-colors">
                                <td className="py-2.5 px-3 font-mono text-[11px] text-text-secondary whitespace-nowrap">
                                  {new Date(tx.timestamp).toLocaleString('en-IN', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit',
                                  })}
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider border ${
                                      tx.type === 'ADD'
                                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                                        : tx.type === 'RESERVE'
                                        ? 'bg-amber-500/15 text-amber-400 border-amber-500/40'
                                        : tx.type === 'RELEASE'
                                        ? 'bg-sky-500/15 text-sky-400 border-sky-500/40'
                                        : tx.type === 'DISPATCH'
                                        ? 'bg-purple-500/15 text-purple-400 border-purple-500/40'
                                        : 'bg-slate-500/15 text-slate-300 border-slate-500/40'
                                    }`}
                                  >
                                    {tx.type}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 font-semibold text-text-primary">
                                  {comm}
                                </td>

                                <td
                                  className={`py-2.5 px-3 text-right font-mono font-bold ${
                                    isPositive ? 'text-emerald-400' : 'text-rose-400'
                                  }`}
                                >
                                  {isPositive ? `+${delta}` : delta}
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono text-text-secondary">
                                  {prevAvail}
                                </td>

                                <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                                  {resAvail}
                                </td>

                                <td className="py-2.5 px-3 text-text-secondary max-w-xs truncate">
                                  {ref}
                                </td>
                              </tr>
                            );
                          })}

                          {activeHubTransactions.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-text-secondary">
                                No stock transactions recorded for this hub yet.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ================================================================= */}
                {/* TAB 4: CONNECTED HILL SECTORS                                     */}
                {/* ================================================================= */}
                {activeTab === 'COMMUNITIES' && (
                  <div className="space-y-4">
                    <div className="text-xs text-text-secondary">
                      Hill communities and disaster sectors within operational staging range of{' '}
                      <strong className="text-text-primary">{activeHub.name}</strong>.
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {connectedCommunities.map((comm) => {
                        const tier = comm.metrics?.priorityTier || 'P3';
                        const cutoff = comm.cutoffTimeHours || 4;

                        return (
                          <div
                            key={comm.id}
                            className="p-3.5 rounded-md border border-border bg-surface-subtle/50 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="font-bold text-sm text-text-primary">{comm.name}</div>
                                <div className="text-[11px] text-text-secondary">
                                  {comm.district}, {comm.state} • Population:{' '}
                                  {comm.population.toLocaleString()}
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                                  tier === 'P1'
                                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/50'
                                    : tier === 'P2'
                                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/50'
                                    : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                {tier} PRIORITY
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/70">
                              <div>
                                <span className="text-[10px] text-text-secondary block">Isolation Runway</span>
                                <span
                                  className={`font-mono font-bold ${
                                    cutoff <= 4 ? 'text-rose-400' : 'text-text-primary'
                                  }`}
                                >
                                  {cutoff}h until cutoff
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] text-text-secondary block">Transit Time</span>
                                <span className="font-mono font-semibold text-text-primary">
                                  ~{comm.transitTimeHours || 2.5}h via {comm.primaryCorridor}
                                </span>
                              </div>
                            </div>

                            <div className="pt-1 flex items-center justify-end">
                              <button
                                onClick={() => {
                                  setSelectedHubId(activeHub.id);
                                  setActiveView('MISSIONS');
                                }}
                                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <span>Dispatch from {activeHub.name}</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {connectedCommunities.length === 0 && (
                        <div className="col-span-2 p-8 text-center bg-surface-subtle border border-border rounded-md text-text-secondary text-xs">
                          No direct mapped communities found for this corridor centroid.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center bg-surface border border-border rounded-md text-text-secondary">
              Select a logistics hub from the roster on the left to inspect stock, fleet, and transactions.
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <HubStockAdjustModal
        isOpen={isAdjustModalOpen}
        onClose={() => {
          setIsAdjustModalOpen(false);
          setAdjustTargetItem(null);
        }}
        hubId={activeHub?.id || ''}
        item={adjustTargetItem}
      />

      <HubAddResourceModal
        isOpen={isAddResourceModalOpen}
        onClose={() => setIsAddResourceModalOpen(false)}
        hubId={activeHub?.id || ''}
        hubName={activeHub?.name || ''}
      />

      <HubEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        hub={activeHub}
      />
    </div>
  );
};
