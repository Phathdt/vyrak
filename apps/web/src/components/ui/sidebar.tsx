import { cn } from '@/lib/utils'
import * as React from 'react'

const SidebarContext = React.createContext<{
  expanded: boolean
  setExpanded: (expanded: boolean) => void
}>({
  expanded: true,
  setExpanded: () => {},
})

export function useSidebar() {
  return React.useContext(SidebarContext)
}

export function Sidebar({ className, children }: { className?: string; children: React.ReactNode }) {
  const [expanded, setExpanded] = React.useState(true)

  return (
    <SidebarContext.Provider value={{ expanded, setExpanded }}>
      <aside className={cn('flex flex-col border-r bg-background', className)}>{children}</aside>
    </SidebarContext.Provider>
  )
}

export function SidebarHeader({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex items-center gap-2 px-4 py-4', className)}>{children}</div>
}

export function SidebarContent({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex-1 overflow-auto px-2 py-2', className)}>{children}</div>
}

export function SidebarFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('mt-auto border-t px-4 py-4', className)}>{children}</div>
}

export function SidebarMenu({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('space-y-1', className)}>{children}</div>
}

export function SidebarMenuItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('', className)}>{children}</div>
}

export function SidebarMenuButton({
  className,
  children,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean
}) {
  const Comp = asChild ? React.Fragment : 'button'

  return (
    <Comp
      className={cn(
        'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        '[&.active]:bg-accent [&.active]:text-accent-foreground',
        className
      )}
      {...(asChild ? {} : props)}
    >
      {children}
    </Comp>
  )
}
