import React, { useState, useEffect, useRef } from 'react';
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
  MicOff,
  Camera,
  WifiOff,
  Send,
  X,
  ShieldCheck,
  CheckCircle,
  Radio,
  Volume2,
  AlertTriangle,
  MapPin,
  Locate,
  Crosshair,
  RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { compressImageToJpeg, type CompressionResult } from '../../utils/imageCompression';

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
  initialInputMethod?: 'TEXT' | 'VOICE' | 'PHOTO';
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
  initialInputMethod = 'TEXT',
}) => {
  const { userContext, isOnline, addIncident } = usePravahStore();

  const [formTitle, setFormTitle] = useState(defaultTitle);
  const [formCorridor, setFormCorridor] = useState<CorridorFlair>(defaultCorridor);
  const [formType, setFormType] = useState<IncidentType>(defaultType);
  const [formSeverity, setFormSeverity] = useState<IncidentSeverity>(defaultSeverity);
  const [formLocationName, setFormLocationName] = useState(defaultLocationName);
  const [formInputMethod, setFormInputMethod] = useState<'TEXT' | 'VOICE' | 'PHOTO'>(initialInputMethod);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // GPS Geolocation state
  const [capturedCoords, setCapturedCoords] = useState<[number, number] | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [isManualCoords, setIsManualCoords] = useState<boolean>(false);

  const handleAcquireGps = () => {
    setGpsError(null);
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        const acc = Math.round(position.coords.accuracy);
        setCapturedCoords([lat, lng]);
        setGpsAccuracy(acc);
        setIsLocating(false);
        setGpsError(null);
        if (!formLocationName.trim()) {
          setFormLocationName(`GPS Fix [${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E]`);
        }
      },
      (err) => {
        console.warn('Geolocation capture failed:', err);
        setIsLocating(false);
        let msg = 'Failed to acquire satellite location.';
        if (err.code === 1) {
          msg = 'GPS permission denied. Please allow location access in your browser settings.';
        } else if (err.code === 2) {
          msg = 'GPS signal unavailable. Ensure your device location/GPS is active.';
        } else if (err.code === 3) {
          msg = 'GPS acquisition timed out. Try again or enter coordinates manually.';
        }
        setGpsError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 15000,
      }
    );
  };

  // Web Speech API state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLanguage, setSpeechLanguage] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const getSpeechRecognitionClass = () => {
    if (typeof window === 'undefined') return null;
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
  };

  const startListening = () => {
    setSpeechError(null);
    const SpeechClass = getSpeechRecognitionClass();
    if (!SpeechClass) {
      setSpeechError('Speech recognition is not supported in this browser. Please type incident details or use Chrome/Edge.');
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          setFormTitle((prev) => {
            const trimmed = prev.trim();
            return trimmed ? `${trimmed} ${final.trim()}` : final.trim();
          });
          setInterimTranscript('');
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setSpeechError('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Speech error: ${event.error}. You can still type manually.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Speech recognition exception:', err);
      setSpeechError('Failed to initialize microphone speech engine. Please type manually.');
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  };

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setFormTitle(defaultTitle);
      setFormCorridor(defaultCorridor);
      setFormLocationName(defaultLocationName);
      setFormSeverity(defaultSeverity);
      setFormType(defaultType);
      setPhotoPreview(null);
      setCompressionStats(null);
      setIsCompressing(false);
      setFormInputMethod(initialInputMethod);
      setSpeechError(null);
      setInterimTranscript('');
      setIsListening(false);
      setCapturedCoords(null);
      setGpsAccuracy(null);
      setIsLocating(false);
      setGpsError(null);
      setIsManualCoords(false);
      if (initialInputMethod === 'VOICE') {
        setTimeout(() => {
          startListening();
        }, 150);
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      setIsListening(false);
    }
  }, [isOpen, defaultCorridor, defaultLocationName, defaultTitle, defaultSeverity, defaultType, initialInputMethod]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  if (!isOpen) return null;

  const isOfficer = userContext.role === 'FIELD_OFFICER' || userContext.role === 'SUPER_ADMIN';

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formLocationName.trim()) return;

    const finalLat = capturedCoords ? capturedCoords[0] : defaultCoords[0];
    const finalLng = capturedCoords ? capturedCoords[1] : defaultCoords[1];

    addIncident({
      title: formTitle.trim(),
      corridorFlair: formCorridor,
      incidentType: formType,
      severity: formSeverity,
      location: {
        lat: finalLat,
        lng: finalLng,
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsCompressing(true);
        const result = await compressImageToJpeg(file, 800, 600, 0.7);
        setPhotoPreview(result.dataUrl);
        setCompressionStats(result);
      } catch (err) {
        console.warn('Image compression fallback to direct FileReader:', err);
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            setPhotoPreview(reader.result);
          }
        };
        reader.readAsDataURL(file);
      } finally {
        setIsCompressing(false);
      }
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
                  if (!isListening) {
                    startListening();
                  } else {
                    stopListening();
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
                    isListening ? 'text-status-blocked-solid animate-pulse' : ''
                  }`}
                />
                <span>{isListening ? 'Listening Live...' : 'Voice Audio'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isListening) stopListening();
                  setFormInputMethod('PHOTO');
                }}
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

          {/* Real-time Web Speech Recognition Console */}
          {formInputMethod === 'VOICE' && (
            <div className="p-3 bg-surface-subtle border border-border rounded-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-text-primary text-[11px]">
                  <Radio className={`w-3.5 h-3.5 ${isListening ? 'text-status-blocked-solid animate-pulse' : 'text-primary'}`} />
                  <span>On-Device Speech-to-Text (Web Speech API)</span>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center bg-surface border border-border rounded-xs p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechLanguage('en-IN');
                      if (isListening) {
                        stopListening();
                        setTimeout(() => startListening(), 100);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-2xs font-medium cursor-pointer ${
                      speechLanguage === 'en-IN' ? 'bg-primary text-white font-bold' : 'text-text-secondary'
                    }`}
                  >
                    English (IN)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechLanguage('hi-IN');
                      if (isListening) {
                        stopListening();
                        setTimeout(() => startListening(), 100);
                      }
                    }}
                    className={`px-2 py-0.5 rounded-2xs font-medium cursor-pointer ${
                      speechLanguage === 'hi-IN' ? 'bg-primary text-white font-bold' : 'text-text-secondary'
                    }`}
                  >
                    Hindi (हिन्दी)
                  </button>
                </div>
              </div>

              {/* Live Streaming Audio Visualizer & Control Button */}
              <div className="flex items-center justify-between p-2.5 bg-surface rounded-xs border border-border">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-status-blocked-solid animate-ping' : 'bg-text-tertiary'}`} />
                  <span className="text-[11px] font-mono text-text-primary font-semibold">
                    {isListening ? (
                      <span className="text-status-blocked-text">● Recording live speech... Speak now</span>
                    ) : (
                      'Microphone Ready'
                    )}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`px-3 py-1 rounded-xs text-[11px] font-semibold flex items-center gap-1 btn-press cursor-pointer border ${
                    isListening
                      ? 'bg-status-blocked-tint text-status-blocked-text border-status-blocked-solid'
                      : 'bg-primary text-white border-primary'
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <span>Stop Listening</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>Start Listening</span>
                    </>
                  )}
                </button>
              </div>

              {/* Interim Real-time Preview */}
              {interimTranscript && (
                <div className="p-2 bg-primary-tint/20 border border-primary/30 rounded-xs text-[11px] text-primary flex items-start gap-1.5 animate-pulse">
                  <Volume2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span className="italic">Transcribing: "{interimTranscript}..."</span>
                </div>
              )}

              {/* Speech Error Warning */}
              {speechError && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xs text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                  <span>{speechError}</span>
                </div>
              )}
            </div>
          )}

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
              {isCompressing && (
                <div className="p-2 rounded-xs bg-primary-tint text-primary text-[11px] flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                  <span>Compressing photo to 800x600 for safe offline cache...</span>
                </div>
              )}
              {photoPreview && (
                <div className="relative mt-2 max-h-44 overflow-hidden rounded-xs border border-border">
                  <img src={photoPreview} alt="Incident Proof Preview" className="w-full object-cover" />
                  <div className="absolute bottom-1 right-1 left-1 flex items-center justify-between bg-black/75 backdrop-blur-xs text-white text-[10px] px-2 py-1 rounded-xs">
                    <span className="flex items-center gap-1 text-emerald-400 font-mono">
                      <CheckCircle className="w-3 h-3" />
                      {compressionStats
                        ? `${compressionStats.originalSizeKb}KB → ${compressionStats.sizeKb}KB (${compressionStats.savedPct}% saved)`
                        : 'Ready to attach'}
                    </span>
                    <span className="font-mono text-text-tertiary">
                      {compressionStats ? `${compressionStats.width}x${compressionStats.height}` : 'Compressed'}
                    </span>
                  </div>
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

          {/* GPS Coordinates & Field Geolocation Card */}
          <div className="p-3 bg-surface-subtle border border-border rounded-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-semibold text-text-primary text-[11px]">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>Geotag &amp; Device GPS Coordinates</span>
              </div>
              {capturedCoords && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>GPS Fix Captured</span>
                </span>
              )}
            </div>

            {capturedCoords ? (
              <div className="bg-surface p-2.5 rounded-xs border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Crosshair className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-mono font-bold text-text-primary text-[11px]">
                        {capturedCoords[0].toFixed(5)}° N, {capturedCoords[1].toFixed(5)}° E
                      </span>
                      {gpsAccuracy !== null && (
                        <span className="ml-2 text-[10px] text-text-tertiary font-mono">
                          (±{gpsAccuracy}m precision)
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAcquireGps}
                    disabled={isLocating}
                    className="flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {isManualCoords && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 text-xs">
                    <div>
                      <label className="text-[10px] text-text-secondary block font-medium">Latitude:</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={capturedCoords[0]}
                        onChange={(e) => setCapturedCoords([parseFloat(e.target.value) || 0, capturedCoords[1]])}
                        className="w-full p-1 bg-surface border border-border rounded-xs text-[11px] font-mono text-text-primary focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-text-secondary block font-medium">Longitude:</label>
                      <input
                        type="number"
                        step="0.00001"
                        value={capturedCoords[1]}
                        onChange={(e) => setCapturedCoords([capturedCoords[0], parseFloat(e.target.value) || 0])}
                        className="w-full p-1 bg-surface border border-border rounded-xs text-[11px] font-mono text-text-primary focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setIsManualCoords(!isManualCoords)}
                  className="text-[10px] text-text-secondary hover:text-text-primary transition-colors underline cursor-pointer"
                >
                  {isManualCoords ? 'Hide Manual Inputs' : 'Edit Coordinates Manually'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-surface p-2.5 rounded-xs border border-border">
                <div className="text-[11px] text-text-secondary">
                  <span>No live GPS fix captured. Default: corridor reference centroid.</span>
                </div>
                <button
                  type="button"
                  onClick={handleAcquireGps}
                  disabled={isLocating}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-xs text-xs font-semibold flex items-center justify-center gap-1.5 btn-press cursor-pointer shrink-0 transition-colors"
                >
                  <Locate className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                  <span>{isLocating ? 'Acquiring GPS Fix...' : 'Acquire Current GPS Location'}</span>
                </button>
              </div>
            )}

            {gpsError && (
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-xs text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                <span>{gpsError}</span>
              </div>
            )}
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
