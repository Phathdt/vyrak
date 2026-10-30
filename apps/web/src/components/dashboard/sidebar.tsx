import { Home, Building2, FolderKanban } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <aside className='w-64 border-r border-border bg-card'>
      <div className='flex h-full flex-col'>
        <div className='p-6'>
          <h1 className='text-2xl font-bold'>Vyrak</h1>
          <p className='text-sm text-muted-foreground'>Full-stack Boilerplate</p>
        </div>
        <nav className='flex-1 space-y-1 px-3'>
          {navigation.map((item) => {
            const isActive = location.pathname === item.href || location.pathname.startsWith(item.href + '/')
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
        </nav>
      </div>
    </aside>
  )
}
