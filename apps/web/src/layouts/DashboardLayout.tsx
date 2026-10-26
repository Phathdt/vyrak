import { Outlet } from 'react-router-dom'

import { Header } from '../components/dashboard/Header'
import { Sidebar } from '../components/dashboard/Sidebar'

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
