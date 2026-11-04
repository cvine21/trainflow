import clsx from 'clsx'
import styles from './Label.module.css'

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="label" className={clsx(styles.label, className)} {...props} />
}

export { Label }
