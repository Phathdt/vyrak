import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate, useParams } from 'react-router-dom'
import { z } from 'zod'

import { UpdateMemberRoleDtoRole } from '@/api/generated/models'
import {
  useOrganizationsControllerFindOne,
  useOrganizationsControllerInviteMember,
  useOrganizationsControllerListMembers,
  useOrganizationsControllerRemoveMember,
  useOrganizationsControllerUpdate,
  useOrganizationsControllerUpdateMemberRole,
} from '@/api/generated/organizations/organizations'
import { LoadingSkeleton } from '@/components/loading-skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorMessage, FormField, HelperText, Label } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Modal, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal'
import { useToast } from '@/components/ui/toast'

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
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null)
  const { showToast } = useToast()

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
      <div className='min-h-screen bg-background'>
        <div className='max-w-5xl mx-auto p-4 md:p-6 lg:p-8'>
          <LoadingSkeleton variant='text' className='h-9 w-64 mb-8' />
          <div className='space-y-6'>
            <LoadingSkeleton variant='rectangular' className='h-64 rounded-lg' />
            <LoadingSkeleton variant='rectangular' className='h-96 rounded-lg' />
          </div>
        </div>
      </div>
    )
  }

  if (!org) {
    return (
      <div className='min-h-screen bg-background flex items-center justify-center'>
        <Card className='max-w-md'>
          <CardContent className='p-8 text-center'>
            <h2 className='text-xl font-semibold mb-2'>Organization not found</h2>
            <p className='text-muted-foreground mb-4'>
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
      showToast({
        title: 'Organization updated successfully',
        type: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Failed to update organization',
        type: 'error',
      })
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
      setShowInviteForm(false)
      await refetchMembers()
      showToast({
        title: 'Invitation sent successfully',
        type: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Failed to send invitation',
        type: 'error',
      })
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
      showToast({
        title: 'Member role updated',
        type: 'success',
      })
    } catch (err) {
      showToast({
        title: 'Failed to update role',
        type: 'error',
      })
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
      showToast({
        title: 'Member removed successfully',
        type: 'success',
      })
      setMemberToRemove(null)
    } catch (err) {
      showToast({
        title: 'Failed to remove member',
        type: 'error',
      })
      console.error('Failed to remove member:', err)
    }
  }

  const canManageMembers = org.role === 'owner' || org.role === 'admin'

  return (
    <div className='min-h-screen bg-background'>
      <div className='max-w-5xl mx-auto p-4 md:p-6 lg:p-8'>
        {/* Header */}
        <header className='mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div>
            <h1 className='text-3xl font-bold tracking-tight'>Organization Settings</h1>
            <p className='text-muted-foreground mt-1'>Manage {org.name}</p>
          </div>
          <Button variant='outline' onClick={() => navigate('/organizations')}>
            <svg className='w-4 h-4 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
            </svg>
            Back
          </Button>
        </header>

        {/* General Settings */}
        <Card className='mb-6'>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Update your organization's basic information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateSubmit(onUpdateSubmit)} className='space-y-4'>
              <FormField>
                <Label htmlFor='name'>Organization Name</Label>
                <Input
                  id='name'
                  {...registerUpdate('name')}
                  disabled={!canManageMembers || isUpdating}
                  error={!!updateErrors.name}
                  aria-describedby={updateErrors.name ? 'name-error' : undefined}
                />
                <ErrorMessage id='name-error'>{updateErrors.name?.message}</ErrorMessage>
              </FormField>

              <FormField>
                <Label htmlFor='slug'>Slug</Label>
                <Input id='slug' value={org.slug} disabled />
                <HelperText>URL-friendly identifier (cannot be changed)</HelperText>
              </FormField>

              <FormField>
                <Label htmlFor='logo'>Logo URL</Label>
                <Input
                  id='logo'
                  {...registerUpdate('logo')}
                  disabled={!canManageMembers || isUpdating}
                  error={!!updateErrors.logo}
                  aria-describedby={updateErrors.logo ? 'logo-error' : undefined}
                />
                <ErrorMessage id='logo-error'>{updateErrors.logo?.message}</ErrorMessage>
              </FormField>

              {canManageMembers && (
                <Button type='submit' loading={isUpdating}>
                  Save Changes
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
              {canManageMembers && (
                <Button onClick={() => setShowInviteForm(!showInviteForm)}>
                  {showInviteForm ? 'Cancel' : 'Invite Member'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {showInviteForm && (
              <form onSubmit={handleInviteSubmit(onInviteSubmit)} className='mb-6 p-4 bg-muted/50 rounded-lg'>
                <div className='space-y-4'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                    <FormField>
                      <Label htmlFor='email' required>
                        Email
                      </Label>
                      <Input
                        id='email'
                        type='email'
                        {...registerInvite('email')}
                        placeholder='user@example.com'
                        disabled={isInviting}
                        error={!!inviteErrors.email}
                        aria-describedby={inviteErrors.email ? 'email-error' : undefined}
                      />
                      <ErrorMessage id='email-error'>{inviteErrors.email?.message}</ErrorMessage>
                    </FormField>

                    <FormField>
                      <Label htmlFor='role' required>
                        Role
                      </Label>
                      <select
                        id='role'
                        {...registerInvite('role')}
                        disabled={isInviting}
                        className='flex w-full rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[44px] md:min-h-[36px]'
                      >
                        <option value='member'>Member</option>
                        <option value='admin'>Admin</option>
                      </select>
                    </FormField>
                  </div>

                  <div className='flex gap-3'>
                    <Button type='submit' loading={isInviting}>
                      Send Invitation
                    </Button>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={() => {
                        setShowInviteForm(false)
                        resetInvite()
                      }}
                      disabled={isInviting}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            )}

            <div className='space-y-3'>
              {members?.map((member) => (
                <div
                  key={member.id}
                  className='flex items-center justify-between p-4 rounded-lg border border-border hover:border-border-subtle transition-colors'
                >
                  <div className='flex items-center gap-3 flex-1 min-w-0'>
                    <Avatar
                      src={member.user.image || undefined}
                      alt={member.user.name || member.user.email}
                      fallback={member.user.name?.substring(0, 2) || member.user.email.substring(0, 2)}
                      size='md'
                    />
                    <div className='flex-1 min-w-0'>
                      <p className='font-medium truncate'>{member.user.name || 'Unnamed User'}</p>
                      <p className='text-sm text-muted-foreground truncate'>{member.user.email}</p>
                    </div>
                  </div>

                  <div className='flex items-center gap-3 ml-4'>
                    {canManageMembers && member.role !== 'owner' ? (
                      <>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UpdateMemberRoleDtoRole)}
                          className='px-3 py-1.5 text-sm rounded-md border border-border bg-input text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        >
                          <option value={UpdateMemberRoleDtoRole.member}>Member</option>
                          <option value={UpdateMemberRoleDtoRole.admin}>Admin</option>
                          {org.role === 'owner' && <option value={UpdateMemberRoleDtoRole.owner}>Owner</option>}
                        </select>
                        <Button
                          variant='destructive'
                          size='sm'
                          onClick={() =>
                            setMemberToRemove({ id: member.id, name: member.user.name || member.user.email })
                          }
                        >
                          Remove
                        </Button>
                      </>
                    ) : (
                      <Badge variant='default'>{member.role}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remove Member Confirmation Modal */}
      <Modal open={!!memberToRemove} onClose={() => setMemberToRemove(null)} size='sm'>
        <ModalHeader onClose={() => setMemberToRemove(null)}>
          <ModalTitle>Remove Member</ModalTitle>
          <ModalDescription>
            Are you sure you want to remove {memberToRemove?.name}? This action cannot be undone.
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <Button variant='outline' onClick={() => setMemberToRemove(null)} disabled={isRemoving}>
            Cancel
          </Button>
          <Button variant='destructive' onClick={handleRemoveMember} loading={isRemoving}>
            Remove Member
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
