import { useEffect, useMemo, useState } from 'react'
import { Building2, DoorOpen, Pencil, Plus, Trash2, User } from 'lucide-react'
import { useStore } from '../lib/store'
import { isRoomOccupied, roomTenant } from '../lib/calc'
import { money } from '../lib/format'
import type { Room } from '../lib/types'
import type { Intent } from '../lib/nav'
import { Btn, Card, Chip, Confirm, EmptyState, Field, Input, Modal, PageHead, Search, Textarea, Toast } from '../components/ui'

type Filter = 'all' | 'free' | 'taken'

const blank = (): Room => ({ id: '', name: '', rent: 0, location: '', note: '' })

export default function Rooms({ intent, clearIntent }: { intent: Intent | null; clearIntent: () => void }) {
  const { data, addRoom, updateRoom, removeRoom } = useStore()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [form, setForm] = useState<Room | null>(null)
  const [del, setDel] = useState<Room | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (intent?.type === 'new') {
      setForm(blank())
      clearIntent()
    }
  }, [intent, clearIntent])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const counts = useMemo(() => {
    const total = data.rooms.length
    const taken = data.rooms.filter((r) => isRoomOccupied(data, r.id)).length
    return { total, taken, free: total - taken }
  }, [data])

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return data.rooms.filter((r) => {
      const taken = isRoomOccupied(data, r.id)
      if (filter === 'free' && taken) return false
      if (filter === 'taken' && !taken) return false
      if (!needle) return true
      const tenant = roomTenant(data, r.id)
      return (
        r.name.toLowerCase().includes(needle) ||
        r.location.toLowerCase().includes(needle) ||
        (tenant?.fullName ?? '').toLowerCase().includes(needle)
      )
    })
  }, [data, q, filter])

  const save = () => {
    if (!form) return
    const name = form.name.trim() || 'Chumba'
    const payload = {
      name,
      rent: Number(form.rent) || 0,
      location: form.location.trim(),
      note: form.note.trim(),
    }
    if (form.id) {
      updateRoom({ ...payload, id: form.id })
      setToast('Chumba kimehaririwa')
    } else {
      addRoom(payload)
      setToast('Chumba kimesajiliwa')
    }
    setForm(null)
  }

  return (
    <>
      <PageHead
        title="Usimamizi wa Vyumba"
        subtitle="Orodha ya vyumba, kodi zake za mwezi na hali ya upatikanaji."
      />

      <Btn full className="mb-4" onClick={() => setForm(blank())}>
        <Plus size={18} /> Sajili Chumba Kipya
      </Btn>

      <Card className="mb-4">
        <Search value={q} onChange={setQ} placeholder="Tafuta chumba au mpangaji..." />
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          <Chip active={filter === 'all'} onClick={() => setFilter('all')}>
            Vyote ({counts.total})
          </Chip>
          <Chip active={filter === 'free'} onClick={() => setFilter('free')}>
            Vivyo Wazi ({counts.free})
          </Chip>
          <Chip active={filter === 'taken'} onClick={() => setFilter('taken')}>
            Vilivyochukuliwa ({counts.taken})
          </Chip>
        </div>
      </Card>

      {list.length === 0 ? (
        <EmptyState
          icon={<DoorOpen size={54} strokeWidth={1.4} />}
          title={data.rooms.length === 0 ? 'Hakuna vyumba vilivyopatikana' : 'Hakuna matokeo'}
          text={
            data.rooms.length === 0
              ? 'Bonyeza kitufe hapo chini ili kusajili chumba chako cha kwanza.'
              : 'Jaribu kutafuta kwa jina lingine au badilisha kichujio.'
          }
          action={
            data.rooms.length === 0 ? (
              <Btn onClick={() => setForm(blank())}>
                <Plus size={17} /> Sajili Chumba Sasa
              </Btn>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((r) => {
            const taken = isRoomOccupied(data, r.id)
            const tenant = roomTenant(data, r.id)
            return (
              <li key={r.id}>
                <Card className="!p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        taken ? 'bg-brand-50 text-brand-700' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Building2 size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-extrabold">{r.name}</h3>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                            taken ? 'bg-brand-100 text-brand-800' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {taken ? 'Imechukuliwa' : 'Wazi'}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-brand-700">
                        {money(r.rent)} / mwezi
                      </div>
                      {r.location && <div className="mt-0.5 text-xs text-muted">{r.location}</div>}
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
                        <User size={13} />
                        {tenant ? (
                          <span className="truncate font-semibold text-slate-600">
                            {tenant.fullName}
                          </span>
                        ) : (
                          <span>Hakuna mpangaji</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => setForm(r)}
                        aria-label="Hariri"
                        className="grid h-9 w-9 place-items-center rounded-lg bg-slate-100 text-slate-500 active:bg-slate-200"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => setDel(r)}
                        aria-label="Futa"
                        className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-500 active:bg-rose-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  {r.note && <p className="mt-2 text-xs text-muted italic">{r.note}</p>}
                </Card>
              </li>
            )
          })}
        </ul>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? 'Hariri Chumba' : 'Sajili Chumba Kipya'}
        footer={
          <Btn full onClick={save}>
            Hifadhi Chumba
          </Btn>
        }
      >
        {form && (
          <div className="space-y-3">
            <Field label="Jina la Chumba" required>
              <Input
                value={form.name}
                autoFocus
                placeholder="mf. Chumba 1, Block A - 03"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </Field>
            <Field label="Kodi ya Mwezi (TZS)" required>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={form.rent || ''}
                placeholder="mf. 150000"
                onChange={(e) => setForm({ ...form, rent: Number(e.target.value) })}
              />
            </Field>
            <Field label="Mahali Chumba Kilipo">
              <Input
                value={form.location}
                placeholder="mf. Sinza, Kinondoni"
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
            <Field label="Maelezo (hiari)">
              <Textarea
                rows={3}
                value={form.note}
                placeholder="mf. Chumba kiko juu ya sakafu ya pili"
                onChange={(e) => setForm({ ...form, note: e.target.value })}
              />
            </Field>
          </div>
        )}
      </Modal>

      <Confirm
        open={!!del}
        title="Futa chumba?"
        text={`Chumba "${del?.name}" kitaondolewa kwenye orodha. Mpangaji aliye kwenye chumba hiki atabaki bila chumba. Utingua hauwezi kutenduliwa.`}
        onConfirm={() => {
          if (del) {
            removeRoom(del.id)
            setToast('Chumba kimefutwa')
          }
          setDel(null)
        }}
        onCancel={() => setDel(null)}
      />

      <Toast msg={toast} />
    </>
  )
}
