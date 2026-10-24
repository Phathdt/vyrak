import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import { signUp } from '../../lib/auth'
import { signupSchema, type SignupInput } from '../../lib/schemas/auth-schema'

export function SignupPage() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupInput) => {
    try {
      setError(null)
      setIsLoading(true)

      const result = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      })

      if (result.error) {
        setError(result.error.message || 'Đăng ký thất bại')
        return
      }

      navigate('/')
    } catch (err) {
      setError('Có lỗi xảy ra. Vui lòng thử lại.')
      console.error('Signup error:', err)
    } finally {
      setIsLoading(false)
    }
  }

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
          Bắt đầu với Vyrak ngay hôm nay
        </p>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '0.5rem',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              color: '#FCA5A5',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor='name'
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#E2E8F0',
                marginBottom: '0.5rem',
              }}
            >
              Tên của bạn
            </label>
            <input
              {...register('name')}
              id='name'
              type='text'
              placeholder='Nguyễn Văn A'
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#161D2B',
                border: '1px solid #1E2636',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
              onBlur={(e) => (e.target.style.borderColor = '#1E2636')}
            />
            {errors.name && (
              <p
                style={{
                  color: '#FCA5A5',
                  fontSize: '0.875rem',
                  marginTop: '0.375rem',
                }}
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor='email'
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#E2E8F0',
                marginBottom: '0.5rem',
              }}
            >
              Email
            </label>
            <input
              {...register('email')}
              id='email'
              type='email'
              placeholder='ten@example.com'
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#161D2B',
                border: '1px solid #1E2636',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
              onBlur={(e) => (e.target.style.borderColor = '#1E2636')}
            />
            {errors.email && (
              <p
                style={{
                  color: '#FCA5A5',
                  fontSize: '0.875rem',
                  marginTop: '0.375rem',
                }}
              >
                {errors.email.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label
              htmlFor='password'
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#E2E8F0',
                marginBottom: '0.5rem',
              }}
            >
              Mật khẩu
            </label>
            <input
              {...register('password')}
              id='password'
              type='password'
              placeholder='••••••••'
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#161D2B',
                border: '1px solid #1E2636',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
              onBlur={(e) => (e.target.style.borderColor = '#1E2636')}
            />
            {errors.password && (
              <p
                style={{
                  color: '#FCA5A5',
                  fontSize: '0.875rem',
                  marginTop: '0.375rem',
                }}
              >
                {errors.password.message}
              </p>
            )}
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label
              htmlFor='confirmPassword'
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '500',
                color: '#E2E8F0',
                marginBottom: '0.5rem',
              }}
            >
              Xác nhận mật khẩu
            </label>
            <input
              {...register('confirmPassword')}
              id='confirmPassword'
              type='password'
              placeholder='••••••••'
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                background: '#161D2B',
                border: '1px solid #1E2636',
                borderRadius: '0.5rem',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
              onBlur={(e) => (e.target.style.borderColor = '#1E2636')}
            />
            {errors.confirmPassword && (
              <p
                style={{
                  color: '#FCA5A5',
                  fontSize: '0.875rem',
                  marginTop: '0.375rem',
                }}
              >
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <button
            type='submit'
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: isLoading ? '#1E3A5F' : '#38BDF8',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
              marginBottom: '1.5rem',
            }}
            onMouseEnter={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#0EA5E9'
            }}
            onMouseLeave={(e) => {
              if (!isLoading) e.currentTarget.style.background = '#38BDF8'
            }}
          >
            {isLoading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
          </button>
        </form>

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
