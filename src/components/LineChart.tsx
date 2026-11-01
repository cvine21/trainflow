import { useId } from 'react'
import { formatNumber, parseISODate } from '@/lib/format'
import { cn } from '@/lib/utils'

export interface ChartPoint {
  date: string
  value: number
}

const W = 340
const H = 170
const PAD = { top: 22, right: 14, bottom: 22, left: 40 }

const shortDate = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
const formatShortDate = (iso: string) => shortDate.format(parseISODate(iso)).replace('.', '')

/** Dependency-free SVG line chart; x follows real dates so gaps between sessions stay visible. */
export function LineChart({
  points,
  format = formatNumber,
  className,
}: {
  points: ChartPoint[]
  format?: (value: number) => string
  className?: string
}) {
  const gradientId = useId()

  if (points.length < 2) {
    return (
      <div
        className={cn(
          'flex h-28 flex-col items-center justify-center rounded-xl bg-muted/50 text-center text-sm text-muted-foreground',
          className,
        )}
      >
        {points[0] && <span className="text-2xl font-semibold text-foreground">{format(points[0].value)}</span>}
        <span>График появится после второй записи</span>
      </div>
    )
  }

  const times = points.map((p) => parseISODate(p.date).getTime())
  const t0 = Math.min(...times)
  const t1 = Math.max(...times)
  const values = points.map((p) => p.value)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const span = hi - lo
  lo -= span * 0.12
  hi += span * 0.12

  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const x = (i: number) =>
    PAD.left + (t1 === t0 ? (i / (points.length - 1)) * innerW : ((times[i]! - t0) / (t1 - t0)) * innerW)
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * innerH

  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${PAD.top + innerH} L${PAD.left},${PAD.top + innerH} Z`
  const ticks = [hi - (hi - lo) * 0.12, (hi + lo) / 2, lo + (hi - lo) * 0.12]
  const tickLabel = (v: number) => format(hi - lo >= 6 ? Math.round(v) : Math.round(v * 10) / 10)
  const last = points.length - 1
  const lastX = x(last)
  const falling = points[last]!.value < points[last - 1]!.value

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn('h-auto w-full overflow-visible', className)} role="img">
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((v) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(v)}
            y2={y(v)}
            className="stroke-border"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
          <text x={PAD.left - 6} y={y(v) + 3.5} textAnchor="end" className="fill-muted-foreground text-[10px]">
            {tickLabel(v)}
          </text>
        </g>
      ))}
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" className="stroke-primary" strokeWidth={2.25} strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle
          key={`${p.date}-${i}`}
          cx={x(i)}
          cy={y(p.value)}
          r={i === last ? 4.5 : 3}
          className={i === last ? 'fill-primary stroke-card' : 'fill-card stroke-primary'}
          strokeWidth={2}
        />
      ))}
      <text
        x={Math.min(lastX, W - PAD.right)}
        y={y(points[last]!.value) + (falling ? 18 : -10)}
        textAnchor={lastX > W - 60 ? 'end' : 'middle'}
        className="fill-foreground text-[11px] font-semibold"
      >
        {format(points[last]!.value)}
      </text>
      <text x={PAD.left} y={H - 4} className="fill-muted-foreground text-[10px]">
        {formatShortDate(points[0]!.date)}
      </text>
      <text x={W - PAD.right} y={H - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
        {formatShortDate(points[last]!.date)}
      </text>
    </svg>
  )
}
