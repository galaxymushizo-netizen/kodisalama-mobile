import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type {
  AppData,
  Contract,
  LandlordProfile,
  NotificationSettings,
  Payment,
  Room,
  Tenant,
  Templates,
} from './types'
import { DEFAULT_CLAUSES } from './types'

const STORAGE_KEY = 'kodisalama:data:v1'
export const DATA_VERSION = 1

export const emptyData = (): AppData => ({
  version: DATA_VERSION,
  landlord: { fullName: '', phone: '', nida: '', location: '' },
  rooms: [],
  tenants: [],
  payments: [],
  contracts: [],
  templates: {
    receipt:
      'Habari {jina}, asante kwa kulipa {kiasi} kwa ajili ya kodi ya {mwezi}. Risiti yako imepokelewa. - {mwenye_nyumba}',
    reminder:
      'Habari {jina}, hii ni kumbusho kwamba kodi ya {mwezi} ya {kiasi} bado inadaiwa. Tafadhali lipa kabla ya {tarehe}. Asante. - {mwenye_nyumba}',
  },
  // 07:00 by default; the user can pick any time in Mipangilio. `important`
  // is on by default — it only ever notifies when permission was already
  // granted, so a fresh install stays silent until the user opts in.
  notifications: { enabled: false, hour: 7, minute: 0, important: true },
})

const load = (): AppData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyData()
    const parsed = JSON.parse(raw) as AppData
    const base = emptyData()
    return {
      ...base,
      ...parsed,
      landlord: { ...base.landlord, ...(parsed.landlord || {}) },
      templates: { ...base.templates, ...(parsed.templates || {}) },
      notifications: { ...base.notifications, ...(parsed.notifications || {}) },
      rooms: parsed.rooms ?? [],
      tenants: parsed.tenants ?? [],
      payments: parsed.payments ?? [],
      contracts: parsed.contracts ?? [],
    }
  } catch {
    return emptyData()
  }
}

type Ctx = {
  data: AppData
  ready: boolean
  quota: { usage: number; quota: number }
  saveLandlord: (p: LandlordProfile) => void
  saveTemplates: (t: Templates) => void
  saveNotifications: (n: NotificationSettings) => void
  addRoom: (r: Omit<Room, 'id'>) => void
  updateRoom: (r: Room) => void
  removeRoom: (id: string) => void
  addTenant: (t: Omit<Tenant, 'id'>) => void
  updateTenant: (t: Tenant) => void
  removeTenant: (id: string) => void
  addPayment: (p: Omit<Payment, 'id'>) => void
  updatePayment: (p: Payment) => void
  removePayment: (id: string) => void
  saveContract: (c: Omit<Contract, 'id' | 'savedAt'> & { id?: string }) => void
  removeContract: (id: string) => void
  replaceAll: (d: AppData) => void
  resetAll: () => void
  refreshQuota: () => void
}

const StoreCtx = createContext<Ctx | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => load())
  const [ready, setReady] = useState(false)
  const [quota, setQuota] = useState({ usage: 0, quota: 0 })

  const refreshQuota = useCallback(() => {
    if (navigator.storage?.estimate) {
      navigator.storage
        .estimate()
        .then((e) => setQuota({ usage: e.usage ?? 0, quota: e.quota ?? 0 }))
        .catch(() => {})
    } else {
      // Fallback: approximate with the serialized payload size
      const size = (localStorage.getItem(STORAGE_KEY) || '').length * 2
      setQuota({ usage: size, quota: 5 * 1024 * 1024 })
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* quota exceeded — surfaced in Settings */
    }
    if (!ready) setReady(true)
    refreshQuota()
  }, [data, ready, refreshQuota])

  const mut = useCallback((fn: (d: AppData) => AppData) => {
    setData((prev) => fn(prev))
  }, [])

  const value = useMemo<Ctx>(
    () => ({
      data,
      ready,
      quota,
      refreshQuota,
      saveLandlord: (landlord) => mut((d) => ({ ...d, landlord })),
      saveTemplates: (templates) => mut((d) => ({ ...d, templates })),
      saveNotifications: (notifications) => mut((d) => ({ ...d, notifications })),
      addRoom: (r) => mut((d) => ({ ...d, rooms: [...d.rooms, { ...r, id: crypto.randomUUID() }] })),
      updateRoom: (r) =>
        mut((d) => ({ ...d, rooms: d.rooms.map((x) => (x.id === r.id ? r : x)) })),
      removeRoom: (id) =>
        mut((d) => ({
          ...d,
          rooms: d.rooms.filter((x) => x.id !== id),
          tenants: d.tenants.map((t) => (t.roomId === id ? { ...t, roomId: null } : t)),
        })),
      addTenant: (t) =>
        mut((d) => ({ ...d, tenants: [...d.tenants, { ...t, id: crypto.randomUUID() }] })),
      updateTenant: (t) =>
        mut((d) => ({ ...d, tenants: d.tenants.map((x) => (x.id === t.id ? t : x)) })),
      removeTenant: (id) =>
        mut((d) => ({
          ...d,
          tenants: d.tenants.filter((x) => x.id !== id),
          payments: d.payments.filter((p) => p.tenantId !== id),
          contracts: d.contracts.filter((c) => c.tenantId !== id),
        })),
      addPayment: (p) =>
        mut((d) => ({ ...d, payments: [...d.payments, { ...p, id: crypto.randomUUID() }] })),
      updatePayment: (p) =>
        mut((d) => ({ ...d, payments: d.payments.map((x) => (x.id === p.id ? p : x)) })),
      removePayment: (id) =>
        mut((d) => ({ ...d, payments: d.payments.filter((x) => x.id !== id) })),
      saveContract: (c) =>
        mut((d) => {
          const savedAt = new Date().toISOString()
          if (c.id) {
            return {
              ...d,
              contracts: d.contracts.map((x) =>
                x.id === c.id ? ({ ...x, ...c, id: c.id, savedAt } as Contract) : x,
              ),
            }
          }
          return { ...d, contracts: [...d.contracts, { ...c, id: crypto.randomUUID(), savedAt }] }
        }),
      removeContract: (id) =>
        mut((d) => ({ ...d, contracts: d.contracts.filter((x) => x.id !== id) })),
      replaceAll: (next) => setData({ ...emptyData(), ...next }),
      resetAll: () => setData(emptyData()),
    }),
    [data, ready, quota, refreshQuota, mut],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore() {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used inside StoreProvider')
  return ctx
}

/* ------------------------------------------------------------------ *
 * Derived selectors
 * ------------------------------------------------------------------ */

export const defaultClauses = DEFAULT_CLAUSES
