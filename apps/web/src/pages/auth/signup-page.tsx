import { Link } from 'react-router-dom'

export function SignupPage() {

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        background: 'linear-gradient(135deg, #05070C 0%, #0F131C 50%, #161D2B 100%)',
        padding: '2rem',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '28rem',
          background: '#0A0D12',
          borderRadius: '1rem',
          padding: '2.5rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        }}
      >
        <h1
          style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#fff',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em',
          }}
        >
          Tạo tài khoản
        </h1>
        <p
          style={{
            color: '#94A3B8',
            marginBottom: '2rem',
          }}
        >
          Signup tạm thời bị vô hiệu hóa
        </p>

        <div
          style={{
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            borderRadius: '0.5rem',
            padding: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <p style={{ color: '#38BDF8', fontWeight: '600', marginBottom: '0.5rem' }}>Test Credentials:</p>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Email: admin@vyrak.dev</p>
          <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Password: Password123!</p>
        </div>

        <p
          style={{
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: '0.875rem',
          }}
        >
          Đã có tài khoản?{' '}
          <Link
            to='/login'
            style={{
              color: '#38BDF8',
              textDecoration: 'none',
              fontWeight: '600',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  )
}
