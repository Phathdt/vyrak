import { useState, useCallback, useRef } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatStreamEvent {
  type: 'user_message' | 'assistant_delta' | 'assistant_complete' | 'error'
  content?: string
  messageId?: string
  error?: string
}

interface UsePlanningChatStreamOptions {
  orgId: string
  projectId: string
  workflowId: string
  onError?: (error: string) => void
}

export function usePlanningChatStream({ orgId, projectId, workflowId, onError }: UsePlanningChatStreamOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [streamingContent, setStreamingContent] = useState<string>('')
  const [isStreaming, setIsStreaming] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const sendMessage = useCallback(
    async (userMessage: string, codeSnippets?: Array<{ path?: string; content: string; label?: string }>) => {
      if (isStreaming) return

      setIsStreaming(true)
      setStreamingContent('')

      // Optimistic update - show user message immediately
      const optimisticId = `temp-${Date.now()}`
      const optimisticMessage: Message = {
        id: optimisticId,
        role: 'user',
        content: userMessage,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, optimisticMessage])

      try {
        // Create abort controller for cancellation
        abortControllerRef.current = new AbortController()

        const url = `/api/organizations/${orgId}/projects/${projectId}/workflows/${workflowId}/planning/chat-stream`

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            userMessage,
            codeSnippets,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        if (!response.body) {
          throw new Error('Response body is null')
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')

          // Keep last incomplete line in buffer
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: ChatStreamEvent = JSON.parse(line.slice(6))

                switch (data.type) {
                  case 'user_message':
                    // Replace optimistic message with confirmed message
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === optimisticId
                          ? {
                              ...m,
                              id: data.messageId!,
                            }
                          : m
                      )
                    )
                    break

                  case 'assistant_delta':
                    // Append streaming content
                    setStreamingContent((prev) => prev + (data.content || ''))
                    break

                  case 'assistant_complete':
                    // Add complete assistant message
                    setMessages((prev) => [
                      ...prev,
                      {
                        id: data.messageId!,
                        role: 'assistant',
                        content: data.content!,
                        createdAt: new Date().toISOString(),
                      },
                    ])
                    setStreamingContent('')
                    setIsStreaming(false)
                    break

                  case 'error':
                    onError?.(data.error || 'Unknown error occurred')
                    setIsStreaming(false)
                    break
                }
              } catch (parseError) {
                console.error('Failed to parse SSE event:', line, parseError)
              }
            }
          }
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            console.log('Stream cancelled by user')
          } else {
            onError?.(error.message || 'Failed to send message')
          }
        }
        // Remove optimistic message on error
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId))
        setIsStreaming(false)
        setStreamingContent('')
      } finally {
        abortControllerRef.current = null
      }
    },
    [isStreaming, orgId, projectId, workflowId, onError]
  )

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsStreaming(false)
      setStreamingContent('')
    }
  }, [])

  const setInitialMessages = useCallback((initialMessages: Message[]) => {
    setMessages(initialMessages)
  }, [])

  return {
    messages,
    streamingContent,
    isStreaming,
    sendMessage,
    cancelStream,
    setInitialMessages,
  }
}
