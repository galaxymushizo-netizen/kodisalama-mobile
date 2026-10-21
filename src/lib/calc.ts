import type { AppData, Payment, Room, Tenant } from './types'
import { fmtDate, monthKey, monthsElapsed, money, num, thisMonthKey } from './format'

export const roomById = (d: AppData, id: string | null) =>
  id ? d.rooms.find((r) => r.id === id) ?? null : null

export const tenantById = (d: AppData, id: string) => d.tenants.find((t) => t.id === id) ?? null

export const currentTenants = (d: AppData) => d.tenants.filter((t) => t.status === 'current')

export const isRoomOccupied = (d: AppData, roomId: string) =>
  d.tenants.some((t) => t.status === 'current' && t.roomId === roomId)

export const roomTenant = (d: AppData, roomId: string) =>
  d.tenants.find((t) => t.status === 'current' && t.roomId === roomId) ?? null

export const paymentsOf = (d: AppData, tenantId: string) =>
  d.payments
    .filter((p) => p.tenantId === tenantId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))

export const paidTotal = (d: AppData, tenantId: string) =>
  d.payments.reduce((s, p) => (p.tenantId === tenantId ? s + p.amount : s), 0)

export type Debt = {
  tenant: Tenant
  room: Room | null
  expected: number
  paid: number
  balance: number
  monthsElapsed: number
}

/**
 * A sitting tenant owes one month's rent immediately; each full month after
 * move-in adds another. Balance = expected rent − everything paid to date.
 */
export const tenantDebt = (d: AppData, t: Tenant): Debt => {
  const room = roomById(d, t.roomId)
  const rent = room?.rent ?? 0
  const months = Math.max(1, monthsElapsed(t.moveInDate) + 1)
  const expected = rent * months
  const paid = paidTotal(d, t.id)
  return {
    tenant: t,
    room,
    expected,
    paid,
    balance: Math.max(0, expected - paid),
    monthsElapsed: months,
  }
}

export const allDebts = (d: AppData): Debt[] =>
  currentTenants(d)
    .map((t) => tenantDebt(d, t))
    .sort((a, b) => b.balance - a.balance)

export const inDebt = (d: AppData) => allDebts(d).filter((x) => x.balance > 0)

export const totalDebt = (d: AppData) => inDebt(d).reduce((s, x) => s + x.balance, 0)

export const occupancy = (d: AppData) => {
  const total = d.rooms.length
  const occupied = d.rooms.filter((r) => isRoomOccupied(d, r.id)).length
  return { total, occupied, free: total - occupied, pct: total ? Math.round((occupied / total) * 100) : 0 }
}

export const collectedThisMonth = (d: AppData) => {
  const key = thisMonthKey()
  return d.payments
    .filter((p) => monthKey(p.date) === key)
    .reduce((s, p) => s + p.amount, 0)
}

export const collectedBetween = (d: AppData, fromISO: string, toISO: string) =>
  d.payments
    .filter((p) => p.date >= fromISO && p.date <= toISO)
    .reduce((s, p) => s + p.amount, 0)

export const paymentsThisMonth = (d: AppData) => {
  const key = thisMonthKey()
  return d.payments
    .filter((p) => monthKey(p.date) === key)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** Payment row enriched for tables/exports */
export type PaymentRow = {
  payment: Payment
  date: string
  tenant: Tenant | null
  room: Room | null
  label: string
  amountText: string
}

export const paymentRows = (d: AppData, list: Payment[] = d.payments): PaymentRow[] =>
  list.map((p) => {
    const tenant = tenantById(d, p.tenantId)
    const room = roomById(d, tenant?.roomId ?? null)
    return {
      payment: p,
      date: fmtDate(p.date),
      tenant,
      room,
      label: tenant ? tenant.fullName : 'Mfutwa',
      amountText: num(p.amount),
    }
  })

/* ---------------------------- messaging ---------------------------- */

const replaceVars = (tpl: string, vars: Record<string, string>) =>
  Object.entries(vars).reduce(
    (s, [k, v]) => s.split(`{${k}}`).join(v),
    tpl,
  )

const currentMonthLabel = () => {
  const d = new Date()
  const months = [
    'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
    'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba',
  ]
  return `${months[d.getMonth()]} ${d.getFullYear()}`
}

const dueDate = () => {
  const d = new Date()
  const next = new Date(d.getFullYear(), d.getMonth() + 1, 5)
  return `${String(next.getDate()).padStart(2, '0')}/${String(next.getMonth() + 1).padStart(2, '0')}/${next.getFullYear()}`
}

export const buildReceiptMessage = (
  d: AppData,
  tenantId: string,
  paymentId: string | null,
): string => {
  const t = tenantById(d, tenantId)
  if (!t) return 'Tafadhali chagua mpangaji ili kuandaa ujumbe.'
  const p = paymentId ? d.payments.find((x) => x.id === paymentId) ?? null : null
  return replaceVars(d.templates.receipt, {
    jina: t.fullName,
    kiasi: money(p?.amount ?? 0),
    tarehe: p ? fmtDate(p.date) : fmtDate(new Date().toISOString().slice(0, 10)),
    mwezi: p ? currentMonthLabel() : currentMonthLabel(),
    chumba: roomById(d, t.roomId)?.name ?? '—',
    simu: t.phone || '—',
    mwenye_nyumba: d.landlord.fullName || 'Mwenye Nyumba',
  })
}

export const buildReminderMessage = (d: AppData, tenantId: string): string => {
  const t = tenantById(d, tenantId)
  if (!t) return 'Tafadhali chagua mpangaji ili kuandaa ujumbe.'
  const debt = tenantDebt(d, t)
  return replaceVars(d.templates.reminder, {
    jina: t.fullName,
    kiasi: money(debt.balance || debt.expected),
    tarehe: dueDate(),
    mwezi: currentMonthLabel(),
    chumba: roomById(d, t.roomId)?.name ?? '—',
    simu: t.phone || '—',
    mwenye_nyumba: d.landlord.fullName || 'Mwenye Nyumba',
  })
}
