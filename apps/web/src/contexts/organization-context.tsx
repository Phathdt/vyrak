import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface OrganizationContextValue {
  activeOrgId: string | null
  setActiveOrgId: (id: string | null) => void
}

const OrganizationContext = createContext<OrganizationContextValue | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [activeOrgId, setActiveOrgId] = useState<string | null>(() => {
    return localStorage.getItem('activeOrgId')
  })

  useEffect(() => {
    if (activeOrgId) {
      localStorage.setItem('activeOrgId', activeOrgId)
    } else {
      localStorage.removeItem('activeOrgId')
    }
  }, [activeOrgId])

  return <OrganizationContext.Provider value={{ activeOrgId, setActiveOrgId }}>{children}</OrganizationContext.Provider>
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (!context) {
    throw new Error('useOrganization must be used within OrganizationProvider')
  }
  return context
}
