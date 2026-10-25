import { Link } from 'react-router-dom'

export function SignupPage() {
  return (
    <div className='min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-surface-base via-surface-2 to-surface-3'>
      <div className='w-full max-w-md'>
        <div className='bg-card border border-border rounded-lg p-6 md:p-8 shadow-lg'>
          <h1 className='text-2xl font-bold tracking-tight mb-2'>Create your account</h1>
          <p className='text-muted-foreground mb-6'>Signup is temporarily disabled</p>

          <div className='bg-accent-cyan/5 border border-accent-cyan/20 rounded-md p-4 mb-6'>
            <p className='text-sm font-medium text-accent-cyan mb-3 flex items-center gap-1.5'>
              <svg className='w-4 h-4 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                />
              </svg>
              Test Credentials
            </p>
            <div className='space-y-1 text-sm text-muted-foreground font-mono'>
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

          <p className='text-center text-sm text-muted-foreground'>
            Already have an account?{' '}
            <Link to='/login' className='text-accent-cyan hover:underline font-medium transition-colors'>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
