import { db, type Measurement } from '@/lib/db'
import { uid } from '@/lib/id'

export const MEASUREMENT_FIELDS = [
  { key: 'weightKg', label: 'Вес', unit: 'кг' },
  { key: 'bodyFatPct', label: '% жира', unit: '%' },
  { key: 'waistCm', label: 'Талия', unit: 'см' },
  { key: 'hipsCm', label: 'Бёдра', unit: 'см' },
  { key: 'chestCm', label: 'Грудь', unit: 'см' },
  { key: 'thighCm', label: 'Бедро', unit: 'см' },
  { key: 'armCm', label: 'Плечо', unit: 'см' },
  { key: 'heightCm', label: 'Рост', unit: 'см' },
] as const

export type MeasurementField = (typeof MEASUREMENT_FIELDS)[number]['key']

export type MeasurementValues = Pick<Measurement, 'date' | 'note'> & Partial<Record<MeasurementField, number | null>>

export function hasValues(m: Partial<Record<MeasurementField, number | null>>): boolean {
  return MEASUREMENT_FIELDS.some((f) => m[f.key] != null)
}

export async function saveMeasurement(clientId: string, values: MeasurementValues, existingId?: string) {
  const now = Date.now()
  if (existingId) {
    await db.measurements.update(existingId, { ...values, updatedAt: now })
    return existingId
  }
  const id = uid()
  await db.measurements.add({ id, clientId, ...values, createdAt: now, updatedAt: now })
  return id
}
