import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { addMonths, fmtDate, money } from './format'
import { roomById } from './calc'
import { currentTenants, tenantDebt } from './calc'
import type { AppData, Contract } from './types'

/* ------------------------------------------------------------------ *
 * Tenant alerts: the landlord opens the app and is told what actually
 * needs doing — who still owes rent, and which contracts are about to
 * run out. These go through the real OS notification channel, so they
 * arrive as proper Android notifications rather than a silent in-app
 * list nobody looks at.
 * ------------------------------------------------------------------ */

export type AlertKind = 'rent-debt' | 'contract-ending'

export type TenantAlert = {
  /** Stable across launches so the same situation is only announced once. */
  id: string
  kind: AlertKind
  tenantId: string
  tenantName: string
  roomName: string
  title: string
  body: string
  /** How many days are left on an expiring contract; undefined for rent. */
  daysLeft?: number
  /** Amount still owed; undefined for expiring contracts. */
  amount?: number
}

const POSTED_KEY = 'kodisalama:alerts-posted:v1'
/** A contract inside this window counts as "about to end". */
const CONTRACT_WARNING_DAYS = 30

const readPosted = (): string[] => {
  try {
    const raw = localStorage.getItem(POSTED_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const writePosted = (ids: string[]) => {
  try {
    localStorage.setItem(POSTED_KEY, JSON.stringify(ids.slice(-200)))
  } catch {
    /* storage full or unavailable — the worst case is a repeated alert */
  }
}

/** Days between two ISO dates (YYYY-MM-DD). Negative when `to` is past. */
const daysBetween = (fromISO: string, toISO: string) => {
  const from = new Date(`${fromISO}T00:00:00`)
  const to = new Date(`${toISO}T00:00:00`)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null
  return Math.round((to.getTime() - from.getTime()) / 86_400_000)
}

const contractEndISO = (c: Contract) => addMonths(c.startDate, c.durationMonths)

const daysLeftOfContract = (c: Contract) => daysBetween(new Date().toISOString().slice(0, 10), contractEndISO(c))

/**
 * Every current situation worth telling the landlord about, worst first.
 * Pure: no side effects, so it can back the on-screen list as well as
 * the notifications.
 */
export const collectTenantAlerts = (d: AppData): TenantAlert[] => {
  const alerts: TenantAlert[] = []

  for (const t of currentTenants(d)) {
    const debt = tenantDebt(d, t)
    if (debt.balance <= 0) continue
    const room = roomById(d, t.roomId)
    alerts.push({
      id: `rent-debt:${t.id}:${debt.balance}`,
      kind: 'rent-debt',
      tenantId: t.id,
      tenantName: t.fullName,
      roomName: room?.name ?? '—',
      title: `Deni la kodi — ${t.fullName}`,
      body: `${money(debt.balance)} haijalipwa${room ? ` (${room.name})` : ''}. Inadaiwa kwa miezi ${debt.monthsElapsed}.`,
      amount: debt.balance,
    })
  }

  for (const c of d.contracts) {
    const days = daysLeftOfContract(c)
    if (days === null || days < 0 || days > CONTRACT_WARNING_DAYS) continue
    const tenant = d.tenants.find((x) => x.id === c.tenantId) ?? null
    const room = roomById(d, tenant?.roomId ?? null)
    const when = days === 0 ? 'inaisha leo' : `inaisha baada ya siku ${days}`
    alerts.push({
      id: `contract-ending:${c.id}`,
      kind: 'contract-ending',
      tenantId: c.tenantId,
      tenantName: tenant?.fullName ?? 'Mpangaji',
      roomName: room?.name ?? '—',
      title: `Mkataba unaisha — ${tenant?.fullName ?? 'Mpangaji'}`,
      body: `Mkataba ${when} (${fmtDate(contractEndISO(c))})${room ? `, chumba ${room.name}` : ''}.`,
      daysLeft: days,
    })
  }

  /* Rent first, then contracts running out soonest. */
  return alerts.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'rent-debt' ? -1 : 1
    if (a.kind === 'rent-debt') return (b.amount ?? 0) - (a.amount ?? 0)
    return (a.daysLeft ?? 0) - (b.daysLeft ?? 0)
  })
}

/** Only the alerts this device has not already told the landlord about. */
export const unseenAlerts = (alerts: TenantAlert[]): TenantAlert[] => {
  const posted = readPosted()
  return alerts.filter((a) => !posted.includes(a.id))
}

export const markAlertsSeen = (alerts: TenantAlert[]) => {
  if (!alerts.length) return
  const posted = readPosted()
  writePosted([...posted, ...alerts.map((a) => a.id)])
}

/**
 * Notification ids have to be small positive integers. Derive one from the
 * alert id so the same situation always maps to the same slot and a
 * repeat simply replaces itself instead of stacking up.
 */
const notificationId = (id: string) => {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0
  return 710_000 + (Math.abs(hash) % 80_000)
}

/**
 * Posts the unseen alerts through the OS notification channel.
 *
 * Needs the same two permissions the daily reminder needs — the caller is
 * expected to have asked for them first. On the web this degrades to the
 * browser Notification API, which only works while the tab is open.
 */
export const postTenantAlerts = async (
  d: AppData,
): Promise<{ posted: number; skipped: number; alerts: TenantAlert[] }> => {
  const alerts = collectTenantAlerts(d)
  const unseen = unseenAlerts(alerts)

  if (!unseen.length) return { posted: 0, skipped: alerts.length - unseen.length, alerts }

  if (!Capacitor.isNativePlatform()) {
    /* No OS notifications in a browser; just remember them. */
    markAlertsSeen(unseen)
    return { posted: 0, skipped: alerts.length, alerts }
  }

  try {
    await LocalNotifications.schedule({
      notifications: unseen.map((a) => ({
        id: notificationId(a.id),
        title: a.title,
        body: a.body,
        channelId: 'kodisalama-reminders',
        smallIcon: 'ic_stat_house',
        extra: { kind: 'tenant-alert', alertId: a.id, tenantId: a.tenantId },
        /* No `schedule`: these fire immediately when the app opens. */
      })),
    })
    markAlertsSeen(unseen)
    return { posted: unseen.length, skipped: alerts.length - unseen.length, alerts }
  } catch {
    /* A failed post must not block the app from opening. */
    return { posted: 0, skipped: alerts.length, alerts }
  }
}

/** One-line summary for the dashboard: "3 deni · 1 mkataba unaisha". */
export const describeAlerts = (alerts: TenantAlert[]): string => {
  if (!alerts.length) return 'Hakuna taarifa muhimu'
  const debts = alerts.filter((a) => a.kind === 'rent-debt').length
  const endings = alerts.filter((a) => a.kind === 'contract-ending').length
  const parts: string[] = []
  if (debts) parts.push(`${debts} deni`)
  if (endings) parts.push(`${endings} mkataba${endings === 1 ? '' : ''} unaisha`)
  return parts.join(' · ')
}
