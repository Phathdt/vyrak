import { LoadingSpinner } from './loading-spinner'

export function PageLoading() {
  return (
    <div className='min-h-screen flex items-center justify-center bg-background'>
      <LoadingSpinner size='lg' message='Loading...' />
    </div>
  )
}
