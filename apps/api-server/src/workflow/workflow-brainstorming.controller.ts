import { Body, Controller, Param, Post, Sse } from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { WorkflowBrainstormingService } from '@vyrak/workflow'
import { Observable } from 'rxjs'

class BrainstormRequestDto {
  userMessage!: string
}

class BrainstormResponseDto {
  sessionId!: string
  aiMessage!: string
  canClassify!: boolean
  messageCount!: number
}

@ApiTags('Workflows - Brainstorming')
@Controller('api/organizations/:orgId/projects/:projectId/workflows/:id')
export class WorkflowBrainstormingController {
  constructor(private readonly brainstormingService: WorkflowBrainstormingService) {}

  @Post('brainstorm')
  @ApiOperation({ summary: 'Brainstorm workflow with AI assistant' })
  async brainstorm(
    @Param('id') workflowId: string,
    @Body() request: BrainstormRequestDto
  ): Promise<BrainstormResponseDto> {
    return this.brainstormingService.brainstorm({
      workflowId,
      userMessage: request.userMessage,
    })
  }

  @Sse('brainstorm-stream')
  @ApiOperation({ summary: 'Brainstorm workflow with AI assistant (streaming)' })
  async brainstormStream(
    @Param('id') workflowId: string,
    @Body() request: BrainstormRequestDto
  ): Promise<Observable<MessageEvent>> {
    return new Observable((subscriber) => {
      ;(async () => {
        try {
          for await (const chunk of this.brainstormingService.brainstormStream({
            workflowId,
            userMessage: request.userMessage,
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
  @ApiOperation({ summary: 'Classify workflow based on brainstorming conversation' })
  async classify(@Param('id') workflowId: string, @Body() body: { sessionId: string }) {
    return this.brainstormingService.classify(workflowId, body.sessionId)
  }
}
