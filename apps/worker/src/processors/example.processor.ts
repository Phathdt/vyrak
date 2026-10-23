import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'

import { Job } from 'bullmq'

export interface ExampleJobData {
  id: string
  message: string
}

@Processor('example')
export class ExampleProcessor extends WorkerHost {
  private readonly logger = new Logger(ExampleProcessor.name)

  async process(job: Job<ExampleJobData>): Promise<void> {
    this.logger.log(`Processing job ${job.id} with data: ${JSON.stringify(job.data)}`)

    try {
      // Simulate some work
      await new Promise((resolve) => setTimeout(resolve, 1000))

      this.logger.log(`Job ${job.id} completed successfully`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Job ${job.id} failed: ${message}`)
      throw error
    }
  }
}
