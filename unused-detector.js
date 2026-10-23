#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const ts = require('typescript')

class UnusedDetector {
  constructor(options = {}) {
    this.allExports = new Map() // symbol -> {file, line, type}
    this.allUsages = new Set()
    this.allMethods = new Map() // methodName -> {file, line, className, isInterface}
    this.allFunctions = new Map() // functionName -> {file, line}
    this.allClasses = new Map() // className -> {file, line, implementsInterface}
    this.allInterfaces = new Map() // interfaceName -> {file, line}
    this.methodUsages = new Set()
    this.functionUsages = new Set()
    this.classUsages = new Set()
    this.interfaceUsages = new Set()

    // Load configuration from .unusedrc.js if exists
    const config = this.loadConfiguration()
    this.ignorePatterns = options.ignorePatterns || config.ignorePatterns

    // Merge built-in patterns with config patterns
    const builtInFilePatterns = [
      // Configuration files
      '.prettierrc',
      '.prettierrc.js',
      '.prettierrc.json',
      '.prettierrc.yml',
      '.prettierrc.yaml',
      'eslint.config.js',
      '.eslintrc.js',
      '.eslintrc.json',
      '.eslintrc.yml',
      '.eslintrc.yaml',
      'project.json',
      'workspace.json',
      'tsconfig.json',
      'tsconfig.base.json',
      'tsconfig.app.json',
      'tsconfig.spec.json',
      'vite.config.js',
      'vite.config.ts',
      'webpack.config.js',
      'tailwind.config.js',
      'tailwind.config.ts',
      'next.config.js',
      'nuxt.config.js',
      // Build and tooling files
      'rollup.config.js',
      'rollup.config.ts',
      'babel.config.js',
      '.babelrc',
      '.babelrc.js',
      'commitlint.config.js',
      '.commitlintrc.js',
      'husky.config.js',
      '.huskyrc.js',
      // Database and migration files
      'prisma/schema.prisma',
      'migrations/',
      // Scripts and utilities
      'scripts/',
      'tools/',
      'bin/',
      // Documentation
      'README.md',
      'CHANGELOG.md',
      'CONTRIBUTING.md',
      // Package files
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      // Custom detector files
      'unused-detector.js',
      'simple-libs-detector.js',
      'generate-indexes.js',
    ]

    this.ignoredFilePatterns = [...builtInFilePatterns, ...(config.ignoredFilePatterns || [])]

    const builtInFunctionPatterns = [
      // Main function patterns
      /^main$/,
      /^bootstrap$/,
      // CLI entry points
      /^cli$/,
      /^run$/,
      // Configuration exports
      /^config$/,
      /^configuration$/,
      // Module exports for configuration
      /^default$/, // default export functions
      // Utility functions that might be exported but unused
      /^__.*__$/, // dunder functions
      /^_.*_$/, // private utility functions
    ]

    this.ignoredFunctionPatterns = [...builtInFunctionPatterns, ...(config.ignoredFunctionPatterns || [])]
    this.ignoredClassPatterns = config.ignoredClassPatterns || []
    this.ignoredMethodPatterns = config.ignoredMethodPatterns || []

    // Store comment-based ignores
    this.commentIgnores = new Set() // stores file:line patterns to ignore
    this.nestjsDecorators = new Set([
      'Get',
      'Post',
      'Put',
      'Delete',
      'Patch',
      'Options',
      'Head',
      'All',
      'OnModuleInit',
      'OnModuleDestroy',
      'OnApplicationBootstrap',
      'OnApplicationShutdown',
      'MessagePattern',
      'EventPattern',
      'Subscribe',
      'Cron',
      'Interval',
      'Timeout',
      'Process',
      'Processor',
      'OnQueueActive',
      'OnQueueCompleted',
      'OnQueueFailed',
      'CanActivate',
      'Intercept',
      'Transform',
    ])
    this.ignoredMethodNames = new Set([
      'constructor',
      'onModuleInit',
      'onModuleDestroy',
      'onApplicationBootstrap',
      'onApplicationShutdown',
      'canActivate',
      'intercept',
      'transform',
      'use',
      'beforeEach',
      'afterEach',
      'beforeAll',
      'afterAll',
    ])
  }

  // Load configuration from .unusedrc.js
  loadConfiguration() {
    const configPath = path.join(process.cwd(), '.unusedrc.js')

    if (fs.existsSync(configPath)) {
      try {
        // Clear require cache to allow config reloading
        delete require.cache[require.resolve(configPath)]
        const config = require(configPath)
        console.log('📋 Loaded configuration from .unusedrc.js')
        return config
      } catch (error) {
        console.warn(`⚠️  Warning: Could not load .unusedrc.js: ${error.message}`)
        return {}
      }
    }

    return {}
  }

  // Find all apps
  findApps() {
    const apps = []
    const appsDir = 'apps'

    if (!fs.existsSync(appsDir)) return apps

    fs.readdirSync(appsDir).forEach((dir) => {
      const mainFile = path.join(appsDir, dir, 'src/main.ts')
      if (fs.existsSync(mainFile)) {
        apps.push(dir)
      }
    })

    return apps
  }

  // Check if file should be ignored based on patterns
  shouldIgnoreFile(filePath) {
    const fileName = path.basename(filePath)
    const relativePath = path.relative(process.cwd(), filePath)

    // Skip test files
    if (filePath.includes('.spec.') || filePath.includes('.test.') || filePath.includes('.e2e-spec.')) {
      return true
    }
    // Skip declaration files
    if (filePath.endsWith('.d.ts')) {
      return true
    }
    // Skip build output
    if (filePath.includes('/dist/') || filePath.includes('/build/')) {
      return true
    }
    // Skip node modules
    if (filePath.includes('/node_modules/')) {
      return true
    }

    // Skip configuration and utility files
    if (
      this.ignoredFilePatterns.some((pattern) => {
        if (pattern.includes('/')) {
          // Pattern with path (e.g., 'scripts/', 'prisma/schema.prisma')
          return relativePath.includes(pattern)
        } else {
          // Pattern for filename only (e.g., '.prettierrc', 'eslint.config.js')
          return fileName === pattern || relativePath.endsWith(pattern)
        }
      })
    ) {
      return true
    }

    // Skip user-defined patterns
    return this.ignorePatterns.some((pattern) => filePath.includes(pattern))
  }

  // Parse TypeScript file and extract declarations
  parseTypeScriptFile(filePath) {
    if (this.shouldIgnoreFile(filePath)) {
      return
    }

    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

      // First pass: collect comment-based ignores
      this.collectCommentIgnores(sourceFile, filePath)

      // Second pass: visit nodes for analysis
      this.visitNode(sourceFile, filePath)
    } catch (error) {
      // Skip files that can't be parsed
      console.warn(`Warning: Could not parse ${filePath}:`, error.message)
    }
  }

  // Collect comment-based ignore directives
  collectCommentIgnores(sourceFile, filePath) {
    const fullText = sourceFile.getFullText()
    const commentRegex = /\/\/\s*@unused-ignore\b/g
    let match

    while ((match = commentRegex.exec(fullText)) !== null) {
      const pos = match.index
      const lineAndChar = ts.getLineAndCharacterOfPosition(sourceFile, pos)
      const commentLine = lineAndChar.line + 1

      // The ignore applies to the next line (where the declaration would be)
      const targetLine = commentLine + 1
      const ignoreKey = `${filePath}:${targetLine}`
      this.commentIgnores.add(ignoreKey)
    }
  }

  // Visit TypeScript AST nodes
  visitNode(node, filePath) {
    switch (node.kind) {
      case ts.SyntaxKind.InterfaceDeclaration:
        this.handleInterfaceDeclaration(node, filePath)
        break
      case ts.SyntaxKind.ClassDeclaration:
        this.handleClassDeclaration(node, filePath)
        break
      case ts.SyntaxKind.FunctionDeclaration:
        this.handleFunctionDeclaration(node, filePath)
        break
      case ts.SyntaxKind.VariableStatement:
        this.handleVariableStatement(node, filePath)
        break
      case ts.SyntaxKind.PropertyAccessExpression:
        this.handlePropertyAccess(node, filePath)
        break
      case ts.SyntaxKind.CallExpression:
        this.handleCallExpression(node, filePath)
        break
      case ts.SyntaxKind.Identifier:
        this.handleIdentifier(node, filePath)
        break
    }

    ts.forEachChild(node, (child) => this.visitNode(child, filePath))
  }

  // Handle interface declarations
  handleInterfaceDeclaration(node, filePath) {
    if (!node.name) return

    const interfaceName = node.name.text
    const line = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()).line + 1

    // Store interface
    this.allInterfaces.set(interfaceName, {
      file: filePath,
      line,
      exported: this.hasExportModifier(node),
    })

    // Store interface methods
    if (node.members) {
      node.members.forEach((member) => {
        if (ts.isMethodSignature(member) && member.name) {
          const methodName = member.name.text
          const methodLine = ts.getLineAndCharacterOfPosition(node.getSourceFile(), member.getStart()).line + 1

          this.allMethods.set(`${interfaceName}.${methodName}`, {
            file: filePath,
            line: methodLine,
            className: interfaceName,
            isInterface: true,
            exported: this.hasExportModifier(node),
          })
        }
      })
    }
  }

  // Handle class declarations
  handleClassDeclaration(node, filePath) {
    if (!node.name) return

    const className = node.name.text
    const line = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()).line + 1

    // Check if class implements interfaces
    const implementsInterface =
      node.heritageClauses && node.heritageClauses.some((clause) => clause.token === ts.SyntaxKind.ImplementsKeyword)

    // Store class
    this.allClasses.set(className, {
      file: filePath,
      line,
      implementsInterface,
      exported: this.hasExportModifier(node),
    })

    // Store class methods (only if class doesn't implement interface)
    if (!implementsInterface && node.members) {
      node.members.forEach((member) => {
        if (ts.isMethodDeclaration(member) && member.name) {
          const methodName = member.name.text
          const methodLine = ts.getLineAndCharacterOfPosition(node.getSourceFile(), member.getStart()).line + 1

          // Skip if method has NestJS decorators or is in ignored list
          if (this.shouldIgnoreMethod(member, methodName, filePath)) {
            return
          }

          this.allMethods.set(`${className}.${methodName}`, {
            file: filePath,
            line: methodLine,
            className,
            isInterface: false,
            exported: this.hasExportModifier(node),
          })
        }
      })
    }
  }

  // Handle function declarations
  handleFunctionDeclaration(node, filePath) {
    if (!node.name) return

    const functionName = node.name.text
    const line = ts.getLineAndCharacterOfPosition(node.getSourceFile(), node.getStart()).line + 1

    this.allFunctions.set(functionName, {
      file: filePath,
      line,
      exported: this.hasExportModifier(node),
    })
  }

  // Handle variable statements (for const exports)
  handleVariableStatement(node, filePath) {
    if (node.declarationList && node.declarationList.declarations) {
      node.declarationList.declarations.forEach((declaration) => {
        if (declaration.name && ts.isIdentifier(declaration.name)) {
          const name = declaration.name.text
          const line = ts.getLineAndCharacterOfPosition(node.getSourceFile(), declaration.getStart()).line + 1

          this.allExports.set(name, {
            file: filePath,
            line,
            type: 'const',
            exported: this.hasExportModifier(node),
          })
        }
      })
    }
  }

  // Handle property access expressions (method calls)
  handlePropertyAccess(node, filePath) {
    if (node.name && ts.isIdentifier(node.name)) {
      const methodName = node.name.text
      this.methodUsages.add(methodName)

      // Also track class.method pattern
      if (node.expression && ts.isIdentifier(node.expression)) {
        const className = node.expression.text
        this.methodUsages.add(`${className}.${methodName}`)
      }
    }
  }

  // Handle call expressions (function calls)
  handleCallExpression(node, filePath) {
    if (node.expression) {
      if (ts.isIdentifier(node.expression)) {
        const functionName = node.expression.text
        this.functionUsages.add(functionName)
        this.classUsages.add(functionName) // Classes can be called as constructors
      } else if (ts.isPropertyAccessExpression(node.expression)) {
        this.handlePropertyAccess(node.expression, filePath)
      }
    }
  }

  // Handle identifiers (general usage)
  handleIdentifier(node, filePath) {
    const name = node.text
    this.allUsages.add(name)

    // Only add to specific usage sets if not in a declaration context
    const parent = node.parent
    if (parent) {
      // Skip if this identifier is the name being declared
      const isDeclarationName =
        (ts.isInterfaceDeclaration(parent) && parent.name === node) ||
        (ts.isClassDeclaration(parent) && parent.name === node) ||
        (ts.isFunctionDeclaration(parent) && parent.name === node) ||
        (ts.isVariableDeclaration(parent) && parent.name === node)

      if (!isDeclarationName) {
        this.classUsages.add(name)
        this.interfaceUsages.add(name)
        this.functionUsages.add(name)
      }
    } else {
      // Fallback for cases where parent is not available
      this.classUsages.add(name)
      this.interfaceUsages.add(name)
      this.functionUsages.add(name)
    }
  }

  // Check if node has export modifier
  hasExportModifier(node) {
    return node.modifiers && node.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  }

  // Check if declaration should be ignored based on comment
  shouldIgnoreByComment(filePath, line) {
    const ignoreKey = `${filePath}:${line}`
    return this.commentIgnores.has(ignoreKey)
  }

  // Check if function should be ignored based on patterns or comments
  shouldIgnoreFunction(functionName, filePath, line) {
    if (this.shouldIgnoreByComment(filePath, line)) {
      return true
    }
    return this.ignoredFunctionPatterns.some((pattern) => pattern.test(functionName))
  }

  // Check if class should be ignored based on patterns or comments
  shouldIgnoreClass(className, filePath, line) {
    if (this.shouldIgnoreByComment(filePath, line)) {
      return true
    }
    return this.ignoredClassPatterns.some((pattern) => pattern.test(className))
  }

  // Check if method should be ignored based on patterns or comments
  shouldIgnoreMethodByPattern(methodName, filePath, line) {
    if (this.shouldIgnoreByComment(filePath, line)) {
      return true
    }
    return this.ignoredMethodPatterns.some((pattern) => pattern.test(methodName))
  }

  // Check if method should be ignored
  shouldIgnoreMethod(methodNode, methodName, filePath = null) {
    // Check comment-based ignore if file path and line are available
    if (filePath && methodNode.getSourceFile) {
      const line = ts.getLineAndCharacterOfPosition(methodNode.getSourceFile(), methodNode.getStart()).line + 1
      if (this.shouldIgnoreByComment(filePath, line) || this.shouldIgnoreMethodByPattern(methodName, filePath, line)) {
        return true
      }
    }

    // Ignore methods with private/protected modifiers starting with _
    if (methodName.startsWith('_')) {
      return true
    }

    // Ignore lifecycle and framework methods
    if (this.ignoredMethodNames.has(methodName)) {
      return true
    }

    // Check decorators in both locations (legacy decorators property and newer modifiers array)
    const decorators = []

    // Legacy decorators property
    if (methodNode.decorators) {
      decorators.push(...methodNode.decorators)
    }

    // Newer TypeScript versions store decorators in modifiers
    if (methodNode.modifiers) {
      decorators.push(...methodNode.modifiers.filter((modifier) => modifier.kind === ts.SyntaxKind.Decorator))
    }

    // Ignore methods with NestJS decorators
    if (decorators.length > 0) {
      return decorators.some((decorator) => {
        if (ts.isCallExpression(decorator.expression) && ts.isIdentifier(decorator.expression.expression)) {
          return this.nestjsDecorators.has(decorator.expression.expression.text)
        }
        if (ts.isIdentifier(decorator.expression)) {
          return this.nestjsDecorators.has(decorator.expression.text)
        }
        return false
      })
    }

    return false
  }

  // Legacy method for backward compatibility
  scanFileForExports(filePath) {
    this.parseTypeScriptFile(filePath)
  }

  // Read file and extract usages
  scanFileForUsages(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')

      // First, collect exports from this file to avoid false usage detection
      const fileExports = new Set()
      const exportLines = content.split('\n')
      exportLines.forEach((line) => {
        const match = line.match(/export\s+(?:interface|type|enum|class|const)\s+([A-Za-z_][A-Za-z0-9_]*)/)
        if (match) {
          fileExports.add(match[1])
        }
      })

      // 1. Import patterns: import { TypeA, TypeB } from '...'
      const importMatches = content.match(/import\s*{([^}]+)}/g) || []
      importMatches.forEach((match) => {
        const imports = match.match(/{([^}]+)}/)[1]
        imports.split(',').forEach((imp) => {
          const name = imp.trim().split(' as ')[0].trim()
          this.allUsages.add(name)
        })
      })

      // 2. NestJS useClass pattern: useClass: ClassName
      const useClassMatches = content.match(/useClass:\s*([A-Za-z_][A-Za-z0-9_]*)/g) || []
      useClassMatches.forEach((match) => {
        const name = match.split(':')[1].trim()
        this.allUsages.add(name)
      })

      // 3. NestJS provide pattern: provide: TOKEN_NAME
      const provideMatches = content.match(/provide:\s*([A-Z_][A-Z0-9_]*)/g) || []
      provideMatches.forEach((match) => {
        const name = match.split(':')[1].trim()
        this.allUsages.add(name)
      })

      // 4. Type annotations: : TypeName
      const typeMatches = content.match(/:\s*([A-Z][A-Za-z0-9_]*)/g) || []
      typeMatches.forEach((match) => {
        const name = match.slice(1).trim()
        // Skip built-in types
        if (!['Boolean', 'String', 'Number', 'Array', 'Object', 'Date', 'Promise'].includes(name)) {
          this.allUsages.add(name)
        }
      })

      // 5. Class extends/implements
      const extendsMatches = content.match(/(?:extends|implements)\s+([A-Z][A-Za-z0-9_]*)/g) || []
      extendsMatches.forEach((match) => {
        const name = match.split(/\s+/)[1]
        this.allUsages.add(name)
      })

      // 6. Generic types: <TypeName>
      const genericMatches = content.match(/<([A-Z][A-Za-z0-9_]*)/g) || []
      genericMatches.forEach((match) => {
        const name = match.slice(1)
        this.allUsages.add(name)
      })

      // 7. Constructor calls: new ClassName
      const constructorMatches = content.match(/new\s+([A-Z][A-Za-z0-9_]*)/g) || []
      constructorMatches.forEach((match) => {
        const name = match.split(/\s+/)[1]
        this.allUsages.add(name)
      })

      // 8. Decorator parameters: @Decorator(ClassName)
      const decoratorMatches = content.match(/@[A-Za-z]+\(([A-Z][A-Za-z0-9_]*)\)/g) || []
      decoratorMatches.forEach((match) => {
        const name = match.match(/\(([^)]+)\)/)[1]
        this.allUsages.add(name)
      })

      // 9. typeof usage: typeof VariableName (real cross-references)
      const typeofMatches = content.match(/=\s*z\.infer<typeof\s+([A-Z][A-Za-z0-9_]*)/g) || []
      typeofMatches.forEach((match) => {
        const nameMatch = match.match(/typeof\s+([A-Z][A-Za-z0-9_]*)/)
        if (nameMatch) {
          this.allUsages.add(nameMatch[1])
        }
      })

      // 10. Function call parameters: functionName(VariableName)
      const functionCallMatches = content.match(/\w+\(([A-Z][A-Za-z0-9_]*)\)/g) || []
      functionCallMatches.forEach((match) => {
        const paramMatch = match.match(/\(([A-Z][A-Za-z0-9_]*)\)/)
        if (paramMatch) {
          this.allUsages.add(paramMatch[1])
        }
      })

      // 11. General variable/constant usage: VariableName (not in type position)
      const variableMatches = content.match(/\b([A-Z][A-Za-z0-9_]*)\b/g) || []
      variableMatches.forEach((name) => {
        // Skip if this is an export from the same file
        if (fileExports.has(name)) {
          return
        }

        // Skip common false positives and built-in types
        if (
          ![
            'Boolean',
            'String',
            'Number',
            'Array',
            'Object',
            'Date',
            'Promise',
            'Module',
            'Injectable',
            'Controller',
            'Service',
            'Repository',
            'Get',
            'Post',
            'Put',
            'Delete',
            'Patch',
            'Body',
            'Param',
            'Query',
            'Type',
            'Interface',
            'Enum',
            'Class',
            'Function',
            'Const',
          ].includes(name)
        ) {
          this.allUsages.add(name)
        }
      })
    } catch (error) {
      // Skip files that can't be read
    }
  }

  // Scan all files in directory
  scanDirectory(dir, forExports = false) {
    if (!fs.existsSync(dir)) return

    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir)

      items.forEach((item) => {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)

        // Skip node_modules, dist, and specific libs (contracts, database)
        const ignoredDirs = ['node_modules', 'dist', 'contracts', 'database']
        if (stat.isDirectory() && !ignoredDirs.includes(item)) {
          scan(fullPath)
        } else if (item.endsWith('.ts') && !this.shouldIgnoreFile(fullPath)) {
          if (forExports) {
            this.parseTypeScriptFile(fullPath)
          } else {
            this.parseTypeScriptFile(fullPath) // Parse for both exports and usages
            this.scanFileForUsages(fullPath) // Keep legacy usage scanning for imports
          }
        }
      })
    }

    scan(dir)
  }

  // Main analysis
  analyze() {
    const apps = this.findApps()

    if (this.ignorePatterns.length > 0) {
      console.log(`Ignoring: ${this.ignorePatterns.join(', ')}`)
    }

    // Scan all files for both exports and usages
    this.scanDirectory('libs', true)
    apps.forEach((app) => {
      this.scanDirectory(`apps/${app}/src`, true)
    })

    // Second pass for usage detection
    this.scanDirectory('libs', false)
    apps.forEach((app) => {
      this.scanDirectory(`apps/${app}/src`, false)
    })

    const unused = []

    // Check unused exports (legacy)
    for (const [name, info] of this.allExports) {
      if (!this.allUsages.has(name)) {
        unused.push({ name, ...info, category: 'export' })
      }
    }

    // Check unused interface methods
    for (const [methodKey, info] of this.allMethods) {
      if (info.isInterface && !this.methodUsages.has(methodKey) && !this.methodUsages.has(methodKey.split('.')[1])) {
        unused.push({
          name: methodKey,
          ...info,
          type: 'interface method',
          category: 'method',
        })
      }
    }

    // Check unused class methods (only for classes that don't implement interfaces)
    for (const [methodKey, info] of this.allMethods) {
      if (!info.isInterface) {
        const className = info.className
        const classInfo = this.allClasses.get(className)

        if (classInfo && !classInfo.implementsInterface) {
          if (!this.methodUsages.has(methodKey) && !this.methodUsages.has(methodKey.split('.')[1])) {
            unused.push({
              name: methodKey,
              ...info,
              type: 'class method',
              category: 'method',
            })
          }
        }
      }
    }

    // Check unused functions (skip ignored function patterns and comments)
    for (const [functionName, info] of this.allFunctions) {
      if (!this.functionUsages.has(functionName) && !this.shouldIgnoreFunction(functionName, info.file, info.line)) {
        unused.push({
          name: functionName,
          ...info,
          type: 'function',
          category: 'function',
        })
      }
    }

    // Check unused classes (only exported ones, skip ignored patterns and comments)
    for (const [className, info] of this.allClasses) {
      if (
        info.exported &&
        !this.classUsages.has(className) &&
        !this.shouldIgnoreClass(className, info.file, info.line)
      ) {
        unused.push({
          name: className,
          ...info,
          type: 'class',
          category: 'class',
        })
      }
    }

    // Check unused interfaces
    for (const [interfaceName, info] of this.allInterfaces) {
      if (!this.interfaceUsages.has(interfaceName)) {
        unused.push({
          name: interfaceName,
          ...info,
          type: 'interface',
          category: 'interface',
        })
      }
    }

    return unused
  }

  // Generate report
  report(unused) {
    if (unused.length === 0) {
      console.log('✅ No unused code found!')
      return
    }

    console.log(`❌ Found ${unused.length} unused items:\n`)

    // Group by file
    const byFile = {}
    unused.forEach((item) => {
      const file = path.relative(process.cwd(), item.file)
      if (!byFile[file]) byFile[file] = []
      byFile[file].push(item)
    })

    // Sort and display
    Object.keys(byFile)
      .sort()
      .forEach((file) => {
        console.log(`📁 ${file}:`)
        byFile[file]
          .sort((a, b) => a.line - b.line)
          .forEach((item) => {
            const icon = this.getCategoryIcon(item.category || 'export')
            console.log(`  ${icon} ${item.type || 'export'} ${item.name} (line ${item.line})`)
          })
        console.log()
      })

    // Summary by category
    const byCategory = {}
    unused.forEach((item) => {
      const category = item.category || 'export'
      byCategory[category] = (byCategory[category] || 0) + 1
    })

    console.log('📊 Summary:')
    Object.entries(byCategory).forEach(([category, count]) => {
      const icon = this.getCategoryIcon(category)
      console.log(`  ${icon} ${category}: ${count}`)
    })
  }

  // Get icon for category
  getCategoryIcon(category) {
    const icons = {
      export: '📦',
      method: '🔧',
      function: '⚡',
      class: '🏗️',
      interface: '📋',
    }
    return icons[category] || '❌'
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🚀 Enhanced NestJS Unused Code Detector (TypeScript Compiler API)

Detects unused exports, classes, methods, and functions with cross-file analysis.

Usage: node unused-detector.js [options]

Options:
  --help, -h      Show this help message
  --version, -v   Show version
  --json          Output as JSON
  --exit-code     Exit with code 1 if unused code found
  --limit N       Show only first N results (default: all)
  --ignore PATHS  Comma-separated paths to ignore
  --methods-only  Only check for unused methods
  --functions-only Only check for unused functions
  --classes-only  Only check for unused classes
  --show-excluded Show files that are being excluded

Features:
  ✅ Interface method usage analysis
  ✅ Cross-file method detection
  ✅ NestJS decorator exclusions
  ✅ Strategy pattern recognition
  ✅ Dependency injection awareness
  ✅ TypeScript AST analysis
  ✅ Configuration file exclusions (.unusedrc.js)
  ✅ Comment-based exclusions (// @unused-ignore)
  ✅ Smart function pattern filtering

Examples:
  node unused-detector.js
  node unused-detector.js --json
  node unused-detector.js --methods-only
  node unused-detector.js --limit 10
  node unused-detector.js --ignore "libs/common/"
  node unused-detector.js --exit-code  # For CI/CD

Exclusion Methods:
  1. Configuration file (.unusedrc.js):
     module.exports = {
       ignorePatterns: ['custom/path/'],
       ignoredFunctionPatterns: [/^helper.*$/]
     }

  2. Comment-based exclusions:
     // @unused-ignore
     export class MyClass { /* won't be reported */ }
`)
    return
  }

  if (args.includes('--version') || args.includes('-v')) {
    console.log('unused-detector v2.0.0 - Enhanced NestJS Edition with TypeScript Compiler API')
    return
  }

  const limitIndex = args.indexOf('--limit')
  const limit = limitIndex !== -1 && args[limitIndex + 1] ? parseInt(args[limitIndex + 1]) : null

  const ignoreIndex = args.indexOf('--ignore')
  const ignorePatterns = ignoreIndex !== -1 && args[ignoreIndex + 1] ? args[ignoreIndex + 1].split(',') : []

  const detector = new UnusedDetector({ ignorePatterns })
  let unused = detector.analyze()

  // Apply filtering based on arguments
  if (args.includes('--methods-only')) {
    unused = unused.filter((item) => item.category === 'method')
  } else if (args.includes('--functions-only')) {
    unused = unused.filter((item) => item.category === 'function')
  } else if (args.includes('--classes-only')) {
    unused = unused.filter((item) => item.category === 'class')
  }

  if (limit && unused.length > limit) {
    console.log(`📝 Limiting results to first ${limit} items (total: ${unused.length})`)
    unused = unused.slice(0, limit)
  }

  if (args.includes('--json')) {
    console.log(JSON.stringify(unused, null, 2))
  } else {
    detector.report(unused)
  }

  if (args.includes('--exit-code') && unused.length > 0) {
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}
