import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'

/**
 * Opens a URL outside the app.
 *
 * Android's WebView implements no `onCreateWindow`, so `window.open` and
 * `target="_blank"` links silently do nothing inside the APK — the system
 * browser has to be launched explicitly. On the web build there is no
 * Capacitor, so the browser handles it normally.
 */
export const openExternal = async (url: string): Promise<void> => {
  if (!url) return
  try {
    if (Capacitor.isNativePlatform()) {
      await Browser.open({ url })
    } else {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  } catch {
    // The browser was dismissed or is unavailable — there is nothing useful
    // left to fall back to, and the app should carry on regardless.
  }
}
