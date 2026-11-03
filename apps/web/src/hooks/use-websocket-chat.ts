import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system' | 'event'
  content: string
  createdAt: string
}

interface UseWebSocketChatProps {
  orgId: string
  projectId: string
  workflowId: string
  sessionId: string
  enabled?: boolean
  initialMessages?: Message[] // Messages loaded from API on first load
}

export function useWebSocketChat({
  workflowId,
  sessionId,
  orgId,
  projectId,
  enabled = true,
  initialMessages = [],
}: UseWebSocketChatProps) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [streamingContent, setStreamingContent] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [toolActivity, setToolActivity] = useState('')
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())

  // Sync initialMessages when they change (e.g., after API loads them)
  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  useEffect(() => {
    if (!enabled) return

    // Get auth token from localStorage (must match TOKEN_KEY in auth-context.tsx)
    const token = localStorage.getItem('vyrak_access_token')
    if (!token) {
      console.error('No auth token found')
      return
    }

    // Create Socket.IO connection with auth token and orgId
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    const socket = io(`${apiBaseUrl}/chat`, {
      auth: {
        token,
        orgId, // Pass orgId for tenant context (fixed per connection)
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected')
      setIsConnected(true)

      // Auto-join workflow room
      socket.emit('chat:join', { workflowId })
    })

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      setIsConnected(false)
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      setIsConnected(false)
    })

    // Chat events
    socket.on('chat:user_message_saved', (data: { messageId: string; content: string }) => {
      console.log('[WebSocket] User message saved:', data)
      // Replace optimistic message with real message from database
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id.startsWith('temp-') && msg.role === 'user' && msg.content === data.content
            ? {
                ...msg,
                id: data.messageId, // Replace temp ID with real DB ID
              }
            : msg
        )
      )
    })

    socket.on('chat:message_sent', () => {
      setIsStreaming(true)
      setStreamingContent('')
      setToolActivity('')
    })

    socket.on('chat:thinking', (_data: { content: string }) => {
      setToolActivity('🤔 Thinking...')
    })

    socket.on('chat:delta', (data: { content: string }) => {
      setStreamingContent((prev) => prev + data.content)
    })

    socket.on('chat:tool', (data: { name: string; input: unknown }) => {
      setToolActivity(`🔧 Using ${data.name}...`)
    })

    socket.on('chat:complete', (data: { messageId: string; content: string }) => {
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId,
          role: 'assistant',
          content: data.content,
          createdAt: new Date().toISOString(),
        },
      ])
      setStreamingContent('')
      setIsStreaming(false)
      setToolActivity('')
    })

    socket.on('chat:error', (data: { message: string }) => {
      console.error('Chat error:', data.message)
      setIsStreaming(false)
      setToolActivity('')
      // TODO: Show error toast
    })

    // Presence events
    socket.on('user:joined', (data: { userId: string }) => {
      console.log('User joined:', data.userId)
    })

    socket.on('user:typing', (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const updated = new Set(prev)
        if (data.isTyping) {
          updated.add(data.userId)
        } else {
          updated.delete(data.userId)
        }
        return updated
      })
    })

    socketRef.current = socket

    // Cleanup function - remove all event listeners
    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('chat:user_message_saved')
      socket.off('chat:message_sent')
      socket.off('chat:thinking')
      socket.off('chat:delta')
      socket.off('chat:tool')
      socket.off('chat:complete')
      socket.off('chat:error')
      socket.off('user:joined')
      socket.off('user:typing')
      socket.disconnect()
      socketRef.current = null
    }
  }, [enabled, workflowId])

  const sendMessage = useCallback(
    (content: string, codeSnippets?: Array<{ language: string; code: string }>) => {
      if (!socketRef.current?.connected) {
        console.error('WebSocket not connected')
        return
      }

      if (!content.trim() || isStreaming) {
        return
      }

      // Optimistic UI update
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, optimisticMessage])

      // Send via WebSocket (orgId from auth handshake, projectId in message)
      socketRef.current.emit('chat:send', {
        workflowId,
        sessionId,
        projectId, // Project can switch, so pass in message
        message: content,
        codeSnippets,
        idempotencyKey: crypto.randomUUID(), // Generate idempotency key
      })
    },
    [workflowId, sessionId, projectId, isStreaming]
  )

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (!socketRef.current?.connected) return

      socketRef.current.emit(isTyping ? 'typing:start' : 'typing:stop', {
        workflowId,
      })
    },
    [workflowId]
  )

  return {
    isConnected,
    messages,
    streamingContent,
    isStreaming,
    toolActivity,
    typingUsers: Array.from(typingUsers),
    sendMessage,
    sendTyping,
  }
}
