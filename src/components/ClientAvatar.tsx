import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

const PALETTE = [
  'bg-red-100 text-red-800',
  'bg-sky-100 text-sky-700',
  'bg-emerald-100 text-emerald-700',
  'bg-violet-100 text-violet-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-800',
  'bg-teal-100 text-teal-700',
]

function colorFor(name: string) {
  let hash = 0
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTE[hash % PALETTE.length]
}

export function ClientAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <div
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
        colorFor(name),
        className,
      )}
      aria-hidden
    >
      {initials(name) || '?'}
    </div>
  )
}
