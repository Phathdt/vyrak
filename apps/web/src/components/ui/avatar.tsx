import * as React from 'react'

import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const sizeStyles = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg',
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function getColorFromName(name?: string): string {
  if (!name) return 'bg-muted'
  const colors = [
    'bg-gradient-to-br from-cyan-500 to-blue-500',
    'bg-gradient-to-br from-orange-500 to-pink-500',
    'bg-gradient-to-br from-green-500 to-teal-500',
    'bg-gradient-to-br from-purple-500 to-indigo-500',
    'bg-gradient-to-br from-yellow-500 to-orange-500',
    'bg-gradient-to-br from-red-500 to-rose-500',
  ]
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, fallback, size = 'md', className, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    const initials = fallback || getInitials(alt)
    const colorClass = getColorFromName(alt)

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex-shrink-0 rounded-full flex items-center justify-center overflow-hidden',
          sizeStyles[size],
          !src || imageError ? colorClass : 'bg-muted',
          className
        )}
        {...props}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className='w-full h-full object-cover'
            onError={() => setImageError(true)}
          />
        ) : (
          <span className='font-semibold text-white select-none'>{initials}</span>
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'
