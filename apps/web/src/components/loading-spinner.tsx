import { type CSSProperties } from 'react'

interface Props {
  size?: 'small' | 'medium' | 'large'
  message?: string
}

export function LoadingSpinner({ size = 'medium', message }: Props) {
  const sizes = {
    small: '16px',
    medium: '32px',
    large: '48px',
  }

  const spinnerStyle: CSSProperties = {
    width: sizes[size],
    height: sizes[size],
    border: '3px solid #1E293B',
    borderTop: '3px solid #38BDF8',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  }

  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
  }

  return (
    <div style={containerStyle}>
      <div style={spinnerStyle} />
      {message && (
        <p
          style={{
            color: '#94A3B8',
            fontSize: '0.875rem',
          }}
        >
          {message}
        </p>
      )}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}
