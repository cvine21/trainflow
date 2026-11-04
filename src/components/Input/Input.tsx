import { Input as InputPrimitive } from '@base-ui/react/input'
import clsx from 'clsx'
import styles from './Input.module.css'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={clsx(styles.input, className)}
      {...props}
    />
  )
}

export { Input }
