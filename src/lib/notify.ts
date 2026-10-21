import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

/* ------------------------------------------------------------------ *
 * Local notifications: a daily rent reminder the user schedules
 * themselves. On Android this goes through the real OS permission
 * (POST_NOTIFICATIONS on 13+) and exact alarms, so it fires even when
 * the app is closed.
 * ------------------------------------------------------------------ */

const REMINDER_ID = 4212
const CHANNEL_ID = 'kodisalama-reminders'

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported'

/** The plugin only exists natively; the web build falls back to the Notification API. */
export const isNative = () => Capacitor.isNativePlatform()

export const notificationsSupported = () => {
  if (isNative()) return true
  return typeof window !== 'undefined' && 'Notification' in window
}

async function ensureChannel() {
  if (!isNative()) return
  try {
    await LocalNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'Kumbusho la Kodi',
      description: 'Arifa ya kila siku kuhusu kodi inayodaiwa',
      // 4 = IMPORTANCE_HIGH, so the reminder pops up as a heads-up banner.
      importance: 4,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#15803d',
      // No `sound` on purpose: the plugin resolves that string to
      // res/raw/<name>, and a missing resource means a silent channel.
      // Leaving it unset keeps Android's default notification sound.
    })
  } catch {
    /* older plugin versions create the channel implicitly */
  }
}

export async function getPermission(): Promise<PermissionState> {
  if (isNative()) {
    try {
      const res = await LocalNotifications.checkPermissions()
      return res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'prompt'
    } catch {
      return 'prompt'
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission === 'granted'
    ? 'granted'
    : Notification.permission === 'denied'
      ? 'denied'
      : 'prompt'
}

export async function requestPermission(): Promise<PermissionState> {
  if (isNative()) {
    try {
      await ensureChannel()
      const res = await LocalNotifications.requestPermissions()
      return res.display === 'granted' ? 'granted' : res.display === 'denied' ? 'denied' : 'prompt'
    } catch {
      return 'denied'
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  const res = await Notification.requestPermission()
  return res === 'granted' ? 'granted' : res === 'denied' ? 'denied' : 'prompt'
}

/** Android 12+ can still block exact alarms per-app; surface that separately. */
export async function exactAlarmAllowed(): Promise<boolean | null> {
  if (!isNative()) return null
  try {
    const res = await LocalNotifications.checkExactNotificationSetting()
    return res.exact_alarm === 'granted'
  } catch {
    /* not supported on this plugin/device */
    return null
  }
}

/** Hands the user straight to the system screen that grants exact alarms. */
export async function openExactAlarmSettings(): Promise<void> {
  if (!isNative()) return
  try {
    await LocalNotifications.changeExactNotificationSetting()
  } catch {
    /* older device — the app detail screen is the manual fallback */
  }
}

const nextOccurrence = (hour: number, minute: number) => {
  const at = new Date()
  at.setHours(hour, minute, 0, 0)
  if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1)
  return at
}

/**
 * Schedules (or replaces) the daily reminder. Cancels any previous one first
 * so changing the time never leaves a stale alarm behind.
 */
export async function scheduleReminder({
  hour,
  minute,
  title,
  body,
}: {
  hour: number
  minute: number
  title: string
  body: string
}): Promise<{ ok: boolean; message: string }> {
  await cancelReminder()

  if (!isNative()) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { ok: false, message: 'Arifa hazipatikani kwenye kivinjari hiki' }
    }
    if (Notification.permission !== 'granted') {
      return { ok: false, message: 'Ruhusu arifa kwanza' }
    }
    return { ok: true, message: 'Arifa imewashwa (kwenye kivinjari hutumika ikiwa app iko wazi)' }
  }

  try {
    await ensureChannel()
    const at = nextOccurrence(hour, minute)
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_ID,
          title,
          body,
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_key',
          extra: { kind: 'rent-reminder' },
          schedule: { at, repeats: true, every: 'day', allowWhileIdle: true },
        },
      ],
    })
    return { ok: true, message: `Imepangwa kila siku saa ${pad(hour)}:${pad(minute)}` }
  } catch (e) {
    const msg = String(e)
    if (msg.includes('0017') || msg.includes('0018')) {
      return {
        ok: false,
        message: 'Ruhusu "Alarms & reminders" kwenye Mipangilio ya simu ili arifa zifanye kazi',
      }
    }
    if (msg.includes('0005')) {
      return { ok: false, message: 'Arifa zimezimwa kwenye Mipangilio ya simu' }
    }
    return { ok: false, message: `Imeshindwa kupanga arifa: ${msg}` }
  }
}

export async function cancelReminder(): Promise<void> {
  if (!isNative()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] })
  } catch {
    /* nothing scheduled */
  }
}

/** Fires a notification straight away so the user can confirm it works. */
export async function testReminder(title: string, body: string): Promise<{ ok: boolean; message: string }> {
  if (!isNative()) {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return { ok: false, message: 'Arifa hazipatikani kwenye kivinjari hiki' }
    }
    if (Notification.permission !== 'granted') {
      const p = await Notification.requestPermission()
      if (p !== 'granted') return { ok: false, message: 'Ruhusu arifa kwanza' }
    }
    new Notification(title, { body, icon: '/icons/icon-192.png' })
    return { ok: true, message: 'Arifa ya majaribio imetumwa' }
  }

  try {
    await ensureChannel()
    await LocalNotifications.schedule({
      notifications: [
        {
          id: REMINDER_ID + 1,
          title,
          body,
          channelId: CHANNEL_ID,
          smallIcon: 'ic_stat_key',
          schedule: { at: new Date(Date.now() + 1500) },
        },
      ],
    })
    return { ok: true, message: 'Arifa ya majaribio imetumwa' }
  } catch (e) {
    return { ok: false, message: `Imeshindwa: ${String(e)}` }
  }
}

export const pad = (n: number) => String(n).padStart(2, '0')

/** Human Swahili description of when the next reminder fires. */
export const describeSchedule = (hour: number, minute: number) =>
  `Kila siku saa ${pad(hour)}:${pad(minute)}`
