import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth'
import { ErrorBoundary } from './components/error-boundary'
import { PageLoading } from './components/page-loading'
import { OrganizationProvider } from './contexts'
import { DashboardLayout } from './layouts/DashboardLayout'
import { LoginPage } from './pages/auth'
import { DashboardPage } from './pages/dashboard'
import { OrganizationSettingsPage, OrganizationsPage } from './pages/organizations'
import { WorkflowDetailPage, WorkflowsPage } from './pages/workflows'

function App() {
  return (
    <ErrorBoundary>
      <OrganizationProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path='/login' element={<LoginPage />} />

            {/* Dashboard routes với layout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path='/dashboard' element={<DashboardPage />} />
              <Route path='/workflows' element={<WorkflowsPage />} />
              <Route path='/workflows/:runId' element={<WorkflowDetailPage />} />
              <Route path='/organizations' element={<OrganizationsPage />} />
              <Route path='/organizations/:id/settings' element={<OrganizationSettingsPage />} />
            </Route>

            <Route path='/' element={<Navigate to='/workflows' replace />} />
            <Route path='*' element={<Navigate to='/workflows' replace />} />
          </Routes>
        </Suspense>
      </OrganizationProvider>
    </ErrorBoundary>
  )
}

export default App
