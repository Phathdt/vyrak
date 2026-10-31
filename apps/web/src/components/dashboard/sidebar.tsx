import { Home, Building2, FolderKanban, Settings } from 'lucide-react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { useOrganization } from '@/contexts/organization-context'
import { routes } from '@/lib/routes'
import { cn } from '@/lib/utils'

const globalNavigation = [
  { name: 'Dashboard', href: routes.dashboard(), icon: Home },
  { name: 'Organizations', href: routes.organizations(), icon: Building2 },
] as const

export function Sidebar() {
  const location = useLocation()
  const { orgId: orgIdFromUrl } = useParams<{ orgId?: string }>()
  const { activeOrgId } = useOrganization()
  const orgId = orgIdFromUrl ?? activeOrgId

  const orgNavigation = orgId
    ? [
        { name: 'Projects', href: routes.orgProjects(orgId), icon: FolderKanban },
        { name: 'Settings', href: routes.orgSettings(orgId), icon: Settings },
      ]
    : []

  return (
    <aside className='w-64 border-r border-border bg-card'>
      <div className='flex h-full flex-col'>
        <div className='p-6'>
          <h1 className='text-2xl font-bold'>Vyrak</h1>
          <p className='text-sm text-muted-foreground'>Full-stack Boilerplate</p>
        </div>
        <nav className='flex-1 space-y-1 px-3'>
          {globalNavigation.map((item) => {
            const isActive =
              item.name === 'Organizations'
                ? location.pathname === routes.organizations()
                : location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className='h-5 w-5' />
                {item.name}
              </Link>
            )
          })}

          {orgNavigation.length > 0 && (
            <>
              <div className='px-3 pt-4 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                Organization
              </div>
              {orgNavigation.map((item) => {
                const isActive = location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <item.icon className='h-5 w-5' />
                    {item.name}
                  </Link>
                )
              })}
            </>
          )}
        </nav>
      </div>
    </aside>
  )
}
