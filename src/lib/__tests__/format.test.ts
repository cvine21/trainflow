import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  addDaysISO,
  ageFromBirthDate,
  countLabel,
  formatClock,
  formatDate,
  formatDuration,
  formatNumber,
  initials,
  normalizeName,
  parseDuration,
  parseISODate,
  parseNumber,
  plural,
  toISODate,
  todayISO,
} from '@/lib/format'

describe('toISODate / todayISO / parseISODate / addDaysISO', () => {
  it('formats a local date as YYYY-MM-DD', () => {
    expect(toISODate(new Date(2026, 10, 1))).toBe('2026-11-01')
  })

  it('round-trips ISO dates without UTC shift', () => {
    const d = parseISODate('2026-11-01')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(10)
    expect(d.getDate()).toBe(1)
    expect(toISODate(d)).toBe('2026-11-01')
  })

  it('adds days across month boundaries', () => {
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysISO('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('returns today in local time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 5, 15, 12, 0, 0))
    expect(todayISO()).toBe('2026-06-15')
    vi.useRealTimers()
  })
})

describe('formatDate', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 1, 12, 0, 0))
  })
  afterEach(() => vi.useRealTimers())

  it('uses relative labels for nearby days', () => {
    expect(formatDate('2026-11-01')).toBe('Сегодня')
    expect(formatDate('2026-10-31')).toBe('Вчера')
    expect(formatDate('2026-11-02')).toBe('Завтра')
  })

  it('can disable relative wording', () => {
    expect(formatDate('2026-11-01', { relative: false, weekday: false })).toMatch(/1\s*ноября/i)
  })
})

describe('plural / countLabel', () => {
  const forms: [string, string, string] = ['подход', 'подхода', 'подходов']

  it('picks Russian plural forms', () => {
    expect(plural(1, forms)).toBe('подход')
    expect(plural(2, forms)).toBe('подхода')
    expect(plural(5, forms)).toBe('подходов')
    expect(plural(11, forms)).toBe('подходов')
    expect(plural(21, forms)).toBe('подход')
    expect(plural(22, forms)).toBe('подхода')
  })

  it('prefixes the number', () => {
    expect(countLabel(3, forms)).toBe('3 подхода')
  })
})

describe('numbers and durations', () => {
  it('formats numbers in ru-RU', () => {
    expect(formatNumber(107.5)).toMatch(/107[,.]5/)
  })

  it('formats clock and human duration', () => {
    expect(formatClock(90)).toBe('1:30')
    expect(formatClock(45)).toBe('0:45')
    expect(formatDuration(45)).toBe('45 с')
    expect(formatDuration(120)).toBe('2 мин')
    expect(formatDuration(90)).toBe('1:30')
  })

  it('parses numbers with comma or spaces', () => {
    expect(parseNumber('14,3')).toBe(14.3)
    expect(parseNumber('1 000')).toBe(1000)
    expect(parseNumber('')).toBeNull()
    expect(parseNumber('abc')).toBeNull()
  })

  it('parses duration as seconds or m:ss / m,ss', () => {
    expect(parseDuration('90')).toBe(90)
    expect(parseDuration('1:30')).toBe(90)
    expect(parseDuration('1,30')).toBe(90)
    expect(parseDuration('14,3')).toBe(14 * 60 + 30)
    expect(parseDuration('')).toBeNull()
  })
})

describe('normalizeName / initials / age', () => {
  it('normalizes exercise names for matching', () => {
    expect(normalizeName('Жим лёжа!')).toBe('жим лежа')
    expect(normalizeName('  Тяга-верхнего  ')).toBe('тяга верхнего')
  })

  it('builds initials from first two words', () => {
    expect(initials('Анна Смирнова')).toBe('АС')
    expect(initials('Игорь')).toBe('И')
  })

  it('computes age from birth date', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 1))
    expect(ageFromBirthDate('2000-11-01')).toBe(26)
    expect(ageFromBirthDate('2000-11-02')).toBe(25)
    expect(ageFromBirthDate(undefined)).toBeNull()
    vi.useRealTimers()
  })
})
