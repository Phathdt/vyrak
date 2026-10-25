import { zodResolver } from '@hookform/resolvers/zod'

import {
  useOrganizationsControllerCreate,
  useOrganizationsControllerFindAll,
} from '@/api/generated/organizations/organizations'
import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

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
    } catch (err) {
      console.error('Failed to create organization:', err)
    }
  }

  if (isLoading) {
    return <div className='page-loading'>Loading organizations...</div>
  }

  return (
    <div className='organizations-page'>
      <header className='page-header'>
        <h1>Organizations</h1>
        <button onClick={() => setIsCreating(!isCreating)} className='btn-primary' disabled={isCreating}>
          {isCreating ? 'Cancel' : 'Create Organization'}
        </button>
      </header>

      {isCreating && (
        <section className='create-org-section'>
          <h2>Create New Organization</h2>
          <form onSubmit={handleSubmit(onSubmit)} className='create-org-form'>
            <div className='form-field'>
              <label htmlFor='name'>Organization Name</label>
              <input id='name' type='text' {...register('name')} placeholder='Acme Inc' disabled={isPending} />
              {errors.name && <span className='error'>{errors.name.message}</span>}
            </div>

            <div className='form-field'>
              <label htmlFor='slug'>Slug (URL-friendly)</label>
              <input id='slug' type='text' {...register('slug')} placeholder='acme-inc' disabled={isPending} />
              {errors.slug && <span className='error'>{errors.slug.message}</span>}
            </div>

            <div className='form-field'>
              <label htmlFor='logo'>Logo URL (optional)</label>
              <input
                id='logo'
                type='text'
                {...register('logo')}
                placeholder='https://example.com/logo.png'
                disabled={isPending}
              />
              {errors.logo && <span className='error'>{errors.logo.message}</span>}
            </div>

            <div className='form-actions'>
              <button type='submit' className='btn-primary' disabled={isPending}>
                {isPending ? 'Creating...' : 'Create'}
              </button>
              <button
                type='button'
                onClick={() => {
                  setIsCreating(false)
                  reset()
                }}
                className='btn-secondary'
                disabled={isPending}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section className='orgs-list'>
        <h2>Your Organizations</h2>
        {!orgs || orgs.length === 0 ? (
          <p className='empty-state'>No organizations yet. Create one to get started.</p>
        ) : (
          <div className='orgs-grid'>
            {orgs.map((org) => (
              <div
                key={org.id}
                className={`org-card ${activeOrgId === org.id ? 'active' : ''}`}
                onClick={() => setActiveOrgId(org.id)}
              >
                {org.logo && (
                  <div className='org-logo'>
                    <img src={org.logo} alt={org.name} />
                  </div>
                )}
                <div className='org-info'>
                  <h3>{org.name}</h3>
                  <p className='org-slug'>{org.slug}</p>
                  <div className='org-meta'>
                    <span className='role-badge'>{org.role}</span>
                    <span className='member-count'>{org.memberCount} members</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
