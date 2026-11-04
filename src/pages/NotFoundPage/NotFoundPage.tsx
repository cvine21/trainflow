import { buttonVariants } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import clsx from 'clsx'
import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Страница не найдена" backTo="/" />
      <EmptyState
        icon={Compass}
        title="Такой страницы нет"
        description="Ссылка устарела или была набрана с ошибкой."
        action={
          <Link to="/" className={clsx(buttonVariants({ size: 'lg' }), styles.home)}>
            К списку клиентов
          </Link>
        }
      />
    </>
  )
}
