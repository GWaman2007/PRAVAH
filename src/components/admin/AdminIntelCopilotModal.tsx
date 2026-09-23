import React, { useState, useRef } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import { processMultimodalAdminIntel, type MultimodalIntelResult } from '../../engine/geminiService';
import { GEMINI_CONFIG } from '../../engine/geminiConfig';
import type { DraftIncidentPlot } from '../../types';
import {
  Mic,
  Square,
  Upload,
  Image as ImageIcon,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  MapPin,
  Clock,
  ShieldAlert,
  Send,
  HelpCircle,
  Key,
} from 'lucide-react';

interface AdminIntelCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminIntelCopilotModal: React.FC<AdminIntelCopilotModalProps> = ({ isOpen, onClose }) => {
  const { geminiApiKey, setGeminiApiKey, approveDraftPlot, addDraftPlot, focusMapOnCoords } = usePravahStore();

  const [textInput, setTextInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [audioMimeType, setAudioMimeType] = useState<string>('audio/webm');

  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string>('image/jpeg');

  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [pdfFileName, setPdfFileName] = useState<string | null>(null);
  const [pdfMimeType, setPdfMimeType] = useState<string>('application/pdf');

  const [isProcessing, setIsProcessing] = useState(false);
  const [intelResult, setIntelResult] = useState<MultimodalIntelResult | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState('');

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(geminiApiKey);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  if (!isOpen) return null;

  // Handle Voice Recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          setAudioBase64(base64);
          setAudioMimeType('audio/webm');
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn('Microphone access denied or unsupported:', err);
      alert('Microphone access was denied or is not supported by your browser.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  // Handle Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageMimeType(file.type || 'image/jpeg');
      const reader = new FileReader();
      reader.onloadend = () => {
        const full = reader.result as string;
        setImagePreview(full);
        setImageBase64(full.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle PDF Upload
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPdfFileName(file.name);
      setPdfMimeType(file.type || 'application/pdf');
      const reader = new FileReader();
      reader.onloadend = () => {
        const full = reader.result as string;
        setPdfBase64(full.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger Gemini Analysis
  const handleAnalyzeIntel = async (extraContext?: string) => {
    setIsProcessing(true);
    try {
      const fullText = extraContext ? `${textInput} | Context Answer: ${extraContext}` : textInput;
      const res = await processMultimodalAdminIntel({
        text: fullText || undefined,
        audioBase64: audioBase64 || undefined,
        audioMimeType,
        imageBase64: imageBase64 || undefined,
        imageMimeType,
        pdfBase64: pdfBase64 || undefined,
        pdfMimeType,
      });
      setIntelResult(res);

      // Immediately plot extracted draft to the map as a preview pin and focus map
      if (res.draftPlot && !res.needsClarification) {
        addDraftPlot(res.draftPlot);
        focusMapOnCoords(res.draftPlot.coordinates, 12, res.draftPlot.id);
      }
    } catch (err) {
      console.error('Error processing multimodal intel:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct Approve & Plot to Map
  const handleDirectApprove = async (draft: DraftIncidentPlot) => {
    await approveDraftPlot(draft);
    focusMapOnCoords(draft.coordinates, 13.5, draft.id);
    onClose();
  };

  // Save to Draft Queue
  const handleSaveToQueue = async (draft: DraftIncidentPlot) => {
    addDraftPlot(draft);
    focusMapOnCoords(draft.coordinates, 12.5, draft.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar bg-surface border border-border rounded-md shadow-2xl text-text-primary flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-border bg-surface-subtle">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/15 border border-indigo-500/30 rounded-sm text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">
                  Gemini AI Multimodal Intel Copilot
                </h2>
                <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xs">
                  {GEMINI_CONFIG.PRIMARY_MODEL}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary mt-0.5">
                Direct native multimodal ingestion for Voice Notes, Field Photos, PDF Circulars & Radio Dispatch
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); setShowKeyModal(true); }}
              className="p-1.5 text-text-tertiary hover:text-primary hover:bg-surface-subtle rounded-xs transition cursor-pointer"
              title="Configure Gemini API Key"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-subtle rounded-xs transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* API Key Warning Banner */}
        {!geminiApiKey && (
          <div className="mx-4 mt-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-sm flex items-center justify-between text-[11px] text-amber-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>
                Running in <strong>Local Heuristic Fallback</strong> mode. Add a Gemini API key for live deep multimodal reasoning.
              </span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowKeyModal(true); }}
              className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold rounded-xs transition text-[10px] cursor-pointer shrink-0"
            >
              Set Key
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 space-y-4">
          {/* 1. Multimodal Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Audio Voice Recorder */}
            <div className="p-3 bg-surface-subtle border border-border rounded-sm flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-rose-400" /> Audio Voice Note
              </div>
              {isRecording ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-rose-400 font-mono font-bold animate-pulse text-xs">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    Recording... {recordingSeconds}s
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                  >
                    <Square className="w-3 h-3 fill-current" /> Stop Audio
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <button
                    onClick={startRecording}
                    className={`px-2.5 py-1.5 text-[10px] font-bold rounded-xs flex items-center gap-1.5 transition cursor-pointer ${
                      audioBase64
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                        : 'bg-primary hover:bg-primary-hover text-white shadow-xs'
                    }`}
                  >
                    <Mic className="w-3 h-3" />
                    {audioBase64 ? 'Re-record Audio' : 'Record Voice Note'}
                  </button>
                  {audioBase64 && (
                    <span className="text-[10px] text-emerald-400 block font-medium">
                      ✓ Audio buffer attached ({audioMimeType})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Field Photo Upload */}
            <div className="p-3 bg-surface-subtle border border-border rounded-sm flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-sky-400" /> Disaster Photo
              </div>
              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-16 h-14 object-cover rounded-xs border border-border"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                    }}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full text-xs hover:bg-rose-500 cursor-pointer"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer px-2.5 py-1.5 bg-surface hover:bg-surface-subtle border border-border text-text-primary text-[10px] font-bold rounded-xs flex items-center gap-1.5 transition">
                  <Upload className="w-3 h-3 text-sky-400" />
                  Attach Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Official PDF Circular Drop */}
            <div className="p-3 bg-surface-subtle border border-border rounded-sm flex flex-col items-center justify-center text-center space-y-2.5">
              <div className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> PDF Advisory / Memo
              </div>
              {pdfFileName ? (
                <div className="flex items-center gap-2 p-1.5 bg-surface border border-border rounded-xs text-[10px] max-w-full truncate">
                  <FileText className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate text-text-secondary">{pdfFileName}</span>
                  <button
                    onClick={() => {
                      setPdfBase64(null);
                      setPdfFileName(null);
                    }}
                    className="text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer px-2.5 py-1.5 bg-surface hover:bg-surface-subtle border border-border text-text-primary text-[10px] font-bold rounded-xs flex items-center gap-1.5 transition">
                  <Upload className="w-3 h-3 text-amber-400" />
                  Attach PDF
                  <input
                    type="file"
                    accept="application/pdf,text/plain"
                    onChange={handlePdfUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* 2. Text / Dispatch Context Area */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-text-secondary uppercase tracking-wider flex items-center justify-between">
              <span>Wireless Dispatch Text / Officer Bulletin Context</span>
              <span className="text-[10px] text-text-tertiary font-normal normal-case">Optional or supplementary notes</span>
            </label>
            <textarea
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Wireless report from BRO Project Sewak: Massive mudslide 4km before Zubza on NH-29. Road completely cut off. 3 excavator rigs requested."
              className="w-full p-2.5 bg-surface border border-border rounded-sm text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary transition"
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={() => handleAnalyzeIntel()}
            disabled={isProcessing || (!textInput && !audioBase64 && !imageBase64 && !pdfBase64)}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs rounded-sm shadow-xs flex items-center justify-center gap-2 transition btn-press cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gemini Multimodal Reasoning in Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Extract Plottable Ground Truth with Gemini</span>
              </>
            )}
          </button>

          {/* 3. Clarification Dialog (If Gemini returns ambiguity) */}
          {intelResult?.needsClarification && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-sm space-y-2.5">
              <div className="flex items-start gap-2 text-amber-400 text-xs">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-300">Gemini Clarification Required:</h4>
                  <p className="mt-0.5 text-text-secondary">{intelResult.clarifyingQuestion}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clarificationAnswer}
                  onChange={(e) => setClarificationAnswer(e.target.value)}
                  placeholder="Type your response to clarify location or blockage status..."
                  className="flex-1 p-2 bg-surface border border-border rounded-xs text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={() => {
                    handleAnalyzeIntel(clarificationAnswer);
                    setClarificationAnswer('');
                  }}
                  className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold rounded-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Send className="w-3 h-3" /> Send
                </button>
              </div>
            </div>
          )}

          {/* 4. Structured Draft Plot Card (When extraction completes) */}
          {intelResult?.draftPlot && !intelResult.needsClarification && (
            <div className="p-4 bg-surface-subtle border border-emerald-500/30 rounded-sm space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h4 className="font-bold text-text-primary text-xs">
                    {intelResult.draftPlot.title}
                  </h4>
                </div>
                <span className="px-1.5 py-0.5 text-[10px] font-bold font-mono bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-xs">
                  {intelResult.draftPlot.severity}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 bg-surface rounded-xs border border-border">
                  <span className="text-[9px] uppercase font-bold text-text-tertiary block">Corridor</span>
                  <span className="font-medium text-text-primary flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    {intelResult.draftPlot.corridor}
                  </span>
                </div>
                <div className="p-2 bg-surface rounded-xs border border-border">
                  <span className="text-[9px] uppercase font-bold text-text-tertiary block">Hazard Type</span>
                  <span className="font-medium text-text-primary flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    {intelResult.draftPlot.hazardType}
                  </span>
                </div>
                <div className="p-2 bg-surface rounded-xs border border-border">
                  <span className="text-[9px] uppercase font-bold text-text-tertiary block">Est. Cutoff</span>
                  <span className="font-medium text-text-primary flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-sky-400" />
                    {intelResult.draftPlot.estimatedCutoffHours} Hours
                  </span>
                </div>
                <div className="p-2 bg-surface rounded-xs border border-border">
                  <span className="text-[9px] uppercase font-bold text-text-tertiary block">GPS Coordinates</span>
                  <span className="font-mono text-text-primary block mt-0.5">
                    {intelResult.draftPlot.coordinates[0].toFixed(3)}, {intelResult.draftPlot.coordinates[1].toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-surface rounded-xs border border-border text-[11px] text-text-secondary">
                <span className="text-text-tertiary font-bold block text-[10px] mb-0.5">
                  Gemini Operational Summary:
                </span>
                {intelResult.draftPlot.summary}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1.5">
                <button
                  onClick={() => handleSaveToQueue(intelResult.draftPlot!)}
                  className="px-3 py-1.5 bg-surface hover:bg-surface-subtle border border-border text-text-secondary hover:text-text-primary text-[10px] font-bold rounded-xs transition cursor-pointer"
                >
                  Save to Draft Review Queue
                </button>
                <button
                  onClick={() => handleDirectApprove(intelResult.draftPlot!)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-xs shadow-xs flex items-center gap-1.5 transition cursor-pointer btn-press"
                >
                  <CheckCircle2 className="w-3 h-3" />
                  Approve & Plot to Live Map
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-full max-w-md bg-surface border border-border rounded-md p-5 space-y-3 text-text-primary shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-text-primary text-sm flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-400" />
                Configure Gemini API Key
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="p-1 text-text-tertiary hover:text-text-primary rounded-xs cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Enter your Google AI Studio Gemini API key to activate direct native multimodal processing (<code className="font-mono text-indigo-400">gemini-3.5-flash-lite</code> / <code className="font-mono text-indigo-400">gemini-3.1-flash-lite</code>).
            </p>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-2 bg-surface-subtle border border-border rounded-xs text-xs text-text-primary placeholder-text-tertiary focus:outline-none focus:border-primary"
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-2.5 py-1.5 text-[10px] text-text-tertiary hover:text-text-primary font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setGeminiApiKey(tempApiKey);
                  setShowKeyModal(false);
                }}
                className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-[10px] font-bold rounded-xs transition cursor-pointer btn-press"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
