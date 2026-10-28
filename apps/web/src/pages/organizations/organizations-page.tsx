import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import {
  useOrganizationsControllerCreate,
  useOrganizationsControllerFindAll,
} from '@/api/generated/organizations/organizations'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ErrorMessage, FormField, Label } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Modal, ModalBody, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'
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
  const { showToast } = useToast()

  // Only fetch organizations after user is loaded
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
      showToast({
        title: 'Organization created successfully',
        type: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Failed to create organization',
        type: 'error',
      })
      console.error('Failed to create organization:', err)
    }
  }

  if (isLoading) {
    return (
      <div className='min-h-screen bg-background'>
        <div className='max-w-7xl mx-auto p-4 md:p-6 lg:p-8'>
          <div className='mb-8 flex items-center justify-between'>
            <LoadingSkeleton variant='text' className='h-9 w-48' />
            <LoadingSkeleton variant='rectangular' className='h-10 w-44' />
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {[...Array(3)].map((_, i) => (
              <LoadingSkeleton key={i} variant='rectangular' className='h-48 rounded-lg' />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-background'>
      <div className='max-w-7xl mx-auto p-4 md:p-6 lg:p-8'>
        {/* Header */}
        <header className='mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <h1 className='text-3xl font-bold tracking-tight'>Organizations</h1>
          <Button onClick={() => setIsCreating(!isCreating)} disabled={isCreating}>
            {isCreating ? 'Cancel' : 'Create Organization'}
          </Button>
        </header>

        {/* Create Organization Modal */}
        <Modal open={isCreating} onClose={() => setIsCreating(false)} size='md'>
          <ModalHeader onClose={() => setIsCreating(false)}>
            <ModalTitle>Create New Organization</ModalTitle>
            <ModalDescription>Add a new organization to manage teams and projects</ModalDescription>
          </ModalHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <ModalBody>
              <div className='space-y-4'>
                <FormField>
                  <Label htmlFor='name' required>
                    Organization Name
                  </Label>
                  <Input
                    id='name'
                    {...register('name')}
                    placeholder='Acme Inc'
                    disabled={isPending}
                    error={!!errors.name}
                    aria-describedby={errors.name ? 'name-error' : undefined}
                  />
                  <ErrorMessage id='name-error'>{errors.name?.message}</ErrorMessage>
                </FormField>

                <FormField>
                  <Label htmlFor='slug' required>
                    Slug (URL-friendly)
                  </Label>
                  <Input
                    id='slug'
                    {...register('slug')}
                    placeholder='acme-inc'
                    disabled={isPending}
                    error={!!errors.slug}
                    aria-describedby={errors.slug ? 'slug-error' : undefined}
                  />
                  <ErrorMessage id='slug-error'>{errors.slug?.message}</ErrorMessage>
                </FormField>

                <FormField>
                  <Label htmlFor='logo'>Logo URL (optional)</Label>
                  <Input
                    id='logo'
                    {...register('logo')}
                    placeholder='https://example.com/logo.png'
                    disabled={isPending}
                    error={!!errors.logo}
                    aria-describedby={errors.logo ? 'logo-error' : undefined}
                  />
                  <ErrorMessage id='logo-error'>{errors.logo?.message}</ErrorMessage>
                </FormField>
              </div>
            </ModalBody>
            <ModalFooter>
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
              <Button type='submit' loading={isPending}>
                Create
              </Button>
            </ModalFooter>
          </form>
        </Modal>

        {/* Organizations Grid */}
        <section>
          <h2 className='text-xl font-semibold mb-4'>Your Organizations</h2>
          {!orgs || orgs.length === 0 ? (
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
              action={<Button onClick={() => setIsCreating(true)}>Create Organization</Button>}
            />
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {orgs.map((org) => (
                <Card
                  key={org.id}
                  variant='interactive'
                  className={activeOrgId === org.id ? 'border-accent-cyan bg-surface-4' : ''}
                  onClick={() => setActiveOrgId(org.id)}
                >
                  <CardContent className='p-6'>
                    <div className='flex items-start gap-4 mb-4'>
                      <Avatar
                        src={org.logo || undefined}
                        alt={org.name || 'Organization'}
                        fallback={org.name?.substring(0, 2) || 'OR'}
                        size='lg'
                      />
                      <div className='flex-1 min-w-0'>
                        <h3 className='font-semibold truncate'>{org.name}</h3>
                        <p className='text-sm text-muted-foreground font-mono truncate'>{org.slug}</p>
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant='default' size='sm'>
                        {org.role}
                      </Badge>
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
        </section>
      </div>
    </div>
  )
}
