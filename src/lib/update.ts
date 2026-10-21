import { APP_VERSION } from './version'

const REPO = 'galaxymushizo-netizen/kodisalama-mobile'
const API = `https://api.github.com/repos/${REPO}/releases/latest`
export const RELEASES_URL = `https://github.com/${REPO}/releases/latest`

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | /** Sideloaded APKs never get Play Store updates, so "no network" is the normal state, not an error. */
    { state: 'offline' }
  | { state: 'error' }
  | { state: 'current'; version: string }
  | { state: 'available'; version: string; url: string; page: string }

type GhRelease = {
  tag_name?: unknown
  html_url?: unknown
  assets?: Array<{ name?: unknown; browser_download_url?: unknown }>
}

const numeric = (v: string): number[] =>
  v
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)

/** True when `latest` is a strictly newer release than `current`. */
export const isNewer = (latest: string, current: string): boolean => {
  const a = numeric(latest)
  const b = numeric(current)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) return (a[i] ?? 0) > (b[i] ?? 0)
  }
  return false
}

/**
 * Asks GitHub for the newest published release and compares it with this build.
 *
 * Every failure path resolves to `offline`/`error` rather than throwing — the
 * app is offline-first, so a blocked, slow or absent network must never surface
 * as anything more than "could not check just now".
 */
export const checkForUpdate = async (): Promise<UpdateStatus> => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { state: 'offline' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10_000)
  try {
    const res = await fetch(API, {
      signal: controller.signal,
      headers: { Accept: 'application/vnd.github+json' },
    })
    if (!res.ok) return { state: 'error' }

    const release = (await res.json()) as GhRelease
    const tag = String(release.tag_name ?? '').replace(/^v/, '')
    if (!tag) return { state: 'error' }

    if (!isNewer(tag, APP_VERSION)) return { state: 'current', version: tag }

    // Prefer the exact .apk asset so the user downloads in one tap instead of
    // landing on the release page and hunting for the right file.
    const apk = release.assets?.find((a) => String(a.name ?? '').toLowerCase().endsWith('.apk'))
    const url = String(apk?.browser_download_url ?? '') || String(release.html_url ?? RELEASES_URL)

    return {
      state: 'available',
      version: tag,
      url,
      page: String(release.html_url ?? RELEASES_URL),
    }
  } catch {
    return typeof navigator !== 'undefined' && navigator.onLine === false
      ? { state: 'offline' }
      : { state: 'error' }
  } finally {
    clearTimeout(timer)
  }
}
