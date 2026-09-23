/**
 * ============================================================================
 * PRAVAH - Gemini Multimodal AI Intelligence Pipeline Configuration
 * Direct API Integration using Official Google Gemini Models
 * ============================================================================
 */

export const GEMINI_CONFIG = {
  // Official active Google Gemini models with primary -> secondary fallback
  PRIMARY_MODEL: 'gemini-3.5-flash-lite',
  BACKUP_MODEL: 'gemini-3.1-flash-lite',
  FAST_MODEL: 'gemini-3.5-flash-lite',
  LITE_MODEL: 'gemini-3.1-flash-lite',
  FLASH_MODEL: 'gemini-3.5-flash',
  PRO_MODEL: 'gemini-1.5-pro',
  LEGACY_FALLBACK: 'gemini-1.5-flash',
  API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
  STORAGE_KEY_API_KEY: 'pravah_gemini_api_key',
  STORAGE_KEY_ACTIVE_MODEL: 'pravah_gemini_active_model',
  DEFAULT_TEMPERATURE: 0.2,
  MAX_OUTPUT_TOKENS: 2048,
};

let inMemoryApiKey = '';

/**
 * Retrieves the currently active Gemini API key from memory, localStorage, or environment variables.
 * Automatically inspects all common key variations so user-provided keys in localStorage work instantly.
 */
export function getGeminiApiKey(): string {
  if (inMemoryApiKey && inMemoryApiKey.trim().length > 0) {
    return inMemoryApiKey.trim();
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    // 1. Direct candidate keys
    const candidateKeys = [
      'pravah_gemini_api_key',
      'gemini_api_key',
      'GEMINI_API_KEY',
      'VITE_GEMINI_API_KEY',
      'geminiApiKey',
      'GeminiApiKey',
      'gemini_key',
      'GEMINI_KEY',
      'google_api_key',
      'GOOGLE_API_KEY',
      'apiKey',
      'API_KEY',
    ];

    for (const key of candidateKeys) {
      const stored = localStorage.getItem(key);
      if (stored && stored.trim().length > 0) {
        const clean = stored.replace(/^["']|["']$/g, '').trim();
        if (clean.length > 5) return clean;
      }
    }

    // 2. Scan all localStorage keys for any containing 'gemini'
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && /gemini/i.test(k)) {
          const val = localStorage.getItem(k);
          if (val && val.trim().length > 0 && !val.includes('{') && !val.includes('[')) {
            const clean = val.replace(/^["']|["']$/g, '').trim();
            if (clean.length > 5) return clean;
          }
        }
      }
    } catch {
      // ignore security exceptions if third-party storage is restricted
    }

    // 3. Scan all localStorage values for Google API keys starting with 'AIzaSy'
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          const val = localStorage.getItem(k);
          if (val && typeof val === 'string') {
            const clean = val.replace(/^["']|["']$/g, '').trim();
            if (clean.startsWith('AIzaSy')) {
              return clean;
            }
          }
        }
      }
    } catch {
      // ignore
    }
  }

  // 4. Vite client environment variable (check all variations)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const candidateEnv = [
      import.meta.env.VITE_GEMINI_API_KEY,
      import.meta.env.GEMINI_API_KEY,
      import.meta.env.VITE_GOOGLE_API_KEY,
      import.meta.env.GOOGLE_API_KEY,
      (import.meta.env as any).VITE_API_KEY,
      (import.meta.env as any).API_KEY,
    ];
    for (const val of candidateEnv) {
      if (val && typeof val === 'string' && val.trim().length > 5) {
        return val.replace(/^["']|["']$/g, '').trim();
      }
    }
  }

  // 5. Node / Server / Process environment variable
  try {
    const envProcess = typeof (globalThis as any).process !== 'undefined' ? (globalThis as any).process?.env : undefined;
    if (envProcess) {
      const pKey =
        envProcess.VITE_GEMINI_API_KEY ||
        envProcess.GEMINI_API_KEY ||
        envProcess.GOOGLE_API_KEY ||
        envProcess.VITE_GOOGLE_API_KEY;
      if (pKey && typeof pKey === 'string' && pKey.trim().length > 5) {
        return pKey.replace(/^["']|["']$/g, '').trim();
      }
    }
  } catch {
    // ignore
  }

  return '';
}

/**
 * Persists the user-provided Gemini API key to in-memory state and localStorage
 */
export function setGeminiApiKey(apiKey: string): void {
  inMemoryApiKey = (apiKey || '').trim();
  if (typeof window !== 'undefined' && window.localStorage) {
    if (apiKey && apiKey.trim().length > 0) {
      localStorage.setItem(GEMINI_CONFIG.STORAGE_KEY_API_KEY, apiKey.trim());
      // Also sync to common aliases so other tabs/tools find it
      localStorage.setItem('gemini_api_key', apiKey.trim());
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      localStorage.setItem('VITE_GEMINI_API_KEY', apiKey.trim());
    } else {
      localStorage.removeItem(GEMINI_CONFIG.STORAGE_KEY_API_KEY);
      localStorage.removeItem('gemini_api_key');
      localStorage.removeItem('GEMINI_API_KEY');
      localStorage.removeItem('VITE_GEMINI_API_KEY');
    }
  }
}

/**
 * Checks whether a valid Gemini API key is configured
 */
export function hasGeminiApiKey(): boolean {
  return getGeminiApiKey().length > 0;
}
