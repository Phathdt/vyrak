import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from './ui/button'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
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
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                  />
                </svg>
              </div>
              <div className='flex-1'>
                <h1 className='text-xl font-semibold mb-2'>Something went wrong</h1>
                <p className='text-muted-foreground'>An unexpected error occurred. Please try refreshing the page.</p>
              </div>
            </div>

            {this.state.error && (
              <details className='mb-6 p-4 bg-surface-1 border border-border rounded-md'>
                <summary className='cursor-pointer text-sm font-medium mb-2 hover:text-accent-cyan transition-colors'>
                  Error details
                </summary>
                <pre className='mt-3 text-xs text-muted-foreground whitespace-pre-wrap break-words overflow-x-auto'>
                  {this.state.error.message}
                </pre>
              </details>
            )}

            <Button onClick={() => window.location.reload()} className='w-full sm:w-auto'>
              Reload page
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
