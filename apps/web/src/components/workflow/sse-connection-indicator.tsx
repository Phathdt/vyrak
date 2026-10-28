import type { SSEConnectionState } from '../../hooks/use-workflow-sse'

interface SSEConnectionIndicatorProps {
  connectionState: SSEConnectionState
  reconnecting: boolean
  className?: string
}

export function SSEConnectionIndicator({ connectionState, reconnecting, className = '' }: SSEConnectionIndicatorProps) {
  const config = {
    connected: {
      icon: '🔴',
      label: 'Live',
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
    },
    connecting: {
      icon: '⚪',
      label: reconnecting ? 'Reconnecting...' : 'Connecting...',
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
    },
    disconnected: {
      icon: '🔘',
      label: 'Disconnected',
      color: 'text-gray-400',
      bgColor: 'bg-gray-400/10',
    },
  }

  const { icon, label, color, bgColor } = config[connectionState]

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bgColor} ${className}`}
      title={`SSE connection: ${connectionState}`}
    >
      <span className='text-sm'>{icon}</span>
      <span className={`text-sm font-medium ${color}`}>{label}</span>
    </div>
  )
}
