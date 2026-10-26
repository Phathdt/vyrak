import { Outlet } from 'react-router-dom'

import { Header } from '../components/dashboard/Header'
import { Sidebar } from '../components/dashboard/Sidebar'

export function DashboardLayout() {
  return (
    <div className='dashboard-layout'>
      <Sidebar />
      <div className='dashboard-content'>
        <Header />
        <main className='dashboard-main'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
