import { type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#05070C',
        color: '#F8FAFC',
        padding: '2rem',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          padding: '2rem',
          backgroundColor: '#1E2636',
          borderRadius: '8px',
          border: '1px solid #2D3748',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            marginBottom: '1rem',
            color: '#F8FAFC',
          }}
        >
          Page Error
        </h1>
        <p
          style={{
            color: '#94A3B8',
            marginBottom: '1.5rem',
          }}
        >
          This page encountered an error and cannot be displayed.
        </p>
        {error && (
          <details
            style={{
              marginBottom: '1.5rem',
              padding: '1rem',
              backgroundColor: '#0F172A',
              borderRadius: '4px',
              fontSize: '0.875rem',
              color: '#CBD5E1',
            }}
          >
            <summary style={{ cursor: 'pointer', marginBottom: '0.5rem' }}>Error details</summary>
            <pre
              style={{
                marginTop: '0.5rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {error.message}
            </pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleGoBack}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#1E293B',
              color: '#F8FAFC',
              border: '1px solid #2D3748',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Go back
          </button>
          <button
            onClick={handleGoHome}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#38BDF8',
              color: '#0F172A',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.875rem',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Go home
          </button>
        </div>
      </div>
    </div>
  )
}
