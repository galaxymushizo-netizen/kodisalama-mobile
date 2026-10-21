import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.tsx'

// The PWA service worker only matters in a browser. Inside the Android/iOS app
// the files are served locally, so drop any worker + caches to make sure a
// future update can never be served from a stale cache.
if (Capacitor.isNativePlatform()) {
  navigator.serviceWorker?.getRegistrations?.().then((rs) => rs.forEach((r) => void r.unregister()))
  typeof caches !== 'undefined' &&
    caches.keys?.().then((ks) => ks.forEach((k) => void caches.delete(k)))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
