// Browser Web Audio API Synthesizer & Multilingual Regional TTS Engine

import { 
  PRESET_PHONETICS, 
  PRESET_TRANSLATIONS, 
  SUPPORTED_LANGUAGES, 
  getCalmBroadcastSpeechText 
} from '../data/translations';

let audioCtx = null;
let currentAudio = null;
let currentUtterance = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Plays a distinct two-tone emergency broadcast alert siren
 */
export function playEmergencyAlertSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sawtooth';
    
    // Frequency modulation: high-low warble
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.25);
    osc1.frequency.setValueAtTime(880, now + 0.3);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.55);
    osc1.frequency.setValueAtTime(987.77, now + 0.6);
    osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.9);

    // Gain envelope
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.18, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    osc1.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 1.15);
  } catch (e) {
    console.warn('Audio alert playback error:', e);
  }
}

/**
 * Dispatch packet transmission chirp (short digital beep)
 */
export function playDispatchPacketSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(2200, now + 0.08);

    gainNode.gain.setValueAtTime(0.08, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    // Graceful fallback
  }
}

/**
 * Driver Action ACK chime (clean double-ding)
 */
export function playAckChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Ding 1
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(659.25, now); // E5
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // Ding 2
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880, now + 0.12); // A5
    gain2.gain.setValueAtTime(0.18, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.45);
  } catch (e) {
    // Graceful fallback
  }
}

/**
 * Resolves the optimal text and language code for calm, coherent TTS playback
 */
function resolveTtsParameters(text, langId, incident) {
  let googleLang = 'en';

  // Use the calm broadcast announcement script with natural pauses and cadence
  let cleanText = getCalmBroadcastSpeechText(incident, langId, text);

  // If user passed a heavily edited custom text, ensure natural punctuation pauses
  if (!cleanText) {
    cleanText = text || '';
    cleanText = cleanText
      .replace(/:\s*/g, '. ... ')
      .replace(/\s*\(\s*/g, ', ')
      .replace(/\s*\)\s*/g, ', ')
      .replace(/\s*;\s*/g, '. ... ')
      .replace(/\//g, ' or ');
  }

  // Google TTS URL character limits: truncate cleanly at a natural sentence boundary if needed
  if (cleanText.length > 190) {
    const sentenceBreak = cleanText.indexOf('।');
    if (sentenceBreak > 40 && sentenceBreak <= 190) {
      cleanText = cleanText.substring(0, sentenceBreak + 1);
    } else {
      const dotBreak = cleanText.indexOf('...');
      if (dotBreak > 40 && dotBreak <= 190) {
        cleanText = cleanText.substring(0, dotBreak + 3);
      } else {
        cleanText = cleanText.substring(0, 190);
      }
    }
  }

  switch (langId) {
    case 'hi':
      googleLang = 'hi';
      break;
    case 'bn':
      googleLang = 'bn';
      break;
    case 'as':
      // Assamese Eastern Nagari script is pronounced with high phonetic clarity via Bengali TTS
      googleLang = 'bn';
      break;
    case 'mn':
      // For Manipuri: if in Meitei Mayek, route Eastern Nagari script for clear speech engine pronunciation
      googleLang = 'bn';
      if (/[\uABC0-\uABFF]/.test(cleanText)) {
        if (incident && PRESET_TRANSLATIONS[incident.id]?.mn_bengali) {
          cleanText = PRESET_TRANSLATIONS[incident.id].mn_bengali;
          if (cleanText.length > 190) cleanText = cleanText.substring(0, 190);
        }
      }
      break;
    default:
      googleLang = 'en';
  }

  return { googleLang, cleanText };
}

/**
 * Fallback to Web Speech API with dynamic voice discovery and phonetic romanization
 */
function fallbackToWebSpeech(text, langId, incident, speed = 0.82, onStart, onEnd, onError) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    playEmergencyAlertSound();
    onError?.('SpeechSynthesis not supported');
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const voices = window.speechSynthesis.getVoices();
    const langConfig = SUPPORTED_LANGUAGES.find(l => l.id === langId) || SUPPORTED_LANGUAGES[0];

    // Find best voice match in browser
    let matchedVoice = null;
    if (langConfig.voiceFallbacks && voices.length > 0) {
      for (const code of langConfig.voiceFallbacks) {
        matchedVoice = voices.find(v => 
          v.lang.toLowerCase().replace('_', '-').startsWith(code.toLowerCase())
        );
        if (matchedVoice) break;
      }
    }

    // Determine what text to speak:
    // If we only have an English voice on Windows (e.g. David/Zira), raw Indic characters won't pronounce correctly.
    // In that case, use the precise phonetic romanized transcription!
    let speechText = getCalmBroadcastSpeechText(incident, langId, text);
    let targetLang = langConfig.ttsLang;

    const isEnglishOnlyVoice = !matchedVoice || matchedVoice.lang.startsWith('en');
    if (langId !== 'en' && isEnglishOnlyVoice) {
      if (incident && PRESET_PHONETICS[incident.id]?.[langId]) {
        speechText = PRESET_PHONETICS[incident.id][langId];
      }
      targetLang = 'en-US';
    }

    const utterance = new SpeechSynthesisUtterance(speechText);
    utterance.lang = targetLang;
    
    // Calm, relaxed, coherent speech rate and warm pitch
    utterance.rate = Math.max(0.72, speed * 0.9);
    utterance.pitch = 0.94; // slightly deeper, natural broadcast tone

    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onstart = () => { onStart?.(); };
    utterance.onend = () => { onEnd?.(); };
    utterance.onerror = (err) => { 
      console.warn('SpeechSynthesis error:', err);
      onError?.(err); 
    };

    currentUtterance = utterance;
    // Delay slightly to prevent Chrome cancel bug
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 60);

  } catch (err) {
    console.warn('Fallback speech failed:', err);
    onError?.(err);
  }
}

/**
 * Native Language TTS Engine (Neural Audio Stream + Web Speech Hybrid)
 * Default speed is 0.82 for a calm, coherent, easily understood broadcast pace
 */
export function playTextToSpeech(text, langId = 'en', incident = null, callbacks = {}) {
  const { onStart, onEnd, onError, speed = 0.82 } = callbacks;

  stopTextToSpeech();

  const { googleLang, cleanText } = resolveTtsParameters(text, langId, incident);

  try {
    // Primary: Regional Audio Stream via local dev proxy to avoid browser Referer blocks
    const audioUrl = `/api/tts?tl=${googleLang}&q=${encodeURIComponent(cleanText)}`;
    const audio = new Audio(audioUrl);
    currentAudio = audio;

    // Set calm and coherent playback speed with pitch preservation
    audio.playbackRate = speed;
    if ('preservesPitch' in audio) {
      audio.preservesPitch = true;
    }


    audio.onplay = () => {
      onStart?.();
    };

    audio.onended = () => {
      currentAudio = null;
      onEnd?.();
    };

    audio.onerror = (e) => {
      console.warn('Neural audio stream failed, falling back to Web Speech API:', e);
      currentAudio = null;
      fallbackToWebSpeech(text, langId, incident, speed, onStart, onEnd, onError);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Audio play() rejected, falling back to Web Speech:', err);
        fallbackToWebSpeech(text, langId, incident, speed, onStart, onEnd, onError);
      });
    }
  } catch (e) {
    fallbackToWebSpeech(text, langId, incident, speed, onStart, onEnd, onError);
  }
}

/**
 * Stops any playing TTS audio or speech synthesis
 */
export function stopTextToSpeech() {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.currentTime = 0;
    } catch (e) {}
    currentAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {}
    currentUtterance = null;
  }
}
