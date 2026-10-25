import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from './ui/button'

interface Props {
  error: Error
  reset?: () => void
}

export function RouteErrorBoundary({ error, reset }: Props): ReactNode {
  const navigate = useNavigate()

  const handleGoBack = (): void => {
    if (reset) {
      reset()
    }
    navigate(-1)
  }

  const handleGoHome = (): void => {
    if (reset) {
      reset()
    }
    navigate('/')
  }

  return (
    <div className='min-h-screen flex items-center justify-center bg-background p-6'>
      <div className='max-w-2xl w-full bg-card border border-border rounded-lg p-6 md:p-8 shadow-lg'>
        <div className='flex items-start gap-4 mb-6'>
          <div className='flex-shrink-0 w-12 h-12 rounded-lg bg-destructive/10 flex items-center justify-center'>
            <svg
              className='w-6 h-6 text-destructive'
              fill='none'
              viewBox='0 0 24 24'
              stroke='currentColor'
              aria-hidden='true'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <div className='flex-1'>
            <h1 className='text-xl font-semibold mb-2'>Page Error</h1>
            <p className='text-muted-foreground'>This page encountered an error and cannot be displayed.</p>
          </div>
        </div>

        {error && (
          <details className='mb-6 p-4 bg-surface-1 border border-border rounded-md'>
            <summary className='cursor-pointer text-sm font-medium mb-2 hover:text-accent-cyan transition-colors'>
              Error details
            </summary>
            <pre className='mt-3 text-xs text-muted-foreground whitespace-pre-wrap break-words overflow-x-auto'>
              {error.message}
            </pre>
          </details>
        )}

        <div className='flex flex-col sm:flex-row gap-3'>
          <Button variant='outline' onClick={handleGoBack} className='flex-1 sm:flex-initial'>
            Go back
          </Button>
          <Button onClick={handleGoHome} className='flex-1 sm:flex-initial'>
            Go home
          </Button>
        </div>
      </div>
    </div>
  )
}
