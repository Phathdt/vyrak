import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

// Mock data
const MOCK_WORKFLOW = {
  id: 'wf-123',
  title: 'Implement payment gateway',
  description: 'Integrate Stripe payment with multiple currencies and webhook handling',
  status: 'BRAINSTORMING' as const,
  type: null as string | null,
  repositories: [{ id: 'repo-1', repositoryId: 'repo-uuid-1' }],
  createdAt: new Date().toISOString(),
  currentPhaseKey: null,
}

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

type Classification = {
  type: 'HOTFIX' | 'STORY' | 'EPIC'
  confidence: number
  reasoning: string
  scope: string
  assumptions: string[]
  risks: string[]
}

export function WorkflowDetailPage() {
  const navigate = useNavigate()
  const { projectId } = useParams<{ projectId: string; workflowId: string }>()

  const [workflow] = useState(MOCK_WORKFLOW)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        "Hi! I'm here to help you plan this workflow. Let me understand your requirements better. Can you tell me more about what you're trying to achieve with this payment gateway integration?",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [classification, setClassification] = useState<Classification | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [selectedType, setSelectedType] = useState<'HOTFIX' | 'STORY' | 'EPIC' | null>(null)

  // Mock AI responses based on conversation
  const mockAIResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase()

    if (messages.length === 1) {
      return "Got it! What payment methods do you need to support? And are there any specific currencies or regions you're targeting?"
    }

    if (lowerMessage.includes('stripe') || lowerMessage.includes('payment')) {
      return "I see you're working with Stripe. Will this include: 1) Payment processing, 2) Webhook handling, 3) Subscription management, 4) Refunds? Please let me know which features are in scope."
    }

    if (lowerMessage.includes('webhook') || lowerMessage.includes('subscription')) {
      return "Thanks! Based on what you've described, this sounds like a substantial feature. Do you need to integrate this across multiple services or just one main application?"
    }

    if (messages.length >= 5) {
      // Trigger classification
      setTimeout(() => {
        setClassification({
          type: 'EPIC',
          confidence: 0.85,
          reasoning:
            'This payment integration involves multiple components (payment processing, webhooks, subscription management) across different services. It requires careful planning and can be broken down into smaller, manageable stories.',
          scope:
            'Full payment gateway integration with Stripe including payment processing, webhook handling, subscription management, and multi-currency support.',
          assumptions: [
            'Stripe API keys and webhook endpoints are available',
            'Database schema can be modified to store payment records',
            'Frontend components exist for payment forms',
          ],
          risks: [
            'Payment processing failures could impact revenue',
            'Webhook delivery reliability depends on external service',
            'PCI compliance requirements may add complexity',
          ],
        })
        setShowConfirmDialog(true)
      }, 1500)
      return 'Perfect! I have enough information now. Let me analyze this and provide a recommendation...'
    }

    return 'Could you provide more details about the technical requirements and any constraints you have?'
  }

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputMessage('')
    setIsTyping(true)

    // Simulate AI typing
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: mockAIResponse(inputMessage),
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsTyping(false)
    }, 1500)
  }

  const handleConfirmClassification = () => {
    const finalType = selectedType || classification?.type
    console.log('Confirming classification:', finalType)
    // TODO: Call API to confirm classification
    setShowConfirmDialog(false)
    navigate(`/projects/${projectId}/workflows`)
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'secondary'
      case 'BRAINSTORMING':
        return 'default'
      default:
        return 'outline'
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HOTFIX':
        return { variant: 'destructive' as const, icon: '🔥' }
      case 'STORY':
        return { variant: 'default' as const, icon: '📝' }
      case 'EPIC':
        return { variant: 'default' as const, icon: '🚀' }
      default:
        return { variant: 'outline' as const, icon: '' }
    }
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='sm' onClick={() => navigate(`/projects/${projectId}/workflows`)}>
            <svg className='mr-2 h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
            Back
          </Button>
          <div>
            <div className='flex items-center gap-2'>
              <h1 className='text-3xl font-bold tracking-tight'>{workflow.title}</h1>
              <Badge variant={getStatusBadgeVariant(workflow.status)}>{workflow.status}</Badge>
              {workflow.type && (
                <Badge variant={getTypeBadge(workflow.type).variant}>
                  {getTypeBadge(workflow.type).icon} {workflow.type}
                </Badge>
              )}
            </div>
            {workflow.description && <p className='mt-1 text-muted-foreground'>{workflow.description}</p>}
          </div>
        </div>
      </div>

      {/* Brainstorming Conversation */}
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='lg:col-span-2'>
          <Card className='flex h-[600px] flex-col'>
            <CardHeader>
              <CardTitle>Brainstorming</CardTitle>
              <CardDescription>Discuss with AI to refine requirements and classify the workflow</CardDescription>
            </CardHeader>
            <CardContent className='flex flex-1 flex-col gap-4'>
              {/* Messages */}
              <div className='flex-1 space-y-4 overflow-y-auto rounded-lg border bg-muted/50 p-4'>
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border shadow-sm'
                      }`}
                    >
                      <p className='text-sm'>{message.content}</p>
                      <p className='mt-1 text-xs opacity-70'>
                        {message.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className='flex justify-start'>
                    <div className='max-w-[80%] rounded-lg border bg-background px-4 py-2 shadow-sm'>
                      <div className='flex items-center gap-1'>
                        <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]'></div>
                        <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]'></div>
                        <div className='h-2 w-2 animate-bounce rounded-full bg-muted-foreground'></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className='flex gap-2'>
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder='Type your message... (Press Enter to send, Shift+Enter for new line)'
                  rows={3}
                  disabled={isTyping}
                />
                <Button onClick={handleSendMessage} disabled={isTyping || !inputMessage.trim()} className='self-end'>
                  Send
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Workflow Info */}
        <div className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Workflow Details</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4 text-sm'>
              <div>
                <p className='mb-1 text-muted-foreground'>Status</p>
                <Badge variant={getStatusBadgeVariant(workflow.status)}>{workflow.status}</Badge>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Type</p>
                <p className='font-medium'>{workflow.type || 'Not classified yet'}</p>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Repositories</p>
                <p className='font-medium'>{workflow.repositories.length} linked</p>
              </div>
              <div>
                <p className='mb-1 text-muted-foreground'>Created</p>
                <p className='font-medium'>{new Date(workflow.createdAt).toLocaleDateString()}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className='text-base'>Next Steps</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2 text-sm'>
              <div className='flex items-start gap-2'>
                <div className='mt-0.5 h-5 w-5 rounded-full bg-primary/10 p-1 text-primary'>✓</div>
                <div>
                  <p className='font-medium'>Create workflow</p>
                  <p className='text-xs text-muted-foreground'>Completed</p>
                </div>
              </div>
              <div className='flex items-start gap-2'>
                <div className='mt-0.5 h-5 w-5 rounded-full bg-primary p-1 text-primary-foreground'>2</div>
                <div>
                  <p className='font-medium'>Brainstorming</p>
                  <p className='text-xs text-muted-foreground'>In progress</p>
                </div>
              </div>
              <div className='flex items-start gap-2'>
                <div className='mt-0.5 h-5 w-5 rounded-full bg-muted p-1 text-muted-foreground'>3</div>
                <div>
                  <p className='font-medium'>AI Classification</p>
                  <p className='text-xs text-muted-foreground'>Pending</p>
                </div>
              </div>
              <div className='flex items-start gap-2'>
                <div className='mt-0.5 h-5 w-5 rounded-full bg-muted p-1 text-muted-foreground'>4</div>
                <div>
                  <p className='font-medium'>Human Confirmation</p>
                  <p className='text-xs text-muted-foreground'>Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Classification Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>AI Classification Result</DialogTitle>
            <DialogDescription>Review the AI's recommendation and confirm the workflow type</DialogDescription>
          </DialogHeader>

          {classification && (
            <div className='space-y-4 py-4'>
              {/* Recommended Type */}
              <div className='rounded-lg border-2 border-primary bg-primary/5 p-4'>
                <div className='mb-2 flex items-center justify-between'>
                  <h3 className='font-semibold'>Recommended Type</h3>
                  <Badge variant={getTypeBadge(classification.type).variant} className='text-base'>
                    {getTypeBadge(classification.type).icon} {classification.type}
                  </Badge>
                </div>
                <div className='space-y-2 text-sm'>
                  <div>
                    <span className='text-muted-foreground'>Confidence: </span>
                    <span className='font-medium'>{(classification.confidence * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <p className='mb-1 font-medium text-muted-foreground'>Reasoning:</p>
                    <p>{classification.reasoning}</p>
                  </div>
                </div>
              </div>

              {/* Alternative Options */}
              <div>
                <p className='mb-2 text-sm font-medium'>Or choose a different type:</p>
                <div className='grid grid-cols-3 gap-2'>
                  {(['HOTFIX', 'STORY', 'EPIC'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={selectedType === type ? 'default' : 'outline'}
                      onClick={() => setSelectedType(type)}
                      className='justify-start'
                    >
                      {getTypeBadge(type).icon} {type}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className='space-y-3 text-sm'>
                <div>
                  <p className='mb-1 font-medium'>Scope:</p>
                  <p className='text-muted-foreground'>{classification.scope}</p>
                </div>
                <div>
                  <p className='mb-1 font-medium'>Assumptions:</p>
                  <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                    {classification.assumptions.map((assumption, i) => (
                      <li key={i}>{assumption}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className='mb-1 font-medium'>Risks:</p>
                  <ul className='list-inside list-disc space-y-1 text-muted-foreground'>
                    {classification.risks.map((risk, i) => (
                      <li key={i}>{risk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setShowConfirmDialog(false)}>
              Continue Discussion
            </Button>
            <Button onClick={handleConfirmClassification}>Confirm as {selectedType || classification?.type}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
