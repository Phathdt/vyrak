import { Body, Controller, Param, Post, Query, Sse } from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { WorkflowBrainstormingService } from '@vyrak/workflow'
import { Observable } from 'rxjs'

import {
  BrainstormRequestDto,
  BrainstormResponseDto,
  ClassifyRequestDto,
  ClassifyResponseDto,
} from './dto/brainstorming.dto'

@ApiTags('Workflows - Brainstorming')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
export class WorkflowBrainstormingController {
  constructor(private readonly brainstormingService: WorkflowBrainstormingService) {}

  @Post('brainstorm')
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiOperation({
    summary: 'Brainstorm workflow with AI assistant',
    description: `Start or continue a brainstorming conversation with the AI assistant to understand workflow requirements.

The AI will ask clarifying questions to understand:
- What needs to be built or fixed
- Scope and complexity
- Technical requirements
- Timeline urgency

After 4-5 exchanges (8+ messages), the conversation will have enough context for classification.`,
  })
  @ApiResponse({
    status: 200,
    description: 'AI response received',
    type: BrainstormResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Workflow not found',
  })
  async brainstorm(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string,
    @Body() request: BrainstormRequestDto
  ): Promise<BrainstormResponseDto> {
    return this.brainstormingService.brainstorm({
      workflowId,
      userMessage: request.userMessage,
    })
  }

  @Sse('brainstorm-stream')
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiOperation({
    summary: 'Brainstorm workflow with AI assistant (streaming)',
    description: `Server-Sent Events endpoint for streaming AI responses in real-time.

Each chunk of the AI response will be sent as it's generated, providing a better user experience.`,
  })
  @ApiResponse({
    status: 200,
    description: 'Stream of AI response chunks',
  })
  async brainstormStream(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string,
    @Query('userMessage') userMessage: string
  ): Promise<Observable<MessageEvent>> {
    return new Observable((subscriber) => {
      ;(async () => {
        try {
          for await (const chunk of this.brainstormingService.brainstormStream({
            workflowId,
            userMessage,
          })) {
            subscriber.next({
              data: chunk,
            } as MessageEvent)
          }
          subscriber.complete()
        } catch (error) {
          subscriber.error(error)
        }
      })()
    })
  }

  @Post('classify')
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'id', description: 'Workflow ID' })
  @ApiOperation({
    summary: 'Classify workflow based on brainstorming conversation',
    description: `Analyze the brainstorming conversation and classify the workflow as HOTFIX, STORY, or EPIC.

Requires at least 8 messages in the conversation (4-5 exchanges) to have enough context.

**Classification Criteria:**
- **HOTFIX**: <2h, single component, urgent production fixes
- **STORY**: 1-3 days, 2-5 files, planned features
- **EPIC**: 1+ weeks, multi-system, requires architecture design`,
  })
  @ApiResponse({
    status: 200,
    description: 'Workflow classified successfully',
    type: ClassifyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Not enough messages for classification',
  })
  @ApiResponse({
    status: 404,
    description: 'Session not found',
  })
  async classify(
    @Param('orgId') _orgId: string,
    @Param('projectId') _projectId: string,
    @Param('id') workflowId: string,
    @Body() body: ClassifyRequestDto
  ): Promise<ClassifyResponseDto> {
    return this.brainstormingService.classify(workflowId, body.sessionId)
  }
}
