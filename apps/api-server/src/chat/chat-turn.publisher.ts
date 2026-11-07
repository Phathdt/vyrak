import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import { CHAT_TURN_JOB_NAME, CHAT_TURN_QUEUE } from '@vyrak/workflow-planning'
import { Queue } from 'bullmq'

import type { ChatTurnJob } from '@vyrak/workflow-planning'

/**
 * Hands one chat turn to the worker. `attempts: 1` because a retried turn would
 * stream a second answer after part of the first was already delivered.
 */
@Injectable()
export class BullChatTurnPublisher {
  constructor(@InjectQueue(CHAT_TURN_QUEUE) private readonly queue: Queue) {}

  async enqueueChatTurn(job: ChatTurnJob): Promise<void> {
    await this.queue.add(CHAT_TURN_JOB_NAME, job, {
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: 100,
    })
  }
}
