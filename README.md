# FindTrack 📍

**Find your Bluetooth devices. Stay connected.**

A real, installable Android application that scans for nearby Bluetooth LE devices, estimates distance from RSSI signal strength, locates devices on a map, tracks live signal in real time, and keeps a location history — all offline-first, no account required, no API keys needed.

![FindTrack](https://img.shields.io/badge/platform-Android-green?logo=android)
![Capacitor](https://img.shields.io/badge/built%20with-Capacitor-blue?logo=capacitor)
![React](https://img.shields.io/badge/frontend-React-black?logo=react)
![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)

---

## 📥 Download

### Debug APK (ready to install)

| Asset | Version | Size | Architecture |
|---|---|---|---|
| `FindTrack-debug.apk` | 1.3.0 | 6.4 MB | ARM64 / ARMv7 / x86 |

**Direct download:**
https://github.com/galaxymushizo-netizen/kodisalama-mobile/releases/latest

### Install on your phone

1. Download the APK from the release above.
2. On your Android phone, enable **"Install unknown apps"** for your browser/file manager.
3. Open the APK and tap **Install**.
4. Launch **FindTrack**, grant **Bluetooth** and **Location** permissions when prompted.

> **Requirements:** Android 7.0 (API 24) or higher, Bluetooth LE hardware, Location permission (Android requires it for BLE scanning).

---

## ✨ Features

| Screen | What it does |
|---|---|
| **Home** | Map view with nearby devices, live scanning banner, floating scan button, one-tap "Start Tracking" |
| **Devices** | Full list of discovered Bluetooth LE devices with RSSI, estimated distance, last-seen time, signal-quality badge, pull-to-refresh scan |
| **Tracking** | Live pulsing signal gauge, approximate distance, "getting closer" status, Stop Tracking button |
| **Finder Map** | Full-screen map with the selected device pinned, accuracy circle, last-seen location card |
| **History** | Recent device locations with timestamps, signal strength, distance, address; last-known-location auto-saved on disconnect |

### Core capabilities

- **Bluetooth LE scanning** via `@capacitor-community/bluetooth-le` — discovers nearby devices and reads RSSI + MAC address
- **RSSI → distance estimation** using the log-distance path-loss model (metres/km)
- **Signal quality labels** — Strong / Good / Fair / Weak with color coding
- **Deduplication by MAC address** — merges new scans with previously seen devices
- **Persistent local storage** — devices and history survive app restarts (`localStorage`)
- **Seeded demo data** — 5 pre-loaded devices so the app works immediately
- **OpenStreetMap maps** — no Google Maps API key, no API credentials required
- **PWA offline support** — Workbox service worker caches app shell and assets
- **Local notifications** — ready for tracking alerts (`POST_NOTIFICATIONS` on Android 13+)

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Build | Vite 8 |
| Mobile shell | Capacitor 8 (Android) |
| Bluetooth LE | `@capacitor-community/bluetooth-le` 8.3.0 |
| Maps | Leaflet + OpenStreetMap (no API key) |
| Offline / PWA | `vite-plugin-pwa` + Workbox |
| Notifications | `@capacitor/local-notifications` |
| Storage | browser `localStorage` (device-only) |
| Android | minSdk 24 · targetSdk 36 · compileSdk 36 |

---

## 📱 Screens

**Home** — scanning banner + map + quick actions  
**Devices** — sortable device list with signal quality  
**Tracking** — live signal gauge & distance  
**Finder Map** — pinned device on map with accuracy circle  
**History** — location history with timestamps

---

## 🚀 Build from Source

Prerequisites: Node.js, JDK 17+, Android SDK (`ANDROID_HOME` set).

```bash
# 1. Clone
git clone https://github.com/galaxymushizo-netizen/kodisalama-mobile.git
cd kodisalama-mobile

# 2. Install dependencies
npm install

# 3. Build web app + sync to Android + assemble debug APK
npm run apk
```

The debug APK is written to:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### One-step

```bash
npm run apk
```

### Release build (Play Store)

You need your own signing keystore:

```bash
keytool -genkeypair -v -keystore findtrack-release.keystore \
  -alias findtrack -keyalg RSA -keysize 2048 -validity 10000

# Add signing config to android/app/build.gradle (release buildType), then:
cd android
gradlew assembleRelease
```

---

## 🔐 Permissions

| Permission | Purpose |
|---|---|
| `BLUETOOTH_SCAN` / `BLUETOOTH_CONNECT` | Discover nearby BLE devices |
| `ACCESS_FINE_LOCATION` / `ACCESS_COARSE_LOCATION` | Android requires location for BLE scans |
| `INTERNET` / `ACCESS_NETWORK_STATE` | Load OpenStreetMap tiles |
| `POST_NOTIFICATIONS` | Tracking alerts |
| `FOREGROUND_SERVICE_BLUETOOTH_SCAN` | Keep scanning alive while app is open |
| `WRITE_EXTERNAL_STORAGE` (max SDK 28) | Legacy backup support |

---

## 📦 Project Structure

```
kodisalama-mobile/
├── src/
│   ├── App.tsx                 # App shell + tab routing
│   ├── main.tsx                # React entry point
│   ├── index.css               # Design tokens + base styles
│   ├── index.html              # HTML shell
│   ├── components/
│   │   ├── Shell.tsx           # Bottom nav, header, slide-out menu
│   │   ├── ui.tsx              # DeviceCard, SignalGauge, DeviceIcon, EmptyState
│   │   └── MapView.tsx         # Leaflet map with device markers
│   ├── pages/
│   │   ├── Home.tsx            # Home screen
│   │   ├── Devices.tsx         # Device list + scan
│   │   ├── Tracking.tsx        # Live signal tracking
│   │   ├── FinderMap.tsx       # Full-screen device map
│   │   └── History.tsx         # Location history
│   └── lib/
│       ├── ble.ts              # BLE wrapper, scan, RSSI→device
│       ├── distance.ts         # RSSI→distance, signal labels
│       └── store.ts            # localStorage persistence
├── android/                    # Capacitor Android project
├── capacitor.config.ts         # Capacitor configuration
├── package.json
├── INSTALL.md                  # Installation guide
├── FEATURES.md                 # Feature list
├── TESTING.md                  # Test summary & limitations
└── README.md                   # This file
```

---

## 🧪 Testing & Known Limitations

See `TESTING.md` for full details.

**Build verification:** TypeScript compile ✅ · Vite production build ✅ · Capacitor sync ✅ · Gradle debug build ✅ · APK artifact (6.4 MB) ✅

**Limitations:**
- No physical device / emulator testing was performed in this environment (runtime BLE, permissions, map tiles on device unverified)
- RSSI distance is an estimate (varies with obstacles/interference)
- Debug APK only — release build requires your own signing keystore
- No cloud sync / accounts — data stays on the device only (offline-first by design)

---

## 📄 License

MIT License — see [LICENSE](LICENSE).

---

## 🤝 Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.
