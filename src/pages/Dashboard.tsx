import { ArrowRight, Banknote, DoorOpen, Plus, UserPlus, TriangleAlert } from 'lucide-react'
import { useStore } from '../lib/store'
import {
  allDebts,
  collectedThisMonth,
  currentTenants,
  inDebt,
  occupancy,
  totalDebt,
} from '../lib/calc'
import { money, mweziLabel, thisMonthKey, fmtDate } from '../lib/format'
import { Btn, Card, EmptyState, PageHead } from '../components/ui'
import type { TabId } from '../components/Shell'

export default function Dashboard({
  go,
}: {
  go: (tab: TabId, intent?: string) => void
}) {
  const { data } = useStore()
  const occ = occupancy(data)
  const income = collectedThisMonth(data)
  const sitting = currentTenants(data)
  const debts = inDebt(data)
  const debtSum = totalDebt(data)
  const recent = [...data.payments].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3)
  const empty = data.rooms.length === 0 && data.tenants.length === 0 && data.payments.length === 0

  return (
    <>
      <PageHead
        title="Dashibodi Kuu"
        subtitle="Muhtasari wa vyumba, wapangaji na mapato ya mwezi huu."
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Btn onClick={() => go('malipo', 'new')}>
          <Plus size={17} /> Rekodi Malipo
        </Btn>
        <Btn variant="outline" onClick={() => go('wapangaji', 'new')}>
          <UserPlus size={17} /> Mpangaji Mpya
        </Btn>
        <Btn variant="outline" onClick={() => go('vyumba', 'new')}>
          <DoorOpen size={17} /> Chumba Kipya
        </Btn>
      </div>

      {empty && (
        <div className="mb-4">
          <EmptyState
            icon={<DoorOpen size={54} strokeWidth={1.4} />}
            title="Karibu KodiSalama!"
            text="Anza kwa kusajili chumba chako cha kwanza, kisha ongeza mpangaji na kodi yake."
            action={
              <Btn onClick={() => go('vyumba', 'new')}>
                <Plus size={17} /> Sajili Chumba Sasa
              </Btn>
            }
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Rooms */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="text-sm font-semibold text-muted">Vyumba Vyote</div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <DoorOpen size={18} />
            </div>
          </div>
          <div className="mt-1 text-4xl font-extrabold">{occ.total}</div>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-muted">
              Vilivyochukuliwa: <b className="text-blue-600">{occ.occupied}</b>
            </span>
            <span className="text-muted">
              Vilivyo Wazi: <b className="text-brand-700">{occ.free}</b>
            </span>
          </div>
          <div className="mt-4 flex items-center justify-between text-xs font-semibold text-muted">
            <span>Kiwango cha Upangaji</span>
            <span>{occ.pct}%</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-brand-600 transition-all"
              style={{ width: `${occ.pct}%` }}
            />
          </div>
        </Card>

        {/* Tenants */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="text-sm font-semibold text-muted">Wapangaji Waliopo</div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
              <UserPlus size={18} />
            </div>
          </div>
          <div className="mt-1 text-4xl font-extrabold">{sitting.length}</div>
          <p className="mt-2 text-sm text-muted">Wanaishi kwenye vyumba kwa sasa.</p>
          <button
            onClick={() => go('wapangaji')}
            className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-brand-700 active:opacity-70"
          >
            Tazama Orodha Yote <ArrowRight size={15} />
          </button>
        </Card>

        {/* Income */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="text-sm font-semibold text-muted">Mapato ya {mweziLabel(thisMonthKey())}</div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <Banknote size={18} />
            </div>
          </div>
          <div className="mt-1 text-4xl font-extrabold text-brand-700">{money(income)}</div>
          <p className="mt-2 text-sm text-muted">Jumla ya kodi iliyopokelewa mwezi huu.</p>
          <button
            onClick={() => go('malipo')}
            className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-brand-700 active:opacity-70"
          >
            Historia ya Malipo <ArrowRight size={15} />
          </button>
        </Card>

        {/* Debts */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="text-sm font-semibold text-muted">Madeni Yanayodaiwa</div>
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <TriangleAlert size={18} />
            </div>
          </div>
          <div className="mt-1 text-4xl font-extrabold text-rose-600">{money(debtSum)}</div>
          <p className="mt-2 text-sm text-muted">
            {debts.length === 0
              ? 'Hakuna deni lolote kwa sasa.'
              : `Wapangaji ${debts.length} wana salio ambalo halijalipwa.`}
          </p>
          <button
            onClick={() => go('sms', 'reminder')}
            className="mt-4 inline-flex items-center gap-1 text-sm font-extrabold text-rose-600 active:opacity-70"
          >
            Tuma Kikumbusho <ArrowRight size={15} />
          </button>
        </Card>
      </div>

      {/* Recent payments */}
      <Card className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-extrabold">Malipo ya Hivi Karibuni</h2>
          <button
            onClick={() => go('malipo')}
            className="text-sm font-extrabold text-brand-700 active:opacity-70"
          >
            Zote
          </button>
        </div>
        {recent.length === 0 ? (
          <p className="py-2 text-sm text-muted">
            Hakuna malipo yaliyorekodiwa bado. Rekodi malipo ya kwanza ili kuona historia hapa.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((p) => {
              const t = data.tenants.find((x) => x.id === p.tenantId)
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{t?.fullName ?? 'Mfutwa'}</div>
                    <div className="text-xs text-muted">
                      {fmtDate(p.date)} · {money(p.amount)}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-extrabold text-brand-700">
                    +{money(p.amount)}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {debts.length > 0 && (
        <Card className="mt-4">
          <h2 className="mb-3 font-extrabold">Wanaodaiwa</h2>
          <ul className="divide-y divide-slate-100">
            {allDebts(data)
              .filter((x) => x.balance > 0)
              .slice(0, 5)
              .map((x) => (
                <li key={x.tenant.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate font-bold">{x.tenant.fullName}</div>
                    <div className="text-xs text-muted">
                      {x.room?.name ?? 'Bila chumba'} · {money(x.paid)} imelipwa
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-extrabold text-rose-600">
                    {money(x.balance)}
                  </div>
                </li>
              ))}
          </ul>
        </Card>
      )}
    </>
  )
}
