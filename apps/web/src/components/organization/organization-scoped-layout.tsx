import { useEffect } from 'react'
import { Navigate, Outlet, useParams } from 'react-router-dom'

import { PageLoading } from '@/components/page-loading'
import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'
import { routes } from '@/lib/routes'

export function OrganizationScopedLayout() {
  const { orgId } = useParams<{ orgId: string }>()
  const { organizations, isLoading } = useAuth()
  const { setActiveOrgId } = useOrganization()

  const hasAccess = orgId ? organizations.some((org) => org.id === orgId) : false

  useEffect(() => {
    if (orgId && hasAccess) {
      setActiveOrgId(orgId)
    }
  }, [orgId, hasAccess, setActiveOrgId])

  if (!orgId) {
    return <Navigate to={routes.organizations()} replace />
  }

  if (isLoading) {
    return <PageLoading />
  }

  if (!hasAccess) {
    return <Navigate to={routes.organizations()} replace />
  }

  return <Outlet />
}
