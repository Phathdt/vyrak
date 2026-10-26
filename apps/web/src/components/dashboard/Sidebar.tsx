import { NavLink } from 'react-router-dom'

export function Sidebar() {
  return (
    <aside className='sidebar'>
      <div className='sidebar-header'>
        <h1 className='sidebar-title'>Vyrak</h1>
      </div>

      <nav className='sidebar-nav'>
        <NavLink to='/workflows' className='nav-item'>
          <WorkflowIcon />
          <span>Workflows</span>
        </NavLink>

        <NavLink to='/approvals' className='nav-item'>
          <ApprovalIcon />
          <span>Approvals</span>
        </NavLink>

        <NavLink to='/metrics' className='nav-item'>
          <MetricsIcon />
          <span>Metrics</span>
        </NavLink>

        <NavLink to='/alerts' className='nav-item'>
          <AlertIcon />
          <span>Alerts</span>
        </NavLink>
      </nav>
    </aside>
  )
}

// Icon components (simple SVG icons)
function WorkflowIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2'
        d='M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
      />
    </svg>
  )
}

function ApprovalIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2'
        d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
      />
    </svg>
  )
}

function MetricsIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2'
        d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
      />
    </svg>
  )
}

function AlertIcon() {
  return (
    <svg width='20' height='20' viewBox='0 0 20 20' fill='none' stroke='currentColor'>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        strokeWidth='2'
        d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
      />
    </svg>
  )
}
