import { initials } from '@/lib/format'
import clsx from 'clsx'
import styles from './ClientAvatar.module.css'

const PALETTE = [styles.red, styles.sky, styles.emerald, styles.violet, styles.rose, styles.amber, styles.teal]

function colorFor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function ClientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div className={clsx(styles.root, colorFor(name), className)} aria-hidden>
      {initials(name) || '?'}
    </div>
  )
}
