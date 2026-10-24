import { useOrganizationsControllerFindAll } from '@/api/generated/organizations/organizations'
import { useOrganization } from '@/contexts/organization-context'

export function OrganizationSelector() {
  const { data: orgs, isLoading, error } = useOrganizationsControllerFindAll()
  const { activeOrgId, setActiveOrgId } = useOrganization()

  if (isLoading) {
    return (
      <div className='org-selector-loading'>
        <span>Loading organizations...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className='org-selector-error'>
        <span>Failed to load organizations</span>
      </div>
    )
  }

  if (!orgs || orgs.length === 0) {
    return (
      <div className='org-selector-empty'>
        <span>No organizations yet</span>
      </div>
    )
  }

  return (
    <div className='org-selector'>
      <label htmlFor='org-select'>Organization</label>
      <select
        id='org-select'
        value={activeOrgId || ''}
        onChange={(e) => setActiveOrgId(e.target.value || null)}
        className='org-select'
      >
        <option value=''>Select organization</option>
        {orgs.map((org) => (
          <option key={org.id} value={org.id}>
            {org.name}
          </option>
        ))}
      </select>
    </div>
  )
}
