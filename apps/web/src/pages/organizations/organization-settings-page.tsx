import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useOrganizationsControllerFindOne,
  useOrganizationsControllerUpdate,
  useOrganizationsControllerListMembers,
  useOrganizationsControllerInviteMember,
  useOrganizationsControllerUpdateMemberRole,
  useOrganizationsControllerRemoveMember,
} from '@/api/generated/organizations/organizations'
import { UpdateMemberRoleDtoRole } from '@/api/generated/models'

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
  const { mutateAsync: updateOrg } = useOrganizationsControllerUpdate()
  const { mutateAsync: inviteMember } = useOrganizationsControllerInviteMember()
  const { mutateAsync: updateMemberRole } = useOrganizationsControllerUpdateMemberRole()
  const { mutateAsync: removeMember } = useOrganizationsControllerRemoveMember()

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
        name: org.name,
        logo: org.logo || '',
      })
    }
  }, [org, resetUpdate])

  if (!id) {
    navigate('/organizations')
    return null
  }

  if (isLoading) {
    return <div className='page-loading'>Loading organization...</div>
  }

  if (!org) {
    return <div className='page-error'>Organization not found</div>
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
      setShowInviteForm(false)
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

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      await removeMember({
        id: id!,
        memberId,
      })
      await refetchMembers()
    } catch (err) {
      console.error('Failed to remove member:', err)
    }
  }

  const canManageMembers = org.role === 'owner' || org.role === 'admin'

  return (
    <div className='org-settings-page'>
      <header className='page-header'>
        <h1>Organization Settings</h1>
        <button onClick={() => navigate('/organizations')} className='btn-secondary'>
          Back to Organizations
        </button>
      </header>

      <section className='settings-section'>
        <h2>General Settings</h2>
        <form onSubmit={handleUpdateSubmit(onUpdateSubmit)} className='settings-form'>
          <div className='form-field'>
            <label htmlFor='name'>Organization Name</label>
            <input id='name' type='text' {...registerUpdate('name')} disabled={!canManageMembers} />
            {updateErrors.name && <span className='error'>{updateErrors.name.message}</span>}
          </div>

          <div className='form-field'>
            <label htmlFor='slug'>Slug (read-only)</label>
            <input id='slug' type='text' value={org.slug} disabled />
          </div>

          <div className='form-field'>
            <label htmlFor='logo'>Logo URL</label>
            <input id='logo' type='text' {...registerUpdate('logo')} disabled={!canManageMembers} />
            {updateErrors.logo && <span className='error'>{updateErrors.logo.message}</span>}
          </div>

          {canManageMembers && (
            <button type='submit' className='btn-primary'>
              Save Changes
            </button>
          )}
        </form>
      </section>

      <section className='members-section'>
        <div className='section-header'>
          <h2>Members ({members?.length || 0})</h2>
          {canManageMembers && (
            <button onClick={() => setShowInviteForm(!showInviteForm)} className='btn-primary'>
              {showInviteForm ? 'Cancel' : 'Invite Member'}
            </button>
          )}
        </div>

        {showInviteForm && (
          <form onSubmit={handleInviteSubmit(onInviteSubmit)} className='invite-form'>
            <div className='form-row'>
              <div className='form-field'>
                <label htmlFor='email'>Email</label>
                <input id='email' type='email' {...registerInvite('email')} placeholder='user@example.com' />
                {inviteErrors.email && <span className='error'>{inviteErrors.email.message}</span>}
              </div>

              <div className='form-field'>
                <label htmlFor='role'>Role</label>
                <select id='role' {...registerInvite('role')}>
                  <option value='member'>Member</option>
                  <option value='admin'>Admin</option>
                </select>
              </div>

              <button type='submit' className='btn-primary'>
                Send Invitation
              </button>
            </div>
          </form>
        )}

        <div className='members-list'>
          {members?.map((member) => (
            <div key={member.id} className='member-card'>
              <div className='member-info'>
                {member.user.image && (
                  <img src={member.user.image} alt={member.user.name || 'User'} className='avatar' />
                )}
                <div className='member-details'>
                  <p className='member-name'>{member.user.name || 'Unnamed User'}</p>
                  <p className='member-email'>{member.user.email}</p>
                </div>
              </div>

              <div className='member-actions'>
                {canManageMembers && member.role !== 'owner' ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as UpdateMemberRoleDtoRole)}
                      className='role-select'
                    >
                      <option value={UpdateMemberRoleDtoRole.member}>Member</option>
                      <option value={UpdateMemberRoleDtoRole.admin}>Admin</option>
                      {org.role === 'owner' && <option value={UpdateMemberRoleDtoRole.owner}>Owner</option>}
                    </select>
                    <button onClick={() => handleRemoveMember(member.id)} className='btn-danger'>
                      Remove
                    </button>
                  </>
                ) : (
                  <span className='role-badge'>{member.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
