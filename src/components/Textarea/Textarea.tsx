import clsx from 'clsx'
import styles from './Textarea.module.css'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return <textarea data-slot="textarea" className={clsx(styles.textarea, className)} {...props} />
}

export { Textarea }
