import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth'
import { ErrorBoundary } from './components/error-boundary'
import { PageLoading } from './components/page-loading'
import { OrganizationProvider } from './contexts'
import { LoginPage, SignupPage } from './pages/auth'
import { OrganizationSettingsPage, OrganizationsPage } from './pages/organizations'

function App() {
  return (
    <ErrorBoundary>
      <OrganizationProvider>
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
      </OrganizationProvider>
    </ErrorBoundary>
  )
}

export default App
