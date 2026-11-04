import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/Sheet'
import { Textarea } from '@/components/Textarea'
import { NumberInput } from '@/components/Workout/NumberInput'
import { deleteMeasurement, type Measurement } from '@/lib/db'
import { formatNumber, todayISO } from '@/lib/format'
import { hasValues, MEASUREMENT_FIELDS, saveMeasurement, type MeasurementField } from '@/lib/measurements'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import styles from './MeasurementSheet.module.css'

type Values = Record<MeasurementField, number | null>

interface MeasurementSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  /** Edit this measurement; otherwise a new one is created. */
  measurement?: Measurement | null
  /** Latest earlier values, shown as hints. */
  previous?: Partial<Values>
}

export function MeasurementSheet({ open, onOpenChange, ...props }: MeasurementSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className={styles.sheet}>
        {open && <MeasurementForm {...props} onDone={() => onOpenChange(false)} />}
      </SheetContent>
    </Sheet>
  )
}

function MeasurementForm({
  clientId,
  measurement,
  previous,
  onDone,
}: Omit<MeasurementSheetProps, 'open' | 'onOpenChange'> & { onDone: () => void }) {
  const [date, setDate] = useState(measurement?.date ?? todayISO())
  const [note, setNote] = useState(measurement?.note ?? '')
  const [values, setValues] = useState<Values>(
    () => Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, measurement?.[f.key] ?? null])) as Values,
  )
  const [confirmDelete, setConfirmDelete] = useState(false)
  const canSave = hasValues(values) || note.trim().length > 0

  async function save() {
    await saveMeasurement(clientId, { ...values, date, note: note.trim() || undefined }, measurement?.id)
    toast.success(measurement ? 'Замер обновлён' : 'Замер сохранён')
    onDone()
  }

  return (
    <>
      <SheetHeader className={styles.header}>
        <div className={styles.handle} aria-hidden />
        <SheetTitle className={styles.title}>{measurement ? 'Замер' : 'Новый замер'}</SheetTitle>
        <SheetDescription>Заполните только то, что измеряли сегодня</SheetDescription>
      </SheetHeader>

      <div className={styles.form}>
        <div className={styles.field}>
          <Label htmlFor="m-date">Дата</Label>
          <Input
            id="m-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className={styles.dateInput}
          />
        </div>

        <div className={styles.grid}>
          {MEASUREMENT_FIELDS.map((f) => {
            const hint = previous?.[f.key]
            return (
              <div key={f.key} className={styles.field}>
                <Label htmlFor={`m-${f.key}`} className={styles.measureLabel}>
                  <span>
                    {f.label}, <span className={styles.unit}>{f.unit}</span>
                  </span>
                  {hint != null && <span className={styles.hint}>было {formatNumber(hint)}</span>}
                </Label>
                <NumberInput
                  value={values[f.key]}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                  decimal
                  label={f.label}
                  placeholder="—"
                  className={styles.measureInput}
                />
              </div>
            )
          })}
        </div>

        <div className={styles.field}>
          <Label htmlFor="m-note">Заметка</Label>
          <Textarea
            id="m-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Например: утром натощак"
            rows={2}
          />
        </div>
      </div>

      <div className={styles.footer}>
        {measurement && (
          <Button
            variant="outline"
            size="icon-lg"
            className={styles.delete}
            onClick={() => setConfirmDelete(true)}
            aria-label="Удалить замер"
          >
            <Trash2 />
          </Button>
        )}
        <Button className={styles.save} disabled={!canSave} onClick={save}>
          Сохранить
        </Button>
      </div>

      {measurement && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title="Удалить замер?"
          onConfirm={async () => {
            await deleteMeasurement(measurement.id)
            toast.success('Замер удалён')
            onDone()
          }}
        />
      )}
    </>
  )
}
