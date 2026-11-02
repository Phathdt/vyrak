/**
 * Result of repository scouting operation
 */
export interface ScoutRepositoryResult {
  files: ScoutedFile[]
  summary: string
}

/**
 * Scouted file information
 */
export interface ScoutedFile {
  path: string
  relativePath: string
  size: number
  type: 'file' | 'directory'
}

/**
 * Result of file analysis
 */
export interface AnalyzeFilesResult {
  analyses: FileAnalysis[]
  summary: string
}

/**
 * Analysis of a single file
 */
export interface FileAnalysis {
  filePath: string
  content: string
  imports: string[]
  exports: string[]
  functions: string[]
  classes: string[]
  language: string
}

/**
 * Result of finding impacted modules
 */
export interface ImpactedModulesResult {
  modules: ImpactedModule[]
  affectedFiles: string[]
}

/**
 * Impacted module information
 */
export interface ImpactedModule {
  modulePath: string
  moduleType: 'feature' | 'service' | 'component' | 'utility' | 'config'
  reason: string
  relatedFiles: string[]
}

/**
 * Service for scouting and analyzing source code in workspace
 */
export interface ISourceCodeScout {
  /**
   * Scout repository for files matching query
   * @param workspaceId - Workspace ID (or workflow ID for now)
   * @param query - Search query or pattern
   * @returns Scout result with files and summary
   */
  scoutRepository(workspaceId: string, query: string): Promise<ScoutRepositoryResult>

  /**
   * Analyze specific files for structure and dependencies
   * @param workspaceId - Workspace ID
   * @param filePaths - Array of file paths to analyze
   * @returns Analysis result with imports, exports, functions, classes
   */
  analyzeFiles(workspaceId: string, filePaths: string[]): Promise<AnalyzeFilesResult>

  /**
   * Find modules impacted by a feature description
   * @param workspaceId - Workspace ID
   * @param featureDescription - Description of the feature being implemented
   * @returns Impacted modules and affected files
   */
  findImpactedModules(workspaceId: string, featureDescription: string): Promise<ImpactedModulesResult>
}
