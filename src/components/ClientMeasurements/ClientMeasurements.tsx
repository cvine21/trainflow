import { useState } from 'react'
import { ChevronRight, MessageSquareText, Ruler } from 'lucide-react'
import type { Measurement } from '@/lib/db'
import { formatDate, formatNumber } from '@/lib/format'
import { MEASUREMENT_FIELDS, type MeasurementField } from '@/lib/measurements'
import { Chip } from '@/components/Chip'
import { EmptyState } from '@/components/EmptyState'
import { LineChart } from '@/components/LineChart'
import styles from './ClientMeasurements.module.css'

function formatDelta(delta: number): string {
  const rounded = Math.round(delta * 10) / 10
  if (rounded === 0) return '±0'
  return `${rounded > 0 ? '+' : '−'}${formatNumber(Math.abs(rounded))}`
}

/** Change vs. the nearest older measurement that has the same field. */
function deltaAt(list: Measurement[], index: number, key: MeasurementField): number | null {
  const value = list[index]?.[key]
  if (value == null) return null
  for (let j = index + 1; j < list.length; j++) {
    const prev = list[j]![key]
    if (prev != null) return value - prev
  }
  return null
}

export function ClientMeasurements({
  measurements,
  onOpen,
}: {
  /** Newest first. */
  measurements: Measurement[]
  onOpen: (m: Measurement) => void
}) {
  const available = MEASUREMENT_FIELDS.filter((f) => measurements.some((m) => m[f.key] != null))
  const [picked, setPicked] = useState<MeasurementField>('weightKg')
  const field = available.find((f) => f.key === picked) ?? available[0]

  if (!measurements.length) {
    return (
      <EmptyState
        icon={Ruler}
        title="Замеров пока нет"
        description="Вес, обхваты и процент жира с датами — чтобы видеть динамику, а не одно число в профиле."
        className={styles.empty}
      />
    )
  }

  const points = field
    ? measurements
        .filter((m) => m[field.key] != null)
        .map((m) => ({ date: m.date, value: m[field.key]! }))
        .reverse()
    : []
  const total = points.length > 1 ? points.at(-1)!.value - points[0]!.value : null
  const since = points[0] ? formatDate(points[0].date, { weekday: false, relative: false }) : null

  return (
    <>
      {field && (
        <section className={styles.chart}>
          <div className={styles.chips}>
            {available.map((f) => (
              <Chip key={f.key} active={f.key === field.key} onClick={() => setPicked(f.key)} className={styles.chip}>
                {f.label}
              </Chip>
            ))}
          </div>
          <LineChart points={points} />
          {total != null && (
            <p className={styles.total}>
              С <span className={styles.since}>{since}</span>:{' '}
              <span className={styles.totalValue}>
                {formatDelta(total)} {field.unit}
              </span>
            </p>
          )}
        </section>
      )}

      <ul className={styles.list}>
        {measurements.map((m, i) => {
          const filled = MEASUREMENT_FIELDS.filter((f) => m[f.key] != null)
          return (
            <li key={m.id}>
              <button type="button" onClick={() => onOpen(m)} className={styles.item}>
                <div className={styles.itemBody}>
                  <div className={styles.date}>{formatDate(m.date, { weekday: false })}</div>
                  {filled.length > 0 && (
                    <dl className={styles.metrics}>
                      {filled.map((f) => {
                        const delta = deltaAt(measurements, i, f.key)
                        return (
                          <div key={f.key} className={styles.metric}>
                            <dt className={styles.metricLabel}>{f.label}</dt>
                            <dd className={styles.metricValue}>
                              {formatNumber(m[f.key]!)}
                              <span className={styles.unit}>{f.unit}</span>
                            </dd>
                            {delta != null && delta !== 0 && <span className={styles.delta}>{formatDelta(delta)}</span>}
                          </div>
                        )
                      })}
                    </dl>
                  )}
                  {m.note && (
                    <p className={styles.note}>
                      <MessageSquareText className={styles.noteIcon} />
                      <span className={styles.noteText}>{m.note}</span>
                    </p>
                  )}
                </div>
                <ChevronRight className={styles.chevron} />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
