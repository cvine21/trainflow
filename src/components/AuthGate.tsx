import { useState, type FormEvent } from 'react'
import { LoaderCircle, LogIn, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/** When Supabase is configured, block the app until the user signs in. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  // Local dev: skip the login wall (keeps IndexedDB + avoids auth friction).
  if (!configured || import.meta.env.DEV) return children
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
    if (!email.trim() || !password) return
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(email, password)
        toast.success('Вы вошли')
      } else {
        await signUp(email, password)
        toast.success('Аккаунт создан')
      }
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : mode === 'signin' ? 'Не удалось войти' : 'Не удалось создать аккаунт',
      )
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
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11"
            required
            autoFocus
          />
        </div>
        <div className="flex flex-col gap-1.5 text-left">
          <Label htmlFor="gate-password">Пароль</Label>
          <Input
            id="gate-password"
            type="password"
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Не меньше 6 символов"
            className="h-11"
            minLength={6}
            required
          />
        </div>
        <Button type="submit" className="h-12 text-base" disabled={busy || !navigator.onLine}>
          {busy ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : mode === 'signin' ? (
            <LogIn className="size-5" />
          ) : (
            <UserPlus className="size-5" />
          )}
          {mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
        </Button>
        <button
          type="button"
          className="text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  )
}
