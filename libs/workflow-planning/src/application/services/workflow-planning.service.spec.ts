import { InvalidPlanningStateError } from '@vyrak/workflow-core'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { WorkflowPlanningService } from './workflow-planning.service'

import type { IAIAgentService } from '@vyrak/ai-agent'
import type { IArtifactService } from '@vyrak/artifact'
import type { IConversationService } from '@vyrak/conversation'
import type { IConfigService } from '@vyrak/custom-config'
import type { IGitRepositoryService } from '@vyrak/project'
import type { IWorkflowRepository, IWorkflowRepositoryRepository } from '@vyrak/workflow-core'
import type { RepositoryContextService } from '@vyrak/workflow-core'

describe('WorkflowPlanningService - generatePRDArtifact', () => {
  let service: WorkflowPlanningService
  let mockConversationService: IConversationService
  let mockArtifactService: IArtifactService

  beforeEach(() => {
    mockConversationService = {
      getMessages: vi.fn(),
    } as any

    mockArtifactService = {
      parseArtifactTags: vi.fn(),
      uploadArtifact: vi.fn(),
    } as any

    const mockConfigService = {
      anthropic: { model: 'claude-3-5-sonnet-20241022' },
    } as IConfigService

    service = new WorkflowPlanningService(
      mockConversationService,
      {} as IAIAgentService,
      {} as IWorkflowRepository,
      {} as IWorkflowRepositoryRepository,
      {} as IGitRepositoryService,
      {} as RepositoryContextService,
      mockConfigService,
      mockArtifactService
    )
  })

  it('should generate PRD artifact from conversation', async () => {
    const workflowId = 'workflow-123'
    const sessionId = 'session-456'
    const phaseId = 'phase-789'

    // Mock conversation messages
    vi.mocked(mockConversationService.getMessages).mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Can you create a PRD for user authentication?',
        createdAt: new Date(),
      } as any,
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Here is the PRD:

<artifact type="prd" key="authentication-prd" title="User Authentication PRD">
# User Authentication PRD

## Overview
This feature will add user authentication to the system.

## Requirements
- User login
- Password reset
- Session management
</artifact>`,
        createdAt: new Date(),
      } as any,
    ])

    // Mock artifact parsing
    vi.mocked(mockArtifactService.parseArtifactTags).mockReturnValue([
      {
        type: 'prd',
        key: 'authentication-prd',
        title: 'User Authentication PRD',
        format: 'markdown',
        content:
          '# User Authentication PRD\n\n## Overview\nThis feature will add user authentication to the system.\n\n## Requirements\n- User login\n- Password reset\n- Session management',
      },
    ])

    // Mock artifact upload
    vi.mocked(mockArtifactService.uploadArtifact).mockResolvedValue({
      id: 'artifact-123',
      workflowId,
      phaseId,
      key: 'authentication-prd',
      type: 'prd',
      title: 'User Authentication PRD',
      fileName: 'authentication-prd.md',
      approvalStatus: 'DRAFT',
      version: 1,
    } as any)

    const result = await service.generatePRDArtifact(workflowId, sessionId, phaseId)

    expect(result.id).toBe('artifact-123')
    expect(result.type).toBe('prd')
    expect(result.approvalStatus).toBe('DRAFT')
    expect(mockArtifactService.uploadArtifact).toHaveBeenCalledWith(
      workflowId,
      'prd',
      'authentication-prd',
      'User Authentication PRD',
      expect.stringContaining('# User Authentication PRD'),
      expect.objectContaining({
        phaseId,
        fileName: 'authentication-prd.md',
        mimeType: 'text/markdown',
      })
    )
  })

  it('should throw error when no PRD artifact found in conversation', async () => {
    const workflowId = 'workflow-123'
    const sessionId = 'session-456'
    const phaseId = 'phase-789'

    // Mock conversation messages without PRD artifact
    vi.mocked(mockConversationService.getMessages).mockResolvedValue([
      {
        id: 'msg-1',
        role: 'user',
        content: 'Can you create a PRD?',
        createdAt: new Date(),
      } as any,
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Sure, I can help with that.',
        createdAt: new Date(),
      } as any,
    ])

    // Mock artifact parsing returning empty array
    vi.mocked(mockArtifactService.parseArtifactTags).mockReturnValue([])

    await expect(service.generatePRDArtifact(workflowId, sessionId, phaseId)).rejects.toThrow(InvalidPlanningStateError)
    await expect(service.generatePRDArtifact(workflowId, sessionId, phaseId)).rejects.toThrow(
      'No PRD artifact found in conversation'
    )
  })
})
