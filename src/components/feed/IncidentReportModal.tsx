import React, { useState, useEffect } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import type {
  CorridorFlair,
  IncidentType,
  IncidentSeverity,
  AuthorRole,
} from '../../types';
import {
  FileText,
  Mic,
  Camera,
  WifiOff,
  Send,
  X,
  ShieldCheck,
  CheckCircle,
} from 'lucide-react';

export interface IncidentReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCorridor?: CorridorFlair;
  defaultLocationName?: string;
  defaultCoords?: [number, number];
  defaultCorridorId?: string;
  defaultTitle?: string;
  defaultSeverity?: IncidentSeverity;
  defaultType?: IncidentType;
}

export const IncidentReportModal: React.FC<IncidentReportModalProps> = ({
  isOpen,
  onClose,
  defaultCorridor = 'r/NH-29-Nagaland',
  defaultLocationName = '',
  defaultCoords = [25.7500, 93.9800],
  defaultCorridorId = 'SEG-DIM-KOH-MAIN',
  defaultTitle = '',
  defaultSeverity = 'Total Blockage',
  defaultType = 'Landslide',
}) => {
  const { userContext, isOnline, addIncident } = usePravahStore();

  const [formTitle, setFormTitle] = useState(defaultTitle);
  const [formCorridor, setFormCorridor] = useState<CorridorFlair>(defaultCorridor);
  const [formType, setFormType] = useState<IncidentType>(defaultType);
  const [formSeverity, setFormSeverity] = useState<IncidentSeverity>(defaultSeverity);
  const [formLocationName, setFormLocationName] = useState(defaultLocationName);
  const [formInputMethod, setFormInputMethod] = useState<'TEXT' | 'VOICE' | 'PHOTO'>('TEXT');
  const [formVoiceRecording, setFormVoiceRecording] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setFormTitle(defaultTitle);
      setFormCorridor(defaultCorridor);
      setFormLocationName(defaultLocationName);
      setFormSeverity(defaultSeverity);
      setFormType(defaultType);
      setPhotoPreview(null);
      setFormVoiceRecording(false);
    }
  }, [isOpen, defaultCorridor, defaultLocationName, defaultTitle, defaultSeverity, defaultType]);

  if (!isOpen) return null;

  const isOfficer = userContext.role === 'FIELD_OFFICER' || userContext.role === 'SUPER_ADMIN';

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formLocationName.trim()) return;

    addIncident({
      title: formTitle.trim(),
      corridorFlair: formCorridor,
      incidentType: formType,
      severity: formSeverity,
      location: {
        lat: defaultCoords[0],
        lng: defaultCoords[1],
        placeName: formLocationName.trim(),
        corridorId: defaultCorridorId,
      },
      author: {
        name: userContext.name,
        role: (userContext.role === 'FIELD_OFFICER'
          ? 'Field Officer (BRO/Police)'
          : userContext.role === 'DRIVER'
          ? 'Registered Driver'
          : 'Local Citizen') as AuthorRole,
      },
      timestamp: new Date().toISOString(),
      mediaUrl:
        photoPreview ||
        (formType === 'Landslide'
          ? 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
          : 'https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&w=800&q=80'),
    });

    onClose();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setPhotoPreview(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-surface border border-border rounded-md max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-auto text-xs text-text-primary">
        <div className="flex items-center justify-between pb-2.5 border-b border-border">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-sm text-text-primary">
              Report Road Hazard / Incident
            </h2>
            {isOfficer && (
              <span className="px-1.5 py-0.5 rounded-xs bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                +10 Officer Multiplier
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary rounded-xs hover:bg-surface-subtle transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleCreateReport} className="space-y-4">
          {/* Three input methods: Text, Voice, Photo */}
          <div>
            <label className="font-medium text-text-secondary block mb-1.5">
              Preferred Reporting Mode:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormInputMethod('TEXT')}
                className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1 font-medium transition-colors cursor-pointer ${
                  formInputMethod === 'TEXT'
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border bg-surface text-text-secondary'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Text Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormInputMethod('VOICE');
                  setFormVoiceRecording(!formVoiceRecording);
                  if (!formVoiceRecording) {
                    setFormTitle('Audio Dispatch: Mudflow blocking corridor passage');
                    if (!formLocationName) {
                      setFormLocationName(defaultLocationName || 'Near sector checkpoint');
                    }
                  }
                }}
                className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1 font-medium transition-colors cursor-pointer ${
                  formInputMethod === 'VOICE'
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border bg-surface text-text-secondary'
                }`}
              >
                <Mic
                  className={`w-4 h-4 ${
                    formVoiceRecording ? 'text-status-blocked-solid animate-pulse' : ''
                  }`}
                />
                <span>{formVoiceRecording ? 'Recording (Voice)' : 'Voice Audio'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormInputMethod('PHOTO')}
                className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1 font-medium transition-colors cursor-pointer ${
                  formInputMethod === 'PHOTO'
                    ? 'border-primary bg-primary-tint text-primary'
                    : 'border-border bg-surface text-text-secondary'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Photo Proof</span>
              </button>
            </div>
          </div>

          {/* Photo Upload Input if Photo Mode Selected */}
          {formInputMethod === 'PHOTO' && (
            <div className="p-3 bg-surface-subtle border border-border rounded-sm space-y-2">
              <label className="font-medium text-text-secondary block">
                Attach Image / Camera Proof:
              </label>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoUpload}
                className="w-full text-xs text-text-secondary file:mr-3 file:py-1 file:px-3 file:rounded-xs file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover cursor-pointer"
              />
              {photoPreview && (
                <div className="relative mt-2 max-h-36 overflow-hidden rounded-xs border border-border">
                  <img src={photoPreview} alt="Incident Proof Preview" className="w-full object-cover" />
                  <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded-xs">
                    Ready to attach
                  </span>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="font-medium text-text-secondary block mb-1">
              Corridor Channel Flair:
            </label>
            <select
              value={formCorridor}
              onChange={(e) => setFormCorridor(e.target.value as CorridorFlair)}
              className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
            >
              <option value="r/NH-29-Nagaland">r/NH-29-Nagaland (Kohima Lifeline)</option>
              <option value="r/NH-10-Sikkim">r/NH-10-Sikkim (Teesta Valley)</option>
              <option value="r/Mizoram-NH-306">r/Mizoram-NH-306 (Kolasib Sector)</option>
              <option value="r/Assam-DimaHasao">r/Assam-DimaHasao (Barail Cut)</option>
              <option value="r/East-Khasi-Hills">r/East-Khasi-Hills (Sohra Ridge)</option>
            </select>
          </div>

          <div>
            <label className="font-medium text-text-secondary block mb-1">
              Incident Headline / Summary:
            </label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="e.g. Major rockfall cleaving bridge shoulder at KM-42"
              className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-text-secondary block mb-1">Type:</label>
              <select
                value={formType}
                onChange={(e) => setFormType(e.target.value as IncidentType)}
                className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
              >
                <option value="Landslide">Landslide</option>
                <option value="Flash Flood">Flash Flood</option>
                <option value="Bridge Washout">Bridge Washout</option>
                <option value="Road Subsidence">Road Subsidence</option>
              </select>
            </div>

            <div>
              <label className="font-medium text-text-secondary block mb-1">Severity:</label>
              <select
                value={formSeverity}
                onChange={(e) => setFormSeverity(e.target.value as IncidentSeverity)}
                className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
              >
                <option value="Total Blockage">Total Blockage</option>
                <option value="Single Lane Passable">Single Lane Passable</option>
                <option value="Caution/Hazard">Caution/Hazard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-medium text-text-secondary block mb-1">
              Exact Landmark / Location:
            </label>
            <input
              type="text"
              required
              value={formLocationName}
              onChange={(e) => setFormLocationName(e.target.value)}
              placeholder="e.g. Near Pagla Pahar waterfall KM-144"
              className="w-full p-2 bg-surface border border-border rounded-sm text-text-primary focus:outline-none"
            />
          </div>

          <div className="p-2.5 rounded-sm bg-surface-subtle border border-border flex items-center justify-between text-[11px]">
            <span className="text-text-secondary">Reporting Authority:</span>
            <span className="font-semibold text-text-primary">
              {userContext.name} ({userContext.badgeId || userContext.role})
            </span>
          </div>

          {!isOnline && (
            <div className="p-3 rounded-sm bg-status-highrisk-tint text-status-highrisk-text border border-status-highrisk-solid flex items-center space-x-2">
              <WifiOff className="w-4 h-4 shrink-0" />
              <span>
                Working offline. This report will be saved locally to flash storage and auto-synced once network connectivity is restored.
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-border flex justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium border border-border rounded-sm text-text-secondary hover:bg-surface-subtle btn-press cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold btn-press shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Incident Report</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
