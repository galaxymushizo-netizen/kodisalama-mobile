import { useCallback, useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'
import { Shell, TABS, type TabId } from './components/Shell'
import { StoreProvider, useStore } from './lib/store'
import { AuthGate, AuthProvider } from './lib/auth'
import { cancelReminder, scheduleReminder } from './lib/notify'
import { openExternal } from './lib/link'
import { checkForUpdate, type UpdateStatus } from './lib/update'
import { APP_VERSION } from './lib/version'
import type { Intent } from './lib/nav'
import Dashboard from './pages/Dashboard'
import Rooms from './pages/Rooms'
import Tenants from './pages/Tenants'
import Payments from './pages/Payments'
import Sms from './pages/Sms'
import Contracts from './pages/Contracts'
import Settings from './pages/Settings'

const TAB_IDS = TABS.map((t) => t.id) as string[]

const tabFromHash = (): TabId => {
  const h = window.location.hash.replace('#', '')
  return TAB_IDS.includes(h) ? (h as TabId) : 'dashibodi'
}

/** localStorage key recording the last release the user chose to ignore. */
const DISMISS_KEY = 'kodisalama:update-dismissed:v'

/**
 * One update check per launch, after the PIN gate and strictly non-blocking.
 *
 * A sideloaded APK never hears about new releases on its own, so this is the
 * only thing that can tell the user. Offline is the normal state for this app,
 * so a missing or slow network resolves to nothing being shown at all.
 */
function useUpdateNotice() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    let alive = true
    void checkForUpdate().then((status) => {
      if (!alive || status.state !== 'available') return
      if (localStorage.getItem(DISMISS_KEY) === status.version) return
      setUpdate(status)
    })
    return () => {
      alive = false
    }
  }, [])

  const dismiss = useCallback(() => {
    if (update?.state === 'available') {
      // Remembering the version keeps the banner from nagging on every launch.
      try {
        localStorage.setItem(DISMISS_KEY, update.version)
      } catch {
        // Private mode or a full quota — worst case it asks again next time.
      }
    }
    setUpdate(null)
  }, [update])

  return { update, dismiss }
}

function AppShell() {
  const [tab, setTab] = useState<TabId>(() => tabFromHash())
  const [intent, setIntent] = useState<Intent | null>(null)
  const { data } = useStore()
  const { update, dismiss } = useUpdateNotice()
  const n = data.notifications ?? { enabled: false, hour: 7, minute: 0 }

  // Re-assert the reminder on every launch. Android drops pending alarms after
  // a reboot, an app update, or when exact alarms get toggled off, so this is
  // what keeps a "kila siku" schedule actually firing.
  useEffect(() => {
    if (!n.enabled) {
      void cancelReminder()
      return
    }
    void scheduleReminder({
      hour: n.hour,
      minute: n.minute,
      title: 'Kumbusho la Kodi — KodiSalama',
      body: 'Angalia malipo ya kodi ya mwezi kwenye KodiSalama.',
    })
  }, [n.enabled, n.hour, n.minute])

  // Keeps the Android/iOS back button working between tabs
  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const clearIntent = useCallback(() => setIntent(null), [])

  const go = useCallback((next: TabId, type?: string) => {
    setIntent(type ? { type } : null)
    setTab(next)
    if (window.location.hash !== `#${next}`) window.location.hash = next
  }, [])

  const openReceipt = useCallback((tenantId: string, paymentId: string) => {
    setIntent({ type: 'receipt', tenantId, paymentId })
    setTab('sms')
    if (window.location.hash !== '#sms') window.location.hash = 'sms'
  }, [])

  return (
    <Shell tab={tab} onTab={(t) => go(t)} quickPay={() => go('malipo', 'new')}>
      {update?.state === 'available' && (
        <div className="no-print mb-3 flex items-start gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-3.5">
          <Download size={18} className="mt-0.5 shrink-0 text-brand-700" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold">Toleo jipya lipo: v{update.version}</div>
            <div className="mt-0.5 text-sm text-muted">
              Unatumia v{APP_VERSION}. Pakua APK mpya kisha isakinishse juu ya lililopo —
              data yako haitapotea.
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => void openExternal(update.url)}
              className="rounded-xl bg-brand-700 px-3.5 py-2 text-xs font-extrabold text-white"
            >
              Pakua
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Funga tangazo la sasisho"
              className="rounded-xl p-2 text-muted"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      {tab === 'dashibodi' && <Dashboard go={go} />}
      {tab === 'vyumba' && <Rooms intent={intent} clearIntent={clearIntent} />}
      {tab === 'wapangaji' && <Tenants intent={intent} clearIntent={clearIntent} />}
      {tab === 'malipo' && (
        <Payments intent={intent} clearIntent={clearIntent} onReceipt={openReceipt} />
      )}
      {tab === 'sms' && <Sms intent={intent} clearIntent={clearIntent} />}
      {tab === 'mikataba' && <Contracts intent={intent} clearIntent={clearIntent} />}
      {tab === 'mipangilio' && <Settings />}
    </Shell>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        {/* PIN gate: sign-up on first run, lock screen afterwards. */}
        <AuthGate>
          <AppShell />
        </AuthGate>
      </StoreProvider>
    </AuthProvider>
  )
}
