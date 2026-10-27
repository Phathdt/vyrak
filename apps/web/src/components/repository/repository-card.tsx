import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useRepositories } from '@/hooks/use-repositories'
import { cn } from '@/lib/utils'
import { formatRepoUrl, getProviderInfo, type GitProvider } from '@/lib/utils/git-provider'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircle2, Copy, Edit, ExternalLink, GitBranch, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { useState } from 'react'

interface Repository {
  id: string
  name: string
  url: string
  branch: string
  provider: GitProvider
  status: 'active' | 'inactive'
  updatedAt: string
  activeWorkflowsCount?: number
}

interface RepositoryCardProps {
  repository: Repository
  organizationId: string
  projectId: string
  onEdit: () => void
  onRemove: () => void
}

export function RepositoryCard({ repository, organizationId, projectId, onEdit, onRemove }: RepositoryCardProps) {
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null)
  const { testExisting } = useRepositories(organizationId, projectId)

  const providerInfo = getProviderInfo(repository.provider)
  const isActive = repository.status === 'active'

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(repository.url)
      // Toast will be shown when toast hook is available
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConnection(true)
    setTestResult(null)

    try {
      await testExisting.mutateAsync({
        orgId: organizationId,
        projectId,
        repoId: repository.id,
      })
      setTestResult('success')
    } catch (error) {
      setTestResult('error')
      console.error('Connection test failed:', error)
    } finally {
      setIsTestingConnection(false)
      setTimeout(() => setTestResult(null), 3000)
    }
  }

  const getProviderIcon = () => {
    // Use GitBranch icon for all providers with color differentiation
    const iconClass = 'h-5 w-5'

    switch (repository.provider) {
      case 'github':
        return <GitBranch className={`${iconClass} text-primary`} />
      case 'gitlab':
        return <GitBranch className={`${iconClass} text-orange-400`} />
      case 'bitbucket':
        return <GitBranch className={`${iconClass} text-blue-400`} />
    }
  }

  return (
    <Card className={cn('group relative overflow-hidden transition-all hover:shadow-lg', !isActive && 'opacity-60')}>
      <CardContent className='p-6 space-y-4'>
        {/* Header with Provider Icon and Actions */}
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-start gap-3 min-w-0 flex-1'>
            {/* Provider Icon */}
            <div className='flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10'>
              {getProviderIcon()}
            </div>

            {/* Repository Name */}
            <div className='min-w-0 flex-1'>
              <h3 className='font-semibold text-lg truncate'>{repository.name}</h3>
              <p className='text-xs text-muted-foreground'>{providerInfo.name}</p>
            </div>
          </div>

          {/* Edit Button */}
          <Button
            variant='ghost'
            size='sm'
            onClick={onEdit}
            className='flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'
          >
            <Edit className='h-4 w-4' />
          </Button>
        </div>

        {/* Repository URL */}
        <div className='flex items-center gap-2 rounded-md bg-muted/30 px-3 py-2'>
          <code className='text-xs text-muted-foreground truncate flex-1' title={repository.url}>
            {formatRepoUrl(repository.url, 40)}
          </code>
          <button
            onClick={handleCopyUrl}
            className='flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors'
            aria-label='Copy URL'
          >
            <Copy className='h-3.5 w-3.5' />
          </button>
          <a
            href={repository.url.replace('.git', '')}
            target='_blank'
            rel='noopener noreferrer'
            className='flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors'
            aria-label='Open in browser'
          >
            <ExternalLink className='h-3.5 w-3.5' />
          </a>
        </div>

        {/* Branch and Status */}
        <div className='flex items-center gap-2 flex-wrap'>
          <Badge variant='secondary' className='text-xs'>
            {repository.branch}
          </Badge>
          <Badge
            variant={isActive ? 'success' : 'secondary'}
            className={cn(
              'text-xs',
              isActive
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            )}
          >
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
          <span className='text-xs text-muted-foreground ml-auto'>
            Updated {formatDistanceToNow(new Date(repository.updatedAt), { addSuffix: true })}
          </span>
        </div>

        {/* Test Connection Result */}
        {testResult && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-xs font-medium',
              testResult === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            )}
          >
            {testResult === 'success' ? (
              <>
                <CheckCircle2 className='h-4 w-4' />
                Repository accessible
              </>
            ) : (
              <>
                <XCircle className='h-4 w-4' />
                Connection failed
              </>
            )}
          </div>
        )}

        {/* Actions */}
        <div className='flex items-center gap-2 pt-2 border-t border-border'>
          <Button
            variant='outline'
            size='sm'
            onClick={handleTestConnection}
            disabled={isTestingConnection || !isActive}
            className='flex-1'
          >
            <RefreshCw className={cn('h-3.5 w-3.5 mr-2', isTestingConnection && 'animate-spin')} />
            {isTestingConnection ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button variant='ghost' size='sm' onClick={onRemove} className='text-destructive hover:text-destructive'>
            <Trash2 className='h-3.5 w-3.5' />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
