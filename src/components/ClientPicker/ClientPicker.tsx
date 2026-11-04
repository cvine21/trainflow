import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/Sheet'
import { db, type Client } from '@/lib/db'
import { normalizeName } from '@/lib/format'
import clsx from 'clsx'
import { useLiveQuery } from 'dexie-react-hooks'
import { Search, User } from 'lucide-react'
import { useMemo, useState } from 'react'
import styles from './ClientPicker.module.css'

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
      <SheetContent side="bottom" className={styles.sheet}>
        <SheetHeader className={styles.header}>
          <SheetTitle>{title}</SheetTitle>
          <div className={styles.searchWrap}>
            <Search className={styles.searchIcon} />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск"
              className={styles.searchInput}
              autoFocus
            />
          </div>
        </SheetHeader>

        <div className={styles.list}>
          {current && (
            <>
              <p className={styles.section}>Этот клиент</p>
              <ClientRow client={current} onPick={pick} current />
              {others.length > 0 && <p className={clsx(styles.section, styles.sectionSpaced)}>Другой клиент</p>}
            </>
          )}
          {others.map((c) => (
            <ClientRow key={c.id} client={c} onPick={pick} />
          ))}
          {clients && !current && others.length === 0 && <p className={styles.empty}>Клиенты не найдены</p>}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function ClientRow({ client, onPick, current }: { client: Client; onPick: (c: Client) => void; current?: boolean }) {
  return (
    <Button type="button" variant="ghost" className={styles.row} onClick={() => onPick(client)}>
      <span className={styles.avatar}>
        <User className={styles.avatarIcon} />
      </span>
      <span className={styles.name}>{client.name}</span>
      {current && <span className={styles.current}>текущий</span>}
    </Button>
  )
}
