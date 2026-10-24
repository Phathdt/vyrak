import { Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { LoginPage, SignupPage } from './pages/auth'
import { OrganizationsPage, OrganizationSettingsPage } from './pages/organizations'
import { ProtectedRoute } from './components/auth'
import { OrganizationProvider } from './contexts'
import { ErrorBoundary } from './components/error-boundary'
import { PageLoading } from './components/page-loading'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <OrganizationProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoading />}>
              <Routes>
                <Route path='/login' element={<LoginPage />} />
                <Route path='/signup' element={<SignupPage />} />
                <Route
                  path='/'
                  element={
                    <ProtectedRoute>
                      <OrganizationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/organizations'
                  element={
                    <ProtectedRoute>
                      <OrganizationsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path='/organizations/:id/settings'
                  element={
                    <ProtectedRoute>
                      <OrganizationSettingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path='*' element={<Navigate to='/' replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </OrganizationProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
