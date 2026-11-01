import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { db, deleteClientCascade, type Client } from '@/lib/db'
import { uid } from '@/lib/id'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

type FormState = {
  name: string
  phone: string
  birthDate: string
  goal: string
  health: string
  notes: string
}

const EMPTY: FormState = {
  name: '',
  phone: '',
  birthDate: '',
  goal: '',
  health: '',
  notes: '',
}

export function ClientFormPage() {
  const { clientId } = useParams()
  const existing = useLiveQuery(async () => (clientId ? ((await db.clients.get(clientId)) ?? null) : null), [clientId])

  if (clientId && existing === null) {
    return (
      <>
        <PageHeader title="Клиент" backTo="/" />
        <EmptyState icon={UserX} title="Клиент не найден" description="Возможно, он был удалён." />
      </>
    )
  }

  if (clientId && !existing) {
    return (
      <>
        <PageHeader title="Редактирование" backTo={`/clients/${clientId}`} />
        <div className="flex flex-col gap-4 p-4">
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-11 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </>
    )
  }

  return <ClientForm key={existing?.id ?? 'new'} existing={existing ?? null} />
}

function ClientForm({ existing }: { existing: Client | null }) {
  const isEdit = existing !== null
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(() =>
    existing
      ? {
          name: existing.name,
          phone: existing.phone ?? '',
          birthDate: existing.birthDate ?? '',
          goal: existing.goal ?? '',
          health: existing.health ?? '',
          notes: existing.notes ?? '',
        }
      : EMPTY,
  )
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const set = (key: keyof FormState) => (e: { target: { value: string } }) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    if (key === 'name') setError('')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setError('Укажите имя клиента')
      return
    }
    const now = Date.now()
    const data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'> = {
      name,
      phone: form.phone.trim() || undefined,
      birthDate: form.birthDate || undefined,
      goal: form.goal.trim() || undefined,
      health: form.health.trim() || undefined,
      notes: form.notes.trim() || undefined,
    }
    if (existing) {
      await db.clients.update(existing.id, { ...data, updatedAt: now })
      toast.success('Данные клиента обновлены')
      navigate(`/clients/${existing.id}`, { replace: true })
    } else {
      const id = uid()
      await db.clients.add({ id, ...data, createdAt: now, updatedAt: now })
      toast.success(`${name} добавлен(а) в базу`)
      navigate(`/clients/${id}`, { replace: true })
    }
  }

  const backTo = existing ? `/clients/${existing.id}` : '/'

  return (
    <>
      <PageHeader title={isEdit ? 'Редактирование' : 'Новый клиент'} backTo={backTo} />
      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <div className="flex flex-col gap-5 px-4 py-5">
          <Field label="Имя и фамилия" htmlFor="name" required error={error}>
            <Input
              id="name"
              value={form.name}
              onChange={set('name')}
              placeholder="Например, Анна Смирнова"
              autoComplete="off"
              autoFocus={!isEdit}
              aria-invalid={!!error}
              className="h-11"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Телефон" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+7…"
                className="h-11"
              />
            </Field>
            <Field label="Дата рождения" htmlFor="birthDate">
              <Input id="birthDate" type="date" value={form.birthDate} onChange={set('birthDate')} className="h-11" />
            </Field>
          </div>
          <Field label="Цель тренировок" htmlFor="goal">
            <Textarea
              id="goal"
              value={form.goal}
              onChange={set('goal')}
              placeholder="Похудение, сила, подготовка к старту…"
              rows={2}
            />
          </Field>
          <Field
            label="Здоровье и ограничения"
            htmlFor="health"
            hint="Травмы, противопоказания — будут видны при составлении тренировок"
          >
            <Textarea
              id="health"
              value={form.health}
              onChange={set('health')}
              placeholder="Например: болит колено при глубоком приседе"
              rows={2}
            />
          </Field>
          <Field label="Заметки" htmlFor="notes">
            <Textarea
              id="notes"
              value={form.notes}
              onChange={set('notes')}
              placeholder="Расписание, предпочтения, всё важное"
              rows={3}
            />
          </Field>

          {existing && (
            <Button
              type="button"
              variant="destructive"
              className="mt-2 h-11 self-start"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Удалить клиента
            </Button>
          )}
        </div>

        <div className="pb-safe sticky bottom-0 mt-auto border-t border-border/60 bg-background/90 px-4 pt-3 backdrop-blur-md">
          <Button type="submit" className="mb-3 h-12 w-full text-base">
            {isEdit ? 'Сохранить изменения' : 'Добавить клиента'}
          </Button>
        </div>
      </form>

      {existing && (
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Удалить ${existing.name}?`}
          description="Вместе с клиентом будут удалены все его тренировки и заметки. Это действие нельзя отменить."
          onConfirm={async () => {
            await deleteClientCascade(existing.id)
            toast.success('Клиент удалён')
            navigate('/', { replace: true })
          }}
        />
      )}
    </>
  )
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string
  htmlFor: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
        {required && <span className="text-primary">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}
