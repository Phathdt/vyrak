import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20',
        primary: 'bg-primary/10 text-primary border border-primary/20',
        success: 'bg-green-500/10 text-green-400 border border-green-500/20',
        warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
        error: 'bg-destructive/10 text-destructive border border-destructive/20',
        secondary: 'bg-secondary text-secondary-foreground border border-border',
        outline: 'bg-transparent text-foreground border border-border',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-pill',
        md: 'px-2.5 py-1 text-xs rounded-pill',
        lg: 'px-3 py-1.5 text-sm rounded-pill',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
