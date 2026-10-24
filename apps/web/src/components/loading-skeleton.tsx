import { type CSSProperties } from 'react'

interface Props {
  width?: string
  height?: string
  variant?: 'text' | 'rectangular' | 'circular'
}

export function LoadingSkeleton({ width = '100%', height = '20px', variant = 'rectangular' }: Props) {
  const baseStyle: CSSProperties = {
    width,
    height,
    backgroundColor: '#1E293B',
    animation: 'pulse 1.5s ease-in-out infinite',
  }

  const variantStyles: Record<string, CSSProperties> = {
    text: {
      borderRadius: '4px',
      height: '1em',
    },
    rectangular: {
      borderRadius: '8px',
    },
    circular: {
      borderRadius: '50%',
      width: height,
    },
  }

  return (
    <>
      <div style={{ ...baseStyle, ...variantStyles[variant] }} />
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </>
  )
}

export function TableLoadingSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <LoadingSkeleton key={colIndex} height='24px' />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardLoadingSkeleton() {
  return (
    <div
      style={{
        padding: '1.5rem',
        backgroundColor: '#1E2636',
        borderRadius: '8px',
        border: '1px solid #2D3748',
      }}
    >
      <LoadingSkeleton height='24px' width='60%' />
      <div style={{ marginTop: '1rem' }}>
        <LoadingSkeleton height='16px' width='100%' />
      </div>
      <div style={{ marginTop: '0.5rem' }}>
        <LoadingSkeleton height='16px' width='80%' />
      </div>
      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
        <LoadingSkeleton height='36px' width='100px' />
        <LoadingSkeleton height='36px' width='100px' />
      </div>
    </div>
  )
}
