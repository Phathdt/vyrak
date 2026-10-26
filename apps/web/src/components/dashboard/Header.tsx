import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../contexts/auth-context'
import { OrganizationSelector } from '../organizations/organization-selector'

export function Header() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className='dashboard-header'>
      <div className='header-breadcrumbs'>{/* Breadcrumbs sẽ được thêm trong phase sau */}</div>

      <div className='header-actions'>
        <OrganizationSelector />
        <div className='user-menu'>
          <button className='user-info' onClick={() => setShowMenu(!showMenu)}>
            <div className='user-avatar'>{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
            <span className='user-email'>{user?.email || 'User'}</span>
            <svg
              width='16'
              height='16'
              viewBox='0 0 16 16'
              fill='none'
              stroke='currentColor'
              style={{ transform: showMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
            >
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6l4 4 4-4' />
            </svg>
          </button>

          {showMenu && (
            <>
              <div className='menu-backdrop' onClick={() => setShowMenu(false)} />
              <div className='user-dropdown'>
                <button className='dropdown-item logout-item' onClick={handleLogout}>
                  <svg width='16' height='16' viewBox='0 0 16 16' fill='none' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth='2'
                      d='M11 13l4-4m0 0l-4-4m4 4H5m0-6H3a2 2 0 00-2 2v8a2 2 0 002 2h2'
                    />
                  </svg>
                  Logout
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
