import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rclabs.bmsmonitor',
  appName: 'ASTRA',
  webDir: 'dist',
  plugins: {
    // Capacitor BLE plugin configuration
    BluetoothLe: {
      displayStrings: {
        scanning: 'Scanning for BMS devices…',
        cancel: 'Cancel',
        availableDevices: 'Available Devices',
        noDeviceFound: 'No BMS device found',
      },
    },
  },
  android: {
    // Allow cleartext traffic for local dev server
    allowMixedContent: true,
    // Target Android 12+ (API 31+) for BLE permissions
    minWebViewVersion: 55,
  },
  ios: {
    // Required for BLE background scanning
    backgroundColor: '#020617',
    contentInset: 'always',
    scrollEnabled: false,
  },
};

export default config;
