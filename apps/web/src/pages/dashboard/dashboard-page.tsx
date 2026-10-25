import { useAuth } from '@/contexts/auth-context'
import { useOrganization } from '@/contexts/organization-context'
import { Link } from 'react-router-dom'

export function DashboardPage() {
  const { user, organizations, logout } = useAuth()
  const { activeOrgId, setActiveOrgId } = useOrganization()

  const activeOrg = organizations.find((org) => org.id === activeOrgId)

  return (
    <div className='dashboard-page' style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
      <header style={{ marginBottom: '32px', borderBottom: '1px solid #1E2636', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px' }}>Dashboard</h1>
            <p style={{ margin: '4px 0 0', color: '#9CA3AF' }}>Welcome back, {user?.name || user?.email}</p>
          </div>
          <button
            onClick={logout}
            style={{
              padding: '8px 16px',
              background: '#1E2636',
              border: '1px solid #38BDF8',
              borderRadius: '6px',
              color: '#38BDF8',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Organization Selector */}
      {organizations.length > 0 && (
        <section style={{ marginBottom: '32px', padding: '20px', background: '#0F131C', borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>Active Organization</h2>
          <select
            value={activeOrgId || ''}
            onChange={(e) => setActiveOrgId(e.target.value || null)}
            style={{
              width: '100%',
              padding: '12px',
              background: '#161D2B',
              border: '1px solid #1E2636',
              borderRadius: '6px',
              color: 'white',
              fontSize: '16px',
            }}
          >
            <option value=''>Select an organization</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.role})
              </option>
            ))}
          </select>
          {activeOrg && (
            <div style={{ marginTop: '12px', fontSize: '14px', color: '#9CA3AF' }}>
              <p style={{ margin: '4px 0' }}>Slug: {activeOrg.slug}</p>
            </div>
          )}
        </section>
      )}

      {/* Quick Links */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <Link
          to='/organizations'
          style={{
            padding: '24px',
            background: '#0F131C',
            border: '1px solid #1E2636',
            borderRadius: '8px',
            textDecoration: 'none',
            color: 'white',
            transition: 'border-color 0.2s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38BDF8')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1E2636')}
        >
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#38BDF8' }}>Organizations</h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF' }}>Manage your organizations and team members</p>
        </Link>

        {activeOrgId && (
          <Link
            to={`/organizations/${activeOrgId}/settings`}
            style={{
              padding: '24px',
              background: '#0F131C',
              border: '1px solid #1E2636',
              borderRadius: '8px',
              textDecoration: 'none',
              color: 'white',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38BDF8')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1E2636')}
          >
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#38BDF8' }}>Organization Settings</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#9CA3AF' }}>Configure {activeOrg?.name}</p>
          </Link>
        )}
      </section>

      {/* User Info */}
      <section style={{ marginTop: '32px', padding: '20px', background: '#0F131C', borderRadius: '8px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px' }}>User Information</h2>
        <dl style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px', fontSize: '14px' }}>
          <dt style={{ color: '#9CA3AF' }}>ID:</dt>
          <dd style={{ margin: 0 }}>{user?.id}</dd>
          <dt style={{ color: '#9CA3AF' }}>Email:</dt>
          <dd style={{ margin: 0 }}>{user?.email}</dd>
          <dt style={{ color: '#9CA3AF' }}>Name:</dt>
          <dd style={{ margin: 0 }}>{user?.name || 'Not set'}</dd>
          <dt style={{ color: '#9CA3AF' }}>Organizations:</dt>
          <dd style={{ margin: 0 }}>{organizations.length}</dd>
        </dl>
      </section>
    </div>
  )
}
