import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/auth-context'
import { OrganizationSelector } from '../organizations/organization-selector'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className='border-b border-border bg-background px-6 py-4'>
      <div className='flex items-center justify-between'>
        <div className='flex-1'>{/* Breadcrumbs sẽ được thêm trong phase sau */}</div>

        <div className='flex items-center gap-4'>
          <OrganizationSelector />

          <DropdownMenu>
            <DropdownMenuTrigger className='flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors outline-none'>
              <div className='flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-medium'>
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <span className='text-foreground'>{user?.email || 'User'}</span>
              <ChevronDown className='h-4 w-4 text-muted-foreground' />
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuLabel>
                <div className='flex flex-col gap-1'>
                  <span className='text-sm font-medium'>{user?.email || 'User'}</span>
                  <span className='text-xs text-muted-foreground'>Account Settings</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <User className='h-4 w-4' />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className='text-destructive focus:text-destructive'>
                <LogOut className='h-4 w-4' />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
