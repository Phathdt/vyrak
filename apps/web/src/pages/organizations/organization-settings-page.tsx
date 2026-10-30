import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { UpdateMemberRoleDtoRole as RoleEnum } from '@/api/generated/models'
import {
  useOrganizationsControllerFindOne,
  useOrganizationsControllerInviteMember,
  useOrganizationsControllerListMembers,
  useOrganizationsControllerRemoveMember,
  useOrganizationsControllerUpdate,
  useOrganizationsControllerUpdateMemberRole,
} from '@/api/generated/organizations/organizations'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import type { UpdateMemberRoleDtoRole } from '@/api/generated/models'

const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  logo: z.string().url().optional().or(z.literal('')),
})

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['admin', 'member']),
})

type UpdateOrgFormData = z.infer<typeof updateOrgSchema>
type InviteMemberFormData = z.infer<typeof inviteMemberSchema>

export function OrganizationSettingsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{
    id: string
    name: string
  } | null>(null)

  const {
    data: org,
    isLoading,
    refetch,
  } = useOrganizationsControllerFindOne(id!, {
    query: { enabled: !!id },
  })
  const { data: members, refetch: refetchMembers } = useOrganizationsControllerListMembers(id!, {
    query: { enabled: !!id },
  })
  const { mutateAsync: updateOrg, isPending: isUpdating } = useOrganizationsControllerUpdate()
  const { mutateAsync: inviteMember, isPending: isInviting } = useOrganizationsControllerInviteMember()
  const { mutateAsync: updateMemberRole } = useOrganizationsControllerUpdateMemberRole()
  const { mutateAsync: removeMember, isPending: isRemoving } = useOrganizationsControllerRemoveMember()

  const {
    register: registerUpdate,
    handleSubmit: handleUpdateSubmit,
    formState: { errors: updateErrors },
    reset: resetUpdate,
  } = useForm<UpdateOrgFormData>({
    resolver: zodResolver(updateOrgSchema),
  })

  const {
    register: registerInvite,
    handleSubmit: handleInviteSubmit,
    formState: { errors: inviteErrors },
    reset: resetInvite,
    setValue: setInviteValue,
  } = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { role: 'member' },
  })

  useEffect(() => {
    if (org) {
      resetUpdate({
        name: org.name || '',
        logo: org.logo || '',
      })
    }
  }, [org, resetUpdate])

  if (!id) {
    navigate('/organizations')
    return null
  }

  if (isLoading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <div className='text-center'>
          <div className='mb-4 inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent'></div>
          <p className='text-muted-foreground'>Loading organization...</p>
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Card className='max-w-md'>
          <CardContent className='p-8 text-center'>
            <h2 className='mb-2 text-xl font-semibold'>Organization not found</h2>
            <p className='mb-4 text-muted-foreground'>
              The organization you're looking for doesn't exist or you don't have access to it.
            </p>
            <Button onClick={() => navigate('/organizations')}>Back to Organizations</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onUpdateSubmit = async (data: UpdateOrgFormData) => {
    try {
      await updateOrg({
        id: id!,
        data: {
          name: data.name,
          logo: data.logo || undefined,
        },
      })
      await refetch()
    } catch (err) {
      console.error('Failed to update organization:', err)
    }
  }

  const onInviteSubmit = async (data: InviteMemberFormData) => {
    try {
      await inviteMember({
        id: id!,
        data,
      })
      resetInvite()
      setShowInviteDialog(false)
      await refetchMembers()
    } catch (err) {
      console.error('Failed to invite member:', err)
    }
  }

  const handleRoleChange = async (memberId: string, newRole: UpdateMemberRoleDtoRole) => {
    try {
      await updateMemberRole({
        id: id!,
        memberId,
        data: { role: newRole },
      })
      await refetchMembers()
    } catch (err) {
      console.error('Failed to update role:', err)
    }
  }

  const handleRemoveMember = async () => {
    if (!memberToRemove) return

    try {
      await removeMember({
        id: id!,
        memberId: memberToRemove.id,
      })
      await refetchMembers()
      setMemberToRemove(null)
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  const canManageMembers = org.role === 'owner' || org.role === 'admin'

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Organization Settings</h1>
          <p className='text-muted-foreground'>Manage {org.name}</p>
        </div>
        <Button variant='outline' onClick={() => navigate('/organizations')}>
          <svg className='mr-2 h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
          </svg>
          Back
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>Update your organization's basic information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateSubmit(onUpdateSubmit)} className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Organization Name</Label>
              <Input id='name' {...registerUpdate('name')} disabled={!canManageMembers || isUpdating} />
              {updateErrors.name && <p className='text-sm text-destructive'>{updateErrors.name.message}</p>}
            </div>

            <div className='space-y-2'>
              <Label htmlFor='slug'>Slug</Label>
              <Input id='slug' value={org.slug} disabled />
              <p className='text-sm text-muted-foreground'>URL-friendly identifier (cannot be changed)</p>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='logo'>Logo URL</Label>
              <Input id='logo' {...registerUpdate('logo')} disabled={!canManageMembers || isUpdating} />
              {updateErrors.logo && <p className='text-sm text-destructive'>{updateErrors.logo.message}</p>}
            </div>

            {canManageMembers && (
              <Button type='submit' disabled={isUpdating}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Members Section */}
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                {members?.length || 0} {members?.length === 1 ? 'member' : 'members'}
              </CardDescription>
            </div>
            {canManageMembers && <Button onClick={() => setShowInviteDialog(true)}>Invite Member</Button>}
          </div>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            {members?.map((member) => (
              <div key={member.id} className='flex items-center justify-between rounded-lg border p-4'>
                <div className='flex min-w-0 flex-1 items-center gap-3'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
                    <span className='text-sm font-semibold text-primary'>
                      {(member.user.name || member.user.email).substring(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className='min-w-0 flex-1'>
                    <p className='truncate font-medium'>{member.user.name || 'Unnamed User'}</p>
                    <p className='truncate text-sm text-muted-foreground'>{member.user.email}</p>
                  </div>
                </div>

                <div className='ml-4 flex items-center gap-3'>
                  {canManageMembers && member.role !== 'owner' ? (
                    <>
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member.id, value as UpdateMemberRoleDtoRole)}
                      >
                        <SelectTrigger className='w-32'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={RoleEnum.member}>Member</SelectItem>
                          <SelectItem value={RoleEnum.admin}>Admin</SelectItem>
                          {org.role === 'owner' && <SelectItem value={RoleEnum.owner}>Owner</SelectItem>}
                        </SelectContent>
                      </Select>
                      <Button
                        variant='destructive'
                        size='sm'
                        onClick={() =>
                          setMemberToRemove({
                            id: member.id,
                            name: member.user.name || member.user.email,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <Badge>{member.role}</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
            <DialogDescription>Send an invitation to join this organization</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit(onInviteSubmit)}>
            <div className='space-y-4 py-4'>
              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  {...registerInvite('email')}
                  placeholder='user@example.com'
                  disabled={isInviting}
                />
                {inviteErrors.email && <p className='text-sm text-destructive'>{inviteErrors.email.message}</p>}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='role'>Role</Label>
                <Select
                  defaultValue='member'
                  onValueChange={(value) => setInviteValue('role', value as 'admin' | 'member')}
                >
                  <SelectTrigger id='role'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='member'>Member</SelectItem>
                    <SelectItem value='admin'>Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setShowInviteDialog(false)
                  resetInvite()
                }}
                disabled={isInviting}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={isInviting}>
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove {memberToRemove?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setMemberToRemove(null)} disabled={isRemoving}>
              Cancel
            </Button>
            <Button variant='destructive' onClick={handleRemoveMember} disabled={isRemoving}>
              {isRemoving ? 'Removing...' : 'Remove Member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
