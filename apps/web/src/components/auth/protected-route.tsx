import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/auth-context'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#05070C',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            border: '4px solid #1E2636',
            borderTopColor: '#38BDF8',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
      </div>
    )
  }

  if (!user) {
    return <Navigate to='/login' state={{ from: location }} replace />
  }

  return <>{children}</>
}
