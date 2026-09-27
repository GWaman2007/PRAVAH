import React, { useState } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { compressImageToJpeg } from '../../utils/imageCompression';
import {
  X,
  Camera,
  MapPin,
  AlertTriangle,
  Upload,
  Trash2,
  Send,
  Radio,
  FileText,
  Package,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import type { ResourceUrgency } from '../../types';

export type QuickReportTab = 'INCIDENT' | 'RESOURCE_REQUEST' | 'FIELD_UPDATE';

export interface QuickFieldReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: QuickReportTab;
  defaultCommunityId?: string;
}

const INCIDENT_TYPES = [
  'Flood',
  'Landslide',
  'Road Blockage',
  'Bridge Blockage',
  'Accident',
  'Road Damage',
  'Weather Hazard',
  'Community Emergency',
  'Other',
] as const;

export const QuickFieldReportModal: React.FC<QuickFieldReportModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'INCIDENT',
  defaultCommunityId,
}) => {
  const {
    userContext,
    communities,
    addIncident,
    submitResourceRequest,
    setSegmentDisruption,
  } = usePravahStore();

  const [activeTab, setActiveTab] = useState<QuickReportTab>(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Common Fields
  const [communityId, setCommunityId] = useState<string>(
    defaultCommunityId || userContext.communityId || 'COMMUNITY_KOLASIB'
  );
  const selectedCommunity = communities.find((c) => c.id === communityId) || communities[0];

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState(selectedCommunity?.name || '');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Incident Specific
  const [incidentType, setIncidentType] = useState<(typeof INCIDENT_TYPES)[number]>('Road Blockage');
  const [severity, setSeverity] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [affectedSegment, setAffectedSegment] = useState<string>('SEG-SIL-KOL');

  // Resource Request Specific
  const [resourceType, setResourceType] = useState('Medical Kits');
  const [quantity, setQuantity] = useState<number>(20);
  const [unit, setUnit] = useState('trauma kits');
  const [urgency, setUrgency] = useState<ResourceUrgency>('CRITICAL');
  const [requestReason, setRequestReason] = useState('Critical stock depletion due to emergency surge and flood isolation.');
  const [requestNotes, setRequestNotes] = useState('Access via main valley road restricted. Expedited airlift or light 4x4 convoy needed.');

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await compressImageToJpeg(file, 800, 600, 0.7);
        newUrls.push(res.dataUrl);
      }
      setPhotos((prev) => [...prev, ...newUrls]);
    } catch (err) {
      console.warn('Failed compressing image:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (activeTab === 'RESOURCE_REQUEST') {
        submitResourceRequest({
          officerId: userContext.officerId || 'fo-hmar',
          officerName: userContext.name,
          communityId,
          communityName: selectedCommunity.name,
          resourceType,
          quantity: Number(quantity),
          unit,
          urgency,
          reason: requestReason,
          notes: requestNotes,
          evidencePhoto: photos[0],
        });
        setSuccessMessage(`Resource request for ${quantity} ${unit} of ${resourceType} dispatched to PRAVAH Engine!`);
      } else {
        // Incident or Field Update
        const reportTitle =
          activeTab === 'INCIDENT'
            ? `${incidentType.toUpperCase()} — ${severity} (${selectedCommunity.name})`
            : title.trim() || `Field Situation Update — ${selectedCommunity.name}`;

        addIncident({
          title: reportTitle,
          corridorFlair: selectedCommunity.primaryCorridor || 'NH-306',
          incidentType:
            incidentType === 'Road Blockage' || incidentType === 'Landslide'
              ? 'Landslide'
              : incidentType === 'Bridge Blockage'
              ? 'Bridge Washout'
              : incidentType === 'Flood'
              ? 'Flash Flood'
              : 'Tree Fall',
          severity:
            severity === 'CRITICAL'
              ? 'Total Blockage'
              : severity === 'HIGH'
              ? 'Single Lane Passable'
              : 'Caution/Hazard',
          location: {
            placeName: locationName || selectedCommunity.name,
            lat: selectedCommunity.coordinates[0],
            lng: selectedCommunity.coordinates[1],
          },
          author: {
            name: userContext.name,
            role: 'Field Officer (BRO/Police)',
          },
          timestamp: new Date().toISOString(),
          mediaUrl: photos[0] || (incidentType === 'Bridge Blockage' ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80' : ''),
          hasOfficerVerified: true,
        });

        // If it's a road or bridge blockage, update the network segment disruption in real-time
        if (incidentType === 'Road Blockage' || incidentType === 'Bridge Blockage' || incidentType === 'Landslide') {
          setSegmentDisruption(affectedSegment, {
            status: severity === 'CRITICAL' ? 'TOTAL_BLOCKAGE' : 'SINGLE_LANE_PASSABLE',
            cause: incidentType === 'Landslide' ? 'Landslide_Debris' : 'Flood_Inundation',
            description: `${incidentType} reported near ${selectedCommunity.name}: ${description.slice(0, 80)}`,
            reportedBy: userContext.name,
          });
        }

        setSuccessMessage(`Report posted to Ground Intelligence feed and telemetry synchronized!`);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage(null);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Submission failed:', err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-lg max-w-lg w-full p-4 sm:p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto text-xs text-text-primary space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold text-text-primary">
              Ground Intelligence &amp; Field Dispatch
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-sm text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-subtle border border-border rounded-md">
          <button
            type="button"
            onClick={() => setActiveTab('INCIDENT')}
            className={`py-1.5 px-2 rounded font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'INCIDENT'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Incident</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('RESOURCE_REQUEST')}
            className={`py-1.5 px-2 rounded font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'RESOURCE_REQUEST'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Resource Req</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FIELD_UPDATE')}
            className={`py-1.5 px-2 rounded font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'FIELD_UPDATE'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Field Update</span>
          </button>
        </div>

        {successMessage ? (
          <div className="p-4 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="font-semibold text-xs">{successMessage}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Officer Identification Bar */}
            <div className="flex items-center justify-between bg-surface-subtle p-2 rounded border border-border text-[11px]">
              <div>
                <span className="text-text-tertiary">Reporting Officer: </span>
                <span className="font-semibold text-text-primary">{userContext.name}</span>
                <span className="text-text-tertiary"> ({userContext.badgeId})</span>
              </div>
              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 font-mono text-[10px] font-bold">
                {userContext.jurisdictionState || 'Active Sector'}
              </span>
            </div>

            {/* Target Community */}
            <div>
              <label className="block font-medium text-text-secondary mb-1">
                Target Community / Sector
              </label>
              <select
                value={communityId}
                onChange={(e) => {
                  setCommunityId(e.target.value);
                  const comm = communities.find((c) => c.id === e.target.value);
                  if (comm) setLocationName(comm.name);
                }}
                className="w-full bg-surface border border-border rounded p-2 text-xs font-medium text-text-primary focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {communities.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.state}) — {c.metrics.priorityTier} Priority
                  </option>
                ))}
              </select>
            </div>

            {/* Incident Tab Specifics */}
            {activeTab === 'INCIDENT' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Incident Type</label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value as any)}
                      className="w-full bg-surface border border-border rounded p-2 text-xs font-medium text-text-primary focus:border-primary"
                    >
                      {INCIDENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-surface border border-border rounded p-2 text-xs font-medium text-text-primary focus:border-primary"
                    >
                      <option value="CRITICAL">Critical (Total Blockage)</option>
                      <option value="HIGH">High (Single Lane Passable)</option>
                      <option value="MEDIUM">Medium (Slow Moving Hazard)</option>
                      <option value="LOW">Low (Caution Alert)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-text-secondary mb-1">
                    Affected Corridor / Road Segment
                  </label>
                  <select
                    value={affectedSegment}
                    onChange={(e) => setAffectedSegment(e.target.value)}
                    className="w-full bg-surface border border-border rounded p-2 text-xs font-mono text-text-primary focus:border-primary"
                  >
                    <option value="SEG-SIL-KOL">NH-306 (Silchar → Kolasib) - Bilkhawthlir</option>
                    <option value="SEG-DIM-KOH-MAIN">NH-29 (Dimapur → Kohima) - Pagla Pahar</option>
                    <option value="SEG-SK-TEESTA">NH-10 (Siliguri → Teesta Valley)</option>
                    <option value="SEG-LUM-HAF">NH-54E (Lumding → Haflong Outpost)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-text-secondary mb-1">
                    Situation Description &amp; Details
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Bridge near Community A is partially submerged. Heavy 16T vehicles cannot pass; 4x4 light vehicles only."
                    className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary placeholder:text-text-tertiary focus:border-primary"
                    required
                  />
                </div>
              </div>
            )}

            {/* Resource Request Specifics */}
            {activeTab === 'RESOURCE_REQUEST' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Resource Item</label>
                    <select
                      value={resourceType}
                      onChange={(e) => setResourceType(e.target.value)}
                      className="w-full bg-surface border border-border rounded p-2 text-xs font-medium text-text-primary focus:border-primary"
                    >
                      <option value="Medical Kits">Medical Kits (Trauma &amp; ORS)</option>
                      <option value="Food Kits">Food Kits (Ready-to-Eat)</option>
                      <option value="Water Units">Water Units (20L Cans)</option>
                      <option value="Tarpaulins / Shelter Kits">Tarpaulins / Shelter Kits</option>
                      <option value="Diesel / Generator Fuel">Diesel / Fuel (Litres)</option>
                      <option value="Water Purification Tablets">Water Purification Tablets</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Quantity Needed</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 bg-surface border border-border rounded p-2 text-xs font-mono font-bold text-text-primary focus:border-primary"
                        required
                      />
                      <input
                        type="text"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="unit (kits, cans)"
                        className="flex-1 bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Urgency Tier</label>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as ResourceUrgency)}
                      className="w-full bg-surface border border-border rounded p-2 text-xs font-medium text-text-primary focus:border-primary"
                    >
                      <option value="CRITICAL">Critical (Immediate dispatch)</option>
                      <option value="HIGH">High (Within 6 hours)</option>
                      <option value="MEDIUM">Medium (Within 12 hours)</option>
                      <option value="LOW">Low (Next scheduled sortie)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-text-secondary mb-1">Specific Location</label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Kolasib Relief Center"
                      className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-text-secondary mb-1">
                    Justification / Operational Reason
                  </label>
                  <input
                    type="text"
                    value={requestReason}
                    onChange={(e) => setRequestReason(e.target.value)}
                    placeholder="e.g. Medical stock depleted due to flood inundation."
                    className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-text-secondary mb-1">
                    Field Notes &amp; Access Constraints
                  </label>
                  <textarea
                    rows={2}
                    value={requestNotes}
                    onChange={(e) => setRequestNotes(e.target.value)}
                    placeholder="e.g. Road passable only by light trucks. Route bridge submerged at KM-42."
                    className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Field Update Specifics */}
            {activeTab === 'FIELD_UPDATE' && (
              <div className="space-y-3">
                <div>
                  <label className="block font-medium text-text-secondary mb-1">Update Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Water receding at Bilkhawthlir Causeway"
                    className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-text-secondary mb-1">Update Details</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe ground observations, community status, or transit readiness..."
                    className="w-full bg-surface border border-border rounded p-2 text-xs text-text-primary focus:border-primary"
                    required
                  />
                </div>
              </div>
            )}

            {/* Photos & Evidence Upload Section */}
            <div className="border border-border/80 rounded-md p-3 bg-surface-subtle/50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-text-secondary flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-primary" />
                  <span>Ground Photos &amp; Visual Evidence ({photos.length})</span>
                </label>
                <label className="cursor-pointer px-2.5 py-1 bg-surface border border-border hover:bg-surface-subtle text-primary rounded text-[11px] font-semibold flex items-center gap-1 btn-press">
                  <Upload className="w-3 h-3" />
                  <span>{isCompressing ? 'Compressing...' : '+ Add Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={isCompressing}
                  />
                </label>
              </div>

              {photos.length > 0 ? (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {photos.map((src, idx) => (
                    <div key={idx} className="relative group rounded overflow-hidden border border-border h-20 bg-black/20">
                      <img src={src} alt="Evidence preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removePhoto(idx)}
                        className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-text-tertiary">
                  Upload geo-tagged evidence of road washouts, flood levels, or warehouse stock.
                </p>
              )}
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded border border-border bg-surface hover:bg-surface-subtle text-text-secondary font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isCompressing}
                className={`px-4 py-1.5 rounded font-semibold text-white flex items-center gap-1.5 btn-press cursor-pointer shadow-xs ${
                  activeTab === 'INCIDENT'
                    ? 'bg-red-600 hover:bg-red-700'
                    : activeTab === 'RESOURCE_REQUEST'
                    ? 'bg-primary hover:bg-primary/90'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? 'Submitting...'
                    : activeTab === 'RESOURCE_REQUEST'
                    ? 'Send Resource Request'
                    : 'Post Ground Report'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
