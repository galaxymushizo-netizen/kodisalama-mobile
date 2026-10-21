import { useEffect, useMemo, useRef, useState } from 'react'
import { FilePlus2, FileText, Plus, Printer, Save, SquarePen, Trash2, X } from 'lucide-react'
import { jsPDF } from 'jspdf'
import { useStore } from '../lib/store'
import { roomById, tenantById } from '../lib/calc'
import { addMonths, fmtDate, money, num, todayISO } from '../lib/format'
import { bytesToBase64, saveFile } from '../lib/files'
import { DEFAULT_CLAUSES, type Contract } from '../lib/types'
import { FLAG_CREDIT, FLAG_PDF_SRC, FLAG_SRC, loadImage } from '../lib/symbol'
import { isNative } from '../lib/notify'
import { Btn, Card, Confirm, Field, Input, PageHead, Select, Toast } from '../components/ui'
import type { Intent } from '../lib/nav'

const blank = (tenantId: string): Contract => ({
  id: '',
  tenantId,
  deposit: 0,
  durationMonths: 12,
  payEveryMonths: 1,
  startDate: todayISO(),
  clauses: DEFAULT_CLAUSES,
  savedAt: '',
})

export default function Contracts({
  intent,
  clearIntent,
}: {
  intent: Intent | null
  clearIntent: () => void
}) {
  const { data, saveContract, removeContract } = useStore()
  const [form, setForm] = useState<Contract>(() => blank(''))
  const [editClauses, setEditClauses] = useState(false)
  const [del, setDel] = useState<Contract | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const pickTenant = (id: string) => {
    const t = id ? tenantById(data, id) : null
    const room = t ? roomById(data, t.roomId) : null
    setForm((f) => ({
      ...f,
      tenantId: id,
      deposit: f.deposit || room?.rent || 0,
      startDate: f.startDate || t?.moveInDate || todayISO(),
    }))
  }

  const tenant = form.tenantId ? tenantById(data, form.tenantId) : null
  const room = tenant ? roomById(data, tenant.roomId) : null
  const rent = room?.rent ?? 0
  const endDate = form.startDate ? addMonths(form.startDate, form.durationMonths) : '—'
  const existing = useMemo(
    () => [...data.contracts].sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1)),
    [data.contracts],
  )

  useEffect(() => {
    if (intent?.type === 'load' && intent.tenantId) {
      const found = data.contracts.find((c) => c.tenantId === intent.tenantId)
      if (found) setForm(found)
      clearIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  const save = () => {
    if (!form.tenantId) return setToast('Chagua mpangaji kwanza')
    saveContract({
      ...form,
      deposit: Number(form.deposit) || 0,
      durationMonths: Number(form.durationMonths) || 12,
      payEveryMonths: Number(form.payEveryMonths) || 1,
      clauses: form.clauses.map((c) => c.trim()).filter(Boolean),
    })
    setToast('Mkataba umehifadhiwa')
  }

  const print = async () => {
    if (!form.tenantId) return setToast('Chagua mpangaji kwanza')
    // Android's WebView exposes no print bridge, so window.print() silently
    // does nothing there. Hand the user a PDF instead — it prints from any
    // PDF viewer, and the same sheet is what would have been printed anyway.
    if (isNative()) {
      await exportPdf()
      setToast('PDF imefunguliwa — chagua "Chapisha" kwenye programu ya PDF')
      return
    }
    window.print()
  }

  const landlord = data.landlord
  const clauseAt = (i: number, v: string) => {
    const next = [...form.clauses]
    next[i] = v
    setForm({ ...form, clauses: next })
  }

  /** A4 contract rendered straight to PDF (works in the Android app too). */
  const buildPdf = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const M = 16
    const CW = W - M * 2
    let y = M

    const ensure = (need: number) => {
      if (y + need > H - M) {
        doc.addPage()
        y = M
      }
    }
    const bold = (size: number) => {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(size)
    }
    const normal = (size: number) => {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(size)
    }
    const wrap = (text: string, width: number) => doc.splitTextToSize(text, width) as string[]

    // Bendera ya Tanzania — juu kabisa kwenye ukurasa
    const flag = await loadImage(FLAG_PDF_SRC)
    if (flag) {
      const h = 14
      const w = (h * flag.width) / flag.height
      doc.addImage(flag, 'PNG', W / 2 - w / 2, y, w, h)
      y += h + 4
    }

    // Title
    doc.setTextColor(17, 24, 39)
    bold(16)
    doc.text('MKATABA WA UPANGAJI WA MAKAZI', W / 2, y, { align: 'center' })
    y += 7
    normal(9)
    doc.setTextColor(100, 116, 139)
    doc.text(
      `Kwa kuzingatia Sheria za Tanzania  ·  Tarehe: ${fmtDate(form.startDate || todayISO())}`,
      W / 2,
      y,
      { align: 'center' },
    )
    y += 5
    doc.setDrawColor(20, 83, 45)
    doc.setLineWidth(0.7)
    doc.line(M, y, W - M, y)
    y += 9

    // Parties
    ensure(34)
    const boxW = (CW - 6) / 2
    const boxH = 30
    const box = (x: number, heading: string, lines: string[]) => {
      doc.setFillColor(248, 250, 252)
      doc.setDrawColor(226, 232, 240)
      doc.rect(x, y, boxW, boxH, 'FD')
      doc.setTextColor(100, 116, 139)
      bold(7.5)
      doc.text(heading.toUpperCase(), x + 3, y + 6)
      let by = y + 12
      lines.forEach((l) => {
        doc.setTextColor(17, 24, 39)
        normal(9)
        doc.text(wrap(l, boxW - 6)[0] ?? '', x + 3, by)
        by += 5
      })
    }
    box(M, 'Mwenye Nyumba', [
      landlord.fullName || '________________',
      `Simu: ${landlord.phone || '—'}`,
      `NIDA: ${landlord.nida || '—'}`,
      `${landlord.location || '—'}`,
    ])
    box(M + boxW + 6, 'Mpangaji', [
      tenant?.fullName ?? '________________',
      `Simu: ${tenant?.phone || '—'}`,
      `NIDA: ${tenant?.nida || '—'}`,
      `Anaingia: ${tenant ? fmtDate(tenant.moveInDate) : '—'}`,
    ])
    y += boxH + 8

    // Details table
    const labelW = CW * 0.42
    const rows: [string, string][] = [
      ['Nyumba / Chumba', `${room?.name ?? 'Chumba'} — ${room?.location || landlord.location || '—'}`],
      ['Kodi ya Mwezi', `${money(rent)} (TZS)`],
      ['Dhamana (Deposit)', `${money(form.deposit)} (TZS)`],
      [
        'Muda wa Mkataba',
        `${form.durationMonths} miezi (${fmtDate(form.startDate)} — ${fmtDate(endDate)})`,
      ],
      ['Malipo Hubadilika Kila', `${form.payEveryMonths} mwezi`],
      ['Msingi wa Malipo', `Kila ${form.payEveryMonths === 1 ? 'mwezi' : `${form.payEveryMonths} miezi`} kwa ${money(rent)}`],
    ]
    rows.forEach(([k, v]) => {
      const lines = wrap(v, CW - labelW - 6)
      const h = Math.max(lines.length * 5.5 + 4.5, 8.5)
      ensure(h)
      doc.setFillColor(248, 250, 252)
      doc.rect(M, y, labelW, h, 'F')
      doc.setDrawColor(226, 232, 240)
      doc.setLineWidth(0.2)
      doc.rect(M, y, CW, h)
      doc.line(M + labelW, y, M + labelW, y + h)
      doc.setTextColor(30, 41, 59)
      bold(9)
      doc.text(k, M + 2.5, y + 5.8)
      doc.setTextColor(51, 65, 85)
      normal(9)
      lines.forEach((l, i) => doc.text(l, M + labelW + 3, y + 5.8 + i * 5.5))
      y += h
    })
    y += 8

    // Clauses
    ensure(14)
    doc.setTextColor(17, 24, 39)
    bold(11)
    doc.text('MASHARTI NA VIFUNGU', M, y)
    y += 7
    form.clauses.filter(Boolean).forEach((c, i) => {
      const lines = wrap(c, CW - 7)
      ensure(lines.length * 5.5 + 3)
      normal(9.5)
      doc.setTextColor(40, 50, 70)
      lines.forEach((l, li) => {
        if (li === 0) {
          bold(9.5)
          doc.text(`${i + 1}.`, M, y)
          normal(9.5)
        }
        doc.text(l, M + 7, y)
        y += 5.5
      })
      y += 2.5
    })

    // Signatures
    ensure(46)
    y += 8
    const colW = CW / 2
    const sign = (x: number, who: string, name: string) => {
      doc.setDrawColor(148, 163, 184)
      doc.setLineWidth(0.3)
      doc.line(x, y + 16, x + colW - 8, y + 16)
      doc.setTextColor(17, 24, 39)
      bold(9)
      doc.text(who, x, y + 22)
      doc.setTextColor(100, 116, 139)
      normal(8.5)
      doc.text(name || 'Jina na saini', x, y + 27)
    }
    sign(M, 'MWE NYE NYUMBA', landlord.fullName)
    sign(M + colW, 'MPANGAJI', tenant?.fullName ?? '')

    // Footers
    const pages = doc.getNumberOfPages()
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(148, 163, 184)
      doc.text(`Imetengenezwa na KodiSalama  ·  ${fmtDate(todayISO())}`, W / 2, H - 8, {
        align: 'center',
      })
      normal(6)
      doc.setTextColor(180, 190, 200)
      doc.text(FLAG_CREDIT, W / 2, H - 4.5, { align: 'center' })
      doc.text(`${i} / ${pages}`, W - M, H - 8, { align: 'right' })
    }
    return doc
  }

  const exportPdf = async () => {
    if (!form.tenantId) return setToast('Chagua mpangaji kwanza')
    try {
      const doc = await buildPdf()
      const base64 = bytesToBase64(new Uint8Array(doc.output('arraybuffer')))
      const who = (tenant?.fullName ?? 'mpangaji').replace(/\s+/g, '-').toLowerCase()
      const filename = `mkataba-${who}-${form.startDate || todayISO()}.pdf`
      const res = await saveFile({
        filename,
        base64,
        onBrowser: () => doc.save(filename),
      })
      setToast(res.message)
    } catch {
      setToast('Imeshidwa kutengeneza PDF')
    }
  }

  return (
    <>
      <div className="no-print">
        <PageHead
          title="Mikataba ya Upangaji wa Makazi"
          subtitle="Tengeneza na kuhariri mkataba rasmi wa kisheria wa Tanzania, kisha chapisha au pakua kama PDF."
        />

        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Btn variant="outline" onClick={() => setEditClauses((v) => !v)}>
            <SquarePen size={16} /> {editClauses ? 'Funga Vifungu' : 'Hariri Vifungu'}
          </Btn>
          <Btn onClick={save}>
            <Save size={16} /> Hifadhi Mkataba
          </Btn>
          <Btn variant="outline" onClick={print}>
            <Printer size={16} /> Chapisha
          </Btn>
          <Btn variant="dark" onClick={exportPdf}>
            <FileText size={16} /> Pakua PDF
          </Btn>
        </div>

        <Card className="mb-4">
          <div className="space-y-3">
            <Field label="Mkataba kwa Ajili ya Mpangaji:">
              <Select value={form.tenantId} onChange={(e) => pickTenant(e.target.value)}>
                <option value="">-- Chagua Mpangaji Kutoa Mkataba --</option>
                {data.tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.fullName}
                    {t.status === 'moved' ? ' (amehamia)' : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Jina la Mwenye Nyumba:">
              <Input
                value={landlord.fullName}
                placeholder="mf. Mzee Juma Ramadhani"
                readOnly
                className="!bg-white"
              />
            </Field>
            <Field label="Namba ya Simu ya Mwenye Nyumba:">
              <Input value={landlord.phone} placeholder="0712345678" readOnly className="!bg-white" />
            </Field>
            <Field label="NIDA ya Mwenye Nyumba:">
              <Input value={landlord.nida} placeholder="19850101-..." readOnly className="!bg-white" />
            </Field>
            <Field label="Mahali Nyumba Iipo:">
              <Input
                value={room?.location || landlord.location}
                placeholder="Eneo, Mtaa, Wilaya..."
                readOnly
                className="!bg-white"
              />
            </Field>
            {!landlord.fullName && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-700">
                Kamilisha Wasifu wa Mwenye Nyumba kwenye tab ya <b>Mipangilio</b> ili taifa hizi
                zijae kiotomatiki na kionekane kwenye mkataba.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Dhamana (Deposit – TZS):">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={form.deposit || ''}
                  placeholder="0"
                  onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) })}
                />
              </Field>
              <Field label="Kiasi cha Kodi / Mwezi (TZS):">
                <Input value={rent ? num(rent) : ''} placeholder="Chagua chumba" readOnly className="!bg-white" />
              </Field>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Muda wa Mkataba (Miezi):">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.durationMonths || ''}
                  onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })}
                />
              </Field>
              <Field label="Kulipa Kila Baada ya (Miezi):">
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={form.payEveryMonths || ''}
                  onChange={(e) => setForm({ ...form, payEveryMonths: Number(e.target.value) })}
                />
              </Field>
              <Field label="Kuanzia Tarehe:">
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </Field>
            </div>
          </div>
        </Card>

        {editClauses && (
          <Card className="mb-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-extrabold">Vifungu vya Mkataba</h2>
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => setForm({ ...form, clauses: [...form.clauses, ''] })}
              >
                <Plus size={14} /> Ongeza
              </Btn>
            </div>
            <ol className="space-y-2">
              {form.clauses.map((c, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-2 shrink-0 text-xs font-extrabold text-slate-400">
                    {i + 1}.
                  </span>
                  <textarea
                    rows={2}
                    className="field !py-2 text-sm"
                    value={c}
                    onChange={(e) => clauseAt(i, e.target.value)}
                  />
                  <button
                    onClick={() =>
                      setForm({ ...form, clauses: form.clauses.filter((_, j) => j !== i) })
                    }
                    aria-label="Futa kifungu"
                    className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500"
                  >
                    <X size={15} />
                  </button>
                </li>
              ))}
            </ol>
          </Card>
        )}

        {existing.length > 0 && (
          <Card className="mb-4">
            <h2 className="mb-3 font-extrabold">Mikataba Iliyohifadhiwa</h2>
            <ul className="divide-y divide-slate-100">
              {existing.map((c) => {
                const t = tenantById(data, c.tenantId)
                const rm = t ? roomById(data, t.roomId) : null
                return (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <button
                      onClick={() => setForm(c)}
                      className="min-w-0 flex-1 text-left active:opacity-70"
                    >
                      <div className="truncate font-bold">{t?.fullName ?? 'Mfutwa'}</div>
                      <div className="text-xs text-muted">
                        {rm?.name ?? 'Bila chumba'} · {c.durationMonths} miezi · imehifadhiwa{' '}
                        {fmtDate(c.savedAt.slice(0, 10))}
                      </div>
                    </button>
                    <button
                      onClick={() => setDel(c)}
                      aria-label="Futa"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-500"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
        )}

        <p className="px-1 pb-2 text-center text-xs text-muted">
          Kidokezo: kwenye dirisha la kuchapisha, chagua <b>“Save as PDF”</b> kupata faili ya PDF.
        </p>
      </div>

      {/* ------------------------- PRINTABLE CONTRACT ------------------------- */}
      <div
        ref={printRef}
        className="print-sheet mx-auto w-full max-w-[820px] rounded-2xl border border-slate-200 bg-white p-6 text-[13.5px] leading-relaxed text-slate-800 shadow-sm sm:p-9"
      >
        <div className="border-b-2 border-slate-800 pb-3 text-center">
          <img
            src={FLAG_SRC}
            alt="Bendera ya Tanzania"
            width={330}
            height={220}
            draggable={false}
            className="mx-auto mb-2 h-12 w-auto select-none rounded-[3px] ring-1 ring-slate-200"
          />
          <h1 className="text-xl font-extrabold tracking-wide">
            MKATABA WA UPANGAJI WA MAKAZI
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Kwa kuzingatia Sheria za Tanzania · Tarehe:{' '}
            {fmtDate(form.startDate || todayISO())}
          </p>
        </div>

        {!tenant ? (
          <p className="py-10 text-center text-slate-500">
            Chagua mpangaji hapo juu ili kuona maudhui ya mkataba.
          </p>
        ) : (
          <>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="mb-1 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                  Mwenye Nyumba
                </div>
                <div className="font-bold">{landlord.fullName || '________________'}</div>
                <div className="text-xs">Simu: {landlord.phone || '—'}</div>
                <div className="text-xs">NIDA: {landlord.nida || '—'}</div>
                <div className="text-xs">Anapoishi: {landlord.location || '—'}</div>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <div className="mb-1 text-[11px] font-extrabold tracking-wider text-slate-500 uppercase">
                  Mpangaji
                </div>
                <div className="font-bold">{tenant.fullName}</div>
                <div className="text-xs">Simu: {tenant.phone || '—'}</div>
                <div className="text-xs">NIDA: {tenant.nida || '—'}</div>
                <div className="text-xs">Anaingia: {fmtDate(tenant.moveInDate)}</div>
              </div>
            </div>

            <table className="mt-4 w-full border-collapse text-sm">
              <tbody>
                {[
                  ['Nyumba / Chumba', `${room?.name ?? 'Chumba'} — ${room?.location || landlord.location || '—'}`],
                  ['Kodi ya Mwezi', `${money(rent)} (TZS)`],
                  ['Dhamana (Deposit)', `${money(form.deposit)} (TZS)`],
                  ['Muda wa Mkataba', `${form.durationMonths} miezi (${fmtDate(form.startDate)} — ${fmtDate(endDate)})`],
                  ['Malipo Hubadilika Kila', `${form.payEveryMonths} mwezi`],
                  ['Msingi wa Malipo', `Kila ${form.payEveryMonths === 1 ? 'mwezi' : `${form.payEveryMonths} miezi`} kwa ${money(rent)}`],
                ].map(([k, v]) => (
                  <tr key={k} className="border-b border-slate-200">
                    <th className="w-[42%] border-r border-slate-200 bg-slate-50 px-3 py-2 text-left font-extrabold">
                      {k}
                    </th>
                    <td className="px-3 py-2">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h2 className="mt-5 mb-2 text-sm font-extrabold tracking-wide">
              MASHARTI NA VIFUNGU
            </h2>
            <ol className="list-decimal space-y-1.5 pl-5">
              {form.clauses.filter(Boolean).map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ol>

            <div className="mt-8 grid grid-cols-2 gap-6 text-center text-xs">
              <div>
                <div className="mb-6 italic">___________________________</div>
                <div className="font-extrabold">MWE NYE NYUMBA</div>
                <div className="text-slate-500">{landlord.fullName || 'Jina na saini'}</div>
              </div>
              <div>
                <div className="mb-6 italic">___________________________</div>
                <div className="font-extrabold">MPANGAJI</div>
                <div className="text-slate-500">{tenant.fullName}</div>
              </div>
            </div>

            <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-400">
              Imetengenezwa na KodiSalama · {FLAG_CREDIT}
            </p>
            <div className="mt-8 border-t border-slate-200 pt-2 text-center text-[11px] text-slate-400">
              Imetengenezwa na KodiSalama · {fmtDate(todayISO())}
            </div>
          </>
        )}
      </div>

      <Confirm
        open={!!del}
        title="Futa mkataba?"
        text="Mkataba huu utaondolewa kwenye orodha. Hauwezi kutenduliwa."
        onConfirm={() => {
          if (del) removeContract(del.id)
          setDel(null)
          setToast('Mkataba umefutwa')
        }}
        onCancel={() => setDel(null)}
      />

      <Toast msg={toast} />
      <div className="no-print">
        <button
          onClick={() => setForm(blank(''))}
          className="mx-auto mt-4 flex items-center gap-1.5 text-xs font-bold text-slate-400"
        >
          <FilePlus2 size={14} /> Mpya tupu
        </button>
      </div>
    </>
  )
}
