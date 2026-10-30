import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  useOrganizationsControllerCreate,
  useOrganizationsControllerFindAll,
} from '@/api/generated/organizations/organizations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'

const createOrgSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug too long')
    .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
  logo: z.string().url('Invalid URL').optional().or(z.literal('')),
})

type CreateOrgFormData = z.infer<typeof createOrgSchema>

export function OrganizationsPage() {
  const [isCreating, setIsCreating] = useState(false)
  const { user } = useAuth()

  const {
    data: orgs,
    isLoading,
    refetch,
  } = useOrganizationsControllerFindAll({
    query: {
      enabled: !!user,
    },
  })
  const { mutateAsync: createOrg, isPending } = useOrganizationsControllerCreate()
  const { activeOrgId, setActiveOrgId } = useOrganization()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateOrgFormData>({
    resolver: zodResolver(createOrgSchema),
  })

  const onSubmit = async (data: CreateOrgFormData) => {
    try {
      const newOrg = await createOrg({
        data: {
          name: data.name,
          slug: data.slug,
          logo: data.logo || undefined,
        },
      })
      reset()
      setIsCreating(false)
      setActiveOrgId(newOrg.id)
      await refetch()
    } catch (err) {
      console.error('Failed to create organization:', err)
    }
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading organizations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Organizations</h1>
          <p className='text-muted-foreground'>Manage your organizations and teams</p>
        </div>
        <Button onClick={() => setIsCreating(true)}>Create Organization</Button>
      </div>

      {/* Create Organization Dialog */}
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>Add a new organization to manage teams and projects</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Organization Name</Label>
                <Input id='name' {...register('name')} placeholder='Acme Inc' disabled={isPending} />
                {errors.name && <p className='text-sm text-destructive'>{errors.name.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='slug'>Slug (URL-friendly)</Label>
                <Input id='slug' {...register('slug')} placeholder='acme-inc' disabled={isPending} />
                {errors.slug && <p className='text-sm text-destructive'>{errors.slug.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='logo'>Logo URL (optional)</Label>
                <Input
                  id='logo'
                  {...register('logo')}
                  placeholder='https://example.com/logo.png'
                  disabled={isPending}
                />
                {errors.logo && <p className='text-sm text-destructive'>{errors.logo.message}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setIsCreating(false)
                  reset()
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isPending}>
                {isPending ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Organizations Grid */}
      {!orgs || orgs.length === 0 ? (
        <Card className='p-12'>
          <div className='text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted'>
              <svg className='h-6 w-6 text-muted-foreground' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
                />
              </svg>
            </div>
            <h3 className='mb-2 text-lg font-semibold'>No organizations yet</h3>
            <p className='mb-4 text-muted-foreground'>
              Create your first organization to start managing teams and projects
            </p>
            <Button onClick={() => setIsCreating(true)}>Create Organization</Button>
          </div>
        </Card>
      ) : (
        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'>
          {orgs.map((org) => (
            <Card
              key={org.id}
              className={`cursor-pointer transition-colors hover:border-primary ${
                activeOrgId === org.id ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => setActiveOrgId(org.id)}
            >
              <CardContent className='p-6'>
                <div className='mb-4 flex items-start gap-4'>
                  {org.logo ? (
                    <img src={org.logo} alt={org.name || ''} className='h-12 w-12 rounded-lg object-cover' />
                  ) : (
                    <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10'>
                      <span className='text-lg font-semibold text-primary'>
                        {org.name?.substring(0, 2).toUpperCase() || 'OR'}
                      </span>
                    </div>
                  )}
                  <div className='min-w-0 flex-1'>
                    <h3 className='truncate font-semibold'>{org.name}</h3>
                    <p className='truncate font-mono text-sm text-muted-foreground'>{org.slug}</p>
                  </div>
                </div>
                <div className='flex items-center gap-2'>
                  <Badge>{org.role}</Badge>
                  {org.memberCount !== undefined && (
                    <span className='text-sm text-muted-foreground'>
                      {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
