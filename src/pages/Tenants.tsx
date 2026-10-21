import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, MessageCircle, Pencil, Phone, Plus, Trash2, Users } from 'lucide-react'
import { useStore } from '../lib/store'
import { isRoomOccupied, currentTenants, allDebts } from '../lib/calc'
import { fmtDate, money, smsLink, todayISO, waLink } from '../lib/format'
import type { Tenant } from '../lib/types'
import type { Intent } from '../lib/nav'
import {
  Btn, Card, Chip, Confirm, EmptyState, Field, Input, Modal, PageHead, Search, Select, Textarea, Toast,
} from '../components/ui'

type Filter = 'current' | 'moved' | 'all'

const blank = (freeRoomId: string | null): Tenant => ({
  id: '',
  fullName: '',
  phone: '',
  nida: '',
  roomId: freeRoomId,
  moveInDate: todayISO(),
  moveOutDate: '',
  status: 'current',
  note: '',
})

export default function Tenants({ intent, clearIntent }: { intent: Intent | null; clearIntent: () => void }) {
  const { data, addTenant, updateTenant, removeTenant } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('current')
  const [form, setForm] = useState<Tenant | null>(null)
  const [del, setDel] = useState<Tenant | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (intent?.type === 'new') {
      const free = data.rooms.find((r) => !isRoomOccupied(data, r.id)) ?? null
      setForm(blank(free?.id ?? null))
      clearIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const counts = useMemo(
    () => ({
      current: currentTenants(data).length,
      moved: data.tenants.filter((t) => t.status === 'moved').length,
      total: data.tenants.length,
    }),
    [data],
  )

  const debts = useMemo(() => new Map(allDebts(data).map((d) => [d.tenant.id, d.balance])), [data])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return data.tenants
      .filter((t) => (filter === 'all' ? true : t.status === filter))
      .filter((t) => {
        if (!needle) return true
        const room = data.rooms.find((r) => r.id === t.roomId)
        return (
          t.fullName.toLowerCase().includes(needle) ||
          t.phone.includes(needle) ||
          t.nida.toLowerCase().includes(needle) ||
          (room?.name ?? '').toLowerCase().includes(needle)
        )
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [data, q, filter])

  const save = () => {
    if (!form) return
    if (!form.fullName.trim()) {
      setToast('Jina la mpangaji linahitajika')
      return
    }
    const payload = {
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      nida: form.nida.trim(),
      roomId: form.roomId,
      moveInDate: form.moveInDate,
      moveOutDate: form.status === 'moved' ? form.moveOutDate || todayISO() : '',
      status: form.status,
      note: form.note.trim(),
    }
    if (form.id) {
      updateTenant({ ...payload, id: form.id })
      setToast('Mpangaji amehaririwa')
    } else {
      addTenant(payload)
      setToast('Mpangaji amesajiliwa')
    }
    setForm(null)
  }

  const freeRooms = data.rooms.filter((r) => !isRoomOccupied(data, r.id) || r.id === form?.roomId)

  return (
    <>
      <PageHead
        title="Usimamizi wa Wapangaji"
        subtitle="Kusajili wapangaji, namba zao, vyumba vyao na hali zao za madeni."
      />

      <Btn full className="mb-4" onClick={() => setForm(blank(freeRooms[0]?.id ?? null))}>
        <Users size={18} /> Sajili Mpangaji Mpya
      </Btn>

      <Card className="mb-4">
        <Search value={q} onChange={setQ} placeholder="Tafuta jina, simu, au NIDA..." />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Chip active={filter === 'current'} onClick={() => setFilter('current')}>
            Wanaokaa ({counts.current})
          </Chip>
          <Chip active={filter === 'moved'} onClick={() => setFilter('moved')}>
            Waliohama ({counts.moved})
          </Chip>
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Wote ({counts.total})
          </Chip>
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState
          icon={<Users size={54} strokeWidth={1.4} />}
          title={data.tenants.length === 0 ? 'Hakuna wapangaji kwa sasa' : 'Hakuna matokeo'}
          text={
            data.tenants.length === 0
              ? 'Sajili mpangaji mpya na umpangie chumba kilichowazi.'
              : 'Jaribu kutafuta kwa jina lingine au badilisha kichujio.'
          }
          action={
            data.tenants.length === 0 ? (
              <Btn onClick={() => setForm(blank(freeRooms[0]?.id ?? null))}>
                <Plus size={17} /> Sajili Mpangaji
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((t) => {
            const room = data.rooms.find((r) => r.id === t.roomId) ?? null
            const balance = debts.get(t.id) ?? 0
            return (
              <li key={t.id}>
                <Card className="!p-4">
                  <div className="flex items-start gap-3">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-50 text-base font-extrabold text-brand-800">
                      {t.fullName.trim().charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate font-extrabold">{t.fullName}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                            t.status === 'current'
                              ? 'bg-brand-100 text-brand-800'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {t.status === 'current' ? 'Anaishi' : 'Amehamia'}
                        </span>
                        {balance > 0 && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-600">
                            Deni {money(balance)}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <span className="font-semibold text-slate-600">
                          🏠 {room ? room.name : 'Bila chumba'}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarDays size={12} /> {fmtDate(t.moveInDate)}
                        </span>
                        {t.phone && (
                          <span className="flex items-center gap-1">📞 {t.phone}</span>
                        )}
                      </div>

                      {t.phone && (
                        <div className="mt-2.5 flex gap-2">
                          <a
                            href={`tel:${t.phone.replace(/[^\d+]/g, '')}`}
                            className="btn btn-ghost !py-1.5 !px-2.5 !text-xs"
                          >
                            <Phone size={13} /> Piga
                          </a>
                          <a
                            href={waLink(t.phone, 'Habari, hii ni kutoka KodiSalama.')}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-ghost !py-1.5 !px-2.5 !text-xs"
                          >
                            <MessageCircle size={13} /> WhatsApp
                          </a>
                          <a
                            href={smsLink(t.phone, 'Habari, hii ni kutoka KodiSalama.')}
                            className="btn btn-ghost !py-1.5 !px-2.5 !text-xs"
                          >
                            📩 SMS
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setForm(t)}
                        aria-label="Hariri"
                        className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 active:bg-slate-200"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDel(t)}
                        aria-label="Futa"
                        className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-500 active:bg-rose-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {t.note && <p className="mt-2 text-xs text-muted italic">{t.note}</p>}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Hariri Mpangaji' : 'Sajili Mpangaji Mpya'}
        footer={
          <Btn full onClick={save}>
            Hifadhi Mpangaji
          </Btn>
        }
      >
        {form && (
          <div className="space-y-3">
            <Field label="Jina Kamili la Mpangaji" required>
              <Input
                value={form.fullName}
                autoFocus
                placeholder="mf. Amina Said"
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </Field>
            <Field label="Namba ya Simu" required>
              <Input
                type="tel"
                inputMode="tel"
                value={form.phone}
                placeholder="0712345678"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Namba ya Kitambulisho cha NIDA">
              <Input
                value={form.nida}
                placeholder="19850101-12345-00001-22"
                onChange={(e) => setForm({ ...form, nida: e.target.value })}
              />
            </Field>
            <Field label="Chumba">
              <Select
                value={form.roomId ?? ''}
                onChange={(e) => setForm({ ...form, roomId: e.target.value || null })}
              >
                <option value="">— Hakuna chumba —</option>
                {data.rooms.map((r) => {
                  const taken = isRoomOccupied(data, r.id) && r.id !== form.roomId
                  return (
                    <option key={r.id} value={r.id} disabled={taken}>
                      {r.name} — {money(r.rent)}/mwezi {taken ? '(imechukuliwa)' : '(wazi)'}
                    </option>
                  )
                })}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarehe ya Kuingia">
                <Input
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) => setForm({ ...form, moveInDate: e.target.value })}
                />
              </Field>
              <Field label="Hali">
                <Select
                  value={form.status}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as Tenant['status'] })
                  }
                >
                  <option value="current">Anaishi sasa</option>
                  <option value="moved">Amehamia</option>
                </Select>
              </Field>
            </div>
            {form.status === 'moved' && (
              <Field label="Tarehe ya Kuhama">
                <Input
                  type="date"
                  value={form.moveOutDate}
                  onChange={(e) => setForm({ ...form, moveOutDate: e.target.value })}
                />
              </Field>
            )}
            <Field label="Maelezo (hiari)">
              <Textarea
                rows={2}
                value={form.note}
                placeholder="mf. Familia ya watu 3"
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!del}
        title="Futa mpangaji?"
        text={`"${del?.fullName}" na malipo yake yote yatafutwa milele. Utingua hauwezi kutenduliwa.`}
        onConfirm={() => {
          if (del) {
            removeTenant(del.id)
            setToast('Mpangaji amefutwa')
          }
          setDel(null)
        }}
        onCancel={() => setDel(null)}
      />

      <Toast msg={toast} />
    </>
  )
}
