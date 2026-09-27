import React, { useState, useEffect } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type { CommodityCategory } from '../../types';
import { X, Plus, AlertCircle, CheckCircle2, PackagePlus } from 'lucide-react';

interface HubAddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  hubId: string;
  hubName: string;
}

interface CommodityTemplate {
  name: string;
  category: CommodityCategory;
  unit: string;
  defaultThreshold: number;
}

const PRESET_TEMPLATES: Record<string, CommodityTemplate> = {
  RICE_GRAIN: {
    name: 'Rice & Fortified Grains',
    category: 'FOOD',
    unit: 'kg',
    defaultThreshold: 2000,
  },
  POTABLE_WATER: {
    name: 'Packaged Drinking Water',
    category: 'WATER',
    unit: 'litres',
    defaultThreshold: 3000,
  },
  TRAUMA_KITS: {
    name: 'Emergency Trauma & Surgical Kits',
    category: 'MEDICAL',
    unit: 'kits',
    defaultThreshold: 50,
  },
  OXYGEN: {
    name: 'High-Altitude Medical Oxygen',
    category: 'MEDICAL',
    unit: 'cylinders',
    defaultThreshold: 40,
  },
  INFANT_NUTRITION: {
    name: 'Infant Nutrition & Lactogen',
    category: 'FOOD',
    unit: 'packs',
    defaultThreshold: 300,
  },
  DIESEL: {
    name: 'Generator & Convoy Diesel',
    category: 'FUEL',
    unit: 'litres',
    defaultThreshold: 2500,
  },
  WINTER_BLANKETS: {
    name: 'Thermal Blankets & Fleece Sets',
    category: 'SHELTER',
    unit: 'sets',
    defaultThreshold: 400,
  },
  TARPAULIN: {
    name: 'Reinforced Monsoon Tarpaulins',
    category: 'SHELTER',
    unit: 'sheets',
    defaultThreshold: 350,
  },
  PURIFICATION_TABS: {
    name: 'Water Purification Tablets',
    category: 'WATER',
    unit: 'strips',
    defaultThreshold: 1000,
  },
};

export const HubAddResourceModal: React.FC<HubAddResourceModalProps> = ({
  isOpen,
  onClose,
  hubId,
  hubName,
}) => {
  const { addHubInventoryItem } = usePravahStore();
  const [selectedPreset, setSelectedPreset] = useState<string>('RICE_GRAIN');
  const [commodityName, setCommodityName] = useState<string>('Rice & Fortified Grains');
  const [category, setCategory] = useState<CommodityCategory>('FOOD');
  const [quantity, setQuantity] = useState<string>('5000');
  const [unit, setUnit] = useState<string>('kg');
  const [threshold, setThreshold] = useState<string>('2000');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSelectedPreset('RICE_GRAIN');
      const t = PRESET_TEMPLATES.RICE_GRAIN;
      setCommodityName(t.name);
      setCategory(t.category);
      setUnit(t.unit);
      setThreshold(String(t.defaultThreshold));
      setQuantity('5000');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handlePresetChange = (presetKey: string) => {
    setSelectedPreset(presetKey);
    if (presetKey !== 'CUSTOM' && PRESET_TEMPLATES[presetKey]) {
      const t = PRESET_TEMPLATES[presetKey];
      setCommodityName(t.name);
      setCategory(t.category);
      setUnit(t.unit);
      setThreshold(String(t.defaultThreshold));
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedQty = parseFloat(quantity);
    const parsedThresh = parseFloat(threshold);

    if (!commodityName.trim()) {
      setError('Commodity name is required.');
      return;
    }
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Please provide a positive initial stock quantity.');
      return;
    }
    if (isNaN(parsedThresh) || parsedThresh < 0) {
      setError('Please specify a valid non-negative low stock threshold.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await addHubInventoryItem(hubId, {
        resourceName: commodityName.trim(),
        resourceType: category,
        commodityName: commodityName.trim(),
        category,
        quantity: parsedQty,
        unit: unit.trim() || 'units',
        minimumStock: parsedThresh,
        lowStockThreshold: parsedThresh,
        reservedQuantity: 0,
      });

      if (res) {
        onClose();
      } else {
        setError('Failed to add resource. Ensure item is not already registered.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error registering new inventory item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-surface border border-border rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface-subtle">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/40 flex items-center justify-center text-primary">
              <PackagePlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                Register Stock Commodity
              </h2>
              <p className="text-[11px] text-text-secondary">
                Depot: <span className="font-semibold text-text-primary">{hubName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary p-1 rounded hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Preset Selector */}
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
              Select Preset Commodity or Custom
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
            >
              <optgroup label="Standard Disaster Lifeline Commodities">
                <option value="RICE_GRAIN">Rice & Fortified Grains (FOOD, kg)</option>
                <option value="POTABLE_WATER">Packaged Drinking Water (WATER, litres)</option>
                <option value="TRAUMA_KITS">Emergency Trauma Kits (MEDICAL, kits)</option>
                <option value="OXYGEN">High-Altitude Oxygen (MEDICAL, cylinders)</option>
                <option value="INFANT_NUTRITION">Infant Nutrition (FOOD, packs)</option>
                <option value="DIESEL">Generator & Convoy Diesel (FUEL, litres)</option>
                <option value="WINTER_BLANKETS">Thermal Blankets (SHELTER, sets)</option>
                <option value="TARPAULIN">Reinforced Monsoon Tarpaulins (SHELTER, sheets)</option>
                <option value="PURIFICATION_TABS">Water Purification Tablets (WATER, strips)</option>
              </optgroup>
              <option value="CUSTOM">+ Custom Commodity Item...</option>
            </select>
          </div>

          {/* Commodity Name & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Commodity Label
              </label>
              <input
                type="text"
                value={commodityName}
                onChange={(e) => setCommodityName(e.target.value)}
                placeholder="e.g. Rice & Fortified Grains"
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as CommodityCategory)}
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-primary"
              >
                <option value="FOOD">FOOD</option>
                <option value="MEDICAL">MEDICAL</option>
                <option value="WATER">WATER</option>
                <option value="FUEL">FUEL</option>
                <option value="SHELTER">SHELTER</option>
                <option value="OTHER">OTHER</option>
              </select>
            </div>
          </div>

          {/* Quantity, Unit & Alert Threshold */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                step="any"
                min="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="5000"
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Unit of Measure
              </label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg, litres..."
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-1">
                Low-Stock Trigger
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                placeholder="1000"
                className="w-full bg-surface-subtle border border-border rounded-md px-3 py-2 text-xs text-text-primary font-mono placeholder:text-text-secondary focus:outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-2.5 rounded-md bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-1.5 rounded-md text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <span>Adding to Stockpile...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Register Item</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
