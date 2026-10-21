declare const __APP_VERSION__: string

/**
 * Version of this build, injected from package.json by vite.config.ts.
 *
 * package.json is the single source of truth: `scripts/sync-android-version.ps1`
 * mirrors it into android/app/build.gradle (versionName + versionCode), and a
 * GitHub release is tagged `v<package.json version>`. That chain is what lets
 * `lib/update.ts` tell a stale APK apart from a current one.
 */
export const APP_VERSION: string =
  typeof __APP_VERSION__ === 'string' ? __APP_VERSION__.replace(/^v/, '') : '0.0.0'

/** versionCode Android needs for a given semver — monotonic, so ordering holds. */
export const toVersionCode = (version: string): number => {
  const [maj = 0, min = 0, pat = 0] = version
    .replace(/^v/, '')
    .split('.')
    .map((n) => Number.parseInt(n, 10) || 0)
  return maj * 10000 + min * 100 + pat
}
