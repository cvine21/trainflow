import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router'
import { AuthProvider } from '@/lib/auth'
import { normalizeLocalData } from '@/lib/migrations'
import { AppLayout } from '@/components/AppLayout'
import { Toaster } from '@/components/ui/sonner'
import { ClientsPage } from '@/pages/ClientsPage'
import { ClientFormPage } from '@/pages/ClientFormPage'
import { ClientPage } from '@/pages/ClientPage'
import { NewWorkoutPage, WorkoutEditRedirect, WorkoutPage } from '@/pages/WorkoutPage'
import { WorkoutsPage } from '@/pages/WorkoutsPage'
import { ExercisesPage } from '@/pages/ExercisesPage'
import { AccountPage } from '@/pages/AccountPage'
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
      { path: '/clients/:clientId/workouts/new', element: <NewWorkoutPage /> },
      { path: '/workouts', element: <WorkoutsPage /> },
      { path: '/workouts/:workoutId', element: <WorkoutPage /> },
      { path: '/workouts/:workoutId/edit', element: <WorkoutEditRedirect /> },
      { path: '/exercises', element: <ExercisesPage /> },
      { path: '/account', element: <AccountPage /> },
      { path: '/data', element: <Navigate to="/account" replace /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

navigator.storage?.persist?.().catch(() => {})
void normalizeLocalData()

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
