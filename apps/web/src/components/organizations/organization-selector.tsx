import { Building2, Loader2 } from 'lucide-react'

import { useOrganizationsControllerFindAll } from '@/api/generated/organizations/organizations'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useOrganization } from '@/contexts/organization-context'

export function OrganizationSelector() {
  const { data: orgs, isLoading, error } = useOrganizationsControllerFindAll()
  const { activeOrgId, setActiveOrgId } = useOrganization()

  if (isLoading) {
    return (
      <div className='flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        <span>Loading organizations...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className='rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
        Failed to load organizations
      </div>
    )
  }

  if (!orgs || orgs.length === 0) {
    return (
      <div className='rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground'>
        No organizations yet
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-2'>
      <label htmlFor='org-select' className='text-sm font-medium'>
        Organization
      </label>
      <Select value={activeOrgId || ''} onValueChange={(value) => setActiveOrgId(value || null)}>
        <SelectTrigger id='org-select' className='w-full'>
          <div className='flex items-center gap-2'>
            <Building2 className='h-4 w-4 text-muted-foreground' />
            <SelectValue placeholder='Select organization' />
          </div>
        </SelectTrigger>
        <SelectContent>
          {orgs.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              <div className='flex items-center gap-2'>
                <Building2 className='h-4 w-4' />
                {org.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
