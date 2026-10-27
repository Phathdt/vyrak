import { FolderKanban, LayoutDashboard, Settings, Workflow } from 'lucide-react'
import { NavLink } from 'react-router-dom'

import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  Sidebar as SidebarRoot,
} from '../ui/sidebar'

export function Sidebar() {
  return (
    <SidebarRoot className='w-64'>
      <SidebarHeader>
        <div className='flex items-center gap-2'>
          <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
            <Workflow className='h-5 w-5' />
          </div>
          <h1 className='text-xl font-bold'>Vyrak</h1>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavLink to='/dashboard'>
              {({ isActive }) => (
                <SidebarMenuButton className={isActive ? 'active' : ''}>
                  <LayoutDashboard className='h-5 w-5' />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <NavLink to='/workflows'>
              {({ isActive }) => (
                <SidebarMenuButton className={isActive ? 'active' : ''}>
                  <Workflow className='h-5 w-5' />
                  <span>Workflows</span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <NavLink to='/projects'>
              {({ isActive }) => (
                <SidebarMenuButton className={isActive ? 'active' : ''}>
                  <FolderKanban className='h-5 w-5' />
                  <span>Projects</span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <NavLink to='/organizations'>
              {({ isActive }) => (
                <SidebarMenuButton className={isActive ? 'active' : ''}>
                  <Settings className='h-5 w-5' />
                  <span>Organizations</span>
                </SidebarMenuButton>
              )}
            </NavLink>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </SidebarRoot>
  )
}
