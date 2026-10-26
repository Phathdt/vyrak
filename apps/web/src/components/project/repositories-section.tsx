import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface RepositoriesSectionProps {
  repositories?: Array<{
    id: string
    name: string
    url: string
  }>
}

export function RepositoriesSection({ repositories = [] }: RepositoriesSectionProps) {
  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-semibold'>Git Repositories</h2>
        <Button variant='outline' disabled title='Coming in Epic 12'>
          <svg className='w-4 h-4 mr-2' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
          </svg>
          Add Repository
        </Button>
      </div>

      {repositories.length === 0 ? (
        <Card className='border-dashed'>
          <CardContent className='flex flex-col items-center justify-center py-12 text-center'>
            <svg className='w-16 h-16 text-muted-foreground mb-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
              />
            </svg>
            <p className='text-muted-foreground mb-1'>
              No repositories yet. Add your first repository to enable workflow execution.
            </p>
            <p className='text-sm text-muted-foreground/70'>(Repository management will be available in Epic 12)</p>
          </CardContent>
        </Card>
      ) : (
        <div className='space-y-3'>
          {repositories.map((repo) => (
            <Card key={repo.id}>
              <CardContent className='p-4'>
                <h4 className='font-medium mb-1'>{repo.name}</h4>
                <p className='text-sm text-muted-foreground'>{repo.url}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
