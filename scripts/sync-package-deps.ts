#!/usr/bin/env npx ts-node

/**
 * Script to scan all imports in each lib/app module and sync dependencies in package.json
 *
 * Usage: npx ts-node scripts/sync-package-deps.ts [--dry-run] [--module <module-name>] [--strict] [--check-versions]
 *
 * Options:
 *   --dry-run         Show what would be changed without modifying files
 *   --module          Only process a specific module (e.g., --module bitcoin or --module api-server)
 *   --strict          Remove unused dependencies from libs/apps only (skips root package.json)
 *   --check-versions  Check for version mismatches across packages (exits with error if found)
 */
import * as fs from 'fs'
import * as path from 'path'

const LIBS_DIR = path.join(__dirname, '..', 'libs')
const APPS_DIR = path.join(__dirname, '..', 'apps')
const ROOT_PACKAGE_JSON = path.join(__dirname, '..', 'package.json')

// Known npm packages and their versions (from root package.json or common versions)
const NPM_PACKAGE_VERSIONS: Record<string, string> = {}

// Packages that should only be in devDependencies (not dependencies)
const DEV_ONLY_PACKAGES = new Set(['@nestjs/testing', '@types/node', 'typescript', '@swc/core', 'eslint', 'prettier'])

/**
 * Load always-keep dependencies from .keep-deps file in module directory.
 * Each line in the file is a package name that should always be kept.
 * Lines starting with # are comments.
 */
function loadKeepDeps(modulePath: string): string[] {
  const keepDepsFile = path.join(modulePath, '.keep-deps')
  if (!fs.existsSync(keepDepsFile)) {
    return []
  }

  const content = fs.readFileSync(keepDepsFile, 'utf-8')
  return content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
}

// Packages that should be ignored (built-in node modules, relative imports, etc.)
const IGNORE_PACKAGES = new Set([
  'fs',
  'path',
  'crypto',
  'util',
  'events',
  'stream',
  'buffer',
  'url',
  'querystring',
  'http',
  'https',
  'net',
  'os',
  'child_process',
  'assert',
  'tty',
  'readline',
  'dns',
  'dgram',
  'cluster',
  'v8',
  'vm',
  'zlib',
  'string_decoder',
  'timers',
  'constants',
  'domain',
  'process',
  'punycode',
  'tls',
  // Node.js prefixed imports (node:* protocol)
  'node:fs',
  'node:path',
  'node:crypto',
  'node:util',
  'node:events',
  'node:stream',
  'node:buffer',
  'node:url',
  'node:querystring',
  'node:http',
  'node:https',
  'node:net',
  'node:os',
  'node:child_process',
  'node:assert',
  'node:tty',
  'node:readline',
  'node:dns',
  'node:dgram',
  'node:cluster',
  'node:v8',
  'node:vm',
  'node:zlib',
  'node:string_decoder',
  'node:timers',
  'node:constants',
  'node:domain',
  'node:process',
  'node:punycode',
  'node:tls',
])

// Load versions from root package.json
function loadRootPackageVersions(): void {
  try {
    const rootPkg = JSON.parse(fs.readFileSync(ROOT_PACKAGE_JSON, 'utf-8'))
    const allDeps = {
      ...rootPkg.dependencies,
      ...rootPkg.devDependencies,
    }
    Object.assign(NPM_PACKAGE_VERSIONS, allDeps)
  } catch (error) {
    console.error('Warning: Could not load root package.json')
  }
}

// Get all TypeScript/JavaScript files in a directory recursively
function getSourceFiles(dir: string): string[] {
  const files: string[] = []

  function walk(currentDir: string) {
    if (!fs.existsSync(currentDir)) return

    const entries = fs.readdirSync(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name)

      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'dist') {
        walk(fullPath)
      } else if (entry.isFile() && /\.(ts|tsx|js|jsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        files.push(fullPath)
      }
    }
  }

  walk(dir)
  return files
}

// Extract package names from import statements
function extractImports(filePath: string): Set<string> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const imports = new Set<string>()

  // Match various import patterns (using [\s\S] to match across newlines for multi-line imports)
  const importPatterns = [
    /import\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g, // import X from 'package' (multi-line)
    /import\s+['"]([^'"]+)['"]/g, // import 'package'
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g, // require('package')
    /export\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g, // export X from 'package' (multi-line)
  ]

  for (const pattern of importPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1]

      // Skip relative imports
      if (importPath.startsWith('.') || importPath.startsWith('/')) {
        continue
      }

      // Extract package name (handle scoped packages)
      let packageName: string
      if (importPath.startsWith('@')) {
        // Scoped package: @scope/package or @scope/package/subpath
        const parts = importPath.split('/')
        packageName = `${parts[0]}/${parts[1]}`
      } else {
        // Regular package: package or package/subpath
        packageName = importPath.split('/')[0]
      }

      // Skip built-in modules
      if (!IGNORE_PACKAGES.has(packageName)) {
        imports.add(packageName)
      }
    }
  }

  return imports
}

// Get all imports for a module
function getModuleImports(modulePath: string, isRoot = false): Set<string> {
  const allImports = new Set<string>()

  if (isRoot) {
    // For root, scan scripts/ directory
    const scriptsDir = path.join(modulePath, 'scripts')
    if (fs.existsSync(scriptsDir)) {
      const files = getSourceFiles(scriptsDir)
      for (const file of files) {
        const imports = extractImports(file)
        imports.forEach((imp) => allImports.add(imp))
      }
    }
  } else {
    // For libs/apps, scan src/ directory
    const srcDir = path.join(modulePath, 'src')
    if (!fs.existsSync(srcDir)) {
      return new Set()
    }
    const files = getSourceFiles(srcDir)
    for (const file of files) {
      const imports = extractImports(file)
      imports.forEach((imp) => allImports.add(imp))
    }
  }

  return allImports
}

// Categorize imports into internal (@vyrak) and external (npm)
function categorizeImports(imports: Set<string>): { internal: string[]; external: string[] } {
  const internal: string[] = []
  const external: string[] = []

  for (const imp of imports) {
    if (imp.startsWith('@vyrak/')) {
      internal.push(imp)
    } else {
      external.push(imp)
    }
  }

  return {
    internal: internal.sort(),
    external: external.sort(),
  }
}

// Get version for an external package
function getPackageVersion(packageName: string): string | null {
  // First check root package.json
  if (NPM_PACKAGE_VERSIONS[packageName]) {
    return NPM_PACKAGE_VERSIONS[packageName]
  }

  // Try to find version from node_modules
  try {
    const pkgPath = path.join(__dirname, '..', 'node_modules', packageName, 'package.json')
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
      return `^${pkg.version}`
    }
  } catch {
    // Ignore errors
  }

  return null
}

// Get peer dependencies of imported packages from node_modules
function getPeerDepsOfImports(imports: string[]): Set<string> {
  const peerDeps = new Set<string>()

  for (const imp of imports) {
    try {
      const pkgPath = path.join(__dirname, '..', 'node_modules', imp, 'package.json')
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
        if (pkg.peerDependencies) {
          Object.keys(pkg.peerDependencies).forEach((dep) => peerDeps.add(dep))
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return peerDeps
}

// Update package.json for a module
function updatePackageJson(
  modulePath: string,
  imports: { internal: string[]; external: string[] },
  dryRun: boolean,
  strict: boolean,
  isRoot: boolean = false
): { added: string[]; removed: string[]; kept: string[]; movedToDev: string[] } {
  const pkgPath = path.join(modulePath, 'package.json')

  if (!fs.existsSync(pkgPath)) {
    console.error(`  Warning: package.json not found at ${pkgPath}`)
    return { added: [], removed: [], kept: [], movedToDev: [] }
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
  const currentDeps: Record<string, string> = pkg.dependencies || {}
  const currentDevDeps: Record<string, string> = pkg.devDependencies || {}
  const moduleName = pkg.name

  // Load always-keep dependencies from .keep-deps file
  const keepDeps = new Set(loadKeepDeps(modulePath))

  // Get peer dependencies of imported packages
  const peerDepsOfImports = getPeerDepsOfImports(imports.external)

  // Build new dependencies from imports (separate prod and dev)
  const importedDeps: Record<string, string> = {}
  const importedDevDeps: Record<string, string> = {}
  const added: string[] = []
  const movedToDev: string[] = []

  // Add internal dependencies (always prod deps)
  for (const dep of imports.internal) {
    // Skip self-reference
    if (dep === moduleName) continue

    importedDeps[dep] = '*'
    if (!currentDeps[dep]) {
      added.push(dep)
    }
  }

  // Add external dependencies (check if dev-only)
  for (const dep of imports.external) {
    const isDevOnly = DEV_ONLY_PACKAGES.has(dep)
    const version = currentDeps[dep] || currentDevDeps[dep] || getPackageVersion(dep)

    if (version) {
      if (isDevOnly) {
        importedDevDeps[dep] = version
        // Check if it was incorrectly in dependencies
        if (currentDeps[dep] && !currentDevDeps[dep]) {
          movedToDev.push(dep)
        } else if (!currentDevDeps[dep]) {
          added.push(`${dep} (dev)`)
        }
      } else {
        importedDeps[dep] = version
        if (!currentDeps[dep]) {
          added.push(dep)
        }
      }
    } else {
      console.error(`  Warning: Could not find version for ${dep}`)
    }
  }

  // Add peer dependencies of imported packages
  // Optional NestJS peer deps that are typically not needed unless explicitly used
  const optionalNestJsPeerDeps = new Set(['@nestjs/microservices', '@nestjs/websockets'])

  for (const peerDep of peerDepsOfImports) {
    // Skip if already in importedDeps or importedDevDeps or is a dev-only package
    if (importedDeps[peerDep] || importedDevDeps[peerDep] || DEV_ONLY_PACKAGES.has(peerDep)) {
      continue
    }
    // Skip internal packages
    if (peerDep.startsWith('@vyrak/')) {
      continue
    }
    // Skip optional NestJS peer deps
    if (optionalNestJsPeerDeps.has(peerDep)) {
      continue
    }

    const version = currentDeps[peerDep] || getPackageVersion(peerDep)
    if (version) {
      importedDeps[peerDep] = version
      if (!currentDeps[peerDep]) {
        added.push(`${peerDep} (peer)`)
      }
    }
  }

  // Determine final dependencies
  let finalDeps: Record<string, string>
  let finalDevDeps: Record<string, string>
  const removed: string[] = []
  const kept: string[] = []

  // In strict mode, skip removal for root package.json (only remove from libs/apps)
  const applyStrictRemoval = strict && !isRoot

  if (applyStrictRemoval) {
    // Strict mode: only keep imported dependencies + keep-deps
    finalDeps = { ...importedDeps }
    finalDevDeps = { ...currentDevDeps, ...importedDevDeps }

    // Add keep-deps packages (from .keep-deps file)
    for (const dep of keepDeps) {
      if (currentDeps[dep] && !finalDeps[dep]) {
        finalDeps[dep] = currentDeps[dep]
      }
    }

    // Remove dev-only packages from dependencies
    for (const dep of Object.keys(finalDeps)) {
      if (DEV_ONLY_PACKAGES.has(dep)) {
        delete finalDeps[dep]
      }
    }

    for (const dep of Object.keys(currentDeps)) {
      if (!importedDeps[dep] && !DEV_ONLY_PACKAGES.has(dep) && !keepDeps.has(dep)) {
        removed.push(dep)
      }
    }
  } else {
    // Default mode: keep existing dependencies, add new imports
    finalDeps = { ...currentDeps }
    finalDevDeps = { ...currentDevDeps }

    // Add new imports
    for (const [dep, version] of Object.entries(importedDeps)) {
      finalDeps[dep] = version
    }
    for (const [dep, version] of Object.entries(importedDevDeps)) {
      finalDevDeps[dep] = version
    }

    // Move dev-only packages from dependencies to devDependencies
    for (const dep of Object.keys(finalDeps)) {
      if (DEV_ONLY_PACKAGES.has(dep)) {
        const version = finalDeps[dep]
        delete finalDeps[dep]
        finalDevDeps[dep] = version
        if (!movedToDev.includes(dep)) {
          movedToDev.push(dep)
        }
      }
    }

    // Track what we're keeping that's not imported
    for (const dep of Object.keys(currentDeps)) {
      if (!importedDeps[dep] && !DEV_ONLY_PACKAGES.has(dep)) {
        kept.push(dep)
      }
    }
  }

  // Sort dependencies alphabetically (internal first, then external)
  const sortDeps = (deps: Record<string, string>): Record<string, string> => {
    const sorted: Record<string, string> = {}
    const internalKeys = Object.keys(deps)
      .filter((k) => k.startsWith('@vyrak/'))
      .sort()
    const externalKeys = Object.keys(deps)
      .filter((k) => !k.startsWith('@vyrak/'))
      .sort()

    for (const key of [...internalKeys, ...externalKeys]) {
      sorted[key] = deps[key]
    }
    return sorted
  }

  const sortedDeps = sortDeps(finalDeps)
  const sortedDevDeps = sortDeps(finalDevDeps)

  // Update package.json
  const hasChanges = added.length > 0 || removed.length > 0 || movedToDev.length > 0
  if (!dryRun && hasChanges) {
    pkg.dependencies = sortedDeps
    if (Object.keys(sortedDevDeps).length > 0) {
      pkg.devDependencies = sortedDevDeps
    }
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  }

  return { added, removed, kept, movedToDev }
}

// Check for version mismatches across all packages
function checkVersionMismatches(modules: { name: string; path: string; type: string }[]): {
  mismatches: Map<string, { version: string; modules: string[] }[]>
  hasMismatches: boolean
} {
  // Map: packageName -> Map<version, modules[]>
  const packageVersions = new Map<string, Map<string, string[]>>()

  for (const module of modules) {
    const pkgPath = path.join(module.path, 'package.json')
    if (!fs.existsSync(pkgPath)) continue

    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

    for (const [depName, version] of Object.entries(allDeps)) {
      // Skip internal packages
      if (depName.startsWith('@vyrak/')) continue
      // Skip wildcard versions
      if (version === '*') continue

      if (!packageVersions.has(depName)) {
        packageVersions.set(depName, new Map())
      }

      const versionMap = packageVersions.get(depName)!
      const versionStr = version as string
      if (!versionMap.has(versionStr)) {
        versionMap.set(versionStr, [])
      }
      versionMap.get(versionStr)!.push(module.name)
    }
  }

  // Find packages with multiple versions
  const mismatches = new Map<string, { version: string; modules: string[] }[]>()

  for (const [pkgName, versionMap] of packageVersions) {
    if (versionMap.size > 1) {
      const versions: { version: string; modules: string[] }[] = []
      for (const [version, modules] of versionMap) {
        versions.push({ version, modules })
      }
      // Sort by number of modules using this version (descending)
      versions.sort((a, b) => b.modules.length - a.modules.length)
      mismatches.set(pkgName, versions)
    }
  }

  return { mismatches, hasMismatches: mismatches.size > 0 }
}

// Main function
function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const strict = args.includes('--strict')
  const checkVersions = args.includes('--check-versions')
  const moduleIndex = args.indexOf('--module')
  const targetModule = moduleIndex !== -1 ? args[moduleIndex + 1] : null

  console.log('🔍 Scanning module dependencies...\n')
  if (dryRun) {
    console.log('📝 DRY RUN MODE - No files will be modified\n')
  }
  if (strict) {
    console.log('⚠️  STRICT MODE - Unused dependencies will be removed from libs/apps (root skipped)\n')
  }
  if (checkVersions) {
    console.log('🔎 VERSION CHECK MODE - Will detect version mismatches\n')
  }

  loadRootPackageVersions()

  // Get root package (scripts/ directory as source)
  const ROOT_DIR = path.join(__dirname, '..')
  const root = [{ name: 'root', path: ROOT_DIR, type: 'root' }]

  // Get all libs
  const libs = fs
    .readdirSync(LIBS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: path.join(LIBS_DIR, entry.name), type: 'lib' }))

  // Get all apps
  const apps = fs
    .readdirSync(APPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({ name: entry.name, path: path.join(APPS_DIR, entry.name), type: 'app' }))

  // Combine and filter
  const modules = [...root, ...libs, ...apps]
    .filter((m) => !targetModule || m.name === targetModule)
    .sort((a, b) => a.name.localeCompare(b.name))

  if (targetModule && modules.length === 0) {
    console.error(`Module '${targetModule}' not found in libs/ or apps/`)
    process.exit(1)
  }

  let totalAdded = 0
  let totalRemoved = 0
  let totalMoved = 0

  for (const module of modules) {
    const { name: moduleName, path: modulePath, type } = module
    console.log(`📦 ${moduleName} (${type})`)

    // Get imports
    const imports = getModuleImports(modulePath, type === 'root')
    const categorized = categorizeImports(imports)

    // Update package.json (pass isRoot flag to skip strict removal for root)
    const isRoot = type === 'root'
    const { added, removed, kept, movedToDev } = updatePackageJson(modulePath, categorized, dryRun, strict, isRoot)

    if (added.length > 0) {
      console.log(`   ➕ Added: ${added.join(', ')}`)
      totalAdded += added.length
    }

    if (removed.length > 0) {
      console.log(`   ➖ Removed: ${removed.join(', ')}`)
      totalRemoved += removed.length
    }

    if (movedToDev.length > 0) {
      console.log(`   🔄 Moved to devDependencies: ${movedToDev.join(', ')}`)
      totalMoved += movedToDev.length
    }

    if (!strict && kept.length > 0) {
      console.log(`   📌 Kept (not imported): ${kept.join(', ')}`)
    }

    if (added.length === 0 && removed.length === 0 && movedToDev.length === 0) {
      console.log('   ✅ No changes needed')
    }

    console.log('')
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📊 Summary: ${totalAdded} added, ${totalRemoved} removed, ${totalMoved} moved to devDeps`)

  if (dryRun && (totalAdded > 0 || totalRemoved > 0)) {
    console.log('\n💡 Run without --dry-run to apply changes')
  }

  if (!strict) {
    console.log('\n💡 Use --strict to remove unused dependencies')
  }

  // Check for version mismatches
  if (checkVersions) {
    // Get all modules for version check (ignore target module filter)
    const allRoot = [{ name: 'root', path: ROOT_DIR, type: 'root' }]

    const allLibs = fs
      .readdirSync(LIBS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ name: entry.name, path: path.join(LIBS_DIR, entry.name), type: 'lib' }))

    const allApps = fs
      .readdirSync(APPS_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({ name: entry.name, path: path.join(APPS_DIR, entry.name), type: 'app' }))

    const allModules = [...allRoot, ...allLibs, ...allApps]

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔎 Checking for version mismatches across packages...\n')

    const { mismatches, hasMismatches } = checkVersionMismatches(allModules)

    if (hasMismatches) {
      console.log('❌ VERSION MISMATCHES DETECTED:\n')

      for (const [pkgName, versions] of mismatches) {
        console.log(`  📦 ${pkgName}:`)
        for (const { version, modules: mods } of versions) {
          console.log(`     ${version} → ${mods.join(', ')}`)
        }
        // Suggest the highest version (strip ^ or ~ prefix for comparison)
        const parseVersion = (v: string) => v.replace(/^[\^~]/, '')
        const sortedVersions = [...versions].sort((a, b) => {
          const vA = parseVersion(a.version).split('.').map(Number)
          const vB = parseVersion(b.version).split('.').map(Number)
          for (let i = 0; i < Math.max(vA.length, vB.length); i++) {
            const diff = (vB[i] || 0) - (vA[i] || 0)
            if (diff !== 0) return diff
          }
          return 0
        })
        const suggestedVersion = sortedVersions[0].version
        console.log(`     💡 Suggested: use "${suggestedVersion}" everywhere\n`)
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`\n❌ Found ${mismatches.size} package(s) with version mismatches.`)
      console.log('   Fix these to avoid inconsistent builds.')
      process.exit(1)
    } else {
      console.log('✅ No version mismatches found - all packages use consistent versions!')
    }
  }
}

main()
