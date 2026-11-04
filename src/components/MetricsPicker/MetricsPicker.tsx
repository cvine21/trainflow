import type { Metric } from '@/lib/db'
import { BASE_METRICS, LOAD_LABELS, loadOf, METRIC_LABELS, sortMetrics, withLoad, type LoadType } from '@/lib/workouts'
import { Chip, Segmented } from '@/components/Chip'
import styles from './MetricsPicker.module.css'

const LOADS: LoadType[] = ['kg', 'band', 'bodyweight']

export function MetricsPicker({ metrics, onChange }: { metrics: Metric[]; onChange: (metrics: Metric[]) => void }) {
  const toggle = (m: Metric) => {
    const next = metrics.includes(m) ? metrics.filter((x) => x !== m) : [...metrics, m]
    if (next.length) onChange(sortMetrics(next))
  }

  return (
    <div className={styles.root}>
      <div className={styles.field}>
        <span className={styles.label}>Нагрузка</span>
        <Segmented
          label="Нагрузка"
          value={loadOf(metrics)}
          options={LOADS.map((l) => [l, LOAD_LABELS[l]] as const)}
          onChange={(l) => onChange(withLoad(metrics, l))}
        />
      </div>
      <div className={styles.field}>
        <span className={styles.label}>Что записываем</span>
        <div className={styles.chips}>
          {BASE_METRICS.map((m) => (
            <Chip key={m} active={metrics.includes(m)} onClick={() => toggle(m)} className={styles.chip}>
              {METRIC_LABELS[m].full}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  )
}
