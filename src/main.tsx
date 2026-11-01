import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '@/lib/auth'
import { AppLayout } from '@/components/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { ClientsPage } from '@/pages/ClientsPage'
import { ClientFormPage } from '@/pages/ClientFormPage'
import { ClientPage } from '@/pages/ClientPage'
import { WorkoutPage } from '@/pages/WorkoutPage'
import { WorkoutEditorPage } from '@/pages/WorkoutEditorPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { ExercisesPage } from '@/pages/ExercisesPage'
import { DataPage } from '@/pages/DataPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import './index.css'

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <ClientsPage /> },
      { path: '/clients/new', element: <ClientFormPage /> },
      { path: '/clients/:clientId', element: <ClientPage /> },
      { path: '/clients/:clientId/edit', element: <ClientFormPage /> },
      { path: '/clients/:clientId/workouts/new', element: <WorkoutEditorPage /> },
      { path: '/workouts', element: <WorkoutsPage /> },
      { path: '/workouts/:workoutId', element: <WorkoutPage /> },
      { path: '/workouts/:workoutId/edit', element: <WorkoutEditorPage /> },
      { path: '/exercises', element: <ExercisesPage /> },
      { path: '/data', element: <DataPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

navigator.storage?.persist?.().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <Toaster
        position="top-center"
        richColors={false}
        offset={16}
        mobileOffset={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}
      />
    </AuthProvider>
  </StrictMode>,
)
