# KodiSalama 🇹🇿

**Usimamizi wa Wapangaji** — a phone-first rental management app for Tanzanian landlords.
Swahili UI, offline-first, ships as an **Android APK** (and also runs in any browser as a PWA).

> 🌐 **Live:** https://galaxymushizo-netizen.github.io/kodisalama-mobile/
> 📦 **APK download:** https://github.com/galaxymushizo-netizen/kodisalama-mobile/releases/latest

---

## Modules (tabs)

| Tab | What it does |
|-----|--------------|
| **Dashibodi** | Occupancy, tenants, income this month, total debts, recent payments, quick actions |
| **Vyumba** | Register rooms, monthly rent, location; filter by free/taken; edit & delete |
| **Wapangaji** | Register tenants, assign rooms, NIDA, move-in/out dates, live debt badge, call/WhatsApp/SMS shortcuts |
| **Malipo** | Record payments (cash, M-Pesa, Tigo Pesa, HaloPesa, bank…), search/filter, totals, debts view, receipt shortcut |
| **SMS** | Generate Swahili **payment receipts** and **rent reminders**, edit the text, count SMS segments, copy / open WhatsApp / open SMS |
| **Mikataba** | Tenancy contract (Tanzania) — Tanzanian flag at the top, autofilled from your profile & room, editable clauses, save, **print / PDF export** |
| **Mipangilio** | Landlord profile, **daily rent reminders**, **PIN account**, storage usage, **JSON backup export/import**, credits, wipe all data |

Everything is stored **only on the phone** (localStorage) — no server, no sync, works fully offline. The only account is a **local PIN** that locks the app; it never leaves the device.

---

## Akaunti ya PIN

First launch asks you to register with your name, phone number and a **4–6 digit PIN**. The PIN is never stored — only a salted SHA-256 hash (WebCrypto, with an FNV-1a fallback). Use **Mipangilio → Akaunti Yangu (PIN)** to change the PIN, lock now, or delete the account. Deleting the account removes the PIN only; your rooms, tenants and payments stay put.

## Arifa za kumbusho la kodi

**Mipangilio → Arifa za Kumbusho la Kodi** schedules a real, system-level daily reminder:

- You pick the time; the app schedules an **exact alarm** (`USE_EXACT_ALARM`) that fires in Doze too.
- It re-asserts the schedule on every launch, because Android drops pending alarms after a reboot, an app update, or when exact alarms get toggled off.
- Android 13+ needs the `POST_NOTIFICATIONS` runtime permission — the app shows its live status and takes you to the OS prompt.
- The channel deliberately omits `sound`, which makes the plugin look for a missing `res/raw/default` file and end up silent; the system default sound is used instead.

## Live web app (GitHub Pages)

A GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and deploys the PWA on every push to `main`.
Pages is configured with **build type = workflow**, so the site is rebuilt from source each time — there is no committed build output in the repo. Every push redeploys:

```bash
git push origin main          # → https://<user>.github.io/kodisalama-mobile/
```

The build reads `BASE_PATH` so assets, the manifest and the service worker all live under `/kodisalama-mobile/`. Set it locally the same way if you want to preview exactly what Pages will serve:

```bash
BASE_PATH=/kodisalama-mobile/ npm run build   # PowerShell: $env:BASE_PATH='/kodisalama-mobile/'; npm run build
```

> Related repos: [`kodisalama`](https://github.com/galaxymushizo-netizen/kodisalama) (Next.js + PostgreSQL server edition) and [`kodisalama-apk`](https://github.com/galaxymushizo-netizen/kodisalama-apk) (APK releases + `update.json`). This repo is the self-contained offline edition — no database, no SMS gateway, no account server.

---

## Run in a browser (development)

```bash
npm install
npm run dev          # http://localhost:5173  (also reachable from your phone on the same Wi-Fi)
```

The dev server binds `0.0.0.0`, so on your phone open `http://<your-pc-ip>:5173`.

---

## Build the Android APK

Prerequisites (already present on this machine): **JDK 17**, **Android SDK** (`ANDROID_HOME`), and network access for the first Gradle/dependency download.

```bash
# 1. Build the web app and copy it into the Android project
npm run build
npx cap sync android

# 2. Compile the APK
cd android
gradlew assembleDebug          # Windows: .\gradlew.bat assembleDebug
```

The APK is written to:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Install it on a phone

- **USB:** enable Developer options → USB debugging, connect, then
  `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`
- **Or copy** `app-debug.apk` to the phone and open it (allow "install unknown apps").

For a Play-Store / shareable release build you need a signing keystore:

```bash
cd android
gradlew assembleRelease
```

### One-shot script

```bash
npm run apk
```

= `build → cap sync → gradlew assembleDebug`.

---

## Regenerating the icons

```bash
npm run icons            # PWA icons (public/icons, apple-touch-icon, favicon)
npm run icons:android    # Android launcher icons + splash screens
```

Both scripts use PowerShell + System.Drawing (no image tooling required).

---

## Project structure

```
src/
  lib/
    types.ts     # domain models (rooms, tenants, payments, contracts, templates, notifications)
    store.tsx    # React context + localStorage persistence + all mutations
    auth.tsx     # local account + PIN gate (sign-up, lock screen, hash-only storage)
    notify.ts    # permission, exact alarms, channel, scheduling, test reminder
    symbol.ts    # Tanzanian flag asset paths + attribution
    calc.ts      # occupancy, debts, monthly income, message builders
    format.ts    # TZS money, Swahili dates, phone normalisation, SMS segment count
    nav.ts       # cross-tab navigation intents
  components/
    Shell.tsx    # green header, slide-in menu, 7-tab bottom nav (safe-area aware)
    ui.tsx       # Card, Btn, Field, Modal (bottom sheet), Chip, EmptyState, Toast…
  pages/         # Dashboard, Rooms, Tenants, Payments, Sms, Contracts, Settings
android/         # Capacitor Android project
scripts/         # icon & splash generators
```

### Debt calculation

For a sitting tenant: `months = full months since move-in + 1` (the current month is due),
`expected = rent × months`, `balance = max(0, expected − everything paid)`.

### Data format

`localStorage["kodisalama:data:v1"]` → exported/imported verbatim by **Mipangilio → Pakua/Rejesha Nakala**.
