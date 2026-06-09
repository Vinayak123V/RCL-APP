# RC Labs BMS — Android & iOS Build Guide

## Architecture

```
React + Vite (frontend/)
    │
    ├── useBLEAdapter.ts          ← runtime selector
    │       ├── useBLE.ts         ← Web / Electron (browser + desktop)
    │       └── useCapacitorBLE.ts← Android / iOS (native BLE via Capacitor)
    │
    └── Capacitor shell
            ├── android/          ← Android Studio project
            └── ios/              ← Xcode project
```

`Capacitor.isNativePlatform()` returns `true` on Android/iOS and `false` in the
browser, so the right BLE implementation is selected automatically.

---

## Prerequisites

### For Android
| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 18 | https://nodejs.org |
| Android Studio | Hedgehog+ | https://developer.android.com/studio |
| Android SDK | API 31+ | via Android Studio SDK Manager |
| Java JDK | 17 | bundled with Android Studio |

### For iOS (macOS only)
| Tool | Version | Install |
|------|---------|---------|
| Xcode | 15+ | Mac App Store |
| CocoaPods | latest | `sudo gem install cocoapods` |
| Xcode CLI tools | latest | `xcode-select --install` |

---

## Quick Start

### 1. Install dependencies
```bash
npm run install:all
```

### 2. Build web assets
```bash
npm run build:frontend
```

### 3. Sync to native projects
```bash
npm run cap:sync
```

### 4. Open in IDE and run

**Android:**
```bash
npm run cap:android
# Opens Android Studio → click ▶ Run
```

**iOS (macOS only):**
```bash
npm run cap:ios
# Opens Xcode → select a simulator or device → click ▶ Run
# First time: run `pod install` inside frontend/ios/App/
```

---

## Development Workflow

### Live reload on a physical device
```bash
# 1. Find your machine's local IP
ipconfig   # Windows
ifconfig   # macOS/Linux

# 2. Start the dev server
npm run dev:frontend

# 3. Update capacitor.config.ts to point at your dev server:
#    server: { url: 'http://192.168.x.x:5173', cleartext: true }

# 4. Sync and run
npm run cap:sync
npm run cap:run:android   # or cap:run:ios
```

### Full rebuild cycle
```bash
npm run cap:build   # build:frontend + cap sync
```

---

## BLE Permissions

### Android (already configured in AndroidManifest.xml)
- `BLUETOOTH_SCAN` — scan for devices (Android 12+)
- `BLUETOOTH_CONNECT` — connect to devices (Android 12+)
- `BLUETOOTH` + `BLUETOOTH_ADMIN` — legacy (Android ≤ 11)
- `ACCESS_FINE_LOCATION` — required for BLE scan on Android ≤ 11

The app uses `androidNeverForLocation: true` so no location permission is
needed on Android 12+.

### iOS (already configured in Info.plist)
- `NSBluetoothAlwaysUsageDescription` — required by App Store
- `bluetooth-central` background mode — allows BLE while app is backgrounded

---

## Signing & Distribution

### Android — Debug APK
```bash
# In Android Studio: Build → Build Bundle(s)/APK(s) → Build APK(s)
# Output: frontend/android/app/build/outputs/apk/debug/app-debug.apk
```

### Android — Release APK
1. Generate a keystore: `keytool -genkey -v -keystore release.jks ...`
2. Add signing config to `frontend/android/app/build.gradle`
3. Build → Generate Signed Bundle/APK

### iOS — TestFlight / App Store
1. Open Xcode → select "Any iOS Device"
2. Product → Archive
3. Distribute App → App Store Connect

---

## Project Structure After Conversion

```
frontend/
├── android/                  ← Android Studio project (git-tracked)
│   └── app/src/main/
│       └── AndroidManifest.xml  ← BLE permissions
├── ios/                      ← Xcode project (git-tracked)
│   └── App/App/
│       └── Info.plist           ← BLE usage strings
├── capacitor.config.ts       ← Capacitor configuration
├── src/
│   ├── hooks/
│   │   ├── useBLE.ts            ← Web / Electron BLE
│   │   ├── useCapacitorBLE.ts   ← Android / iOS BLE  ← NEW
│   │   └── useBLEAdapter.ts     ← Runtime selector    ← NEW
│   └── main.tsx                 ← Capacitor-aware bootstrap
└── dist/                     ← Built web assets (synced to native)
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `pod install` fails | `sudo gem install cocoapods && pod install` in `frontend/ios/App/` |
| BLE scan returns nothing | Enable Bluetooth + grant permissions on device |
| White screen on Android | Check `adb logcat` for JS errors; ensure `dist/` was synced |
| iOS build fails | Run `xcode-select --install` and ensure Xcode 15+ |
| `BLUETOOTH_SCAN` denied | User must grant permission at runtime — handled by BleClient |
| Demo mode not working | Enable Demo Mode in Profile → Settings |
