import { IArtifactService } from '@vyrak/artifact'
import { EnhancedLogger } from '@vyrak/custom-logger'

export type FileChangeEvent = {
  type: 'file.created' | 'file.updated' | 'file.deleted'
  path: string
  toolName: string
  agentId?: string
  timestamp: string
}

export interface IFileChangeEventHandler {
  handleFileChange(event: FileChangeEvent, workflowId: string, repoPath: string): Promise<void>
}

/**
 * Handler cho file change events từ Agent SDK PostToolUse hooks
 * Tự động lưu files được tạo/sửa thành artifacts
 */
export class FileChangeEventHandler implements IFileChangeEventHandler {
  constructor(
    private readonly artifactService: IArtifactService,
    private readonly logger: EnhancedLogger
  ) {}

  async handleFileChange(event: FileChangeEvent, workflowId: string, repoPath: string): Promise<void> {
    try {
      this.logger.log(
        `[FileChangeHandler] Event: ${event.type}, Path: ${event.path}, Workflow: ${workflowId}, RepoPath: ${repoPath}`,
        'FileChangeEventHandler'
      )

      // Chỉ lưu file.created và file.updated (không lưu deleted)
      if (event.type === 'file.deleted') {
        return
      }

      // Convert absolute path to relative path if needed
      const path = await import('path')
      let relativePath = event.path

      if (path.isAbsolute(event.path)) {
        if (event.path.startsWith(repoPath)) {
          relativePath = path.relative(repoPath, event.path)
          this.logger.log(`[FileChangeHandler] Converted to relative: ${relativePath}`, 'FileChangeEventHandler')
        }
      }

      // Chỉ lưu files trong docs/ hoặc plans/ (ADR và Implementation Plans)
      const shouldSave = this.shouldSaveAsArtifact(relativePath)
      this.logger.log(
        `[FileChangeHandler] Should save? ${shouldSave} for path: ${relativePath}`,
        'FileChangeEventHandler'
      )

      if (!shouldSave) {
        this.logger.debug(`Skipping artifact creation for ${relativePath}`, 'FileChangeEventHandler')
        return
      }

      // Đọc nội dung file
      const fs = await import('fs/promises')
      const fullPath = path.isAbsolute(event.path) ? event.path : path.join(repoPath, event.path)
      this.logger.log(`[FileChangeHandler] Reading from: ${fullPath}`, 'FileChangeEventHandler')

      const content = await fs.readFile(fullPath, 'utf-8')
      this.logger.log(`[FileChangeHandler] Read ${content.length} bytes`, 'FileChangeEventHandler')

      const filename = path.basename(relativePath)

      // Lưu thành artifact (dùng uploadArtifact)
      this.logger.log(
        `[FileChangeHandler] Uploading artifact - Key: ${relativePath}, Title: ${filename}`,
        'FileChangeEventHandler'
      )

      await this.artifactService.uploadArtifact(
        workflowId,
        'document', // ArtifactType
        relativePath, // key: use relative path for consistency
        filename, // title
        content,
        {
          fileName: filename,
          mimeType: 'text/markdown',
          metadata: {
            source: 'agent_sdk',
            toolName: event.toolName,
            filePath: relativePath, // also use relative path in metadata
            changeType: event.type,
            timestamp: event.timestamp,
          },
        }
      )

      this.logger.log(`Artifact created for ${event.path} in workflow ${workflowId}`, 'FileChangeEventHandler')
    } catch (error) {
      this.logger.error(error instanceof Error ? error : new Error(String(error)), undefined, 'FileChangeEventHandler')
    }
  }

  /**
   * Xác định file có nên lưu thành artifact không
   * Chỉ lưu: docs/adr/, plans/, docs/prd/
   */
  private shouldSaveAsArtifact(filePath: string): boolean {
    const patterns = [
      /^docs\/adr\//i, // ADR files
      /^plans\//i, // Implementation plans
      /^docs\/prd\//i, // PRD files (nếu có)
    ]

    return patterns.some((pattern) => pattern.test(filePath))
  }
}
