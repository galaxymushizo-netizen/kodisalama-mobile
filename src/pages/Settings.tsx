import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  DatabaseBackup,
  Download,
  ExternalLink,
  HardDrive,
  KeyRound,
  Lock,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  User,
  WifiOff,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { useAuth, isValidPin, PIN_LENGTH } from '../lib/auth'
import { FLAG_CREDIT, FLAG_SRC } from '../lib/symbol'
import { openExternal } from '../lib/link'
import { checkForUpdate, type UpdateStatus } from '../lib/update'
import { APP_VERSION } from '../lib/version'
import {
  cancelReminder,
  describeSchedule,
  exactAlarmAllowed,
  getPermission,
  openExactAlarmSettings,
  pad,
  requestPermission,
  scheduleReminder,
  testReminder,
  type PermissionState,
} from '../lib/notify'
import { totalDebt } from '../lib/calc'
import { money } from '../lib/format'
import { saveFile, textToBase64 } from '../lib/files'
import type { LandlordProfile } from '../lib/types'
import { Btn, Card, Confirm, Field, Input, PageHead, Toast } from '../components/ui'

const fmtBytes = (b: number) => {
  if (!b) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(b) / Math.log(1024)))
  return `${(b / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

const permLabel: Record<PermissionState, string> = {
  granted: 'Imeruhusiwa ✅',
  denied: 'Imezimwa — weka kwenye Mipangilio ya simu',
  prompt: 'Bado haijaombwa',
  unsupported: 'Haipatikani kwenye kifaa hiki',
}

export default function Settings() {
  const {
    data,
    saveLandlord,
    saveNotifications,
    replaceAll,
    resetAll,
    quota,
    refreshQuota,
  } = useStore()
  const { account, lock, changePin, updateProfile, deleteAccount } = useAuth()
  const [profile, setProfile] = useState<LandlordProfile>(data.landlord)
  const [toast, setToast] = useState<string | null>(null)
  const [wipe, setWipe] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  /* -------------------------------- Updates --------------------------------- */
  const [upd, setUpd] = useState<UpdateStatus>({ state: 'idle' })

  const runCheck = async () => {
    setUpd({ state: 'checking' })
    // `checkForUpdate` never throws — offline and blocked networks both resolve
    // to a calm status, so there is no error path to swallow here.
    setUpd(await checkForUpdate())
  }

  /* ------------------------------ Notifications ----------------------------- */
  const [perm, setPerm] = useState<PermissionState>('prompt')
  const [exact, setExact] = useState<boolean | null>(null)
  const [nBusy, setNBusy] = useState(false)
  const n = data.notifications ?? { enabled: false, hour: 7, minute: 0 }

  /* -------------------------------- Account --------------------------------- */
  const [identity, setIdentity] = useState({
    fullName: account?.fullName ?? '',
    phone: account?.phone ?? '',
  })
  const [pinOpen, setPinOpen] = useState(false)
  const [pinForm, setPinForm] = useState({ current: '', next: '', confirm: '' })
  const [pinBusy, setPinBusy] = useState(false)
  const [delAcct, setDelAcct] = useState(false)

  useEffect(() => refreshQuota(), [refreshQuota])

  useEffect(() => {
    void getPermission().then(setPerm)
    void exactAlarmAllowed().then(setExact)
  }, [])

  useEffect(() => {
    setProfile(data.landlord)
  }, [data.landlord])

  useEffect(() => {
    if (account) setIdentity({ fullName: account.fullName, phone: account.phone })
  }, [account])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const saveProfile = () => {
    if (!profile.fullName.trim()) return setToast('Jina la mwenye nyumba linahitajika')
    if (!profile.phone.trim()) return setToast('Namba ya simu inahitajika')
    saveLandlord({
      fullName: profile.fullName.trim(),
      phone: profile.phone.trim(),
      nida: profile.nida.trim(),
      location: profile.location.trim(),
    })
    setToast('Wasifu umehifadhiwa')
  }

  /** Asks the OS for notification access. Real permission, real dialog. */
  const askPermission = async () => {
    setNBusy(true)
    try {
      const p = await requestPermission()
      setPerm(p)
      if (p === 'granted') {
        const e = await exactAlarmAllowed()
        setExact(e)
      }
      setToast(
        p === 'granted'
          ? 'Ruhusa ya arifa imepewa'
          : p === 'denied'
            ? 'Ruhusa imekataliwa — weka kwenye Mipangilio ya simu'
            : 'Ruhusa haijapatikana',
      )
    } finally {
      setNBusy(false)
    }
  }

  const scheduleBody = () => {
    const debt = totalDebt(data)
    return debt > 0
      ? `Kuna madeni ya ${money(debt)}. KodiSalama inakusubiri.`
      : 'Angalia malipo ya kodi ya mwezi kwenye KodiSalama.'
  }

  const enableReminder = async () => {
    setNBusy(true)
    try {
      let p = perm
      if (p !== 'granted') {
        p = await requestPermission()
        setPerm(p)
      }
      if (p !== 'granted') return setToast('Ruhusu arifa kwanza iwe kazi')

      const res = await scheduleReminder({
        hour: n.hour,
        minute: n.minute,
        title: 'Kumbusho la Kodi — KodiSalama',
        body: scheduleBody(),
      })
      if (!res.ok) {
        if (exact !== true) setExact(await exactAlarmAllowed())
        return setToast(res.message)
      }
      saveNotifications({ ...n, enabled: true })
      setToast(res.message)
    } finally {
      setNBusy(false)
    }
  }

  const disableReminder = async () => {
    setNBusy(true)
    try {
      await cancelReminder()
      saveNotifications({ ...n, enabled: false })
      setToast('Arifa zimezimwa')
    } finally {
      setNBusy(false)
    }
  }

  const applyTime = async (value: string) => {
    const [h, m] = value.split(':').map((x) => parseInt(x, 10))
    if (Number.isNaN(h) || Number.isNaN(m)) return
    const next = { ...n, hour: h, minute: m }
    saveNotifications(next)
    if (next.enabled) {
      const res = await scheduleReminder({
        hour: h,
        minute: m,
        title: 'Kumbusho la Kodi — KodiSalama',
        body: scheduleBody(),
      })
      setToast(res.ok ? res.message : res.message)
    } else {
      setToast(`Muda umehifadhiwa: ${describeSchedule(h, m)}`)
    }
  }

  const runTest = async () => {
    setNBusy(true)
    try {
      let p = perm
      if (p !== 'granted') {
        p = await requestPermission()
        setPerm(p)
      }
      if (p !== 'granted') return setToast('Ruhusu arifa kwanza')
      const res = await testReminder(
        'KodiSalama — jaribio la arifa',
        'Umeona hii, basi arifa za kila siku zitafanya kazi.',
      )
      setToast(res.message)
    } finally {
      setNBusy(false)
    }
  }

  /* ------------------------------ Account actions --------------------------- */
  const saveIdentity = () => {
    if (!identity.fullName.trim()) return setToast('Jina linahitajika')
    if (!identity.phone.trim()) return setToast('Namba ya simu inahitajika')
    updateProfile(identity.fullName, identity.phone)
    setToast('Taarifa za akaunti zimehifadhiwa')
  }

  const submitPin = async () => {
    if (!isValidPin(pinForm.current)) return setToast('PIN ya sasa si sahihi')
    if (!isValidPin(pinForm.next)) return setToast(`PIN mpya iwe na ${PIN_LENGTH}–6 tarakimu`)
    if (pinForm.next !== pinForm.confirm) return setToast('PIN mpya hazifanani')
    setPinBusy(true)
    try {
      const ok = await changePin(pinForm.current, pinForm.next)
      if (!ok) return setToast('PIN ya sasa si sahihi')
      setPinForm({ current: '', next: '', confirm: '' })
      setPinOpen(false)
      setToast('PIN imebadilishwa')
    } finally {
      setPinBusy(false)
    }
  }

  const exportJson = async () => {
    const json = JSON.stringify(data, null, 2)
    const filename = `kodisalama-nakala-${new Date().toISOString().slice(0, 10)}.json`
    const res = await saveFile({
      filename,
      base64: textToBase64(json),
      onBrowser: () => {
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      },
    })
    setToast(res.message)
  }

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)
      if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.rooms ?? [])) {
        throw new Error('bad shape')
      }
      replaceAll(parsed)
      refreshQuota()
      setToast('Data zimerejeshwa')
    } catch {
      setToast('Faili si sahihi / si la KodiSalama')
    }
  }

  const pct = quota.quota ? Math.min(100, Math.round((quota.usage / quota.quota) * 100)) : 0
  const counts = {
    rooms: data.rooms.length,
    tenants: data.tenants.length,
    payments: data.payments.length,
    contracts: data.contracts.length,
  }

  return (
    <>
      <PageHead
        title="Mipangilio & Uhifadhi wa Data"
        subtitle="Wasifu, arifa za kumbusho la kodi, akaunti yako ya PIN, na nakala ya data (JSON backup)."
      />

      {/* ---------------------------- Profile ---------------------------- */}
      <Card className="mb-4">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <User size={22} />
          </div>
          <div>
            <h2 className="text-lg leading-snug font-extrabold">
              Wasifu wa Mwenye Nyumba (Landlord Profile)
            </h2>
            <p className="mt-1 text-sm text-muted">
              Taarifa hizi zitatokea kiotomatiki kwenye mikataba na risiti za SMS.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Field label="Jina Kamili la Mwenye Nyumba" required>
            <Input
              value={profile.fullName}
              placeholder="Mzee Juma Ramadhani"
              onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
            />
          </Field>
          <Field label="Namba ya Simu (Kwa ajili ya Malipo & SMS)" required>
            <Input
              type="tel"
              inputMode="tel"
              value={profile.phone}
              placeholder="0712345678"
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
            />
          </Field>
          <Field label="Namba ya Kitambulisho cha NIDA">
            <Input
              value={profile.nida}
              placeholder="19850101-12345-00001-22"
              onChange={(e) => setProfile({ ...profile, nida: e.target.value })}
            />
          </Field>
          <Field label="Mahali Nyumba Zilipo (Mtaa / Eneo / Mji)">
            <Input
              value={profile.location}
              placeholder="Sinza Palestine, Kinondoni, Dar es Salaam"
              onChange={(e) => setProfile({ ...profile, location: e.target.value })}
            />
          </Field>

          <div className="flex justify-end">
            <Btn onClick={saveProfile}>Hifadhi Wasifu</Btn>
          </div>
        </div>
      </Card>

      {/* --------------------------- Notifications --------------------------- */}
      <Card className="mb-4">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-amber-50 text-amber-600">
            <BellRing size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-extrabold">Arifa za Kumbusho la Kodi</h2>
            <p className="mt-1 text-sm text-muted">
              Chagua mwenyewe saa ya kumbusho. Arifa hutumwa kila siku hata app ikiwa
              imefungwa.
            </p>
          </div>
        </div>

        {/* Permission status — a real OS permission, not a fake in-app toggle */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-600">Ruhusa ya Mfumo (Android)</div>
              <div
                className={`mt-0.5 text-sm font-extrabold ${
                  perm === 'granted' ? 'text-brand-700' : 'text-rose-600'
                }`}
              >
                {permLabel[perm]}
              </div>
            </div>
            <Btn
              variant={perm === 'granted' ? 'outline' : 'primary'}
              size="sm"
              disabled={nBusy || perm === 'granted'}
              onClick={askPermission}
            >
              <ShieldCheck size={16} />
              {perm === 'granted' ? 'Ruhusa Imepewa' : 'Ruhusu Arifa'}
            </Btn>
          </div>

          {exact === false && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="min-w-0 text-xs leading-snug font-semibold text-amber-800">
                "Alarms &amp; reminders" hazijaruhusiwa — arifa zinaweza kuchelewa.
              </span>
              <Btn variant="outline" size="sm" onClick={() => void openExactAlarmSettings()}>
                Fungua Mipangilio
              </Btn>
            </div>
          )}
        </div>

        {/* Schedule */}
        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Bell size={15} className="text-brand-700" /> Kumbusho la kila siku
              </div>
              <div className="mt-0.5 text-xs text-muted">
                {n.enabled ? describeSchedule(n.hour, n.minute) : 'Hazijawashwa'}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={n.enabled}
              aria-label="Washa kumbusho la kila siku"
              disabled={nBusy}
              onClick={() => (n.enabled ? void disableReminder() : void enableReminder())}
              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                n.enabled ? 'bg-brand-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all ${
                  n.enabled ? 'left-7' : 'left-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="Saa ya Kumbusho" hint="(muda wa simu)">
              <Input
                type="time"
                value={`${pad(n.hour)}:${pad(n.minute)}`}
                onChange={(e) => void applyTime(e.target.value)}
              />
            </Field>
            <div className="flex items-end gap-2">
              <Btn variant="outline" full disabled={nBusy} onClick={runTest}>
                <BellRing size={16} /> Jaribu Arifa
              </Btn>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Arifa hutumwa na mfumo wa Android kupitia <b>ruhusa halisi ya arifa</b>. Ukizima
            ruhusa kwenye Mipangilio ya simu, kumbusho litakoma. Data yako bado inabaki
            salama kwenye simu.
          </p>
        </div>
      </Card>

      {/* ------------------------------ Account ------------------------------ */}
      <Card className="mb-4">
        <div className="flex items-start gap-3 border-b border-slate-100 pb-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-violet-50 text-violet-600">
            <KeyRound size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg leading-snug font-extrabold">Akaunti Yangu (PIN)</h2>
            <p className="mt-1 text-sm text-muted">
              Akaunti ya ndani yenye PIN. Hakuna server — kila kitu kiko kwenye simu yako.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-700 font-extrabold text-white">
              {(account?.fullName || '?').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-extrabold">
                {account?.fullName || 'Haijajazwa'}
              </div>
              <div className="truncate text-xs text-muted">
                {account?.phone || '—'}
                {account?.createdAt &&
                  ` · imesajiliwa ${new Date(account.createdAt).toLocaleDateString('sw-TZ')}`}
              </div>
            </div>
          </div>

          <Field label="Jina la Akaunti" required>
            <Input
              value={identity.fullName}
              onChange={(e) => setIdentity({ ...identity, fullName: e.target.value })}
            />
          </Field>
          <Field label="Namba ya Simu" required>
            <Input
              type="tel"
              inputMode="tel"
              value={identity.phone}
              onChange={(e) => setIdentity({ ...identity, phone: e.target.value })}
            />
          </Field>
          <div className="flex justify-end">
            <Btn variant="outline" onClick={saveIdentity}>
              Hifadhi Akaunti
            </Btn>
          </div>
        </div>

        {/* Change PIN */}
        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Lock size={15} className="text-violet-600" /> Badilisha PIN
              </div>
              <div className="mt-0.5 text-xs text-muted">
                PIN mpya itafungua app wakati wote.
              </div>
            </div>
            <Btn variant="outline" size="sm" onClick={() => setPinOpen((v) => !v)}>
              {pinOpen ? 'Funga' : 'Badilisha'}
            </Btn>
          </div>

          {pinOpen && (
            <div className="mt-3 space-y-3">
              <Field label="PIN ya Sasa" required>
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={pinForm.current}
                  onChange={(e) =>
                    setPinForm({
                      ...pinForm,
                      current: e.target.value.replace(/\D/g, '').slice(0, 6),
                    })
                  }
                />
              </Field>
              <Field label={`PIN Mpya (${PIN_LENGTH}–6 tarakimu)`} required>
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pinForm.next}
                  onChange={(e) =>
                    setPinForm({ ...pinForm, next: e.target.value.replace(/\D/g, '').slice(0, 6) })
                  }
                />
              </Field>
              <Field label="Thibitisha PIN Mpya" required>
                <Input
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  value={pinForm.confirm}
                  onChange={(e) =>
                    setPinForm({
                      ...pinForm,
                      confirm: e.target.value.replace(/\D/g, '').slice(0, 6),
                    })
                  }
                />
              </Field>
              <Btn full disabled={pinBusy} onClick={() => void submitPin()}>
                <KeyRound size={16} /> Hifadhi PIN Mpya
              </Btn>
            </div>
          )}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Btn variant="dark" onClick={lock}>
            <Lock size={16} /> Funga Sasa (Linda App)
          </Btn>
          <Btn variant="outline" onClick={() => setDelAcct(true)}>
            <Trash2 size={16} /> Futa Akaunti
          </Btn>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Kufuta akaunti huondoa PIN na wasifu wa kuingia, lakini <b>data yako ya vyumba,
          wapangaji na malipo inabaki</b>. Tumia "Futa Data Zote" chini ili kuondoa rekodi
          zenyewe.
        </p>
      </Card>

      {/* ---------------------------- Backup ----------------------------- */}
      <Card className="mb-4">
        <div className="flex items-start gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600">
            <DatabaseBackup size={22} />
          </div>
          <div>
            <h2 className="text-lg leading-snug font-extrabold">
              Hifadhi Nakala ya Data (Backup &amp; Restore)
            </h2>
            <p className="mt-1 text-sm text-muted">
              Linda rekodi zako dhidi ya kupotea kwa kupakua faili la nakala (JSON) au
              kulirejesha kwenye simu/kompyuta nyingine.
            </p>
          </div>
        </div>

        {/* Quota */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-slate-600">
              Hali ya Hifadhi ya Kivinjari
              <span className="block text-[11px] font-normal text-slate-400">
                (LocalStorage Quota)
              </span>
            </span>
            <span className="text-right text-sm font-extrabold text-slate-700">
              {fmtBytes(quota.usage)} / {fmtBytes(quota.quota)} ({pct}%)
            </span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-200">
            <div
              className="h-2 rounded-full bg-brand-600 transition-all"
              style={{ width: `${Math.max(pct, 1)}%` }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span>Vyumba: <b>{counts.rooms}</b></span>
            <span>Wapangaji: <b>{counts.tenants}</b></span>
            <span>Malipo: <b>{counts.payments}</b></span>
            <span>Mikataba: <b>{counts.contracts}</b></span>
            <span>Jumla ya madeni: <b>{money(totalDebt(data))}</b></span>
          </div>
        </div>

        {/* Export */}
        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-extrabold tracking-wide">PAKUA NAKALA (EXPORT JSON)</h3>
          <p className="mt-1 text-sm text-muted">
            Pakua faili lenye vyumba vyote, wapangaji wote, na historia ya malipo kwenye simu yako.
          </p>
          <Btn full className="mt-3" onClick={exportJson}>
            <Download size={17} /> Pakua Nakala ya Data Sasa
          </Btn>
        </div>

        {/* Import */}
        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="text-sm font-extrabold tracking-wide">REJESHA DATA (IMPORT JSON)</h3>
          <p className="mt-1 text-sm text-muted">
            Chagua faili la nakala ulilopakua awali ili kurejesha taarifa zako zote mara moja.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importJson}
          />
          <Btn variant="outline" full className="mt-3" onClick={() => fileRef.current?.click()}>
            <Upload size={17} /> Chagua Faili la Nakala…
          </Btn>
        </div>

        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold tracking-wide">
            <HardDrive size={15} /> Kuhusu Uhifadhi
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Data yote inahifadhiwa kwenye <b>kivinjari cha simu yako pekee</b> — haitumwi kwenye
            server yoyote. Kufuta data au kusafisha kivinjari kunaweza kuondoa rekodi zako, kwa
            hiyo pakua nakala mara kwa mara.
          </p>
        </div>

        <Btn variant="danger" full className="mt-4" onClick={() => setWipe(true)}>
          <Trash2 size={16} /> Futa Data Zote (Anza Upya)
        </Btn>
      </Card>

      {/* ------------------------------ Updates ------------------------------- */}
      <Card className="mb-4">
        <h2 className="text-lg leading-snug font-extrabold">Sasisho</h2>
        <p className="mt-1 text-sm text-muted">
          KodiSalama imepakuliwa kwa mkono (sideload), kwa hivyo haipokei masasisho
          kwa kiotomatiki kama programu za Play Store. Angalia hapa kama kuna toleo jipya.
        </p>

        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          {upd.state === 'available' ? (
            <>
              <div className="flex items-start gap-3">
                <Download size={18} className="mt-0.5 shrink-0 text-brand-700" />
                <div className="min-w-0">
                  <div className="text-sm font-extrabold">
                    Toleo jipya lipo: v{upd.version}
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    Unatumia v{APP_VERSION}. Pakua APK mpya kisha isakinishse juu ya
                    lililopo — data yako haitapotea.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Btn onClick={() => void openExternal(upd.url)}>
                  <Download size={16} /> Pakua sasisho
                </Btn>
                <Btn variant="outline" onClick={() => void openExternal(upd.page)}>
                  <ExternalLink size={16} /> Mabadiliko
                </Btn>
              </div>
            </>
          ) : upd.state === 'current' ? (
            <div className="flex items-start gap-3">
              <CheckCheck size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <div className="min-w-0 text-sm">
                <div className="font-extrabold">Uko na toleo la hivi karibuni</div>
                <p className="mt-0.5 text-muted">
                  Toleo lako: v{APP_VERSION}. Hakuna kipya kilichotolewa.
                </p>
              </div>
            </div>
          ) : upd.state === 'offline' ? (
            <div className="flex items-start gap-3">
              <WifiOff size={18} className="mt-0.5 shrink-0 text-slate-500" />
              <div className="min-w-0 text-sm">
                <div className="font-extrabold">Hakuna mtandao</div>
                <p className="mt-0.5 text-muted">
                  KodiSalama inafanya kazi bila mtandao. Jaribu kukagua ukiwa na intaneti.
                </p>
              </div>
            </div>
          ) : upd.state === 'error' ? (
            <div className="flex items-start gap-3">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-600" />
              <div className="min-w-0 text-sm">
                <div className="font-extrabold">Haiwezekwa kukagua sasa</div>
                <p className="mt-0.5 text-muted">
                  Toleo lako: v{APP_VERSION}. Jaribu tena baadaye.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <RefreshCw size={18} className="mt-0.5 shrink-0 text-slate-500" />
              <div className="min-w-0 text-sm">
                <div className="font-extrabold">Toleo lako: v{APP_VERSION}</div>
                <p className="mt-0.5 text-muted">
                  Bonyeza ili kukagua kama kuna toleo jipya lililotolewa.
                </p>
              </div>
            </div>
          )}

          {upd.state !== 'available' && (
            <Btn
              variant="outline"
              full
              className="mt-3"
              disabled={upd.state === 'checking'}
              onClick={() => void runCheck()}
            >
              <RefreshCw
                size={16}
                className={upd.state === 'checking' ? 'animate-spin' : ''}
              />
              {upd.state === 'checking' ? 'Inakagua…' : 'Angalia sasisho'}
            </Btn>
          )}

          <p className="mt-3 text-xs leading-relaxed text-muted">
            Kukagua sasisho na kubonyeza viungo ndivyo vinavyohitaji intaneti.
            Data yako, mikataba na risiti zote zinabaki kwenye simu yako.
          </p>
        </div>
      </Card>

      {/* ---------------------------- Credits ---------------------------- */}
      <Card className="mb-4">
        <h2 className="text-lg leading-snug font-extrabold">Marejeleo na Haki Miliki</h2>
        <p className="mt-1 text-sm text-muted">
          KodiSalama inatumia bendera rasmi ya taifa kwenye mikataba na skrini ya kuingia.
        </p>

        <div className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <img
            src={FLAG_SRC}
            alt="Bendera ya Tanzania"
            width={330}
            height={220}
            draggable={false}
            className="h-12 w-auto shrink-0 select-none rounded-[3px] ring-1 ring-slate-200"
          />
          <div className="min-w-0 text-sm leading-relaxed">
            <div className="font-extrabold">Bendera ya Tanzania</div>
            <div className="mt-0.5 text-muted">{FLAG_CREDIT}</div>
            <button
              type="button"
              onClick={() =>
                void openExternal('https://commons.wikimedia.org/wiki/File:Flag_of_Tanzania.svg')
              }
              className="mt-1 inline-block text-xs font-semibold text-brand-700 underline"
            >
              Chanzo: Wikimedia Commons
            </button>
            <p className="mt-2 text-xs leading-relaxed text-muted">
              Faili hii ni ya umma (public domain), hivyo inaweza kutumika bila vikwazo.
              Nembo ya Taifa (coat of arms) haikutumika kwa sababu ni ya kulindwa
              kisheria.
            </p>
          </div>
        </div>
      </Card>

      <Confirm
        open={wipe}
        title="Futa data zote?"
        text="Vyumba, wapangaji, malipo, mikataba na wasifu wote watafutwa milele. Hakikume kuwa umepakua nakala. Utingua hauwezi kutenduliwa."
        confirmLabel="Ndiyo, futa zote"
        onConfirm={() => {
          resetAll()
          setWipe(false)
          setToast('Data zimefutwa')
        }}
        onCancel={() => setWipe(false)}
      />

      <Confirm
        open={delAcct}
        title="Futa akaunti yako?"
        text="PIN na taarifa za kuingia zitafutwa. Data ya vyumba, wapangaji na malipo itabaki salama. Utapaswa kusajili upya ili kuingia."
        confirmLabel="Ndiyo, futa akaunti"
        onConfirm={() => {
          deleteAccount()
          setDelAcct(false)
        }}
        onCancel={() => setDelAcct(false)}
      />

      <Toast msg={toast} />
    </>
  )
}
