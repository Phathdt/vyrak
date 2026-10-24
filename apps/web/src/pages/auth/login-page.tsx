import { zodResolver } from '@hookform/resolvers/zod'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuthControllerLogin } from '../../api/generated/auth/auth'
import { useAuth } from '../../contexts/auth-context'

const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useAuthControllerLogin()

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null)
      const result = await loginMutation.mutateAsync({ data })

      // Update auth context (will handle localStorage automatically)
      setAuth(result.accessToken, result.user)

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (_err) {
      setError('Invalid email or password')
    }
  }

  return (
    <div className='login-container' style={{ maxWidth: '400px', margin: '100px auto', padding: '20px' }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label htmlFor='email'>Email</label>
          <input
            id='email'
            type='email'
            {...register('email')}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
          {errors.email && <span style={{ color: 'red', fontSize: '14px' }}>{errors.email.message}</span>}
        </div>

        <div>
          <label htmlFor='password'>Password</label>
          <input
            id='password'
            type='password'
            {...register('password')}
            style={{ width: '100%', padding: '8px', marginTop: '4px' }}
          />
          {errors.password && <span style={{ color: 'red', fontSize: '14px' }}>{errors.password.message}</span>}
        </div>

        {error && (
          <div style={{ color: 'red', padding: '8px', backgroundColor: '#fee', borderRadius: '4px' }}>{error}</div>
        )}

        <button
          type='submit'
          disabled={loginMutation.isPending}
          style={{
            padding: '10px',
            backgroundColor: loginMutation.isPending ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loginMutation.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </button>
      </form>

      <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#f0f0f0', borderRadius: '4px' }}>
        <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Test Credentials:</p>
        <p style={{ margin: '4px 0', fontSize: '14px' }}>Email: admin@vyrak.dev</p>
        <p style={{ margin: '4px 0', fontSize: '14px' }}>Password: Password123!</p>
      </div>
    </div>
  )
}
