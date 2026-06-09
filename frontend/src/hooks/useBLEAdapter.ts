/**
 * useBLEAdapter — re-exports the shared BLE context API.
 * Implementation lives in BleProvider (one GATT session for the whole app).
 */
export { useBLE, BleProvider } from './BleProvider';
