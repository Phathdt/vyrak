import { Outlet } from 'react-router-dom'

import { Header } from '@/components/dashboard/header'
import { Sidebar } from '@/components/dashboard/sidebar'

export function DashboardLayout() {
  return (
    <div className='flex h-screen overflow-hidden'>
      <Sidebar />
      <div className='flex flex-1 flex-col overflow-hidden'>
        <Header />
        <main className='flex-1 overflow-auto p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
