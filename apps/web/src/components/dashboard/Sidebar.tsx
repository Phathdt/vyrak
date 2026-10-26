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
