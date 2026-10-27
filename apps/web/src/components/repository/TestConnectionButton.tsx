import { Button, type ButtonProps } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react'
import { useState } from 'react'

interface TestConnectionButtonProps extends Omit<ButtonProps, 'onClick'> {
  onTest: () => Promise<void>
  testResult?: 'success' | 'error' | null
}

export function TestConnectionButton({ onTest, testResult, className, ...props }: TestConnectionButtonProps) {
  const [isTesting, setIsTesting] = useState(false)

  const handleTest = async () => {
    setIsTesting(true)
    try {
      await onTest()
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <Button type='button' onClick={handleTest} disabled={isTesting} className={cn('relative', className)} {...props}>
      <RefreshCw className={cn('h-4 w-4 mr-2', isTesting && 'animate-spin')} />
      {isTesting ? 'Testing...' : 'Test Connection'}

      {testResult && !isTesting && (
        <span className='ml-2'>
          {testResult === 'success' ? (
            <CheckCircle2 className='h-4 w-4 text-green-400' />
          ) : (
            <XCircle className='h-4 w-4 text-red-400' />
          )}
        </span>
      )}
    </Button>
  )
}
