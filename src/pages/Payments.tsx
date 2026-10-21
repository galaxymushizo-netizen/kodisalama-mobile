import { useEffect, useMemo, useState } from 'react'
import { Banknote, Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react'
import { useStore } from '../lib/store'
import { allDebts, paymentRows } from '../lib/calc'
import { money, num, thisMonthKey, monthKey, todayISO } from '../lib/format'
import { PAYMENT_METHODS, methodLabel, type Payment, type PaymentMethod } from '../lib/types'
import type { Intent } from '../lib/nav'
import {
  Btn, Card, Chip, Confirm, EmptyState, Field, Input, Modal, PageHead, Search, Select, Textarea, Toast,
} from '../components/ui'

type Filter = 'all' | 'month' | 'debt'

const blank = (tenantId: string): Payment => ({
  id: '',
  tenantId,
  amount: 0,
  date: todayISO(),
  method: 'cash',
  note: '',
})

export default function Payments({
  intent,
  clearIntent,
  onReceipt,
}: {
  intent: Intent | null
  clearIntent: () => void
  onReceipt: (tenantId: string, paymentId: string) => void
}) {
  const { data, addPayment, updatePayment, removePayment } = useStore()
  const [q, setQ] = useState('')
  const [tenantFilter, setTenantFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [scope, setScope] = useState<Filter>('all')
  const [form, setForm] = useState<Payment | null>(null)
  const [del, setDel] = useState<Payment | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const sitting = data.tenants.filter((t) => t.status === 'current')

  useEffect(() => {
    if (intent?.type === 'new') {
      setForm(blank(sitting[0]?.id ?? ''))
      clearIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    const mk = thisMonthKey()
    return data.payments
      .filter((p) => (tenantFilter === 'all' ? true : p.tenantId === tenantFilter))
      .filter((p) => (methodFilter === 'all' ? true : p.method === methodFilter))
      .filter((p) => (scope === 'month' ? monthKey(p.date) === mk : true))
      .filter((p) => {
        if (!needle) return true
        const t = data.tenants.find((x) => x.id === p.tenantId)
        return (
          (t?.fullName ?? '').toLowerCase().includes(needle) ||
          p.note.toLowerCase().includes(needle) ||
          num(p.amount).includes(needle)
        )
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [data, q, tenantFilter, methodFilter, scope])

  const rows = useMemo(() => paymentRows(data, filtered), [data, filtered])
  const total = filtered.reduce((s, p) => s + p.amount, 0)
  const debts = useMemo(
    () => allDebts(data).filter((d) => d.balance > 0),
    [data],
  )
  const totalDebt = debts.reduce((s, d) => s + d.balance, 0)

  const save = () => {
    if (!form) return
    if (!form.tenantId) {
      setToast('Chagua mpangaji kwanza')
      return
    }
    if (!form.amount || form.amount <= 0) {
      setToast('Weka kiasi cha malipo')
      return
    }
    const payload = {
      tenantId: form.tenantId,
      amount: Number(form.amount) || 0,
      date: form.date || todayISO(),
      method: form.method,
      note: form.note.trim(),
    }
    if (form.id) {
      updatePayment({ ...payload, id: form.id })
      setToast('Malipo yamehaririwa')
    } else {
      addPayment(payload)
      setToast('Malipo yamerekodiwa')
    }
    setForm(null)
  }

  return (
    <>
      <PageHead
        title="Ufuatiliaji wa Malipo na Madeni"
        subtitle="Rekodi malipo ya kodi, hesabu salio la madeni, na toa risiti."
      />

      <Btn full className="mb-4" onClick={() => setForm(blank(sitting[0]?.id ?? ''))}>
        <Plus size={18} /> Rekodi Malipo Mpya
      </Btn>

      <Card className="mb-4">
        <Search value={q} onChange={setQ} placeholder="Tafuta mpangaji, maelezo..." />

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)}>
            <option value="all">Wapangaji Wote</option>
            {data.tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName}
                {t.status === 'moved' ? ' (amehamia)' : ''}
              </option>
            ))}
          </Select>
          <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
            <option value="all">Njia Zote za Malipo</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Chip active={scope === 'all'} onClick={() => setScope('all')}>
            Yote ({data.payments.length})
          </Chip>
          <Chip active={scope === 'month'} onClick={() => setScope('month')}>
            Mwezi huu
          </Chip>
          <Chip active={scope === 'debt'} onClick={() => setScope('debt')}>
            Madeni ({debts.length})
          </Chip>
        </div>

        <div className="mt-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-right">
          <div className="text-[11px] font-extrabold tracking-wider text-brand-700 uppercase">
            {scope === 'debt' ? 'Jumla Inayodaiwa' : 'Jumla Iliyochukuliwa'}
          </div>
          <div className="text-2xl font-extrabold text-brand-800">
            {money(scope === 'debt' ? totalDebt : total)}
          </div>
        </div>
      </Card>

      {scope === 'debt' ? (
        debts.length === 0 ? (
          <EmptyState
            icon={<Banknote size={54} strokeWidth={1.4} />}
            title="Hakuna madeni"
            text="Wapangaji wote wamelipa kodi zao kwa wakati. Vibodi vizuri!"
          />
        ) : (
          <ul className="space-y-3">
            {debts.map((d) => (
              <li key={d.tenant.id}>
                <Card className="!p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-extrabold">{d.tenant.fullName}</div>
                      <div className="text-xs text-muted">
                        {d.room?.name ?? 'Bila chumba'} · {money(d.paid)} imelipwa kati ya{' '}
                        {money(d.expected)}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[11px] font-bold text-rose-500">SALIO</div>
                      <div className="text-lg font-extrabold text-rose-600">
                        {money(d.balance)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Btn
                      size="sm"
                      className="flex-1"
                      onClick={() => setForm({ ...blank(d.tenant.id), amount: d.balance })}
                    >
                      <Plus size={14} /> Lipa Deni
                    </Btn>
                    <Btn
                      size="sm"
                      variant="ghost"
                      onClick={() => onReceipt(d.tenant.id, '')}
                    >
                      <ReceiptText size={14} /> Kikumbusho
                    </Btn>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Banknote size={54} strokeWidth={1.4} />}
          title="Hakuna malipo yaliyopatikana"
          text="Rekodi malipo ya kwanza ili kuona historia na kutoa risiti."
          action={
            <Btn onClick={() => setForm(blank(sitting[0]?.id ?? ''))}>
              <Plus size={17} /> Rekodi Malipo Sasa
            </Btn>
          }
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-extrabold tracking-wide text-slate-500 uppercase">
                  <th className="px-3 py-3 text-left">Tarehe</th>
                  <th className="px-3 py-3 text-left">Mpangaji &amp; Chumba</th>
                  <th className="px-3 py-3 text-right">Kiasi</th>
                  <th className="px-3 py-3 text-left">Njia &amp; Kumbukumbu</th>
                  <th className="px-3 py-3 text-right">Hatua</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ payment: p, tenant, room, date }) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3 whitespace-nowrap text-slate-600">{date}</td>
                    <td className="px-3 py-3">
                      <div className="font-bold">{tenant?.fullName ?? 'Mfutwa'}</div>
                      <div className="text-xs text-muted">{room?.name ?? '—'}</div>
                    </td>
                    <td className="px-3 py-3 text-right font-extrabold whitespace-nowrap text-brand-700">
                      {money(p.amount)}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-semibold">{methodLabel(p.method)}</div>
                      {p.note && <div className="text-xs text-muted">{p.note}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => tenant && onReceipt(tenant.id, p.id)}
                          aria-label="Risiti"
                          className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700 active:bg-brand-100"
                        >
                          <ReceiptText size={16} />
                        </button>
                        <button
                          onClick={() => setForm(p)}
                          aria-label="Hariri"
                          className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 active:bg-slate-200"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDel(p)}
                          aria-label="Futa"
                          className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-500 active:bg-rose-100"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Hariri Malipo' : 'Rekodi Malipo Mpya'}
        footer={
          <Btn full onClick={save}>
            Hifadhi Malipo
          </Btn>
        }
      >
        {form && (
          <div className="space-y-3">
            <Field label="Mpangaji" required>
              <Select
                value={form.tenantId}
                onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              >
                <option value="">-- Chagua Mpangaji --</option>
                {data.tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                    {t.status === 'moved' ? ' (amehamia)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Kiasi cha Malipo (TZS)" required>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.amount || ''}
                placeholder="mf. 150000"
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarehe" required>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Njia ya Malipo">
                <Select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value as PaymentMethod })}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Kumbukumbu">
              <Textarea
                rows={2}
                value={form.note}
                placeholder="mf. Kodi ya Oktoba 2026"
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>
            {data.landlord.fullName && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-muted">
                Risiti itatolewa na: <b>{data.landlord.fullName}</b>
              </p>
            )}
          </div>
        )}
      </Modal>

      <Confirm
        open={!!del}
        title="Futa malipo?"
        text={`Malipo ya ${money(del?.amount ?? 0)} yatafutwa kwenye hesabu. Utingua hauwezi kutenduliwa.`}
        onConfirm={() => {
          if (del) {
            removePayment(del.id)
            setToast('Malipo yamefutwa')
          }
          setDel(null)
        }}
        onCancel={() => setDel(null)}
      />

      <Toast msg={toast} />
    </>
  )
}
