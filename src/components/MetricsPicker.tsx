import type { Metric } from '@/lib/db'
import { BASE_METRICS, LOAD_LABELS, loadOf, METRIC_LABELS, sortMetrics, withLoad, type LoadType } from '@/lib/workouts'
import { Chip, Segmented } from '@/components/Chip'

const LOADS: LoadType[] = ['kg', 'band', 'bodyweight']

export function MetricsPicker({ metrics, onChange }: { metrics: Metric[]; onChange: (metrics: Metric[]) => void }) {
  const toggle = (m: Metric) => {
    const next = metrics.includes(m) ? metrics.filter((x) => x !== m) : [...metrics, m]
    if (next.length) onChange(sortMetrics(next))
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Нагрузка</span>
        <Segmented
          label="Нагрузка"
          value={loadOf(metrics)}
          options={LOADS.map((l) => [l, LOAD_LABELS[l]] as const)}
          onChange={(l) => onChange(withLoad(metrics, l))}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-muted-foreground">Что записываем</span>
        <div className="flex flex-wrap gap-1.5">
          {BASE_METRICS.map((m) => (
            <Chip key={m} active={metrics.includes(m)} onClick={() => toggle(m)} className="h-8 text-xs">
              {METRIC_LABELS[m].full}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
