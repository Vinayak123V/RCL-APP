/** Chrome / Edge Web Bluetooth (requires secure context: HTTPS or localhost). */
export function hasWebBluetooth(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth?.requestDevice;
}

export function isBluetoothSecureContext(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext;
}

export function webBluetoothBlockedReason(): string | null {
  if (!hasWebBluetooth()) {
    return 'Web Bluetooth is not supported. Use Chrome or Edge.';
  }
  if (!isBluetoothSecureContext()) {
    return 'Web Bluetooth requires HTTPS or localhost. Open https://localhost:5173 (run npm run dev).';
  }
  return null;
}
