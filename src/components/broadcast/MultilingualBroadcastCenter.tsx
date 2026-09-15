import React, { useState, useEffect } from 'react';
import { usePravahStore } from '../../store/usePravahStore';
import {
  SUPPORTED_LANGUAGES,
  PRESET_PHONETICS,
  PRESET_TRANSLATIONS,
  calculateSmsMetrics,
} from '../../data/translationsData';
import {
  playTextToSpeech,
  stopTextToSpeech,
  playEmergencyAlertSound,
  playDispatchPacketSound,
} from '../../utils/audioAlert';
import type { LanguageId } from '../../types';
import {
  Radio,
  Volume2,
  VolumeX,
  Send,
  MessageSquare,
  Smartphone,
  Bell,
  CheckCircle2,
  Languages,
  Sparkles,
} from 'lucide-react';

export const MultilingualBroadcastCenter: React.FC = () => {
  const {
    broadcastDrafts,
    activeBroadcastLanguage,
    setActiveBroadcastLanguage,
    sendBroadcast,
  } = usePravahStore();

  const [selectedDraftId, setSelectedDraftId] = useState<string>(
    broadcastDrafts[0]?.id || ''
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingLangId, setPlayingLangId] = useState<LanguageId | null>(null);
  const [speechPacing, setSpeechPacing] = useState<number>(0.80);
  const [preferMeiteiMayek, setPreferMeiteiMayek] = useState<boolean>(true);

  // Stop audio on unmount
  useEffect(() => {
    return () => {
      stopTextToSpeech();
    };
  }, []);

  const selectedDraft =
    broadcastDrafts.find((d) => d.id === selectedDraftId) || broadcastDrafts[0];

  // Resolve current text based on script preference for Manipuri
  const getCurrentText = (langId: LanguageId): string => {
    if (!selectedDraft) return '';
    if (langId === 'mn') {
      const incId = selectedDraft.incidentId || selectedDraft.id;
      if (incId && PRESET_TRANSLATIONS[incId]) {
        return preferMeiteiMayek
          ? PRESET_TRANSLATIONS[incId].mn_mayek
          : PRESET_TRANSLATIONS[incId].mn_bengali;
      }
    }
    return selectedDraft.translations[langId] || '';
  };

  const currentText = getCurrentText(activeBroadcastLanguage);
  const activeLangConfig =
    SUPPORTED_LANGUAGES.find((l) => l.id === activeBroadcastLanguage) ||
    SUPPORTED_LANGUAGES[0];
  const smsMetrics = calculateSmsMetrics(currentText, activeLangConfig.isUnicode);

  const handleSpeak = (text: string, langId: LanguageId) => {
    if (isPlayingAudio && playingLangId === langId) {
      stopTextToSpeech();
      setIsPlayingAudio(false);
      setPlayingLangId(null);
      return;
    }

    stopTextToSpeech();
    setIsPlayingAudio(true);
    setPlayingLangId(langId);

    const incidentContext = {
      id: selectedDraft?.incidentId || selectedDraft?.id,
      highway: selectedDraft?.highway,
      location: selectedDraft?.location,
      district: selectedDraft?.location,
      disruptionType: selectedDraft?.disruptionType,
      detourRoute: 'Designated alternate bypass',
      estimatedDelay: '4 hours',
    };

    playTextToSpeech(text, langId, incidentContext, {
      speed: speechPacing,
      onStart: () => {
        setIsPlayingAudio(true);
        setPlayingLangId(langId);
      },
      onEnd: () => {
        setIsPlayingAudio(false);
        setPlayingLangId(null);
      },
      onError: (err) => {
        console.warn('TTS playback error:', err);
        setIsPlayingAudio(false);
        setPlayingLangId(null);
      },
    });
  };

  const handleDispatch = (draftId: string) => {
    playEmergencyAlertSound();
    setTimeout(() => {
      playDispatchPacketSound();
    }, 450);
    sendBroadcast(draftId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-surface border border-border p-5 rounded-md shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Radio className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-semibold text-text-primary">
              Multilingual Automated Emergency Broadcast Dispatcher
            </h1>
          </div>
          <p className="mt-1 text-xs text-text-secondary max-w-3xl">
            Synchronized emergency dispatch generation across 5 North Eastern Region languages (English, Hindi, Assamese, Bengali, Manipuri). Features regional neural audio streams, phonetic fallback synthesis for English-only OS voices, and multi-channel driver telemetry.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-sm bg-primary-tint text-primary font-semibold">
            5 Regional Languages Active
          </span>
        </div>
      </div>

      {/* Main Grid: Drafts Queue (Left 4 cols) + Preview & Channels (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col (4 cols): Active Incident Drafts Queue */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Incident Broadcast Drafts ({broadcastDrafts.length})
          </h2>

          <div className="space-y-2.5">
            {broadcastDrafts.map((d) => {
              const isSelected = d.id === selectedDraftId;
              return (
                <div
                  key={d.id}
                  onClick={() => {
                    setSelectedDraftId(d.id);
                    stopTextToSpeech();
                    setIsPlayingAudio(false);
                    setPlayingLangId(null);
                  }}
                  className={`p-3.5 rounded-md border transition-all cursor-pointer text-xs space-y-1.5 ${
                    isSelected
                      ? 'border-primary bg-primary-tint/20 dark:bg-primary-tint/10 shadow-xs'
                      : 'border-border bg-surface hover:bg-surface-subtle'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-primary">{d.highway}</span>
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-sm border ${
                        d.status === 'SENT'
                          ? 'bg-status-open-tint text-status-open-text border-status-open-solid'
                          : 'bg-status-highrisk-tint text-status-highrisk-text border-status-highrisk-solid'
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>

                  <div className="font-semibold text-text-primary">{d.location}</div>
                  <p className="text-[11px] text-text-secondary truncate">{d.disruptionType}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Col (8 cols): Selected Draft Multilingual Preview & Multi-channel Dispatch */}
        <div className="lg:col-span-8 space-y-5">
          {selectedDraft && (
            <>
              {/* Language Selector Tabs & Voice Controls */}
              <div className="bg-surface border border-border rounded-md shadow-xs p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center space-x-2">
                    <Languages className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold text-text-primary">
                      Regional Script Previewer & Neural Voice Studio
                    </span>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center space-x-2">
                    {/* Script Toggle for Manipuri */}
                    {activeBroadcastLanguage === 'mn' && (
                      <button
                        onClick={() => setPreferMeiteiMayek(!preferMeiteiMayek)}
                        className="px-2 py-1 text-[11px] font-medium rounded-sm border border-border bg-surface-subtle hover:bg-surface text-text-primary btn-press"
                        title="Switch between native Meitei Mayek and Eastern Nagari / Bengali script"
                      >
                        Script: {preferMeiteiMayek ? 'Meitei Mayek (ꯃꯤꯇꯩ)' : 'Bengali Script (মৈতৈ)'}
                      </button>
                    )}

                    {/* Cadence Selector */}
                    <div className="flex items-center rounded-sm bg-surface-subtle border border-border p-0.5 text-[11px] font-mono">
                      <button
                        onClick={() => setSpeechPacing(0.80)}
                        className={`px-2 py-0.5 rounded-xs transition-all ${
                          speechPacing === 0.80
                            ? 'bg-[#1B4B73] dark:bg-[#2E6B9E] text-white font-bold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title="Calm, coherent, well-spaced broadcast cadence"
                      >
                        0.8x Calm
                      </button>
                      <button
                        onClick={() => setSpeechPacing(0.90)}
                        className={`px-2 py-0.5 rounded-xs transition-all ${
                          speechPacing === 0.90
                            ? 'bg-[#1B4B73] dark:bg-[#2E6B9E] text-white font-bold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title="Standard dispatch cadence"
                      >
                        0.9x
                      </button>
                      <button
                        onClick={() => setSpeechPacing(1.0)}
                        className={`px-2 py-0.5 rounded-xs transition-all ${
                          speechPacing === 1.0
                            ? 'bg-[#1B4B73] dark:bg-[#2E6B9E] text-white font-bold'
                            : 'text-text-secondary hover:text-text-primary'
                        }`}
                        title="Normal speed"
                      >
                        1.0x
                      </button>
                    </div>

                    {/* Speech Synthesis Playback */}
                    <button
                      onClick={() => handleSpeak(currentText, activeBroadcastLanguage)}
                      className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded-sm border transition-all btn-press ${
                        isPlayingAudio && playingLangId === activeBroadcastLanguage
                          ? 'border-status-blocked-solid bg-status-blocked-tint text-status-blocked-text animate-pulse'
                          : 'border-primary bg-primary-tint/30 text-primary hover:bg-primary-tint/50'
                      }`}
                      title={`Listen to alert message spoken calmly in ${activeLangConfig.name}`}
                    >
                      {isPlayingAudio && playingLangId === activeBroadcastLanguage ? (
                        <>
                          <VolumeX className="w-3.5 h-3.5 text-status-blocked-solid" />
                          <span>Stop Voice</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3.5 h-3.5 text-primary" />
                          <span>Play Audio ({activeLangConfig.code})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* 5 Language Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  {SUPPORTED_LANGUAGES.map((lang) => {
                    const isSelected = activeBroadcastLanguage === lang.id;
                    const isVoicePlayingThis = isPlayingAudio && playingLangId === lang.id;

                    return (
                      <button
                        key={lang.id}
                        onClick={() => {
                          setActiveBroadcastLanguage(lang.id);
                          if (isPlayingAudio) {
                            stopTextToSpeech();
                            setIsPlayingAudio(false);
                            setPlayingLangId(null);
                          }
                        }}
                        className={`p-2.5 rounded-sm border flex flex-col items-center justify-center space-y-1 transition-all btn-press ${
                          isSelected
                            ? 'border-primary bg-[#1B4B73] dark:bg-[#2E6B9E] text-white shadow-xs'
                            : 'border-border bg-surface-subtle hover:bg-surface text-text-primary'
                        } ${isVoicePlayingThis ? 'ring-2 ring-amber-400 animate-pulse' : ''}`}
                      >
                        <span className="text-base">{lang.flag}</span>
                        <span className="font-semibold text-xs">{lang.name}</span>
                        <span className="text-[10px] opacity-80">{lang.nativeName}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Displayed Translation Card */}
                <div className="p-4 rounded-sm bg-surface-subtle border border-border space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono">
                    <span>
                      Active Script: <strong>{activeLangConfig.scriptName}</strong>
                    </span>
                    <span>Target: {activeLangConfig.targetRegion}</span>
                  </div>

                  <div className="p-3 bg-surface rounded-sm border border-border text-sm font-medium leading-relaxed text-text-primary">
                    {currentText}
                  </div>

                  {/* Phonetic Pronunciation for Drivers & English Voice Engines */}
                  {selectedDraft && (
                    <div className="text-[11px] text-text-secondary pt-1 font-mono space-y-0.5">
                      <div className="flex items-center space-x-1 text-primary font-semibold">
                        <Sparkles className="w-3 h-3" />
                        <span>Phonetic Pronunciation Guide:</span>
                      </div>
                      <div className="text-text-primary bg-surface p-2 rounded-xs border border-border">
                        {PRESET_PHONETICS[selectedDraft.incidentId || selectedDraft.id]?.[
                          activeBroadcastLanguage
                        ] || selectedDraft.phoneticFallback}
                      </div>
                    </div>
                  )}

                  {/* Telecom GSM/Unicode Metrics */}
                  <div className="flex items-center justify-between text-[11px] text-text-secondary font-mono pt-1">
                    <span>
                      SMS Length:{' '}
                      <strong className="text-text-primary">{smsMetrics.totalChars}</strong> chars (
                      {smsMetrics.segments} {smsMetrics.segments === 1 ? 'Segment' : 'Segments'})
                    </span>
                    <span>
                      Encoding:{' '}
                      <strong className="text-text-primary">
                        {smsMetrics.isUnicode ? 'UCS-2 Unicode (70 chars/seg)' : 'GSM-7 Standard (160 chars/seg)'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Broadcast Action Button */}
                <div className="flex items-center justify-between pt-2">
                  <div className="text-xs text-text-secondary">
                    {selectedDraft.status === 'SENT' ? (
                      <span className="text-status-open-text font-medium flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Transmitted to regional towers and driver phones</span>
                      </span>
                    ) : (
                      <span>Ready to transmit on emergency channels</span>
                    )}
                  </div>

                  <button
                    onClick={() => handleDispatch(selectedDraft.id)}
                    className="px-4 py-2 bg-[#1B4B73] hover:bg-[#123A5A] dark:bg-[#2E6B9E] text-white rounded-sm text-xs font-semibold btn-press shadow-xs flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Emergency Broadcast</span>
                  </button>
                </div>
              </div>

              {/* Delivery Channels Telemetry Cards */}
              <div className="bg-surface border border-border rounded-md shadow-xs p-4 space-y-3">
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">
                  Simulated Delivery Channels & Real-Time Telemetry Receipts
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {selectedDraft.channels.map((ch) => {
                    const icon =
                      ch.channel === 'DRIVER_SMS' ? (
                        <Smartphone className="w-4 h-4 text-primary" />
                      ) : ch.channel === 'WHATSAPP_CARD' ? (
                        <MessageSquare className="w-4 h-4 text-status-open-solid" />
                      ) : (
                        <Bell className="w-4 h-4 text-status-blocked-solid" />
                      );

                    return (
                      <div
                        key={ch.channel}
                        className="p-3 rounded-sm border border-border bg-surface-subtle space-y-2 text-xs"
                      >
                        <div className="flex items-center space-x-2 font-semibold text-text-primary">
                          {icon}
                          <span>{ch.channel.replace('_', ' ')}</span>
                        </div>

                        <p className="text-[11px] text-text-secondary">{ch.targetAudience}</p>

                        <div className="pt-2 border-t border-border grid grid-cols-3 gap-1 text-[11px] font-mono text-center">
                          <div className="bg-surface p-1 rounded-sm border border-border">
                            <div className="text-[10px] text-text-secondary">Sent</div>
                            <div className="font-bold text-text-primary">{ch.sentCount}</div>
                          </div>
                          <div className="bg-surface p-1 rounded-sm border border-border">
                            <div className="text-[10px] text-text-secondary">Deliv</div>
                            <div className="font-bold text-status-open-text">{ch.deliveredCount}</div>
                          </div>
                          <div className="bg-surface p-1 rounded-sm border border-border">
                            <div className="text-[10px] text-text-secondary">Read</div>
                            <div className="font-bold text-primary">{ch.readCount}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
