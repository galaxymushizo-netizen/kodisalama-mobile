import { useEffect, useMemo, useState } from 'react'
import {
  Copy,
  MessageCircle,
  Send,
  MessageSquareText,
  ReceiptText,
  BellRing,
  Type,
} from 'lucide-react'
import { useStore } from '../lib/store'
import { buildReceiptMessage, buildReminderMessage, paymentsOf, tenantById, tenantDebt } from '../lib/calc'
import { fmtDate, money, smsLink, smsSegments, waLink, waPhone } from '../lib/format'
import { copyText } from '../lib/files'
import { Btn, Card, Field, PageHead, Select, Textarea, Toast } from '../components/ui'
import type { Intent } from '../lib/nav'

type Mode = 'receipt' | 'reminder' | 'templates'

export default function Sms({
  intent,
  clearIntent,
}: {
  intent: Intent | null
  clearIntent: () => void
}) {
  const { data, saveTemplates } = useStore()
  const [mode, setMode] = useState<Mode>('receipt')
  const [tenantId, setTenantId] = useState('')
  const [paymentId, setPaymentId] = useState('')
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const sitting = data.tenants.filter((t) => t.status === 'current')
  const candidates = sitting.length ? sitting : data.tenants

  useEffect(() => {
    if (!intent) return
    if (intent.type === 'reminder') setMode('reminder')
    if (intent.type === 'receipt') setMode('receipt')
    if (intent.tenantId) setTenantId(intent.tenantId)
    if (intent.paymentId) setPaymentId(intent.paymentId)
    clearIntent()
  }, [intent, clearIntent])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1900)
    return () => clearTimeout(t)
  }, [toast])

  const tenant = tenantId ? tenantById(data, tenantId) : null
  const paymentOptions = useMemo(
    () => (tenantId ? paymentsOf(data, tenantId) : []),
    [data, tenantId],
  )

  // Regenerate the message whenever its inputs change (unless the user edited it)
  const generated = useMemo(() => {
    if (mode === 'receipt') return buildReceiptMessage(data, tenantId, paymentId || null)
    if (mode === 'reminder') return buildReminderMessage(data, tenantId)
    return draft
  }, [mode, data, tenantId, paymentId, draft])

  useEffect(() => {
    if (mode !== 'templates') {
      setDirty(false)
      setDraft(generated)
    }
  }, [generated, mode])

  const message = mode === 'templates' ? draft : draft || generated
  const { len, segments } = smsSegments(message)

  const copy = async () => {
    const ok = await copyText(message)
    setToast(ok ? 'Ujumbe umenakiliwa' : 'Imeshindwa kunakili')
  }

  const sendSms = () => {
    if (!tenant?.phone) return setToast('Mpangaji hana namba ya simu')
    window.location.href = smsLink(tenant.phone, message)
  }

  // Must be a main-frame navigation: Capacitor hands those to the Android
  // system (Intent.ACTION_VIEW), while window.open() would be swallowed.
  const sendWhatsApp = () => {
    if (!tenant?.phone) return setToast('Mpangaji hana namba ya simu')
    window.location.href = waLink(tenant.phone, message)
  }

  const pickTenant = (id: string) => {
    setTenantId(id)
    setPaymentId('')
    setDirty(false)
  }

  const debt = tenant && tenant.status === 'current' ? tenantDebt(data, tenant) : null

  return (
    <>
      <PageHead
        title="Jenereta ya SMS na Risiti"
        subtitle="Tengeneza risiti ya malipo au kikumbusho cha kodi na mtumie mpangaji mmoja kwa mmoja kupitia WhatsApp au SMS."
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <Btn
          variant={mode === 'receipt' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('receipt')}
          className="!text-[13px]"
        >
          <ReceiptText size={15} /> Risiti
        </Btn>
        <Btn
          variant={mode === 'reminder' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('reminder')}
          className="!text-[13px]"
        >
          <BellRing size={15} /> Kikumbusho
        </Btn>
        <Btn
          variant={mode === 'templates' ? 'primary' : 'outline'}
          size="sm"
          onClick={() => setMode('templates')}
          className="!text-[13px]"
        >
          <Type size={15} /> Maneno
        </Btn>
      </div>

      <Card>
        <p className="mb-4 rounded-xl bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-600">
          {mode === 'receipt'
            ? 'Tengeneza risiti rasmi ya malipo kwa Kiswahili na itumie mpangaji kupitia WhatsApp au SMS.'
            : mode === 'reminder'
              ? 'Tuma kumbusho chini ya kodi kwa mpangaji yeyote anayedaiwa, kupitia WhatsApp au SMS.'
              : 'Badilisha maneno ya risiti na kumbusho. Tumia alama {jina}, {kiasi}, {tarehe}, {mwezi}, {chumba}, {mwenye_nyumba}.'}
        </p>

        {mode !== 'templates' && (
          <div className="space-y-3">
            <Field label="Chagua Mpangaji" required>
              <Select value={tenantId} onChange={(e) => pickTenant(e.target.value)}>
                <option value="">-- Chagua Mpangaji --</option>
                {candidates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                    {t.status === 'moved' ? ' (amehamia)' : ''}
                  </option>
                ))}
              </Select>
            </Field>

            {mode === 'receipt' && (
              <Field label="Chagua Rekodi ya Malipo ya Kutoa Risiti">
                <Select value={paymentId} onChange={(e) => setPaymentId(e.target.value)}>
                  <option value="">
                    {paymentOptions.length
                      ? 'Mpya zaidi (kwa kiasi cha hivi karibuni)'
                      : 'Hakuna malipo yaliyorekodiwa kwa mpangaji huyu'}
                  </option>
                  {paymentOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {money(p.amount)} — {fmtDate(p.date)}
                    </option>
                  ))}
                </Select>
              </Field>
            )}

            {mode === 'reminder' && debt && (
              <div className="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-rose-700">Salio la deni</span>
                  <b className="text-rose-700">{money(debt.balance || debt.expected)}</b>
                </div>
                <div className="mt-1 flex justify-between text-xs text-rose-500">
                  <span>Imelipwa: {money(debt.paid)}</span>
                  <span>Inatarajiwa: {money(debt.expected)}</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <div className="flex items-start justify-between gap-3">
            <span className="label !mb-1.5">
              {mode === 'templates'
                ? 'Muundo wa Risiti'
                : 'Muundo wa Ujumbe (unaweza kuhariri moja kwa moja kabla ya kutuma):'}
            </span>
            <span className="shrink-0 text-right text-xs leading-tight font-bold text-slate-400">
              {len} herufi
              <br />(SMS {segments})
            </span>
          </div>
          <Textarea
            rows={mode === 'templates' ? 5 : 7}
            value={mode === 'templates' ? draft : draft || generated}
            onChange={(e) => {
              setDraft(e.target.value)
              setDirty(true)
            }}
            placeholder={mode === 'templates' ? 'Andika muundo hapa...' : 'Chagua mpangaji...'}
          />
          {mode !== 'templates' && dirty && (
            <button
              onClick={() => {
                setDraft(generated)
                setDirty(false)
              }}
              className="mt-2 text-xs font-bold text-brand-700"
            >
              ↺ Rudisha muundo wa kiotomatiki
            </button>
          )}
        </div>

        <div className="mt-4 grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="outline" onClick={copy}>
              <Copy size={16} /> Nakili
            </Btn>
            <Btn variant="primary" onClick={sendWhatsApp} disabled={!tenant}>
              <MessageCircle size={16} /> WhatsApp
            </Btn>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Btn variant="ghost" onClick={sendSms} disabled={!tenant}>
              <Send size={16} /> SMS
            </Btn>
            <Btn variant="dark" onClick={copy} disabled={!tenant}>
              <MessageSquareText size={16} /> Tuma Risiti
            </Btn>
          </div>
        </div>

        {tenant?.phone && (
          <p className="mt-3 text-center text-xs text-muted">
            Kutumwa kwa: <b>{tenant.fullName}</b> · {tenant.phone} ({waPhone(tenant.phone)})
          </p>
        )}
      </Card>

      {mode === 'templates' && (
        <Card className="mt-4">
          <h2 className="mb-3 font-extrabold">Badilisha Maneno (Templates)</h2>
          <div className="space-y-4">
            <Field label="Risiti ya Malipo">
              <Textarea
                rows={4}
                value={data.templates.receipt}
                onChange={(e) => saveTemplates({ ...data.templates, receipt: e.target.value })}
              />
            </Field>
            <Field label="Kikumbusho cha Kodi">
              <Textarea
                rows={4}
                value={data.templates.reminder}
                onChange={(e) => saveTemplates({ ...data.templates, reminder: e.target.value })}
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {['jina', 'kiasi', 'tarehe', 'mwezi', 'chumba', 'simu', 'mwenye_nyumba'].map((v) => (
                <code
                  key={v}
                  className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600"
                >
                  {'{' + v + '}'}
                </code>
              ))}
            </div>
            <Btn variant="outline" full onClick={() => setToast('Maneno yamehifadhiwa')}>
              Hifadhi Maneno
            </Btn>
          </div>
        </Card>
      )}

      <Toast msg={toast} />
    </>
  )
}
