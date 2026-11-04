import clsx from 'clsx'
import styles from './Skeleton.module.css'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={clsx(styles.skeleton, className)} {...props} />
}

export { Skeleton }
