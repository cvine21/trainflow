import { useState, type FormEvent } from 'react'
import { LoaderCircle, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** When Supabase is configured, block the app until the user signs in. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, user, signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

  if (!configured) return children
  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-muted-foreground">
        <LoaderCircle className="size-8 animate-spin text-primary" />
        <p className="text-sm">Загрузка аккаунта…</p>
      </div>
    )
  }
  if (user) return children

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true)
    try {
      await signInWithEmail(email)
      setLinkSent(true)
      toast.success('Ссылка для входа отправлена на почту')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось отправить ссылку')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6 px-6 py-10">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="font-heading text-3xl tracking-wide">Журнал тренера</h1>
        <p className="text-sm text-muted-foreground">
          Войдите, чтобы открыть клиентов и тренировки на этом устройстве.
        </p>
      </div>
      <form onSubmit={onSubmit} className="mx-auto flex w-full max-w-sm flex-col gap-3">
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="gate-email">Email</Label>
          <Input
            id="gate-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setLinkSent(false)
            }}
            placeholder="you@example.com"
            className="h-11"
            required
            autoFocus
          />
        </div>
        <Button type="submit" className="h-12 text-base" disabled={busy || !navigator.onLine}>
          {busy ? <LoaderCircle className="size-5 animate-spin" /> : <Mail className="size-5" />}
          {linkSent ? 'Отправить ещё раз' : 'Войти по ссылке'}
        </Button>
        {linkSent && (
          <p className="text-center text-xs text-muted-foreground">
            Откройте письмо на этом устройстве и перейдите по ссылке.
          </p>
        )}
      </form>
    </div>
  )
}
