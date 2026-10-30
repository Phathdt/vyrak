import { Component } from 'react'

import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='flex min-h-screen items-center justify-center p-6'>
          <div className='max-w-md text-center'>
            <h1 className='mb-4 text-2xl font-bold text-destructive'>Something went wrong</h1>
            <p className='mb-4 text-muted-foreground'>{this.state.error?.message || 'An unexpected error occurred'}</p>
            <button
              onClick={() => window.location.reload()}
              className='rounded-md bg-primary px-4 py-2 text-primary-foreground hover:bg-primary/90'
            >
              Reload page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
