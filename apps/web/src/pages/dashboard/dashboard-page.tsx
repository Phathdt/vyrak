import React from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { StatsCard } from '@/components/ui/stats-card'
import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'

export function DashboardPage() {
  const { user, organizations, logout } = useAuth()
  const { activeOrgId, setActiveOrgId } = useOrganization()

  // Auto-select first organization if none is selected
  React.useEffect(() => {
    if (!activeOrgId && organizations.length > 0) {
      const firstOrg = organizations[0]
      if (firstOrg?.id) {
        setActiveOrgId(firstOrg.id)
      }
    }
  }, [activeOrgId, organizations, setActiveOrgId])

  const activeOrg = organizations.find((org) => org.id === activeOrgId)

  return (
    <div className='min-h-screen bg-background' data-testid='dashboard-content'>
      <div className='max-w-7xl mx-auto p-4 md:p-6 lg:p-8'>
        {/* Header */}
        <header className='mb-8 pb-6 border-b border-border'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight mb-1' data-testid='welcome-message'>
                Dashboard
              </h1>
              <p className='text-muted-foreground' data-testid='user-info'>
                Welcome back, {user?.name || user?.email}
              </p>
            </div>
            <Button variant='outline' onClick={logout} className='w-full sm:w-auto' data-testid='logout-button'>
              <svg className='w-4 h-4 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                />
              </svg>
              Logout
            </Button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
          <StatsCard
            title='Total Organizations'
            value={organizations.length}
            icon={
              <svg fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                />
              </svg>
            }
            variant='default'
          />

          <StatsCard
            title='Active Organization'
            value={activeOrg?.name || 'None'}
            icon={
              <svg fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                />
              </svg>
            }
            variant='success'
            description={activeOrg?.role ? `Your role: ${activeOrg.role}` : undefined}
          />

          <StatsCard
            title='Account Status'
            value='Active'
            icon={
              <svg fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
            }
            variant='accent'
          />

          <StatsCard
            title='Your Role'
            value={activeOrg?.role || 'N/A'}
            icon={
              <svg fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                />
              </svg>
            }
            description={activeOrg ? `in ${activeOrg.name}` : 'No active organization'}
          />
        </div>

        {/* Organization Selector */}
        {organizations.length > 0 && (
          <Card className='mb-8'>
            <CardHeader>
              <CardTitle>Active Organization</CardTitle>
              <CardDescription>Select the organization you want to work with</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={activeOrgId || ''}
                onChange={(e) => setActiveOrgId(e.target.value || null)}
                className='w-full px-3 py-2 bg-input border border-border rounded-md text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors min-h-[44px] md:min-h-[36px]'
                aria-label='Select active organization'
              >
                <option value=''>Select an organization</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.role})
                  </option>
                ))}
              </select>
              {activeOrg && (
                <p className='text-sm text-muted-foreground mt-3'>
                  Slug: <span className='font-mono'>{activeOrg.slug}</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Links */}
        <section className='mb-8'>
          <h2 className='text-xl font-semibold mb-4'>Quick Actions</h2>
          {organizations.length === 0 ? (
            <EmptyState
              variant='no-data'
              icon={
                <svg fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                  />
                </svg>
              }
              title='No organizations yet'
              description='Create your first organization to start managing teams and projects'
              action={
                <Button asChild>
                  <Link to='/organizations'>Create Organization</Link>
                </Button>
              }
            />
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <Card variant='interactive' className='group' onClick={() => (window.location.href = '/organizations')}>
                <CardHeader>
                  <div className='flex items-start gap-3'>
                    <div className='flex-shrink-0 w-10 h-10 rounded-lg bg-accent-cyan/10 flex items-center justify-center group-hover:bg-accent-cyan/20 transition-colors'>
                      <svg className='w-5 h-5 text-accent-cyan' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                        />
                      </svg>
                    </div>
                    <div className='flex-1 min-w-0'>
                      <CardTitle className='text-base mb-1'>Organizations</CardTitle>
                      <CardDescription>Manage your organizations and team members</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {activeOrgId && (
                <Card
                  variant='interactive'
                  className='group'
                  onClick={() => (window.location.href = `/organizations/${activeOrgId}/settings`)}
                >
                  <CardHeader>
                    <div className='flex items-start gap-3'>
                      <div className='flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors'>
                        <svg className='w-5 h-5 text-primary' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z'
                          />
                          <path
                            strokeLinecap='round'
                            strokeLinejoin='round'
                            strokeWidth={2}
                            d='M15 12a3 3 0 11-6 0 3 3 0 016 0z'
                          />
                        </svg>
                      </div>
                      <div className='flex-1 min-w-0'>
                        <CardTitle className='text-base mb-1'>Settings</CardTitle>
                        <CardDescription>Configure {activeOrg?.name}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              )}
            </div>
          )}
        </section>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className='grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm'>
              <div>
                <dt className='font-medium text-muted-foreground mb-1'>User ID</dt>
                <dd className='font-mono text-xs break-all'>{user?.id}</dd>
              </div>
              <div>
                <dt className='font-medium text-muted-foreground mb-1'>Email</dt>
                <dd className='break-all'>{user?.email}</dd>
              </div>
              <div>
                <dt className='font-medium text-muted-foreground mb-1'>Name</dt>
                <dd>{user?.name || <span className='text-muted-foreground'>Not set</span>}</dd>
              </div>
              <div>
                <dt className='font-medium text-muted-foreground mb-1'>Organizations</dt>
                <dd>
                  {organizations.length} {organizations.length === 1 ? 'organization' : 'organizations'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
