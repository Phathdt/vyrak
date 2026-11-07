/**
 * Result of code analysis
 */
export interface CodeAnalysisResult {
  filePath: string
  imports: ImportInfo[]
  exports: ExportInfo[]
  functions: FunctionInfo[]
  classes: ClassInfo[]
  dependencies: string[]
}

/**
 * Import information
 */
export interface ImportInfo {
  source: string
  names: string[]
  isDefault: boolean
}

/**
 * Export information
 */
export interface ExportInfo {
  name: string
  type: 'function' | 'class' | 'const' | 'type' | 'interface' | 'default'
}

/**
 * Function information
 */
export interface FunctionInfo {
  name: string
  isAsync: boolean
  isExported: boolean
  parameters: string[]
}

/**
 * Class information
 */
export interface ClassInfo {
  name: string
  isExported: boolean
  methods: string[]
  properties: string[]
}

/**
 * Module dependency information
 */
export interface ModuleDependency {
  from: string
  to: string
  type: 'import' | 'export'
}

/**
 * Parses TypeScript/JavaScript files and reports their structure and dependencies
 */
export interface ICodeAnalysisService {
  analyzeFile(repoPath: string, filePath: string): Promise<CodeAnalysisResult>
  analyzeFiles(repoPath: string, filePaths: string[]): Promise<CodeAnalysisResult[]>
  findModuleDependencies(analyses: CodeAnalysisResult[]): ModuleDependency[]
}
