import { Button } from '@/components/Button'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { EmptyState } from '@/components/EmptyState'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { PageHeader } from '@/components/PageHeader'
import { Skeleton } from '@/components/Skeleton'
import { Textarea } from '@/components/Textarea'
import { db, deleteClientCascade, type Client } from '@/lib/db'
import { uid } from '@/lib/id'
import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Trash2, UserX } from 'lucide-react'
import { useState, type ReactNode, type SubmitEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import styles from './ClientFormPage.module.css'

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
        <div className={styles.stack}>
          <Skeleton className={styles.skeletonControl} />
          <Skeleton className={styles.skeletonControl} />
          <Skeleton className={styles.skeletonArea} />
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

  async function handleSubmit(e: SubmitEvent) {
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
      <form onSubmit={handleSubmit} className={clsx(styles.form)}>
        <div className={styles.fields}>
          <Field label="Имя и фамилия" htmlFor="name" required error={error}>
            <Input
              id="name"
              value={form.name}
              onChange={set('name')}
              placeholder="Например, Анна Смирнова"
              autoComplete="off"
              autoFocus={!isEdit}
              aria-invalid={!!error}
              className={styles.control}
            />
          </Field>
          <div className={styles.pair}>
            <Field label="Телефон" htmlFor="phone">
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="+7…"
                className={styles.control}
              />
            </Field>
            <Field label="Дата рождения" htmlFor="birthDate">
              <Input
                id="birthDate"
                type="date"
                value={form.birthDate}
                onChange={set('birthDate')}
                className={styles.control}
              />
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
              className={styles.deleteButton}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 /> Удалить клиента
            </Button>
          )}
        </div>

        <div className={styles.stickyBar}>
          <Button type="submit" className={styles.submit}>
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
    <div className={styles.field}>
      <Label htmlFor={htmlFor} className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </Label>
      {children}
      {error ? <p className={styles.error}>{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
