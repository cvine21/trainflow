export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso)
  d.setDate(d.getDate() + days)
  return toISODate(d)
}

function diffDays(iso: string): number {
  const a = parseISODate(iso).getTime()
  const b = parseISODate(todayISO()).getTime()
  return Math.round((a - b) / 86_400_000)
}

const dayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const dayMonthYear = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })

export function formatDate(iso: string, opts: { relative?: boolean; weekday?: boolean } = {}): string {
  const { relative = true, weekday: withWeekday = true } = opts
  const d = parseISODate(iso)
  if (relative) {
    const diff = diffDays(iso)
    if (diff === 0) return 'Сегодня'
    if (diff === -1) return 'Вчера'
    if (diff === 1) return 'Завтра'
  }
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const base = (sameYear ? dayMonth : dayMonthYear).format(d).replace(' г.', '')
  return withWeekday ? `${weekday.format(d)}, ${base}` : base
}

export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
    .format(parseISODate(iso))
    .replace(' г.', '')
}

export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const last = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (last > 1 && last < 5) return forms[1]
  if (last === 1) return forms[0]
  return forms[2]
}

export function countLabel(n: number, forms: [string, string, string]): string {
  return `${n} ${plural(n, forms)}`
}

const numberFmt = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 })

export function formatNumber(n: number): string {
  return numberFmt.format(n)
}

export function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m === 0) return `${s} с`
  if (s === 0) return `${m} мин`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function parseNumber(value: string): number | null {
  const normalized = value.replace(',', '.').replace(/\s/g, '')
  if (normalized === '') return null
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}

/** Accepts plain seconds ("90") or "м:сс" ("1:30") and returns seconds. */
export function parseDuration(value: string): number | null {
  const v = value.trim()
  if (!v) return null
  if (v.includes(':')) {
    const [m, s] = v.split(':')
    const mm = parseNumber(m ?? '') ?? 0
    const ss = parseNumber(s ?? '') ?? 0
    return Math.round(mm * 60 + ss)
  }
  const n = parseNumber(v)
  return n === null ? null : Math.round(n)
}

export function ageFromBirthDate(iso?: string): number | null {
  if (!iso) return null
  const b = parseISODate(iso)
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age >= 0 && age < 120 ? age : null
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}
