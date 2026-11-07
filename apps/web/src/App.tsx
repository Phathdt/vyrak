import { Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth'
import { ErrorBoundary } from './components/error-boundary'
import { OrganizationScopedLayout } from './components/organization/organization-scoped-layout'
import { PageLoading } from './components/page-loading'
import { OrganizationProvider } from './contexts'
import { DashboardLayout } from './layouts/dashboard-layout'
import { routes } from './lib/routes'
import { LoginPage } from './pages/auth'
import { DashboardPage } from './pages/dashboard'
import { OrganizationsPage, OrganizationSettingsPage } from './pages/organizations'
import { ProjectDetailPage, ProjectsPage } from './pages/projects'
import { ImplementationWorkspacePage } from './pages/workflows/implementation-workspace'
import { WorkflowDetailPage } from './pages/workflows/workflow-detail-page'
import { WorkflowsPage } from './pages/workflows/workflows-page'

function App() {
  return (
    <ErrorBoundary>
      <OrganizationProvider>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path='/login' element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path='/dashboard' element={<DashboardPage />} />
              <Route path='/organizations' element={<OrganizationsPage />} />

              <Route path='/organizations/:orgId' element={<OrganizationScopedLayout />}>
                <Route path='settings' element={<OrganizationSettingsPage />} />
                <Route path='projects' element={<ProjectsPage />} />
                <Route path='projects/:projectId' element={<ProjectDetailPage />} />
                <Route path='projects/:projectId/workflows' element={<WorkflowsPage />} />
                <Route path='projects/:projectId/workflows/:workflowId' element={<WorkflowDetailPage />} />
                <Route
                  path='projects/:projectId/workflows/:workflowId/implementation'
                  element={<ImplementationWorkspacePage />}
                />
              </Route>
            </Route>

            <Route path='/' element={<Navigate to={routes.dashboard()} replace />} />
            <Route path='*' element={<Navigate to={routes.dashboard()} replace />} />
          </Routes>
        </Suspense>
      </OrganizationProvider>
    </ErrorBoundary>
  )
}

export default App
