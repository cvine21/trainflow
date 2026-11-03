import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, User } from 'lucide-react'
import { db, type Client } from '@/lib/db'
import { normalizeName } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'

interface ClientPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (client: Client) => void
  title?: string
  /** Highlight / pin this client at the top. */
  currentClientId?: string
}

export function ClientPicker({
  open,
  onOpenChange,
  onPick,
  title = 'Выберите клиента',
  currentClientId,
}: ClientPickerProps) {
  const [query, setQuery] = useState('')
  const clients = useLiveQuery(() => db.clients.orderBy('name').toArray(), [])

  const q = normalizeName(query)
  const { current, others } = useMemo(() => {
    const list = (clients ?? []).filter((c) => !q || normalizeName(c.name).includes(q))
    const cur = currentClientId ? list.find((c) => c.id === currentClientId) : undefined
    return {
      current: cur,
      others: list.filter((c) => c.id !== currentClientId),
    }
  }, [clients, q, currentClientId])

  function reset() {
    setQuery('')
  }

  function pick(c: Client) {
    onPick(c)
    onOpenChange(false)
    reset()
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
    >
      <SheetContent side="bottom" className="mx-auto max-w-lg gap-0 rounded-t-3xl p-0 data-[side=bottom]:h-[70dvh]">
        <SheetHeader className="border-b border-border/60 px-4 pt-4 pb-3">
          <SheetTitle>{title}</SheetTitle>
          <div className="relative pt-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className="h-11 pl-9"
              autoFocus
            />
          </div>
        </SheetHeader>

        <div className="flex flex-col gap-1 overflow-y-auto p-2">
          {current && (
            <>
              <p className="px-3 pt-2 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Этот клиент
              </p>
              <ClientRow client={current} onPick={pick} current />
              {others.length > 0 && (
                <p className="px-3 pt-3 pb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Другой клиент
                </p>
              )}
            </>
          )}
          {others.map((c) => (
            <ClientRow key={c.id} client={c} onPick={pick} />
          ))}
          {clients && !current && others.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Клиенты не найдены</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ClientRow({
  client,
  onPick,
  current,
}: {
  client: Client
  onPick: (c: Client) => void
  current?: boolean
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="h-12 justify-start gap-3 px-3 text-base font-normal"
      onClick={() => onPick(client)}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <User className="size-4 text-muted-foreground" />
      </span>
      <span className="truncate">{client.name}</span>
      {current && <span className="ml-auto text-xs text-muted-foreground">текущий</span>}
    </Button>
  )
}
