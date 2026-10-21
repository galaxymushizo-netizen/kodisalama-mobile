export const uid = () =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase()

/** TZS 12,000 */
export const money = (n: number) =>
  `TZS ${Math.round(n || 0).toLocaleString('en-US')}`

/** 12000 -> "12,000" */
export const num = (n: number) => Math.round(n || 0).toLocaleString('en-US')

export const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

const MONTHS_SW = [
  'Januari',
  'Februari',
  'Machi',
  'Aprili',
  'Mei',
  'Juni',
  'Julai',
  'Agosti',
  'Septemba',
  'Oktoba',
  'Novemba',
  'Desemba',
]

/** ISO (yyyy-mm-dd) -> 15 Okt 2026 */
export const fmtDate = (iso: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')} ${MONTHS_SW[m - 1].slice(0, 3)} ${y}`
}

/** ISO -> 15/10/2026 */
export const fmtDateNum = (iso: string) => {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return iso
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

export const monthKey = (iso: string) => (iso ? iso.slice(0, 7) : '')

export const thisMonthKey = () => todayISO().slice(0, 7)

export const mweziLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number)
  if (!y || !m) return key
  return `${MONTHS_SW[m - 1]} ${y}`
}

/** Whole months elapsed from `from` to today (min 0). Same day = 0. */
export const monthsElapsed = (from: string) => {
  if (!from) return 0
  const [fy, fm, fd] = from.split('-').map(Number)
  if (!fy) return 0
  const now = new Date()
  let months = (now.getFullYear() - fy) * 12 + (now.getMonth() + 1 - fm)
  if (now.getDate() < fd) months -= 1
  return Math.max(0, months)
}

export const addMonths = (iso: string, months: number) => {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(y, m - 1 + months, d || 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

export const normalizePhone = (raw: string) => (raw || '').replace(/[^\d+]/g, '')

/** 0712345678 -> 255712345678 (Tanzania) for wa.me / sms: links */
export const waPhone = (raw: string) => {
  let p = normalizePhone(raw).replace(/^\+/, '')
  if (p.startsWith('0')) p = `255${p.slice(1)}`
  else if (p.startsWith('7') || p.startsWith('6')) p = `255${p}`
  return p
}

export const smsLink = (raw: string, body: string) =>
  `sms:${normalizePhone(raw)}?body=${encodeURIComponent(body)}`

export const waLink = (raw: string, body: string) =>
  `https://wa.me/${waPhone(raw)}?text=${encodeURIComponent(body)}`

/** 23 -> "23 herufi (SMS 1)" */
export const smsSegments = (text: string) => {
  const len = text.length
  const segments = len <= 160 ? 1 : Math.ceil(len / 153)
  return { len, segments }
}
