# FindTrack — Implemented Features

FindTrack is a real, functional Bluetooth LE device finder for Android. It scans for nearby Bluetooth devices, estimates distance from RSSI, displays devices on a map, tracks live signal strength, and keeps a location history.

## Screens & Navigation

| Screen | Tab | What it does |
|---|---|---|
| **Home** | 🏠 Home | Map with nearby devices, live scanning banner, floating scan button, quick "Start Tracking" |
| **Devices** | 📍 Devices | Full list of discovered BLE devices with RSSI, estimated distance, last-seen time, signal quality; pull-to-refresh scan |
| **Tracking** | (navigated) | Live signal gauge with pulsing circle, distance approx., "Signal getting stronger" status, Stop Tracking |
| **Finder Map** | 🔍 Map | Full-screen map with the selected device pinned, accuracy circle, last-seen location card |
| **History** | 🕒 History | Recent device locations with timestamps, signal strength, distance, address; "last known location saved on disconnect" info card |

Bottom navigation lets you switch between Home, Devices, Map, and History. A slide-out menu (from the header) provides the same tabs.

## Core Functionality

### 1. Bluetooth LE Scanning
- Scans for nearby Bluetooth LE devices using `@capacitor-community/bluetooth-le`
- Reads RSSI (signal strength) and MAC address for each discovery
- Merges new discoveries with previously seen devices (preserves name/type/last-seen)
- Sorts by strongest signal first
- Fallback: seeded demo data if BLE is unavailable or permissions denied

### 2. RSSI → Distance Estimation
- Uses the log-distance path loss model: `distance = 10^((txPower - rssi) / (10 * n))`
- txPower = -63 dBm @ 1m, path-loss exponent n = 2.4 (indoor/outdoor mixed)
- Displays distance in metres (or km for long range)
- Signal quality labels: Strong / Good / Fair / Weak with color coding

### 3. Map View (OpenStreetMap)
- Full-screen map with no API key required (OpenStreetMap tiles)
- Device markers with custom green device icons
- Selected device gets a pulsing accuracy circle and fly-to animation
- Markers for all nearby devices on Home screen

### 4. Persistent Storage (localStorage)
- All discovered devices saved to `findtrack:devices:v1`
- Location history saved to `findtrack:history:v1` (capped at 200 entries)
- Data survives app restarts; works fully offline after first load

### 5. Seeded Demo Devices
On first launch, 5 demo devices are pre-loaded so the app is immediately usable:
- JBL Flip 6 (speaker, nearby)
- Galaxy S23 (phone, nearby)
- Apple Watch (watch, far)
- AirPods Pro (earbuds, far)
- JBL Charge 5 (speaker, far)

Each has a MAC address, RSSI, estimated distance, last-seen timestamp, and a demo map coordinate around Riverside Park, NYC.

### 6. Responsive Design
- Single-column mobile layout optimized for phones
- Safe-area insets for notch devices (status bar + home indicator)
- Touch-friendly buttons (min 44px touch targets)
- Works in portrait orientation

### 7. Notifications
- `@capacitor/local-notifications` plugin configured
- Small icon `ic_stat_key` with emerald brand color
- Ready for tracking alerts (permission requested at runtime on Android 13+)

### 8. Offline Support
- Vite PWA with Workbox service worker
- App shells and assets cached for offline use
- All data stored locally on device; no server required

## Technical Stack

| Layer | Technology |
|---|---|
| UI Framework | React 19 + TypeScript |
| Styling | Tailwind CSS 4 |
| Build Tool | Vite 8 |
| Mobile Wrapper | Capacitor 8 (Android) |
| BLE Scanning | @capacitor-community/bluetooth-le 8.3.0 |
| Maps | Leaflet + OpenStreetMap (no API key) |
| PWA / Offline | vite-plugin-pwa + Workbox |
| Notifications | @capacitor/local-notifications |
| Storage | browser localStorage |
| Android | minSdk 24, targetSdk 36, compileSdk 36 |
| JDK | 17+ (build machine has Java 21) |

## What is NOT Included (by design)

- **No user accounts / cloud sync** — data stays on the phone only
- **No Google Maps API key** — OpenStreetMap is used instead
- **No real BLE device pairing/connect** — scanning + RSSI only (no GATT connect)
- **No background continuous tracking** — foreground scan only while app is open
- **No export/import of data** — localStorage only

## Known Limitations

1. **BLE scanning requires location permission** — Android mandates ACCESS_FINE_LOCATION/COARSE_LOCATION for BLE scans. The app will prompt for this.
2. **RSSI distance is an estimate** — actual distance varies with obstacles, interference, device antenna, and txPower calibration.
3. **Demo devices are simulated** — the 5 seeded devices have fixed demo coordinates; real BLE devices discovered by scan will appear with their actual detected signal.
4. **Map tiles need internet** — OpenStreetMap tiles require a network connection; cached tiles may work offline partially.
5. **Debug APK** — this is a debug build signed with a debug keystore. For Play Store, generate a release build with your own signing keystore (see INSTALL.md).
