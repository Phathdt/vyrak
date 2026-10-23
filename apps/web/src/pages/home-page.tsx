import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center p-8'>
      <div className='max-w-2xl text-center'>
        <h1 className='mb-4 text-4xl font-bold tracking-tight'>Welcome to Vyrak</h1>
        <p className='mb-8 text-lg text-muted-foreground'>A modern monorepo with API, Worker, and Web applications</p>
        <div className='flex gap-4 justify-center'>
          <Button asChild>
            <Link to='/about'>Get Started</Link>
          </Button>
          <Button variant='outline' asChild>
            <a href='https://github.com' target='_blank' rel='noopener noreferrer'>
              View on GitHub
            </a>
          </Button>
        </div>
      </div>
    </div>
  )
}
