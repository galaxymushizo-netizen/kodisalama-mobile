# FindTrack — Installation Guide

## Download

**Debug APK:** `FindTrack-debug.apk` (~6.4 MB)

Location: `D:\MUSHI\kodisalama/FindTrack-debug.apk` (project root)

## Install on an Android Phone

### Option A: ADB (Recommended)

1. Enable **Developer Options** on your phone:
   - Settings → About Phone → tap **Build Number** 7 times
2. Enable **USB Debugging**:
   - Settings → System → Developer Options → USB Debugging (ON)
3. Connect your phone to your PC via USB
4. Run:
   ```bash
   adb install -r D:\MUSHI\kodisalama\FindTrack-debug.apk
   ```

### Option B: Direct Install on Phone

1. Copy `FindTrack-debug.apk` to your phone (USB, Bluetooth, email, etc.)
2. On your phone, open the file manager and tap the APK
3. If prompted, allow **"Install unknown apps"** for the source (e.g. your browser or file manager)
4. Tap **Install** → **Done**

### Option C: From Android Studio

1. Open the `android/` folder in Android Studio
2. Connect your device or launch an emulator
3. Run: `./gradlew assembleDebug` then install the APK from `android/app/build/outputs/apk/debug/app-debug.apk`

## Requirements

- **Android 7.0 (API 24) or higher**
- **Bluetooth LE** hardware (required for device scanning)
- **Location permission** (Android requires location for BLE scanning)
- **Internet** (for OpenStreetMap tiles on the map screens)

## Permissions Requested

| Permission | Why |
|---|---|
| BLUETOOTH_SCAN / BLUETOOTH_CONNECT | Scan for nearby Bluetooth LE devices |
| ACCESS_FINE_LOCATION / ACCESS_COARSE_LOCATION | Android requires location for BLE scans |
| INTERNET / ACCESS_NETWORK_STATE | Load OpenStreetMap map tiles |
| POST_NOTIFICATIONS | Tracking alerts |
| FOREGROUND_SERVICE_BLUETOOTH_SCAN | Keep BLE scanning alive in background |
| WRITE_EXTERNAL_STORAGE (max SDK 28) | Legacy backup/PDF support |

## First Launch

1. Open **FindTrack**
2. Grant **Bluetooth** and **Location** permissions when prompted
3. The app will seed 5 demo devices (JBL Flip 6, Galaxy S23, Apple Watch, AirPods Pro, JBL Charge 5)
4. Tap **Refresh** on Devices to start a live BLE scan
5. Tap a device → **Start Tracking** to view live signal strength

## Uninstall

```bash
adb uninstall com.findtrack.app
```

Or long-press the app icon on your phone → Uninstall.

---

## Source Code

- Project root: `D:\MUSHI\kodisalama/`
- Web app source: `src/` (React + TypeScript + Vite)
- Android project: `android/` (Capacitor + Gradle)
- Config: `capacitor.config.ts`

To rebuild from source:

```bash
# From D:\MUSHI\kodisalama
npm install
npm run build
npx cap sync android
cd android
gradlew assembleDebug
```

Or one-shot:

```bash
npm run apk
```

---

## Release APK (Signing)

For Play Store distribution, you need a signing keystore:

```bash
# 1. Generate a keystore (do this once, keep it safe!)
keytool -genkeypair -v -keystore findtrack-release.keystore -alias findtrack -keyalg RSA -keysize 2048 -validity 10000

# 2. Add signing config to android/app/build.gradle (release buildType)
# 3. Build:
cd android
gradlew assembleRelease
```

The release APK goes to `android/app/build/outputs/apk/release/app-release.apk`.
