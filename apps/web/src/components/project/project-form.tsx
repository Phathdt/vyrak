import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { createProjectSchema, generateSlug, type CreateProjectInput } from '@/lib/schemas/project-schema'
import { cn } from '@/lib/utils'

interface ProjectFormProps {
  defaultValues?: Partial<CreateProjectInput>
  onSubmit: (data: CreateProjectInput) => void | Promise<void>
  onCancel?: () => void
  isSubmitting: boolean
  mode: 'create' | 'edit'
}

export function ProjectForm({ defaultValues, onSubmit, onCancel, isSubmitting, mode }: ProjectFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: defaultValues || {
      name: '',
      slug: '',
      description: '',
    },
  })

  const nameValue = watch('name')
  const slugValue = watch('slug')
  const descriptionValue = watch('description')

  // Auto-generate slug from name (only in create mode and if slug is empty)
  useEffect(() => {
    if (mode === 'create' && nameValue && !slugValue) {
      const generatedSlug = generateSlug(nameValue)
      setValue('slug', generatedSlug)
    }
  }, [nameValue, slugValue, setValue, mode])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className='space-y-6'>
      {/* Project Name */}
      <FormField label='Project Name' required error={errors.name?.message} htmlFor='name'>
        <Input
          {...register('name')}
          id='name'
          type='text'
          placeholder='My Awesome Project'
          disabled={isSubmitting}
          className={cn(errors.name && 'border-destructive focus-visible:ring-destructive')}
        />
      </FormField>

      {/* Slug */}
      <FormField
        label='Slug'
        required
        error={errors.slug?.message}
        hint='URL-friendly identifier (lowercase, hyphens only)'
        htmlFor='slug'
      >
        <Input
          {...register('slug')}
          id='slug'
          type='text'
          placeholder='my-awesome-project'
          disabled={isSubmitting || mode === 'edit'}
          className={cn(errors.slug && 'border-destructive focus-visible:ring-destructive')}
        />
      </FormField>

      {/* Description */}
      <FormField
        label='Description'
        error={errors.description?.message}
        hint={`${descriptionValue?.length || 0} / 500 characters`}
        htmlFor='description'
      >
        <textarea
          {...register('description')}
          id='description'
          rows={4}
          placeholder='Describe your project...'
          disabled={isSubmitting}
          className={cn(
            'flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            errors.description && 'border-destructive focus-visible:ring-destructive'
          )}
        />
      </FormField>

      {/* Actions */}
      <div className='flex items-center justify-end gap-3 pt-4'>
        {onCancel && (
          <Button type='button' variant='outline' onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
        <Button type='submit' disabled={isSubmitting} variant='default'>
          {isSubmitting ? (
            <>
              <span className='mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent' />
              {mode === 'create' ? 'Creating...' : 'Saving...'}
            </>
          ) : (
            <>{mode === 'create' ? 'Create Project' : 'Save Changes'}</>
          )}
        </Button>
      </div>
    </form>
  )
}
