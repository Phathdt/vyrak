import { Injectable, Inject, OnModuleInit } from '@nestjs/common'
import { IArtifactService, ARTIFACT_SERVICE } from '@vyrak/artifact'
import { EnhancedLogger } from '@vyrak/custom-logger'
import { DatabaseService } from '@vyrak/database'
import { AgentToolUseEventSchema, IEventBus, EVENT_BUS } from '@vyrak/event-bus'
import * as fs from 'fs/promises'
import * as path from 'path'

import { withTenantContext } from '../common/decorators/with-tenant-context.decorator'
import { WorkerProcessingError } from '../common/errors/worker-error'

import type { AgentToolUseEvent } from '@vyrak/event-bus'

@Injectable()
export class ArtifactCreationProcessor implements OnModuleInit {
  private readonly logger: EnhancedLogger

  constructor(
    @Inject(EVENT_BUS) private readonly eventBus: IEventBus,
    @Inject(ARTIFACT_SERVICE) private readonly artifactService: IArtifactService,
    private readonly databaseService: DatabaseService,
    enhancedLogger: EnhancedLogger
  ) {
    this.logger = enhancedLogger.with({ context: 'ArtifactWorker' })
  }

  async onModuleInit() {
    // Validate before the tenant wrapper reads metadata.orgId, so malformed events never set tenant context
    const handler = withTenantContext(this.databaseService, this.handleToolUse.bind(this))

    await this.eventBus.subscribe<unknown>('agent.tool_use', (rawEvent) => handler(this.parseToolUseEvent(rawEvent)), {
      group: 'artifact-workers',
      consumer: `artifact-worker-${process.pid}`,
      maxRetries: 3,
    })

    this.logger.log('Subscribed to agent.tool_use events')
  }

  private parseToolUseEvent(rawEvent: unknown): AgentToolUseEvent {
    const parseResult = AgentToolUseEventSchema.safeParse(rawEvent)
    if (!parseResult.success) {
      const message = `Invalid agent.tool_use event schema: ${parseResult.error.message}`
      this.logger.error(new Error(message), 'Event validation failed')
      throw new Error(message)
    }
    return parseResult.data
  }

  private async handleToolUse(event: AgentToolUseEvent): Promise<void> {
    const { workflowId, toolName, toolInput, metadata } = event

    // Only process Write/Edit tools
    if (toolName !== 'Write' && toolName !== 'Edit') {
      return
    }

    const filePath = toolInput.file_path
    if (!filePath || typeof filePath !== 'string') {
      return
    }

    try {
      // SECURITY: Validate path to prevent traversal attacks
      const absolutePath = this.validateFilePath(filePath, metadata.repoPath)
      const relativePath = path.relative(metadata.repoPath, absolutePath)

      // Check if should save as artifact
      if (!this.shouldSaveAsArtifact(relativePath)) {
        return
      }

      // Wait for file with exponential backoff
      await this.waitForFile(absolutePath, { retries: 3, initialDelay: 500 })

      // Read file content
      const content = await fs.readFile(absolutePath, 'utf-8')

      // Upload artifact
      await this.artifactService.uploadArtifact(
        workflowId,
        'document',
        relativePath,
        path.basename(relativePath),
        content,
        {
          fileName: path.basename(relativePath),
          mimeType: this.getMimeType(relativePath),
          metadata: {
            source: 'agent_sdk',
            toolName,
            filePath: relativePath,
            timestamp: event.timestamp,
          },
        }
      )

      this.logger.log(`Artifact created: ${relativePath}`)

      // Publish success event
      await this.eventBus.publish('artifact.created', {
        type: 'artifact.created',
        workflowId,
        filePath: relativePath,
        timestamp: Date.now(),
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('Path traversal')) {
        this.logger.error(error, `SECURITY: Path traversal attempt: ${filePath}`)
        // Don't retry - this is malicious
        return
      }

      const enrichedError = new WorkerProcessingError(
        `Failed to create artifact: ${error instanceof Error ? error.message : String(error)}`,
        {
          processor: 'ArtifactCreationProcessor',
          eventType: 'agent.tool_use',
          workflowId,
          toolName,
          filePath,
          repoPath: metadata.repoPath,
          orgId: metadata.orgId,
          projectId: metadata.projectId,
          originalError: error instanceof Error ? error : undefined,
        }
      )

      this.logger.error(
        enrichedError,
        `Artifact creation failed: eventType=agent.tool_use workflowId=${workflowId} toolName=${toolName} filePath=${filePath} orgId=${metadata.orgId} projectId=${metadata.projectId}`
      )
      // Throw to trigger retry logic in event bus
      throw enrichedError
    }
  }

  /**
   * Validate file path to prevent path traversal attacks
   * @throws Error if path traversal is detected
   */
  private validateFilePath(filePath: string, repoPath: string): string {
    // Resolve to absolute path
    const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(repoPath, filePath)

    // Normalize to prevent traversal (resolves .. and .)
    const normalizedPath = path.normalize(absolutePath)

    // Ensure path is within repo boundary
    if (!normalizedPath.startsWith(repoPath)) {
      throw new Error(`Path traversal detected: ${filePath}`)
    }

    return normalizedPath
  }

  private shouldSaveAsArtifact(filePath: string): boolean {
    const patterns = [/^plans\//i, /^docs\/adr\//i, /^docs\/prd\//i]
    return patterns.some((pattern) => pattern.test(filePath))
  }

  private async waitForFile(filePath: string, opts: { retries: number; initialDelay: number }): Promise<void> {
    for (let i = 0; i < opts.retries; i++) {
      try {
        await fs.access(filePath)
        return
      } catch {
        if (i < opts.retries - 1) {
          const delay = opts.initialDelay * Math.pow(2, i)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw new Error(`File not found after ${opts.retries} retries: ${filePath}`)
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase()
    const mimeTypes: Record<string, string> = {
      '.md': 'text/markdown',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.yaml': 'application/yaml',
      '.yml': 'application/yaml',
    }
    return mimeTypes[ext] || 'text/plain'
  }
}
