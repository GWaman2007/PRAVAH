import React, { useState, useEffect } from 'react';
import { 
  X, 
  MapPin, 
  Camera, 
  Navigation, 
  AlertTriangle, 
  CloudOff, 
  Image as ImageIcon,
  CheckCircle2,
  Crosshair
} from 'lucide-react';
import type { 
  CorridorFlair, 
  IncidentType, 
  Severity, 
  AuthorRole 
} from '../types/incident';
import { 
  CORRIDOR_PRESETS, 
  SAMPLE_INCIDENT_IMAGES 
} from '../data/seedIncidents';

interface CreateReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    corridorFlair: CorridorFlair | string;
    incidentType: IncidentType;
    severity: Severity;
    placeName: string;
    state?: string;
    lat: number;
    lng: number;
    authorName: string;
    authorRole: AuthorRole;
    mediaUrl: string;
  }) => void;
  isEffectiveOnline: boolean;
  onStartMapPick: () => void;
  pickedCoordinates?: { lat: number; lng: number } | null;
}

export const CreateReportModal: React.FC<CreateReportModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isEffectiveOnline,
  onStartMapPick,
  pickedCoordinates,
}) => {
  const [corridorFlair, setCorridorFlair] = useState<CorridorFlair>('r/NH-29-Nagaland');
  const [incidentType, setIncidentType] = useState<IncidentType>('Landslide');
  const [severity, setSeverity] = useState<Severity>('Total Blockage');
  const [title, setTitle] = useState('');
  const [placeName, setPlaceName] = useState('Zubza Bypass, NH-29');
  const [lat, setLat] = useState<number>(25.6882);
  const [lng, setLng] = useState<number>(94.0412);
  const [stateName, setStateName] = useState('Nagaland');
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState<AuthorRole>('Registered Driver');
  const [mediaUrl, setMediaUrl] = useState<string>(SAMPLE_INCIDENT_IMAGES.landslide);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Sync with pickedCoordinates from map click
  useEffect(() => {
    if (pickedCoordinates) {
      setLat(pickedCoordinates.lat);
      setLng(pickedCoordinates.lng);
      setPlaceName(`Corridor Marker (${pickedCoordinates.lat.toFixed(4)}, ${pickedCoordinates.lng.toFixed(4)})`);
    }
  }, [pickedCoordinates]);

  if (!isOpen) return null;

  // Handle Corridor preset change
  const handleCorridorChange = (flair: CorridorFlair) => {
    setCorridorFlair(flair);
    const preset = CORRIDOR_PRESETS.find((p) => p.flair === flair);
    if (preset) {
      setLat(preset.lat);
      setLng(preset.lng);
      setPlaceName(preset.name);
      setStateName(preset.state);
    }
  };

  // Browser GPS Geolocation
  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser.');
      return;
    }

    setIsGettingGps(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = parseFloat(pos.coords.latitude.toFixed(5));
        const userLng = parseFloat(pos.coords.longitude.toFixed(5));
        setLat(userLat);
        setLng(userLng);
        setPlaceName(`GPS Ground Location (${userLat}, ${userLng})`);
        setIsGettingGps(false);
      },
      () => {
        setIsGettingGps(false);
        setGpsError('Could not fetch exact GPS location. Defaulting to corridor point.');
      },
      { timeout: 8000 }
    );
  };

  // Base64 image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo is too large (> 5MB). Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setMediaUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a title describing the road disruption.');
      return;
    }

    onSubmit({
      title: title.trim(),
      corridorFlair,
      incidentType,
      severity,
      placeName: placeName.trim() || 'NER Corridor Highway',
      state: stateName,
      lat,
      lng,
      authorName: authorName.trim() || (authorRole === 'Field Officer (BRO/Police)' ? 'Field Officer' : 'Anonymous Driver'),
      authorRole,
      mediaUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center border border-orange-500/30">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Log New Disruption Ground Report
              </h3>
              <p className="text-xs text-slate-400">
                North East Freight Corridors • Crowd & BRO Verification
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Offline Warning Banner */}
        {!isEffectiveOnline && (
          <div className="bg-amber-950/60 border-b border-amber-500/40 px-5 py-2 flex items-center gap-2 text-xs text-amber-300 font-mono">
            <CloudOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              You are currently <strong>Offline</strong>. This report will be queued locally in your browser storage and automatically published once connection restores.
            </span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
          
          {/* Row 1: Corridor / District Flair */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Select Corridor / Highway Flair <span className="text-orange-500">*</span>
            </label>
            <select
              value={corridorFlair}
              onChange={(e) => handleCorridorChange(e.target.value as CorridorFlair)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500 font-medium"
            >
              <option value="r/NH-29-Nagaland">r/NH-29-Nagaland (Dimapur - Kohima - Zubza)</option>
              <option value="r/NH-10-Sikkim">r/NH-10-Sikkim (Sevoke - Teesta - Gangtok)</option>
              <option value="r/East-Khasi-Hills">r/East-Khasi-Hills (Guwahati - Nongpoh - Shillong)</option>
              <option value="r/Assam-DimaHasao">r/Assam-DimaHasao (Haflong - Jatinga Hill Section)</option>
              <option value="r/Arunachal-Tawang">r/Arunachal-Tawang (BCT Road / Sela Tunnel)</option>
              <option value="r/Manipur-NH-37">r/Manipur-NH-37 (Silchar - Imphal Corridor)</option>
              <option value="r/Mizoram-NH-306">r/Mizoram-NH-306 (Vairengte - Aizawl Spine)</option>
              <option value="r/Tripura-NH-08">r/Tripura-NH-08 (Assam-Agartala Highway)</option>
            </select>
          </div>

          {/* Row 2: Disruption Type & Severity Radio Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Disruption Type */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Disruption Type
              </label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value as IncidentType)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value="Landslide">Landslide / Mudslide</option>
                <option value="Flash Flood">Flash Flood / River Overflow</option>
                <option value="Bridge Washout">Bridge Washout / Culvert Collapse</option>
                <option value="Tree Fall">Tree Fall / Timber Blockage</option>
                <option value="Road Subsidence">Road Subsidence / Asphalt Cave-in</option>
              </select>
            </div>

            {/* Severity Radio Buttons */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Severity Level
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'Total Blockage', label: 'Total Block', color: 'border-red-500/50 bg-red-500/10 text-red-300' },
                  { id: 'Single Lane Passable', label: 'Single Lane', color: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
                  { id: 'Caution/Hazard', label: 'Caution', color: 'border-yellow-500/50 bg-yellow-500/10 text-yellow-300' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSeverity(s.id as Severity)}
                    className={`py-2 px-1 rounded-lg border text-[11px] font-bold text-center transition-all ${
                      severity === s.id
                        ? `${s.color} ring-2 ring-orange-500/40 shadow-sm`
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Row 3: Title / Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-300">
              Report Title & Detailed Blockage Description <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Major mudslide blocking both lanes past Nongpoh near petrol pump"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500 font-medium placeholder-slate-500"
              required
            />
          </div>

          {/* Row 4: Location Picker (GPS / Map Click / Preset) */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-orange-400" />
                Geo-Location Coordinates
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGetGps}
                  disabled={isGettingGps}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Navigation className="w-3 h-3 text-emerald-400" />
                  <span>{isGettingGps ? 'Capturing GPS...' : 'My GPS Location'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onStartMapPick();
                    onClose();
                  }}
                  className="px-2.5 py-1 rounded bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/40 text-[11px] font-medium flex items-center gap-1 transition-colors"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>Pick on Map</span>
                </button>
              </div>
            </div>

            {gpsError && (
              <p className="text-[11px] text-amber-400">{gpsError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="sm:col-span-1">
                <label className="block text-[10px] text-slate-400 mb-0.5">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] text-slate-400 mb-0.5">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 font-mono text-xs"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-[10px] text-slate-400 mb-0.5">Place / Landmark Name</label>
                <input
                  type="text"
                  value={placeName}
                  onChange={(e) => setPlaceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-slate-200 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Image Upload & Sample Selection */}
          <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-orange-400" />
                Blockage Evidence Photo
              </span>
              <span className="text-[11px] text-slate-400">Offline SVG or Camera Upload</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Thumbnail preview */}
              <div className="w-24 h-16 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 shrink-0">
                <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>

              {/* Upload file input */}
              <div className="flex-1 space-y-1.5">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer font-medium text-xs transition-colors">
                  <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                  <span>Upload Local Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {/* Quick Sample Photos */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-slate-500">Presets:</span>
                  <button
                    type="button"
                    onClick={() => setMediaUrl(SAMPLE_INCIDENT_IMAGES.landslide)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Landslide
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaUrl(SAMPLE_INCIDENT_IMAGES.flood)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Flood
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaUrl(SAMPLE_INCIDENT_IMAGES.treefall)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Tree Fall
                  </button>
                  <button
                    type="button"
                    onClick={() => setMediaUrl(SAMPLE_INCIDENT_IMAGES.subsidence)}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                  >
                    Subsidence
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Row 6: Reporter Identity & Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Reporter Callsign / Name
              </label>
              <input
                type="text"
                placeholder="e.g. Havildar Dorjee / Trucker Amar"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Reporter Verified Role
              </label>
              <select
                value={authorRole}
                onChange={(e) => setAuthorRole(e.target.value as AuthorRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-orange-500"
              >
                <option value="Registered Driver">Registered Driver (Freight / Taxi)</option>
                <option value="Field Officer (BRO/Police)">Field Officer (BRO / Police) [+10 Instant Boost]</option>
                <option value="Local Citizen">Local Citizen</option>
              </select>
            </div>
          </div>

          {/* Footer Submit / Cancel Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-600/30 flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEffectiveOnline ? 'Publish Live Ground Report' : 'Save to Offline Queue'}</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
