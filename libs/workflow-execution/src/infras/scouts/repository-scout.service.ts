import { readdir, readFile, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'

import type {
  AnalyzeFilesResult,
  ImpactedModulesResult,
  ISourceCodeScout,
  ScoutRepositoryResult,
} from '../../domain/interfaces/source-code-scout.interface'

/**
 * Repository scouting service implementation
 * Provides file system operations for code analysis
 *
 * NO @Injectable() decorator - plain TypeScript class
 */
export class RepositoryScoutService implements ISourceCodeScout {
  constructor(private readonly resolveRepositoryPath: (workflowId: string) => Promise<string | null>) {}

  async scoutRepository(workspaceId: string, query: string): Promise<ScoutRepositoryResult> {
    const repoPath = await this.resolveRepositoryPath(workspaceId)
    if (!repoPath) {
      return {
        files: [],
        summary: 'No repository path found for workspace',
      }
    }

    const files = await this.findFilesByPattern(repoPath, query)

    return {
      files,
      summary: `Found ${files.length} files matching query: ${query}`,
    }
  }

  async analyzeFiles(workspaceId: string, filePaths: string[]): Promise<AnalyzeFilesResult> {
    const repoPath = await this.resolveRepositoryPath(workspaceId)
    if (!repoPath) {
      return {
        analyses: [],
        summary: 'No repository path found for workspace',
      }
    }

    const analyses = await Promise.all(
      filePaths.map(async (filePath) => {
        const fullPath = join(repoPath, filePath)
        try {
          const content = await readFile(fullPath, 'utf-8')
          return this.analyzeFileContent(filePath, content)
        } catch (_error) {
          return {
            filePath,
            content: '',
            imports: [],
            exports: [],
            functions: [],
            classes: [],
            language: 'unknown',
          }
        }
      })
    )

    return {
      analyses,
      summary: `Analyzed ${analyses.length} files`,
    }
  }

  async findImpactedModules(workspaceId: string, featureDescription: string): Promise<ImpactedModulesResult> {
    const repoPath = await this.resolveRepositoryPath(workspaceId)
    if (!repoPath) {
      return {
        modules: [],
        affectedFiles: [],
      }
    }

    // Simple heuristic-based approach
    // In production, this could use AST analysis or AI-powered analysis
    const keywords = this.extractKeywords(featureDescription)
    const files = await this.findFilesByPattern(repoPath, keywords.join('|'))

    const modules = files
      .filter((f) => f.type === 'file')
      .map((f) => ({
        modulePath: f.relativePath,
        moduleType: this.inferModuleType(f.relativePath),
        reason: `Contains keywords: ${keywords.join(', ')}`,
        relatedFiles: [f.relativePath],
      }))

    return {
      modules,
      affectedFiles: files.map((f) => f.relativePath),
    }
  }

  /**
   * Find files by pattern in repository
   */
  private async findFilesByPattern(
    repoPath: string,
    pattern: string
  ): Promise<Array<{ path: string; relativePath: string; size: number; type: 'file' | 'directory' }>> {
    const results: Array<{ path: string; relativePath: string; size: number; type: 'file' | 'directory' }> = []
    const ignorePatterns = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage']

    const walk = async (dir: string) => {
      try {
        const entries = await readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          if (ignorePatterns.some((ignore) => entry.name.includes(ignore))) {
            continue
          }

          const fullPath = join(dir, entry.name)
          const relativePath = relative(repoPath, fullPath)

          if (entry.isDirectory()) {
            await walk(fullPath)
          } else if (entry.isFile()) {
            // Match pattern in filename or path
            if (
              entry.name.toLowerCase().includes(pattern.toLowerCase()) ||
              relativePath.toLowerCase().includes(pattern.toLowerCase())
            ) {
              const stats = await stat(fullPath)
              results.push({
                path: fullPath,
                relativePath,
                size: stats.size,
                type: 'file',
              })
            }
          }
        }
      } catch (_error) {
        // Skip directories we can't read
      }
    }

    await walk(repoPath)
    return results.slice(0, 100) // Limit results
  }

  /**
   * Analyze file content for imports, exports, functions, classes
   */
  private analyzeFileContent(
    filePath: string,
    content: string
  ): {
    filePath: string
    content: string
    imports: string[]
    exports: string[]
    functions: string[]
    classes: string[]
    language: string
  } {
    const language = this.detectLanguage(filePath)
    const imports: string[] = []
    const exports: string[] = []
    const functions: string[] = []
    const classes: string[] = []

    if (language === 'typescript' || language === 'javascript') {
      // Extract imports
      const importMatches = content.matchAll(/import\s+(?:{[^}]+}|[^from]+)\s+from\s+['"]([^'"]+)['"]/g)
      for (const match of importMatches) {
        imports.push(match[1])
      }

      // Extract exports
      const exportMatches = content.matchAll(
        /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
      )
      for (const match of exportMatches) {
        exports.push(match[1])
      }

      // Extract functions
      const functionMatches = content.matchAll(
        /(?:function|const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?:=\s*)?(?:\([^)]*\)|<[^>]*>)/g
      )
      for (const match of functionMatches) {
        functions.push(match[1])
      }

      // Extract classes
      const classMatches = content.matchAll(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g)
      for (const match of classMatches) {
        classes.push(match[1])
      }
    }

    return {
      filePath,
      content,
      imports,
      exports,
      functions,
      classes,
      language,
    }
  }

  /**
   * Detect programming language from file extension
   */
  private detectLanguage(filePath: string): string {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
      return 'typescript'
    }
    if (filePath.endsWith('.js') || filePath.endsWith('.jsx')) {
      return 'javascript'
    }
    if (filePath.endsWith('.py')) {
      return 'python'
    }
    if (filePath.endsWith('.java')) {
      return 'java'
    }
    if (filePath.endsWith('.go')) {
      return 'go'
    }
    return 'unknown'
  }

  /**
   * Infer module type from file path
   */
  private inferModuleType(filePath: string): 'feature' | 'service' | 'component' | 'utility' | 'config' {
    if (filePath.includes('component') || filePath.includes('view')) {
      return 'component'
    }
    if (filePath.includes('service')) {
      return 'service'
    }
    if (filePath.includes('util') || filePath.includes('helper')) {
      return 'utility'
    }
    if (filePath.includes('config') || filePath.includes('setting')) {
      return 'config'
    }
    return 'feature'
  }

  /**
   * Extract keywords from feature description
   */
  private extractKeywords(description: string): string[] {
    // Simple keyword extraction - remove common words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'])
    const words = description
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !commonWords.has(w))

    return [...new Set(words)].slice(0, 5)
  }
}
