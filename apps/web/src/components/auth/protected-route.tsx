import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/auth-context'
import { LoadingSpinner } from '../loading-spinner'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, accessToken } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className='min-h-screen grid place-items-center bg-background'>
        <LoadingSpinner size='lg' />
      </div>
    )
  }

  // If no token at all, definitely not authenticated
  if (!accessToken) {
    return <Navigate to='/login' state={{ from: location }} replace />
  }

  // If we have token but no user, and not loading, something went wrong
  if (!user && !isLoading) {
    return <Navigate to='/login' state={{ from: location }} replace />
  }

  return <>{children}</>
}
