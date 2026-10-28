import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuthControllerLogin } from '../../api/generated/auth/auth'
import { Button } from '../../components/ui/button'
import { ErrorMessage, FormField, Label } from '../../components/ui/form-field'
import { Input } from '../../components/ui/input'
import { useToast } from '../../components/ui/toast'
import { useAuth } from '../../contexts/auth-context'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const { setAuth, user } = useAuth()
  const { showToast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useAuthControllerLogin()

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const onSubmit = async (data: LoginForm) => {
    try {
      const result = await loginMutation.mutateAsync({ data })

      // Update auth context (will handle localStorage automatically)
      setAuth(result.accessToken, result.user)

      showToast({
        title: 'Welcome back!',
        type: 'success',
      })

      // Redirect to dashboard
      navigate('/dashboard')
    } catch (_err) {
      showToast({
        title: 'Invalid email or password',
        type: 'error',
      })
    }
  }

  return (
    <div className='min-h-screen flex'>
      {/* Left side - Branding (hidden on mobile) */}
      <div className='hidden lg:flex lg:w-2/5 bg-surface-1 p-12 flex-col justify-between border-r border-border'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight mb-2'>Vyrak</h1>
          <p className='text-muted-foreground'>A modern full-stack boilerplate</p>
        </div>

        <div className='space-y-6'>
          <div className='flex items-start gap-3'>
            <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center'>
              <svg className='w-5 h-5 text-accent-cyan' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M13 10V3L4 14h7v7l9-11h-7z' />
              </svg>
            </div>
            <div>
              <h3 className='font-medium mb-1'>Fast Development</h3>
              <p className='text-sm text-muted-foreground'>TypeScript monorepo with hot reload</p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center'>
              <svg className='w-5 h-5 text-accent-cyan' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                />
              </svg>
            </div>
            <div>
              <h3 className='font-medium mb-1'>Type-Safe</h3>
              <p className='text-sm text-muted-foreground'>End-to-end type safety with OpenAPI</p>
            </div>
          </div>

          <div className='flex items-start gap-3'>
            <div className='flex-shrink-0 w-8 h-8 rounded-lg bg-accent-cyan/10 flex items-center justify-center'>
              <svg className='w-5 h-5 text-accent-cyan' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                />
              </svg>
            </div>
            <div>
              <h3 className='font-medium mb-1'>Multi-tenant</h3>
              <p className='text-sm text-muted-foreground'>Organization-based access control</p>
            </div>
          </div>
        </div>

        <p className='text-xs text-muted-foreground'>© 2026 Vyrak. Built with modern best practices.</p>
      </div>

      {/* Right side - Login Form */}
      <div className='flex-1 flex items-center justify-center p-6 md:p-12'>
        <div className='w-full max-w-md'>
          <div className='mb-8 lg:hidden'>
            <h1 className='text-2xl font-bold tracking-tight mb-1'>Vyrak</h1>
            <p className='text-sm text-muted-foreground'>A modern full-stack boilerplate</p>
          </div>

          <div className='bg-card border border-border rounded-lg p-6 md:p-8 shadow-lg'>
            <h2 className='text-2xl font-bold tracking-tight mb-2'>Welcome back</h2>
            <p className='text-muted-foreground mb-6'>Sign in to your account to continue</p>

            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <FormField>
                <Label htmlFor='email' required>
                  Email
                </Label>
                <Input
                  id='email'
                  type='email'
                  placeholder='you@example.com'
                  error={!!errors.email}
                  data-testid='login-email-input'
                  {...register('email')}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  autoComplete='email'
                />
                <ErrorMessage id='email-error'>{errors.email?.message}</ErrorMessage>
              </FormField>

              <FormField>
                <Label htmlFor='password' required>
                  Password
                </Label>
                <Input
                  id='password'
                  type='password'
                  placeholder='••••••••'
                  error={!!errors.password}
                  data-testid='login-password-input'
                  {...register('password')}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  autoComplete='current-password'
                />
                <ErrorMessage id='password-error'>{errors.password?.message}</ErrorMessage>
              </FormField>

              <Button
                type='submit'
                className='w-full'
                loading={loginMutation.isPending}
                data-testid='login-submit-button'
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>

            <div className='mt-6 pt-6 border-t border-border'>
              <div className='bg-accent-cyan/5 border border-accent-cyan/20 rounded-md p-3'>
                <p className='text-xs font-medium text-accent-cyan mb-2 flex items-center gap-1.5'>
                  <svg className='w-3.5 h-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                  Test Credentials
                </p>
                <div className='space-y-1 text-xs text-muted-foreground font-mono'>
                  <div className='flex items-center gap-2'>
                    <span className='text-muted-foreground/70'>Email:</span>
                    <span>admin@vyrak.dev</span>
                  </div>
                  <div className='flex items-center gap-2'>
                    <span className='text-muted-foreground/70'>Password:</span>
                    <span>Password123!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
