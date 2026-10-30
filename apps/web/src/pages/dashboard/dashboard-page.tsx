import { useEffect } from 'react'

import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'

export function DashboardPage() {
  const { user, organizations } = useAuth()
  const { activeOrgId, setActiveOrgId } = useOrganization()

  // Auto-select first organization if none is selected
  useEffect(() => {
    if (!activeOrgId && organizations.length > 0) {
      const firstOrg = organizations[0]
      if (firstOrg?.id) {
        setActiveOrgId(firstOrg.id)
      }
    }
  }, [activeOrgId, organizations, setActiveOrgId])

  const activeOrg = organizations.find((org) => org.id === activeOrgId)

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
        <p className='text-muted-foreground'>Welcome back, {user?.name || user?.email}</p>
      </div>

      {/* Stats Grid */}
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Total Organizations</p>
              <p className='text-2xl font-bold'>{organizations.length}</p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10'>
              <svg className='h-6 w-6 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                />
              </svg>
            </div>
          </div>
        </Card>

        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Active Organization</p>
              <p className='text-2xl font-bold'>{activeOrg?.name || 'None'}</p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10'>
              <svg className='h-6 w-6 text-green-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                />
              </svg>
            </div>
          </div>
          {activeOrg?.role && <p className='mt-2 text-sm text-muted-foreground'>Your role: {activeOrg.role}</p>}
        </Card>

        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Account Status</p>
              <p className='text-2xl font-bold'>Active</p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10'>
              <svg className='h-6 w-6 text-blue-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            </div>
          </div>
        </Card>

        <Card className='p-6'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-sm font-medium text-muted-foreground'>Your Role</p>
              <p className='text-2xl font-bold'>{activeOrg?.role || 'N/A'}</p>
            </div>
            <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/10'>
              <svg className='h-6 w-6 text-purple-500' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                />
              </svg>
            </div>
          </div>
          {activeOrg && <p className='mt-2 text-sm text-muted-foreground'>in {activeOrg.name}</p>}
        </Card>
      </div>

      {/* Organization Selector */}
      {organizations.length > 0 && (
        <Card className='p-6'>
          <h2 className='mb-2 text-lg font-semibold'>Active Organization</h2>
          <p className='mb-4 text-sm text-muted-foreground'>Select the organization you want to work with</p>
          <div className='space-y-2'>
            <Label htmlFor='org-select'>Organization</Label>
            <Select value={activeOrgId || undefined} onValueChange={(value) => value && setActiveOrgId(value)}>
              <SelectTrigger>
                <SelectValue placeholder='Select an organization' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name} ({org.role})
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            {activeOrg && (
              <p className='text-sm text-muted-foreground'>
                Slug: <span className='font-mono'>{activeOrg.slug}</span>
              </p>
            )}
          </div>
        </Card>
      )}

      {/* User Info */}
      <Card className='p-6'>
        <h2 className='mb-4 text-lg font-semibold'>User Information</h2>
        <dl className='grid grid-cols-1 gap-4 text-sm sm:grid-cols-2'>
          <div>
            <dt className='mb-1 font-medium text-muted-foreground'>User ID</dt>
            <dd className='font-mono text-xs break-all'>{user?.id}</dd>
          </div>
          <div>
            <dt className='mb-1 font-medium text-muted-foreground'>Email</dt>
            <dd className='break-all'>{user?.email}</dd>
          </div>
          <div>
            <dt className='mb-1 font-medium text-muted-foreground'>Name</dt>
            <dd>{user?.name || <span className='text-muted-foreground'>Not set</span>}</dd>
          </div>
          <div>
            <dt className='mb-1 font-medium text-muted-foreground'>Organizations</dt>
            <dd>
              {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'}
            </dd>
          </div>
        </dl>
      </Card>
    </div>
  )
}
