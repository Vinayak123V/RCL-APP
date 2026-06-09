import { create } from 'zustand';

export type TempUnit = '°C' | '°F';
export type Language = 'English' | 'Hindi' | 'Kannada';

interface SettingsState {
  language: Language;
  tempUnit: TempUnit;
  autoConnect: boolean;
  demoMode: boolean;          // ← NEW: enables simulated BLE + data
  lastDeviceId: string | null;

  setLanguage: (l: Language) => void;
  setTempUnit: (u: TempUnit) => void;
  setAutoConnect: (v: boolean) => void;
  setDemoMode: (v: boolean) => void;  // ← NEW
  setLastDevice: (id: string | null) => void;
  clearCache: () => void;
  hydrate: () => void;
}

const KEY = 'bms_settings';

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function persist(patch: object) {
  localStorage.setItem(KEY, JSON.stringify({ ...load(), ...patch }));
}

export const useSettingsStore = create<SettingsState>((set) => ({
  language:     'English',
  tempUnit:     '°C',
  autoConnect:  true,
  demoMode:     false,   // OFF by default — real BLE only
  lastDeviceId: null,

  hydrate: () => {
    const s = load();
    set({
      language:     s.language     ?? 'English',
      tempUnit:     s.tempUnit     ?? '°C',
      autoConnect:  s.autoConnect  ?? true,
      demoMode:     s.demoMode     ?? false,
      lastDeviceId: s.lastDeviceId ?? null,
    });
  },

  setLanguage:    (language)    => { persist({ language });    set({ language }); },
  setTempUnit:    (tempUnit)    => { persist({ tempUnit });    set({ tempUnit }); },
  setAutoConnect: (autoConnect) => { persist({ autoConnect }); set({ autoConnect }); },
  setDemoMode:    (demoMode)    => { persist({ demoMode });    set({ demoMode }); },
  setLastDevice:  (lastDeviceId) => { persist({ lastDeviceId }); set({ lastDeviceId }); },

  clearCache: () => {
    localStorage.removeItem(KEY);
    set({ language: 'English', tempUnit: '°C', autoConnect: true, demoMode: false, lastDeviceId: null });
  },}));

/** Convert temperature value based on unit setting */
export function convertTemp(celsius: number, unit: TempUnit): number {
  return unit === '°F' ? Math.round((celsius * 9 / 5 + 32) * 10) / 10 : celsius;
}
