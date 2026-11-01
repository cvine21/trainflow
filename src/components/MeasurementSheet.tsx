import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteMeasurement, type Measurement } from '@/lib/db'
import { formatNumber, todayISO } from '@/lib/format'
import { hasValues, MEASUREMENT_FIELDS, saveMeasurement, type MeasurementField } from '@/lib/measurements'
import { NumberInput } from '@/components/workout/NumberInput'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'

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
      <SheetContent side="bottom" className="mx-auto max-w-lg gap-0 rounded-t-3xl p-0 data-[side=bottom]:h-[88dvh]">
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
      <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
        <div className="mx-auto -mt-1 mb-2 h-1 w-10 rounded-full bg-muted-foreground/25" aria-hidden />
        <SheetTitle className="font-sans text-lg font-semibold">{measurement ? 'Замер' : 'Новый замер'}</SheetTitle>
        <SheetDescription>Заполните только то, что измеряли сегодня</SheetDescription>
      </SheetHeader>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="m-date">Дата</Label>
          <Input
            id="m-date"
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="h-11"
          />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-3">
          {MEASUREMENT_FIELDS.map((f) => {
            const hint = previous?.[f.key]
            return (
              <div key={f.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`m-${f.key}`} className="flex items-baseline justify-between gap-1">
                  <span>
                    {f.label}, <span className="font-normal text-muted-foreground">{f.unit}</span>
                  </span>
                  {hint != null && (
                    <span className="text-[11px] font-normal text-muted-foreground">было {formatNumber(hint)}</span>
                  )}
                </Label>
                <NumberInput
                  value={values[f.key]}
                  onChange={(v) => setValues((s) => ({ ...s, [f.key]: v }))}
                  decimal
                  label={f.label}
                  placeholder="—"
                  className="h-11 text-base font-medium"
                />
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-1.5">
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

      <div className="pb-safe flex gap-2 border-t border-border/60 px-4 pt-3">
        {measurement && (
          <Button
            variant="outline"
            size="icon-lg"
            className="mb-3 size-12 shrink-0 text-destructive"
            onClick={() => setConfirmDelete(true)}
            aria-label="Удалить замер"
          >
            <Trash2 />
          </Button>
        )}
        <Button className="mb-3 h-12 flex-1 text-base" disabled={!canSave} onClick={save}>
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
