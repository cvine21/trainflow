import { Link } from 'react-router'
import { Compass } from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { buttonVariants } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <>
      <PageHeader title="Страница не найдена" backTo="/" />
      <EmptyState
        icon={Compass}
        title="Такой страницы нет"
        description="Ссылка устарела или была набрана с ошибкой."
        action={
          <Link to="/" className={buttonVariants({ size: 'lg' })}>
            К списку клиентов
          </Link>
        }
      />
    </>
  )
}
