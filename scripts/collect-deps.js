#!/usr/bin/env node

/**
 * Collects all production dependencies from an app and its workspace libs recursively.
 * Similar to how Nx resolves project dependencies.
 *
 * Usage: node scripts/collect-deps.js [app-name] [output-format]
 * Example: node scripts/collect-deps.js api-server json
 * Example: node scripts/collect-deps.js api-server package > prod-package.json
 */

const fs = require('fs')
const path = require('path')

const ROOT_DIR = path.resolve(__dirname, '..')
const WORKSPACE_PREFIX = '@vyrak/'

function readPackageJson(pkgPath) {
  try {
    const content = fs.readFileSync(pkgPath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    console.error(`Failed to read ${pkgPath}:`, err.message)
    return null
  }
}

function getLibPath(libName) {
  // @vyrak/custom-config -> libs/custom-config
  const shortName = libName.replace(WORKSPACE_PREFIX, '')
  return path.join(ROOT_DIR, 'libs', shortName, 'package.json')
}

function collectDependencies(pkgJsonPath, visited = new Set(), allDeps = {}) {
  if (visited.has(pkgJsonPath)) {
    return allDeps
  }
  visited.add(pkgJsonPath)

  const pkg = readPackageJson(pkgJsonPath)
  if (!pkg) {
    return allDeps
  }

  const deps = pkg.dependencies || {}

  for (const [depName, depVersion] of Object.entries(deps)) {
    if (depName.startsWith(WORKSPACE_PREFIX)) {
      // This is a workspace lib, recurse into it
      const libPkgPath = getLibPath(depName)
      if (fs.existsSync(libPkgPath)) {
        collectDependencies(libPkgPath, visited, allDeps)
      }
    } else if (depName.startsWith('@apps/')) {
      // Skip app references
      continue
    } else {
      // External dependency - add to collection
      // If already exists, keep the higher version (simple semver comparison)
      if (!allDeps[depName] || depVersion > allDeps[depName]) {
        allDeps[depName] = depVersion
      }
    }
  }

  return allDeps
}

function main() {
  const appName = process.argv[2] || 'api-server'
  const appPkgPath = path.join(ROOT_DIR, 'apps', appName, 'package.json')

  if (!fs.existsSync(appPkgPath)) {
    console.error(`App not found: ${appPkgPath}`)
    process.exit(1)
  }

  console.error(`Collecting dependencies for: ${appName}`)
  console.error(`App package.json: ${appPkgPath}\n`)

  const allDeps = collectDependencies(appPkgPath)

  // Also include root package.json dependencies (runtime deps like @prisma/client)
  const rootPkg = readPackageJson(path.join(ROOT_DIR, 'package.json'))
  if (rootPkg && rootPkg.dependencies) {
    for (const [depName, depVersion] of Object.entries(rootPkg.dependencies)) {
      if (!allDeps[depName]) {
        allDeps[depName] = depVersion
      }
    }
  }

  // Add prisma CLI for runtime migrations (same version as @prisma/client)
  if (allDeps['@prisma/client'] && !allDeps['prisma']) {
    allDeps['prisma'] = allDeps['@prisma/client']
  }

  // Sort dependencies alphabetically
  const sortedDeps = Object.keys(allDeps)
    .sort()
    .reduce((acc, key) => {
      acc[key] = allDeps[key]
      return acc
    }, {})

  // Output format based on flag
  const outputFormat = process.argv[3] || 'json'

  if (outputFormat === 'json') {
    console.log(JSON.stringify(sortedDeps, null, 2))
  } else if (outputFormat === 'list') {
    for (const [name, version] of Object.entries(sortedDeps)) {
      console.log(`${name}@${version}`)
    }
  } else if (outputFormat === 'install') {
    // Output as yarn add command
    const packages = Object.entries(sortedDeps)
      .map(([name, version]) => `"${name}@${version}"`)
      .join(' ')
    console.log(`yarn add ${packages}`)
  } else if (outputFormat === 'package') {
    // Output as a complete package.json for production install
    const prodPackage = {
      name: `${appName}-production`,
      version: '1.0.0',
      private: true,
      dependencies: sortedDeps,
    }
    console.log(JSON.stringify(prodPackage, null, 2))
  }

  console.error(`\nTotal external dependencies: ${Object.keys(sortedDeps).length}`)
}

main()
