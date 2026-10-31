import fs from 'node:fs/promises'
import path from 'node:path'

const MAX_FILE_BYTES = 32_000
const MAX_TOTAL_BYTES = 96_000

export type LoadedRepoFile = {
  path: string
  content: string
  bytes: number
}

function isSafeRelativePath(relativePath: string): boolean {
  const normalized = path.posix.normalize(relativePath.replace(/\\/g, '/'))
  return !normalized.startsWith('..') && !path.isAbsolute(normalized)
}

async function tryReadFile(repoRoot: string, relativePath: string): Promise<LoadedRepoFile | null> {
  if (!isSafeRelativePath(relativePath)) {
    return null
  }

  const fullPath = path.join(repoRoot, relativePath)
  const resolvedRoot = path.resolve(repoRoot)
  const resolvedFile = path.resolve(fullPath)
  if (!resolvedFile.startsWith(resolvedRoot + path.sep) && resolvedFile !== resolvedRoot) {
    return null
  }

  try {
    const stat = await fs.stat(resolvedFile)
    if (!stat.isFile() || stat.size > MAX_FILE_BYTES) {
      return null
    }
    const content = await fs.readFile(resolvedFile, 'utf8')
    return { path: relativePath, content, bytes: Buffer.byteLength(content, 'utf8') }
  } catch {
    return null
  }
}

export async function loadRepoFilesFromRoots(repoRoots: string[], relativePaths: string[]): Promise<LoadedRepoFile[]> {
  const loaded: LoadedRepoFile[] = []
  let totalBytes = 0

  for (const relativePath of relativePaths) {
    for (const root of repoRoots) {
      const file = await tryReadFile(root, relativePath)
      if (!file) continue
      if (totalBytes + file.bytes > MAX_TOTAL_BYTES) {
        return loaded
      }
      loaded.push(file)
      totalBytes += file.bytes
      break
    }
  }

  return loaded
}

export async function discoverRepoRoots(candidates: string[]): Promise<string[]> {
  const existing: string[] = []
  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate)
      if (stat.isDirectory()) {
        existing.push(candidate)
      }
    } catch {
      // skip
    }
  }
  return existing
}

export function buildDefaultRepoPaths(): string[] {
  return ['README.md', 'package.json', 'CLAUDE.md', 'prisma/schema.prisma']
}
