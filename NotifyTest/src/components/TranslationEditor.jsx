import React, { useState } from 'react';
import { 
  Languages, 
  Volume2, 
  VolumeX,
  Copy, 
  RotateCcw, 
  Check, 
  FileText, 
  Sparkles, 
  Layers, 
  Eye,
  Info,
  SlidersHorizontal,
  SplitSquareVertical,
  Radio
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, calculateSmsMetrics } from '../data/translations';
import { playTextToSpeech, stopTextToSpeech } from '../utils/audioAlert';

export default function TranslationEditor({
  translations,
  onUpdateTranslation,
  onResetTranslations,
  preferMeiteiMayek,
  onToggleMeiteiScript,
  activeIncident
}) {
  const [activeLangId, setActiveLangId] = useState('en');
  const [copiedId, setCopiedId] = useState(null);
  const [playingLangId, setPlayingLangId] = useState(null);
  const [speechPacing, setSpeechPacing] = useState(0.82); // Calm, coherent default pace
  const [viewMode, setViewMode] = useState('editor'); // 'editor' | 'matrix'

  const activeLang = SUPPORTED_LANGUAGES.find(l => l.id === activeLangId) || SUPPORTED_LANGUAGES[0];
  const currentText = translations[activeLangId] || '';
  const smsMetrics = calculateSmsMetrics(currentText, activeLang.isUnicode);

  const handleCopy = (langId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(langId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePlayTTS = (langId = activeLangId, textToPlay = currentText) => {
    if (playingLangId === langId) {
      stopTextToSpeech();
      setPlayingLangId(null);
    } else {
      stopTextToSpeech();
      setPlayingLangId(langId);
      
      playTextToSpeech(
        textToPlay,
        langId,
        activeIncident,
        {
          speed: speechPacing,
          onStart: () => setPlayingLangId(langId),
          onEnd: () => setPlayingLangId(null),
          onError: (e) => {
            console.warn('TTS playback error:', e);
            setPlayingLangId(null);
          }
        }
      );
    }
  };


  const getFontClass = (langId) => {
    switch (langId) {
      case 'hi': return 'font-devanagari';
      case 'as': return 'font-bengali';
      case 'bn': return 'font-bengali';
      case 'mn': return preferMeiteiMayek ? 'font-meitei' : 'font-bengali';
      default: return 'font-sans';
    }
  };

  const activePlayingLang = SUPPORTED_LANGUAGES.find(l => l.id === playingLangId);

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl flex flex-col h-full">
      {/* Header with Language Tabs and View Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <span>2. Regional Multilingual Template Matrix</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono border border-cyan-500/30">
                5 Regional Languages
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Automated translation matrix localized for NER logistics supply corridors
            </p>
          </div>
        </div>

        {/* View Toggle: Single Editor vs All 5 Matrix */}
        <div className="flex items-center gap-2">
          {activeLangId === 'mn' && (
            <button
              onClick={onToggleMeiteiScript}
              className="px-2.5 py-1 rounded-lg bg-slate-800 border border-amber-500/30 text-amber-300 text-[11px] font-medium hover:bg-slate-700 transition-colors"
              title="Switch between Meitei Mayek and Eastern Nagari script"
            >
              Script: {preferMeiteiMayek ? 'Meitei Mayek (ꯃꯤꯇꯩ)' : 'Bengali Script (মৈতৈ)'}
            </button>
          )}

          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-700 p-0.5">
            <button
              onClick={() => setViewMode('editor')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'editor' 
                  ? 'bg-cyan-500 text-slate-950 font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Editor</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                viewMode === 'matrix' 
                  ? 'bg-cyan-500 text-slate-950 font-bold' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>5-Way Matrix</span>
            </button>
          </div>
        </div>
      </div>

      {/* Language Navigation Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-3 no-scrollbar border-b border-slate-800/60">
        {SUPPORTED_LANGUAGES.map((lang) => {
          const isActive = activeLangId === lang.id;
          const isPlaying = playingLangId === lang.id;
          const charLen = (translations[lang.id] || '').length;

          return (
            <button
              key={lang.id}
              onClick={() => setActiveLangId(lang.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-400 text-cyan-200 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className="text-sm">{lang.flag}</span>
              <div className="text-left">
                <div className="font-semibold leading-none flex items-center gap-1.5">
                  <span>{lang.name}</span>
                  {isPlaying && <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />}
                </div>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                  {lang.nativeName} ({charLen}c)
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Spoken Audio Notification Bar */}
      {playingLangId && (
        <div className="mt-3 px-3.5 py-2.5 rounded-xl bg-amber-950/50 border border-amber-500/50 flex items-center justify-between gap-3 text-xs text-amber-200 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-3 bg-amber-400 rounded-full animate-bounce" />
              <span className="w-1.5 h-5 bg-amber-300 rounded-full animate-bounce [animation-delay:0.15s]" />
              <span className="w-1.5 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:0.3s]" />
            </div>
            <div>
              <span className="font-bold text-white">
                Speaking in {activePlayingLang?.name} ({activePlayingLang?.nativeName})
              </span>
              <span className="text-amber-300/80 text-[11px] ml-2 font-mono">
                • Regional Neural Audio Engine Active
              </span>
            </div>
          </div>

          <button
            onClick={() => handlePlayTTS(playingLangId)}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <VolumeX className="w-3.5 h-3.5" />
            <span>Stop Audio</span>
          </button>
        </div>
      )}

      {/* Mode 1: Detailed Interactive Editor & Previewer */}
      {viewMode === 'editor' && (
        <div className="flex flex-col flex-1 mt-3 space-y-3">
          {/* Active Language Context Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">{activeLang.name} ({activeLang.nativeName})</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 font-mono text-[11px]">{activeLang.scriptName}</span>
              <span className="text-slate-500 hidden md:inline">•</span>
              <span className="text-cyan-300 text-[11px] hidden md:inline">{activeLang.targetRegion}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Reset to Auto Template */}
              <button
                onClick={() => onResetTranslations(activeLangId)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="Reset this language text to the automatically generated template"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                <span>Reset</span>
              </button>

              {/* Voice Pacing / Cadence Selector */}
              <div className="hidden sm:flex items-center rounded-lg bg-slate-950/80 border border-slate-700/80 p-0.5 text-[11px] font-mono">
                <button
                  onClick={() => setSpeechPacing(0.80)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    speechPacing === 0.80 
                      ? 'bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/40' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Calm, coherent, well-spaced broadcast cadence"
                >
                  🌿 Calm (0.8x)
                </button>
                <button
                  onClick={() => setSpeechPacing(0.90)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    speechPacing === 0.90 
                      ? 'bg-cyan-500/30 text-cyan-300 font-bold border border-cyan-500/40' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Standard dispatch speed"
                >
                  📻 0.9x
                </button>
                <button
                  onClick={() => setSpeechPacing(1.0)}
                  className={`px-2 py-0.5 rounded transition-all ${
                    speechPacing === 1.0 
                      ? 'bg-slate-700 text-white font-bold' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Standard speed"
                >
                  1.0x
                </button>
              </div>

              {/* TTS Voice Preview */}
              <button
                onClick={() => handlePlayTTS(activeLangId, currentText)}
                className={`flex items-center gap-1 px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${
                  playingLangId === activeLangId
                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-lg shadow-amber-500/20 animate-pulse'
                    : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
                title={`Listen to alert message spoken calmly in ${activeLang.name}`}
              >
                {playingLangId === activeLangId ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Stop Voice</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Listen in {activeLang.name}</span>
                  </>
                )}
              </button>


              {/* Copy */}
              <button
                onClick={() => handleCopy(activeLangId, currentText)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                title="Copy alert text to clipboard"
              >
                {copiedId === activeLangId ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Editable Text Area */}
          <div className="relative flex-1">
            <textarea
              value={currentText}
              onChange={(e) => onUpdateTranslation(activeLangId, e.target.value)}
              rows={4}
              className={`w-full h-full min-h-[120px] p-3.5 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-100 text-sm leading-relaxed focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 outline-none resize-none transition-all ${getFontClass(activeLangId)}`}
              placeholder={`Enter or edit localized alert message in ${activeLang.name}...`}
            />
          </div>

          {/* Telecom Telemetry Bar (SMS Segment & UCS-2 Metrics) */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <div className="flex items-center gap-3 text-slate-400">
              <span>
                Standard: <strong className="text-slate-200">{smsMetrics.isUnicode ? 'UCS-2 Unicode (Indic)' : 'GSM 7-bit (Latin)'}</strong>
              </span>
              <span>•</span>
              <span>
                Length: <strong className="text-cyan-300">{smsMetrics.totalChars}</strong> chars
              </span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-slate-400">
                SMS Segments: <strong className={`font-bold ${smsMetrics.segments > 1 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {smsMetrics.segments} SMS
                </strong> ({smsMetrics.remainingInSegment} chars left in seg)
              </span>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                <Check className="w-3 h-3" />
                <span>GSM Safe</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: 5-Way Matrix Comparison Viewer */}
      {viewMode === 'matrix' && (
        <div className="flex-1 mt-3 space-y-2.5 overflow-y-auto max-h-[380px] pr-1">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const txt = translations[lang.id] || '';
            const metrics = calculateSmsMetrics(txt, lang.isUnicode);
            const isPlaying = playingLangId === lang.id;

            return (
              <div 
                key={lang.id}
                className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{lang.flag}</span>
                    <span className="font-bold text-xs text-white">{lang.name}</span>
                    <span className="text-xs text-slate-400 font-mono">({lang.nativeName})</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                      {metrics.segments} SMS ({metrics.totalChars}c)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {/* Direct Listen Button in Matrix */}
                    <button
                      onClick={() => handlePlayTTS(lang.id, txt)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                        isPlaying
                          ? 'bg-amber-500 text-slate-950 font-bold animate-pulse'
                          : 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                      }`}
                      title={`Listen in ${lang.name}`}
                    >
                      {isPlaying ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
                      <span>{isPlaying ? 'Stop' : 'Listen'}</span>
                    </button>

                    <button
                      onClick={() => handleCopy(lang.id, txt)}
                      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                      title="Copy text"
                    >
                      {copiedId === lang.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    
                    <button
                      onClick={() => {
                        setActiveLangId(lang.id);
                        setViewMode('editor');
                      }}
                      className="text-[11px] px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <p className={`text-xs text-slate-200 leading-relaxed ${getFontClass(lang.id)}`}>
                  {txt}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
