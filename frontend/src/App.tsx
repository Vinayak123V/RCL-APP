import React, { useState, useCallback, useEffect, useRef } from 'react';
import { HomeScreen }    from './pages/HomeScreen';
import { AdvanceScreen } from './pages/AdvanceScreen';
import { ScanScreen }    from './pages/ScanScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { LoginScreen }   from './pages/LoginScreen';
import { LaunchScreen }  from './pages/LaunchScreen';
import { BottomNav }     from './components/mobile/BottomNav';
import { ToastContainer, ToastMessage } from './components/mobile/Toast';
import { useBmsStore }   from './store/bmsStore';
import { useAuthStore }  from './store/authStore';
import { useSettingsStore } from './store/settingsStore';
import { useDeviceHistoryStore } from './store/deviceHistoryStore';
export type Tab = 'home' | 'advance'| 'alerts' | 'history' | 'profile';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab]       = useState<Tab>('home');
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Dedup ref — prevents the same message firing twice in a row
  const lastMsgRef    = useRef<string>('');
  const dedupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isAuthenticated, hydrate: hydrateAuth } = useAuthStore();
  const { hydrate: hydrateSettings }              = useSettingsStore();
  const { hydrate: hydrateHistory }               = useDeviceHistoryStore();
  const { connectionStatus, error } = useBmsStore();
  const connected = connectionStatus === 'connected';
  const [prevConnected, setPrevConnected] = useState(false);

  // Hydrate persisted state on mount
  useEffect(() => {
    hydrateAuth();
    hydrateSettings();
    hydrateHistory();
  }, []);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000); // Faster loading time
    return () => clearTimeout(timer);
  }, []);

  /**
   * Single-slot toast — replaces any existing toast immediately.
   * Identical consecutive messages are suppressed.
   */
  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    // Suppress exact duplicate that is already showing
    if (message === lastMsgRef.current) return;

    lastMsgRef.current = message;

    // Clear previous dedup window
    if (dedupTimerRef.current) clearTimeout(dedupTimerRef.current);
    // Reset dedup key slightly after the toast would have auto-dismissed
    dedupTimerRef.current = setTimeout(() => {
      lastMsgRef.current = '';
    }, 3500);

    // Replace — single slot, no stacking
    setToasts([{ id: Date.now(), message, type }]);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(p => p.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    if (connected && !prevConnected) {
      addToast('Device connected', 'success');
      setTab('home');
    }
    if (!connected && prevConnected && connectionStatus !== 'connecting') {
      addToast('Device disconnected', 'info');
    }
    setPrevConnected(connected);
  }, [connected, connectionStatus, prevConnected, addToast]);

  useEffect(() => {
    if (error) addToast(error, 'error');
  }, [error]);

  // Show splash screen
  if (showSplash) {
    return <LaunchScreen />;
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="h-full">
        <LoginScreen onToast={addToast} />
        <ToastContainer toasts={toasts} onRemove={removeToast} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: 'linear-gradient(170deg, #0f172a 0%, #020617 100%)' }}>
      <div className="flex-1 overflow-hidden relative">
        {tab === 'home'    && <HomeScreen    onNavigate={setTab} onToast={addToast} />}
        {tab === 'advance' && <AdvanceScreen onNavigate={setTab} />}

        {tab === 'profile' && <ProfileScreen onNavigate={setTab} onToast={addToast} />}
      </div>
      <BottomNav active={tab} onChange={setTab} />
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
}
