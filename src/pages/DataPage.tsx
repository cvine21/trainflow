import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  CheckCircle2,
  Cloud,
  CloudOff,
  Download,
  HardDrive,
  LoaderCircle,
  LogOut,
  Mail,
  RefreshCw,
  Share,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  Upload,
  WifiOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { countLabel } from '@/lib/format'
import { exportBackup, importBackup, wipeAllData } from '@/lib/backup'
import { loadDemoData } from '@/lib/demo'
import { isIosDevice, isOnline, isStandaloneApp } from '@/lib/pwa'
import {
  countRemoteRows,
  getLastSyncedAt,
  pushAllLocal,
  runSync,
  subscribeSyncStatus,
  type SyncStatus,
} from '@/lib/sync'
import { PageHeader } from '@/components/PageHeader'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DataPage() {
  const { configured, loading: authLoading, user, session, signInWithEmail, signOut } = useAuth()
  const counts = useLiveQuery(async () => ({
    clients: await db.clients.count(),
    workouts: await db.workouts.count(),
    exercises: await db.exercises.count(),
  }))
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [standalone, setStandalone] = useState(() => isStandaloneApp())
  const [online, setOnline] = useState(() => isOnline())
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [email, setEmail] = useState('')
  const [authBusy, setAuthBusy] = useState(false)
  const [linkSent, setLinkSent] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(configured ? 'idle' : 'unconfigured')
  const [syncError, setSyncError] = useState<string | undefined>()
  const [lastSynced, setLastSynced] = useState(() => getLastSyncedAt())
  const [syncBusy, setSyncBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const firstUploadDone = useRef(false)
  const ios = isIosDevice()

  useEffect(() => {
    navigator.storage
      ?.persisted?.()
      .then(setPersisted)
      .catch(() => setPersisted(null))
  }, [])

  useEffect(() => {
    const onOnline = () => setOnline(true)
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    const onInstalled = () => {
      setStandalone(true)
      setInstallPrompt(null)
    }
    window.addEventListener('appinstalled', onInstalled)

    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    }
  }, [])

  useEffect(
    () =>
      subscribeSyncStatus((status, error) => {
        setSyncStatus(status)
        setSyncError(error)
        if (status === 'ok') setLastSynced(getLastSyncedAt())
      }),
    [],
  )

  // First login: if cloud is empty and local DB has data, upload everything once.
  useEffect(() => {
    if (!session || !online || firstUploadDone.current || authLoading) return
    firstUploadDone.current = true
    void (async () => {
      try {
        const remote = await countRemoteRows(session)
        const local = (await db.clients.count()) + (await db.workouts.count()) + (await db.exercises.count())
        if (remote === 0 && local > 0) {
          setSyncBusy(true)
          const n = await pushAllLocal(session)
          toast.success(`В облако загружено записей: ${n}`)
          setLastSynced(getLastSyncedAt())
          setSyncStatus('ok')
        }
      } catch (err) {
        console.error(err)
      } finally {
        setSyncBusy(false)
      }
    })()
  }, [session, online, authLoading])

  async function installApp() {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') {
      toast.success('Приложение установлено на устройство')
      setStandalone(true)
    }
    setInstallPrompt(null)
  }

  async function handleSignIn(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAuthBusy(true)
    try {
      await signInWithEmail(email)
      setLinkSent(true)
      toast.success('Ссылка для входа отправлена на почту')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось отправить ссылку')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleSync() {
    if (!session) return
    setSyncBusy(true)
    try {
      const res = await runSync(session)
      setLastSynced(getLastSyncedAt())
      toast.success(`Синхронизировано: ↑${res.pushed} ↓${res.pulled}${res.deleted ? ` · удалено ${res.deleted}` : ''}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ошибка синхронизации')
    } finally {
      setSyncBusy(false)
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      firstUploadDone.current = false
      toast.success('Вы вышли из аккаунта')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Не удалось выйти')
    }
  }

  const syncLabel = !configured
    ? 'Добавьте ключи Supabase в .env'
    : !online
      ? 'Офлайн — синк при появлении сети'
      : syncStatus === 'syncing' || syncBusy
        ? 'Синхронизация…'
        : syncStatus === 'error'
          ? syncError || 'Ошибка синхронизации'
          : user
            ? lastSynced
              ? `Обновлено ${new Date(lastSynced).toLocaleString('ru-RU')}`
              : 'Ещё не синхронизировали'
            : 'Войдите, чтобы синхронизировать устройства'

  return (
    <>
      <PageHeader large title="Данные" subtitle="Хранение и резервные копии" />
      <div className="flex flex-col gap-4 px-4 py-4">
        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              {configured && user ? <Cloud className="size-5" /> : <CloudOff className="size-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Облачный аккаунт</h2>
              <p className="text-sm text-muted-foreground">{syncLabel}</p>
            </div>
          </div>

          {!configured && (
            <p className="mt-3 text-sm text-muted-foreground">
              Скопируйте <code className="text-foreground">.env.example</code> в{' '}
              <code className="text-foreground">.env</code>, вставьте URL и anon key из Supabase, выполните SQL из{' '}
              <code className="text-foreground">supabase/migrations</code> и перезапустите приложение.
            </p>
          )}

          {configured && authLoading && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> Проверяем сессию…
            </p>
          )}

          {configured && !authLoading && !user && (
            <form onSubmit={handleSignIn} className="mt-4 flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sync-email">Email</Label>
                <Input
                  id="sync-email"
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
                />
              </div>
              <Button type="submit" className="h-12 text-base" disabled={authBusy || !online}>
                {authBusy ? <LoaderCircle className="size-5 animate-spin" /> : <Mail className="size-5" />}
                {linkSent ? 'Отправить ещё раз' : 'Войти по ссылке'}
              </Button>
              {linkSent && (
                <p className="text-xs text-muted-foreground">
                  Откройте письмо на этом же телефоне/компьютере и перейдите по ссылке — вернётесь сюда уже в аккаунте.
                </p>
              )}
            </form>
          )}

          {configured && user && (
            <div className="mt-4 flex flex-col gap-2">
              <p className="truncate text-sm">
                <span className="text-muted-foreground">Вы вошли как </span>
                <span className="font-medium">{user.email}</span>
              </p>
              <Button
                variant="outline"
                className="h-12 justify-start gap-3 rounded-xl bg-background px-4 text-base"
                onClick={handleSync}
                disabled={!online || syncBusy || syncStatus === 'syncing'}
              >
                {syncBusy || syncStatus === 'syncing' ? (
                  <LoaderCircle className="size-5 animate-spin text-primary" />
                ) : (
                  <RefreshCw className="size-5 text-primary" />
                )}
                Синхронизировать сейчас
              </Button>
              <Button
                variant="ghost"
                className="h-11 justify-start gap-3 text-muted-foreground"
                onClick={handleSignOut}
              >
                <LogOut className="size-5" /> Выйти
              </Button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <HardDrive className="size-5" />
            </div>
            <div>
              <h2 className="font-semibold">База на этом устройстве</h2>
              <p className="text-sm text-muted-foreground">
                {online ? 'Работает без интернета' : 'Сейчас офлайн — всё доступно'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Count value={counts?.clients} label="клиентов" />
            <Count value={counts?.workouts} label="тренировок" />
            <Count value={counts?.exercises} label="упражнений" />
          </div>
          {!online && (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <WifiOff className="size-4 shrink-0" /> Нет сети: клиенты и тренировки открываются из памяти телефона.
            </p>
          )}
          {persisted !== null && (
            <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className={persisted ? 'size-4 shrink-0 text-emerald-600' : 'size-4 shrink-0'} />
              {persisted
                ? 'Браузер не удалит данные при нехватке места.'
                : 'Браузер может очистить данные при нехватке памяти. Делайте резервные копии или установите приложение на главный экран.'}
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-border/70 bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Smartphone className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold">Приложение на телефон</h2>
              <p className="text-sm text-muted-foreground">
                {standalone ? 'Установлено — работает как обычное приложение' : 'Иконка на экране «Домой», без Safari'}
              </p>
            </div>
          </div>

          {standalone ? (
            <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              Открыто с домашнего экрана. Интерфейс и данные доступны без интернета после первой загрузки.
            </p>
          ) : (
            <div className="mt-3 flex flex-col gap-3">
              {installPrompt && (
                <Button className="h-12 w-full text-base" onClick={installApp}>
                  <Download className="size-5" /> Установить приложение
                </Button>
              )}
              {ios ? (
                <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                  <li>
                    Нажмите{' '}
                    <span className="inline-flex items-center gap-1 font-medium text-foreground">
                      <Share className="size-3.5" /> Поделиться
                    </span>{' '}
                    внизу Safari
                  </li>
                  <li>
                    Выберите <span className="font-medium text-foreground">«На экран „Домой“»</span>
                  </li>
                  <li>
                    Откройте иконку <span className="font-medium text-foreground">«Тренер»</span> — дальше можно без
                    интернета
                  </li>
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">
                  В меню браузера выберите «Установить приложение» или «Добавить на главный экран». Один раз откройте
                  онлайн, чтобы скачать интерфейс — потом журнал работает офлайн.
                </p>
              )}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Резервная копия</h2>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 rounded-xl bg-card px-4 text-base"
            onClick={async () => {
              await exportBackup()
              toast.success('Файл резервной копии сохранён')
            }}
          >
            <Download className="size-5 text-primary" /> Скачать копию (.json)
          </Button>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 rounded-xl bg-card px-4 text-base"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-5 text-primary" /> Восстановить из файла
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              try {
                const res = await importBackup(file)
                toast.success(
                  `Загружено: ${countLabel(res.clients, ['клиент', 'клиента', 'клиентов'])}, ${countLabel(res.workouts, ['тренировка', 'тренировки', 'тренировок'])}`,
                )
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Не удалось прочитать файл')
              }
            }}
          />
          <p className="px-1 text-xs text-muted-foreground">
            Копия переносит всех клиентов, тренировки и базу упражнений на другое устройство. При восстановлении
            существующие записи обновятся, новые — добавятся.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">Прочее</h2>
          <Button
            variant="outline"
            className="h-12 justify-start gap-3 rounded-xl bg-card px-4 text-base"
            onClick={async () => {
              await loadDemoData()
              toast.success('Добавлены демо-клиенты с тренировками')
            }}
          >
            <Sparkles className="size-5 text-primary" /> Добавить демо-данные
          </Button>
          <Button
            variant="destructive"
            className="h-12 justify-start gap-3 rounded-xl px-4 text-base"
            onClick={() => setConfirmWipe(true)}
            disabled={!counts?.clients && !counts?.workouts}
          >
            <Trash2 className="size-5" /> Удалить всех клиентов и тренировки
          </Button>
        </section>
      </div>

      <ConfirmDialog
        open={confirmWipe}
        onOpenChange={setConfirmWipe}
        title="Удалить все данные?"
        description="Будут удалены все клиенты и их тренировки. База упражнений сохранится. Рекомендуем сначала скачать резервную копию."
        confirmLabel="Удалить всё"
        onConfirm={async () => {
          await wipeAllData()
          toast.success('Данные удалены')
        }}
      />
    </>
  )
}

function Count({ value, label }: { value: number | undefined; label: string }) {
  return (
    <div className="rounded-xl bg-muted/60 py-2">
      <div className="text-lg leading-6 font-semibold tabular-nums">{value ?? '…'}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  )
}
