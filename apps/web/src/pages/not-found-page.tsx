import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

export default function NotFoundPage() {
  return (
    <div className='flex min-h-screen flex-col items-center justify-center p-8'>
      <div className='max-w-md text-center'>
        <h1 className='mb-4 text-6xl font-bold'>404</h1>
        <p className='mb-8 text-lg text-muted-foreground'>Page not found</p>
        <Button asChild>
          <Link to='/'>Go Home</Link>
        </Button>
      </div>
    </div>
  )
}
