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
  const { geminiApiKey, setGeminiApiKey, approveDraftPlot, submitCitizenReport } = usePravahStore();

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
    } catch (err) {
      console.error('Error processing multimodal intel:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct Approve & Plot to Map
  const handleDirectApprove = async (draft: DraftIncidentPlot) => {
    await approveDraftPlot(draft.id);
    onClose();
  };

  // Save to Draft Queue
  const handleSaveToQueue = async (draft: DraftIncidentPlot) => {
    await submitCitizenReport({
      rawText: draft.summary,
      coords: draft.coordinates,
      reporterName: draft.sourceReport.reporterName,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl text-slate-100 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/95 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-emerald-500/20 border border-indigo-500/40 rounded-xl text-indigo-400">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  Gemini AI Multimodal Intel Copilot
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full">
                  {GEMINI_CONFIG.PRIMARY_MODEL}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct native multimodal ingestion for Voice Notes, Field Photos, PDF Circulars & Radio Dispatch
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
              title="Configure Gemini API Key"
            >
              <Key className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* API Key Modal Banner if not set */}
        {!geminiApiKey && (
          <div className="mx-6 mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Running in <strong>Local Heuristic Fallback</strong> mode. Add a Gemini API key for live deep multimodal reasoning.
              </span>
            </div>
            <button
              onClick={() => setShowKeyModal(true)}
              className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-medium rounded-lg transition-colors"
            >
              Set Key
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* 1. Multimodal Inputs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Audio Voice Recorder */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Mic className="w-4 h-4 text-rose-400" /> Audio Voice Note
              </div>
              {isRecording ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 text-rose-400 font-mono font-bold animate-pulse text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    Recording... {recordingSeconds}s
                  </div>
                  <button
                    onClick={stopRecording}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-900/30"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" /> Stop Audio
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={startRecording}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ${
                      audioBase64
                        ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-600/40'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/30'
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5" />
                    {audioBase64 ? 'Re-record Audio' : 'Record Voice Note'}
                  </button>
                  {audioBase64 && (
                    <span className="text-[11px] text-emerald-400 block font-medium">
                      ✓ Audio buffer attached ({audioMimeType})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Field Photo Upload */}
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-sky-400" /> Disaster Photo
              </div>
              {imagePreview ? (
                <div className="relative group">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-16 object-cover rounded-lg border border-slate-600"
                  />
                  <button
                    onClick={() => {
                      setImagePreview(null);
                      setImageBase64(null);
                    }}
                    className="absolute -top-1.5 -right-1.5 p-0.5 bg-rose-600 text-white rounded-full text-xs hover:bg-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-sky-400" />
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
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" /> PDF Advisory / Memo
              </div>
              {pdfFileName ? (
                <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 border border-slate-700 rounded-lg text-xs max-w-full truncate">
                  <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="truncate text-slate-300">{pdfFileName}</span>
                  <button
                    onClick={() => {
                      setPdfBase64(null);
                      setPdfFileName(null);
                    }}
                    className="text-rose-400 hover:text-rose-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors">
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Wireless Dispatch Text / Officer Bulletin Context</span>
              <span className="text-[11px] text-slate-400 font-normal">Optional or supplementary notes</span>
            </label>
            <textarea
              rows={3}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="e.g. Wireless report from BRO Project Sewak: Massive mudslide 4km before Zubza on NH-29. Road completely cut off. 3 excavator rigs requested."
              className="w-full p-3 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={() => handleAnalyzeIntel()}
            disabled={isProcessing || (!textInput && !audioBase64 && !imageBase64 && !pdfBase64)}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-950/40 flex items-center justify-center gap-2 transition-all"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Gemini Multimodal Reasoning in Progress...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract Plottable Ground Truth with Gemini</span>
              </>
            )}
          </button>

          {/* 3. Clarification Dialog (If Gemini returns ambiguity) */}
          {intelResult?.needsClarification && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5 text-amber-300 text-sm">
                <HelpCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-200">Gemini Clarification Required:</h4>
                  <p className="mt-1 text-slate-300">{intelResult.clarifyingQuestion}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clarificationAnswer}
                  onChange={(e) => setClarificationAnswer(e.target.value)}
                  placeholder="Type your response to clarify location or blockage status..."
                  className="flex-1 p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
                <button
                  onClick={() => {
                    handleAnalyzeIntel(clarificationAnswer);
                    setClarificationAnswer('');
                  }}
                  className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" /> Send
                </button>
              </div>
            </div>
          )}

          {/* 4. Structured Draft Plot Card (When extraction completes) */}
          {intelResult?.draftPlot && !intelResult.needsClarification && (
            <div className="p-5 bg-slate-800/80 border border-emerald-500/30 rounded-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <h4 className="font-bold text-white text-sm">
                    {intelResult.draftPlot.title}
                  </h4>
                </div>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full">
                  {intelResult.draftPlot.severity}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Corridor</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-indigo-400" />
                    {intelResult.draftPlot.corridor}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Hazard Type</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3 h-3 text-amber-400" />
                    {intelResult.draftPlot.hazardType}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">Est. Cutoff</span>
                  <span className="font-medium text-slate-200 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-sky-400" />
                    {intelResult.draftPlot.estimatedCutoffHours} Hours
                  </span>
                </div>
                <div className="p-2.5 bg-slate-900/60 rounded-lg border border-slate-700/40">
                  <span className="text-slate-400 block text-[10px] uppercase">GPS Coordinates</span>
                  <span className="font-mono text-slate-200 block mt-0.5">
                    {intelResult.draftPlot.coordinates[0].toFixed(3)}, {intelResult.draftPlot.coordinates[1].toFixed(3)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/40 text-xs text-slate-300">
                <span className="text-slate-400 font-semibold block text-[11px] mb-1">
                  Gemini Operational Summary:
                </span>
                {intelResult.draftPlot.summary}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => handleSaveToQueue(intelResult.draftPlot!)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                >
                  Save to Draft Review Queue
                </button>
                <button
                  onClick={() => handleDirectApprove(intelResult.draftPlot!)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Approve & Plot to Live Map
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-xl p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-indigo-400" />
                Configure Gemini API Key
              </h3>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Enter your Google AI Studio Gemini API key to activate direct native multimodal processing (`gemini-3.5-flash-lite` / `gemini-3.1-flash-lite`).
            </p>
            <input
              type="password"
              value={tempApiKey}
              onChange={(e) => setTempApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setGeminiApiKey(tempApiKey);
                  setShowKeyModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition-colors"
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
