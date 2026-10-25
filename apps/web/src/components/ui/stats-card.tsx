import { cn } from '@/lib/utils'
import { type ReactNode } from 'react'

import { Card, CardContent } from './card'

interface StatsCardProps {
  title: string
  value: string | number
  icon?: ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
  variant?: 'default' | 'accent' | 'success' | 'warning'
  className?: string
}

const variantStyles = {
  default: {
    iconBg: 'bg-accent-cyan/10',
    iconColor: 'text-accent-cyan',
  },
  accent: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
  },
  success: {
    iconBg: 'bg-green-500/10',
    iconColor: 'text-green-400',
  },
  warning: {
    iconBg: 'bg-yellow-500/10',
    iconColor: 'text-yellow-400',
  },
}

export function StatsCard({ title, value, icon, trend, description, variant = 'default', className }: StatsCardProps) {
  const styles = variantStyles[variant]

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className='p-6'>
        <div className='flex items-start justify-between'>
          <div className='flex-1'>
            <p className='text-sm font-medium text-muted-foreground mb-1'>{title}</p>
            <div className='flex items-baseline gap-2'>
              <h3 className='text-2xl font-bold tracking-tight'>{value}</h3>
              {trend && (
                <span
                  className={cn(
                    'text-xs font-medium flex items-center gap-0.5',
                    trend.isPositive ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {trend.isPositive ? (
                    <svg className='w-3 h-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M5 10l7-7m0 0l7 7m-7-7v18'
                      />
                    </svg>
                  ) : (
                    <svg className='w-3 h-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M19 14l-7 7m0 0l-7-7m7 7V3'
                      />
                    </svg>
                  )}
                  {Math.abs(trend.value)}%
                </span>
              )}
            </div>
            {description && <p className='text-xs text-muted-foreground mt-1'>{description}</p>}
          </div>
          {icon && (
            <div className={cn('flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center', styles.iconBg)}>
              <div className={cn('w-6 h-6', styles.iconColor)}>{icon}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
