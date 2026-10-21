import { useCallback, useEffect, useState } from 'react'
import { Shell, TABS, type TabId } from './components/Shell'
import { StoreProvider, useStore } from './lib/store'
import { AuthGate, AuthProvider } from './lib/auth'
import { cancelReminder, scheduleReminder } from './lib/notify'
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

function AppShell() {
  const [tab, setTab] = useState<TabId>(() => tabFromHash())
  const [intent, setIntent] = useState<Intent | null>(null)
  const { data } = useStore()
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
