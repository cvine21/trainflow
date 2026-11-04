import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Label } from '@/components/Label'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, LoaderCircle, LogIn, UserPlus } from 'lucide-react'
import { useState, type SubmitEvent } from 'react'
import { toast } from 'sonner'
import styles from './AuthGate.module.css'

/** When Supabase is configured, block the app until the user signs in. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { configured, loading, user, signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)

  // Local dev: skip the login wall (keeps IndexedDB + avoids auth friction).
  if (!configured || import.meta.env.DEV) return children
  if (loading) {
    return (
      <div className={styles.loading}>
        <LoaderCircle className={styles.loader} />
        <p className={styles.loadingText}>Загрузка аккаунта…</p>
      </div>
    )
  }
  if (user) return children

  async function onSubmit(e: SubmitEvent) {
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
    <div className={styles.gate}>
      <div className={styles.intro}>
        <h1 className={styles.title}>Журнал тренера</h1>
        <p className={styles.lead}>Войдите, чтобы открыть клиентов и тренировки на этом устройстве.</p>
      </div>
      <form onSubmit={onSubmit} className={styles.form}>
        <div className={styles.field}>
          <Label htmlFor="gate-email">Email</Label>
          <Input
            id="gate-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={styles.input}
            required
            autoFocus
          />
        </div>
        <div className={styles.field}>
          <Label htmlFor="gate-password">Пароль</Label>
          <div className={styles.passwordWrap}>
            <Input
              id="gate-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Не меньше 6 символов"
              className={styles.password}
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={styles.reveal}
              aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
            >
              {showPassword ? <EyeOff className={styles.icon} /> : <Eye className={styles.icon} />}
            </button>
          </div>
        </div>
        <Button type="submit" className={styles.submit} disabled={busy || !navigator.onLine}>
          {busy ? (
            <LoaderCircle className={styles.submitSpin} />
          ) : mode === 'signin' ? (
            <LogIn className={styles.submitIcon} />
          ) : (
            <UserPlus className={styles.submitIcon} />
          )}
          {mode === 'signin' ? 'Войти' : 'Создать аккаунт'}
        </Button>
        <button
          type="button"
          className={styles.switchMode}
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Нет аккаунта? Создать' : 'Уже есть аккаунт? Войти'}
        </button>
      </form>
    </div>
  )
}
