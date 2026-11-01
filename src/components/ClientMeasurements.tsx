import { useState } from 'react'
import { ChevronRight, MessageSquareText, Ruler } from 'lucide-react'
import type { Measurement } from '@/lib/db'
import { formatDate, formatNumber } from '@/lib/format'
import { MEASUREMENT_FIELDS, type MeasurementField } from '@/lib/measurements'
import { Chip } from '@/components/Chip'
import { EmptyState } from '@/components/EmptyState'
import { LineChart } from '@/components/LineChart'

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
        className="py-8"
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

  return (
    <>
      {field && (
        <section className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card p-4">
          <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
            {available.map((f) => (
              <Chip key={f.key} active={f.key === field.key} onClick={() => setPicked(f.key)} className="h-8 text-xs">
                {f.label}
              </Chip>
            ))}
          </div>
          <LineChart points={points} />
          {total != null && (
            <p className="text-sm text-muted-foreground">
              С <span className="lowercase">{formatDate(points[0]!.date, { weekday: false, relative: false })}</span>:{' '}
              <span className="font-semibold text-foreground">
                {formatDelta(total)} {field.unit}
              </span>
            </p>
          )}
        </section>
      )}

      <ul className="flex flex-col gap-2">
        {measurements.map((m, i) => {
          const filled = MEASUREMENT_FIELDS.filter((f) => m[f.key] != null)
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onOpen(m)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card p-4 text-left active:bg-muted/60"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-muted-foreground first-letter:uppercase">
                    {formatDate(m.date, { weekday: false })}
                  </div>
                  {filled.length > 0 && (
                    <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {filled.map((f) => {
                        const delta = deltaAt(measurements, i, f.key)
                        return (
                          <div key={f.key} className="flex items-baseline gap-1.5">
                            <dt className="text-muted-foreground">{f.label}</dt>
                            <dd className="font-semibold tabular-nums">
                              {formatNumber(m[f.key]!)}
                              <span className="ml-0.5 text-xs font-normal text-muted-foreground">{f.unit}</span>
                            </dd>
                            {delta != null && delta !== 0 && (
                              <span className="text-[11px] text-muted-foreground tabular-nums">
                                {formatDelta(delta)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </dl>
                  )}
                  {m.note && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <MessageSquareText className="mt-px size-3.5 shrink-0" />
                      <span className="line-clamp-2">{m.note}</span>
                    </p>
                  )}
                </div>
                <ChevronRight className="size-5 shrink-0 text-muted-foreground/60" />
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
