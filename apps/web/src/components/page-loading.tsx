import { LoadingSpinner } from './loading-spinner'

export function PageLoading() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#05070C',
      }}
    >
      <LoadingSpinner size='large' message='Loading...' />
    </div>
  )
}
