import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { Fingerprint } from 'lucide-react'
import { FLAG_CREDIT, FLAG_SRC } from './symbol'

/* ------------------------------------------------------------------ *
 * Local account + PIN. Everything stays on the phone: the PIN is never
 * stored, only a salted SHA-256 of it. There is no server.
 * ------------------------------------------------------------------ */

const STORAGE_KEY = 'kodisalama:account:v1'
const PIN_LENGTH = 4

export type Account = {
  fullName: string
  phone: string
  salt: string
  pinHash: string
  createdAt: string
}

export type AuthStatus = 'loading' | 'setup' | 'locked' | 'unlocked'

const randomSalt = () => {
  const bytes = new Uint8Array(16)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}::${pin}`)
  const subtle = globalThis.crypto?.subtle
  if (subtle) {
    const digest = await subtle.digest('SHA-256', bytes)
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  }
  // Insecure-context fallback. Capacitor serves the app over https, so this
  // only matters when someone opens the web build over plain http.
  let h = 0x811c9dc5
  for (const b of bytes) {
    h ^= b
    h = Math.imul(h, 0x01000193)
  }
  return `fnv-${(h >>> 0).toString(16)}`
}

const readAccount = (): Account | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Account
    if (!parsed?.pinHash || !parsed?.salt) return null
    return parsed
  } catch {
    return null
  }
}

const writeAccount = (account: Account | null) => {
  try {
    if (account) localStorage.setItem(STORAGE_KEY, JSON.stringify(account))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* storage full or unavailable — the gate will fall back to setup */
  }
}

type Ctx = {
  account: Account | null
  status: AuthStatus
  /** 4–6 digits. Returns false when the PIN is wrong. */
  signUp: (fullName: string, phone: string, pin: string) => Promise<boolean>
  unlock: (pin: string) => Promise<boolean>
  lock: () => void
  changePin: (currentPin: string, nextPin: string) => Promise<boolean>
  updateProfile: (fullName: string, phone: string) => void
  deleteAccount: () => void
}

const AuthCtx = createContext<Ctx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null)
  const [status, setStatus] = useState<AuthStatus>('loading')

  useEffect(() => {
    const existing = readAccount()
    setAccount(existing)
    setStatus(existing ? 'locked' : 'setup')
  }, [])

  const signUp = useCallback(async (fullName: string, phone: string, pin: string) => {
    const salt = randomSalt()
    const pinHash = await hashPin(pin, salt)
    const next: Account = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      salt,
      pinHash,
      createdAt: new Date().toISOString(),
    }
    writeAccount(next)
    setAccount(next)
    setStatus('unlocked')
    return true
  }, [])

  const unlock = useCallback(
    async (pin: string) => {
      if (!account) return false
      const candidate = await hashPin(pin, account.salt)
      if (candidate !== account.pinHash) return false
      setStatus('unlocked')
      return true
    },
    [account],
  )

  const lock = useCallback(() => setStatus((s) => (s === 'unlocked' ? 'locked' : s)), [])

  const changePin = useCallback(
    async (currentPin: string, nextPin: string) => {
      if (!account) return false
      const candidate = await hashPin(currentPin, account.salt)
      if (candidate !== account.pinHash) return false
      const salt = randomSalt()
      const pinHash = await hashPin(nextPin, salt)
      const next = { ...account, salt, pinHash }
      writeAccount(next)
      setAccount(next)
      return true
    },
    [account],
  )

  const updateProfile = useCallback(
    (fullName: string, phone: string) => {
      if (!account) return
      const next = { ...account, fullName: fullName.trim(), phone: phone.trim() }
      writeAccount(next)
      setAccount(next)
    },
    [account],
  )

  const deleteAccount = useCallback(() => {
    writeAccount(null)
    setAccount(null)
    setStatus('setup')
  }, [])

  const value = useMemo<Ctx>(
    () => ({ account, status, signUp, unlock, lock, changePin, updateProfile, deleteAccount }),
    [account, status, signUp, unlock, lock, changePin, updateProfile, deleteAccount],
  )

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** True when the string is a usable PIN (4–6 digits). */
export const isValidPin = (pin: string) => new RegExp(`^\\d{${PIN_LENGTH},6}$`).test(pin)

export { PIN_LENGTH }

/* ------------------------------------------------------------------ *
 * Gate screens
 * ------------------------------------------------------------------ */

export function AuthGate({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  if (status === 'loading') {
    return (
      <div className="grid min-h-dvh place-items-center bg-brand-900 text-white">
        <Fingerprint size={40} className="animate-pulse" />
      </div>
    )
  }
  if (status === 'setup') return <SignUpScreen />
  if (status === 'locked') return <LockScreen />
  return <>{children}</>
}

function BrandMark({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 text-center">
      {/* Bendera ya Tanzania */}
      <img
        src={FLAG_SRC}
        alt="Bendera ya Tanzania"
        width={330}
        height={220}
        draggable={false}
        className="mx-auto h-11 w-auto select-none rounded-[3px] ring-1 ring-slate-200 shadow-sm"
      />
      <div className="mx-auto -mt-2 grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 ring-1 ring-white/20">
        <Fingerprint size={26} className="text-white" />
      </div>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted">{subtitle}</p>
    </div>
  )
}

function SignUpScreen() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pin2, setPin2] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    if (!fullName.trim()) return setError('Weka jina lako kamili')
    if (!phone.trim()) return setError('Weka namba ya simu')
    if (!isValidPin(pin)) return setError('PIN iwe na tarakimu hadi 6')
    if (pin !== pin2) return setError('PIN zote mbili hazifanani')
    setBusy(true)
    try {
      await signUp(fullName, phone, pin)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="card p-6">
          <BrandMark title="Karibu KodiSalama" subtitle="Sajili akaunti yako ya ndani" />
          <div className="space-y-3">
            <label className="block">
              <span className="label">Jina Kamili</span>
              <input
                className="field"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mzee Juma Ramadhani"
                autoComplete="name"
              />
            </label>
            <label className="block">
              <span className="label">Namba ya Simu</span>
              <input
                className="field"
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
                autoComplete="tel"
              />
            </label>
            <label className="block">
              <span className="label">Weka PIN ({PIN_LENGTH}–6 tarakimu)</span>
              <input
                className="field text-center tracking-[0.5em]"
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
              />
            </label>
            <label className="block">
              <span className="label">Thibitisha PIN</span>
              <input
                className="field text-center tracking-[0.5em]"
                type="password"
                inputMode="numeric"
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="••••"
              />
            </label>
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
            <button className="btn btn-primary w-full" disabled={busy} onClick={submit}>
              {busy ? 'Inasajili…' : 'Sajili na Kuingia'}
            </button>
            <p className="text-center text-xs leading-relaxed text-muted">
              PIN yako huhifadhiwa kwenye simu yako pekee. Hakuna server inayohusika.
            </p>
            <p className="text-center text-[10px] leading-relaxed text-slate-400">
              {FLAG_CREDIT}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function LockScreen() {
  const { unlock, account } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      const ok = await unlock(pin)
      if (!ok) {
        setError('PIN si sahihi. Jaribu tena.')
        setPin('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="card p-6">
          <BrandMark
            title="Fungua KodiSalama"
            subtitle={account?.fullName ? `Karibu, ${account.fullName}` : 'Weka PIN yako'}
          />
          <div className="space-y-3">
            <label className="block">
              <span className="label">PIN Yako</span>
              <input
                className="field text-center text-xl tracking-[0.5em]"
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                onKeyDown={(e) => e.key === 'Enter' && pin && submit()}
                placeholder="••••"
              />
            </label>
            {error && <p className="text-sm font-semibold text-rose-600">{error}</p>}
            <button
              className="btn btn-primary w-full"
              disabled={busy || pin.length < PIN_LENGTH}
              onClick={submit}
            >
              {busy ? 'Inafungua…' : 'Fungua'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
