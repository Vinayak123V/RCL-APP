/**
 * Single BLE hook instance for the whole app.
 * Web Bluetooth GATT refs must not be split across multiple hook instances
 * (Chrome disconnects / loses polling when Scan unmounts after connect).
 */
import React, { createContext, useContext, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { useBLE as useWebBLE } from './useBLE';
import { useCapacitorBLE } from './useCapacitorBLE';

export type BleApi = ReturnType<typeof useWebBLE>;

const BleContext = createContext<BleApi | null>(null);

export function BleProvider({ children }: { children: ReactNode }) {
  const webBLE = useWebBLE();
  const capacitorBLE = useCapacitorBLE();
  const api = Capacitor.isNativePlatform() ? capacitorBLE : webBLE;
  return <BleContext.Provider value={api}>{children}</BleContext.Provider>;
}

export function useBLE(): BleApi {
  const ctx = useContext(BleContext);
  if (!ctx) {
    throw new Error('useBLE must be used within BleProvider');
  }
  return ctx;
}
