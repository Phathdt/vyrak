import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth'
import { ErrorBoundary } from './components/error-boundary'
import { PageLoading } from './components/page-loading'
import { OrganizationProvider } from './contexts'
import { DashboardLayout } from './layouts/dashboard-layout'
import { LoginPage } from './pages/auth'
import { DashboardPage } from './pages/dashboard'
import { OrganizationsPage, OrganizationSettingsPage } from './pages/organizations'
import { ProjectsPage } from './pages/projects'
import { WorkflowsPage } from './pages/workflows/workflows-page'

function App() {
  return (
    <ErrorBoundary>
      <OrganizationProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path='/login' element={<LoginPage />} />

            {/* Dashboard routes with layout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path='/dashboard' element={<DashboardPage />} />
              <Route path='/organizations' element={<OrganizationsPage />} />
              <Route path='/organizations/:id/settings' element={<OrganizationSettingsPage />} />
              <Route path='/projects' element={<ProjectsPage />} />
              <Route path='/projects/:projectId/workflows' element={<WorkflowsPage />} />
            </Route>

            <Route path='/' element={<Navigate to='/dashboard' replace />} />
            <Route path='*' element={<Navigate to='/dashboard' replace />} />
          </Routes>
        </Suspense>
      </OrganizationProvider>
    </ErrorBoundary>
  )
}

export default App
