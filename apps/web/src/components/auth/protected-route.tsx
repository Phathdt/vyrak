import { Navigate } from 'react-router-dom'

import { useAuth } from '@/contexts/auth-context'

import type { ReactNode } from 'react'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { accessToken, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className='flex min-h-screen items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading...</p>
        </div>
      </div>
    )
  }

  if (!accessToken) {
    return <Navigate to='/login' replace />
  }

  return <>{children}</>
}
