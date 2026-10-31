export const routes = {
  dashboard: () => '/dashboard',
  login: () => '/login',
  organizations: () => '/organizations',
  orgSettings: (orgId: string) => `/organizations/${orgId}/settings`,
  orgProjects: (orgId: string) => `/organizations/${orgId}/projects`,
  projectWorkflows: (orgId: string, projectId: string) => `/organizations/${orgId}/projects/${projectId}/workflows`,
  workflowDetail: (orgId: string, projectId: string, workflowId: string) =>
    `/organizations/${orgId}/projects/${projectId}/workflows/${workflowId}`,
} as const

/** Replace org id segment when switching organization on an org-scoped path. */
export function replaceOrgInPath(pathname: string, newOrgId: string): string | null {
  const match = pathname.match(/^\/organizations\/[^/]+(\/.*)?$/)
  if (!match) {
    return null
  }
  const suffix = match[1] ?? '/projects'
  return `/organizations/${newOrgId}${suffix}`
}
