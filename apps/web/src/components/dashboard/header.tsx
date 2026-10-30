import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'

export function Header() {
  const { user, organizations, logout } = useAuth()
  const { activeOrgId, setActiveOrgId } = useOrganization()

  const activeOrg = organizations.find((org) => org.id === activeOrgId)

  return (
    <header className='border-b border-border bg-card px-6 py-4'>
      <div className='flex items-center justify-between gap-4'>
        <div className='flex min-w-0 flex-1 items-center gap-4'>
          <div className='min-w-0'>
            <h2 className='truncate text-lg font-semibold'>Vyrak Dashboard</h2>
            <p className='truncate text-sm text-muted-foreground'>Welcome, {user?.name || user?.email}</p>
          </div>

          {organizations.length > 0 && (
            <div className='flex items-center gap-2'>
              <span className='whitespace-nowrap text-sm text-muted-foreground'>Organization:</span>
              <Select value={activeOrgId || undefined} onValueChange={(value) => value && setActiveOrgId(value)}>
                <SelectTrigger className='w-[200px]'>
                  <SelectValue>
                    {activeOrg ? `${activeOrg.name} (${activeOrg.role})` : 'Select organization'}
                  </SelectValue>
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
            </div>
          )}
        </div>

        <Button variant='outline' size='sm' onClick={logout}>
          Logout
        </Button>
      </div>
    </header>
  )
}
