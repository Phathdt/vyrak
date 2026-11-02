import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

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
 * Code analysis service for parsing TypeScript/JavaScript files
 * Identifies structure and dependencies
 *
 * NO @Injectable() decorator - plain TypeScript class
 */
export class CodeAnalysisService {
  /**
   * Analyze a TypeScript/JavaScript file
   * @param repoPath - Repository base path
   * @param filePath - Relative file path
   * @returns Analysis result
   */
  async analyzeFile(repoPath: string, filePath: string): Promise<CodeAnalysisResult> {
    const fullPath = join(repoPath, filePath)
    const content = await readFile(fullPath, 'utf-8')

    return this.parseContent(filePath, content)
  }

  /**
   * Analyze multiple files
   * @param repoPath - Repository base path
   * @param filePaths - Array of relative file paths
   * @returns Array of analysis results
   */
  async analyzeFiles(repoPath: string, filePaths: string[]): Promise<CodeAnalysisResult[]> {
    return Promise.all(filePaths.map((filePath) => this.analyzeFile(repoPath, filePath)))
  }

  /**
   * Find dependencies between modules
   * @param analyses - Array of analysis results
   * @returns Array of module dependencies
   */
  findModuleDependencies(analyses: CodeAnalysisResult[]): ModuleDependency[] {
    const dependencies: ModuleDependency[] = []
    const fileMap = new Map(analyses.map((a) => [a.filePath, a]))

    for (const analysis of analyses) {
      for (const imp of analysis.imports) {
        // Check if import source matches another analyzed file
        const normalizedSource = this.normalizeImportPath(imp.source)
        const targetFile = this.findMatchingFile(normalizedSource, Array.from(fileMap.keys()))

        if (targetFile) {
          dependencies.push({
            from: analysis.filePath,
            to: targetFile,
            type: 'import',
          })
        }
      }
    }

    return dependencies
  }

  /**
   * Parse file content and extract structure
   */
  private parseContent(filePath: string, content: string): CodeAnalysisResult {
    const imports = this.extractImports(content)
    const exports = this.extractExports(content)
    const functions = this.extractFunctions(content)
    const classes = this.extractClasses(content)
    const dependencies = imports.map((imp) => imp.source)

    return {
      filePath,
      imports,
      exports,
      functions,
      classes,
      dependencies,
    }
  }

  /**
   * Extract import statements
   */
  private extractImports(content: string): ImportInfo[] {
    const imports: ImportInfo[] = []

    // Match: import defaultExport from 'module'
    const defaultImportRegex = /import\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"]([^'"]+)['"]/g
    for (const match of content.matchAll(defaultImportRegex)) {
      imports.push({
        source: match[2],
        names: [match[1]],
        isDefault: true,
      })
    }

    // Match: import { name1, name2 } from 'module'
    const namedImportRegex = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g
    for (const match of content.matchAll(namedImportRegex)) {
      const names = match[1]
        .split(',')
        .map((n) => n.trim().split(/\s+as\s+/)[0])
        .filter((n) => n.length > 0)

      imports.push({
        source: match[2],
        names,
        isDefault: false,
      })
    }

    // Match: import * as name from 'module'
    const namespaceImportRegex = /import\s+\*\s+as\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s+from\s+['"]([^'"]+)['"]/g
    for (const match of content.matchAll(namespaceImportRegex)) {
      imports.push({
        source: match[2],
        names: [match[1]],
        isDefault: false,
      })
    }

    return imports
  }

  /**
   * Extract export statements
   */
  private extractExports(content: string): ExportInfo[] {
    const exports: ExportInfo[] = []

    // Match: export default
    if (/export\s+default/.test(content)) {
      exports.push({
        name: 'default',
        type: 'default',
      })
    }

    // Match: export class ClassName
    const classExportRegex = /export\s+class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    for (const match of content.matchAll(classExportRegex)) {
      exports.push({
        name: match[1],
        type: 'class',
      })
    }

    // Match: export function functionName
    const functionExportRegex = /export\s+(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    for (const match of content.matchAll(functionExportRegex)) {
      exports.push({
        name: match[1],
        type: 'function',
      })
    }

    // Match: export const/let/var name
    const constExportRegex = /export\s+(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    for (const match of content.matchAll(constExportRegex)) {
      exports.push({
        name: match[1],
        type: 'const',
      })
    }

    // Match: export interface/type
    const typeExportRegex = /export\s+(interface|type)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    for (const match of content.matchAll(typeExportRegex)) {
      exports.push({
        name: match[2],
        type: match[1] as 'interface' | 'type',
      })
    }

    return exports
  }

  /**
   * Extract function declarations
   */
  private extractFunctions(content: string): FunctionInfo[] {
    const functions: FunctionInfo[] = []

    // Match: function name(params)
    const functionRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g
    for (const match of content.matchAll(functionRegex)) {
      const isAsync = match[0].includes('async')
      const isExported = match[0].includes('export')
      const parameters = match[2]
        .split(',')
        .map((p) => p.trim().split(/\s*[:=]/)[0])
        .filter((p) => p.length > 0)

      functions.push({
        name: match[1],
        isAsync,
        isExported,
        parameters,
      })
    }

    // Match: const name = function(params) or const name = (params) =>
    const arrowFunctionRegex = /(?:export\s+)?const\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g
    for (const match of content.matchAll(arrowFunctionRegex)) {
      const isAsync = match[0].includes('async')
      const isExported = match[0].includes('export')
      const parameters = match[2]
        .split(',')
        .map((p) => p.trim().split(/\s*[:=]/)[0])
        .filter((p) => p.length > 0)

      functions.push({
        name: match[1],
        isAsync,
        isExported,
        parameters,
      })
    }

    return functions
  }

  /**
   * Extract class declarations
   */
  private extractClasses(content: string): ClassInfo[] {
    const classes: ClassInfo[] = []

    // Match: class ClassName { ... }
    const classRegex = /(?:export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g
    for (const match of content.matchAll(classRegex)) {
      const className = match[1]
      const isExported = match[0].includes('export')

      // Extract class body
      const classBodyStart = content.indexOf('{', match.index!)
      if (classBodyStart === -1) continue

      let braceCount = 1
      let classBodyEnd = classBodyStart + 1
      while (braceCount > 0 && classBodyEnd < content.length) {
        if (content[classBodyEnd] === '{') braceCount++
        if (content[classBodyEnd] === '}') braceCount--
        classBodyEnd++
      }

      const classBody = content.substring(classBodyStart, classBodyEnd)

      // Extract methods
      const methodRegex = /(?:async\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\([^)]*\)\s*{/g
      const methods: string[] = []
      for (const methodMatch of classBody.matchAll(methodRegex)) {
        methods.push(methodMatch[1])
      }

      // Extract properties
      const propertyRegex = /(?:private|public|protected|readonly)?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*[:=]/g
      const properties: string[] = []
      for (const propMatch of classBody.matchAll(propertyRegex)) {
        if (!methods.includes(propMatch[1])) {
          properties.push(propMatch[1])
        }
      }

      classes.push({
        name: className,
        isExported,
        methods,
        properties,
      })
    }

    return classes
  }

  /**
   * Normalize import path for matching
   */
  private normalizeImportPath(importPath: string): string {
    // Remove relative path indicators
    return importPath.replace(/^\.\.?\//g, '')
  }

  /**
   * Find matching file from import path
   */
  private findMatchingFile(importPath: string, filePaths: string[]): string | null {
    const normalized = this.normalizeImportPath(importPath)

    for (const filePath of filePaths) {
      if (filePath.includes(normalized) || normalized.includes(filePath.replace(/\.(ts|js)x?$/, ''))) {
        return filePath
      }
    }

    return null
  }
}
