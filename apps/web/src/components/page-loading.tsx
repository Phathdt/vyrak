export function PageLoading() {
  return (
    <div className='flex min-h-screen items-center justify-center'>
      <div className='text-center'>
        <div className='mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent'></div>
        <p className='text-lg text-muted-foreground'>Loading application...</p>
      </div>
    </div>
  )
}
