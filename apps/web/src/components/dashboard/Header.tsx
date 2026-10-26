import { useAuth } from '../../contexts/auth-context'

export function Header() {
  const { user } = useAuth()

  return (
    <header className='dashboard-header'>
      <div className='header-breadcrumbs'>{/* Breadcrumbs sẽ được thêm trong phase sau */}</div>

      <div className='header-actions'>
        <div className='user-info'>
          <div className='user-avatar'>{user?.email?.charAt(0).toUpperCase() || 'U'}</div>
          <span className='user-email'>{user?.email || 'User'}</span>
        </div>
      </div>
    </header>
  )
}
