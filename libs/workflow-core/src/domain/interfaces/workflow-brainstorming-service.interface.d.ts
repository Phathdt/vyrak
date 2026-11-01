import type { WorkflowType } from '../entities'
import type { MessageRole } from '@vyrak/conversation'
export interface BrainstormInput {
  workflowId: string
  userMessage: string
}
export interface BrainstormResult {
  sessionId: string
  aiMessage: string
  canClassify: boolean
  messageCount: number
}
export interface BrainstormMessageView {
  id: string
  role: MessageRole
  content: string
  createdAt: string
}
export interface BrainstormSessionView {
  sessionId: string | null
  messages: BrainstormMessageView[]
  canClassify: boolean
  messageCount: number
}
export declare const ClassificationPriority: {
  readonly LOW: 'LOW'
  readonly MEDIUM: 'MEDIUM'
  readonly HIGH: 'HIGH'
  readonly CRITICAL: 'CRITICAL'
}
export type ClassificationPriority = (typeof ClassificationPriority)[keyof typeof ClassificationPriority]
export interface ClassifyBrainstormResult {
  type: WorkflowType
  confidence: number
  reasoning: string
  estimatedHours?: number
  priority?: ClassificationPriority
}
export interface IWorkflowBrainstormingService {
  getBrainstormSession(workflowId: string): Promise<BrainstormSessionView>
  brainstorm(input: BrainstormInput): Promise<BrainstormResult>
  brainstormStream(input: BrainstormInput): AsyncGenerator<string>
  classify(workflowId: string, sessionId: string): Promise<ClassifyBrainstormResult>
}
//# sourceMappingURL=workflow-brainstorming-service.interface.d.ts.map
