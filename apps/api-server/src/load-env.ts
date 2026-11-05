import { config as loadDotenv } from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'

function findProjectRoot(): string {
  let currentDir = process.cwd()
  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, 'config')) && fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml'))) {
      return currentDir
    }
    currentDir = path.dirname(currentDir)
  }
  return process.cwd()
}

const envPath = path.join(findProjectRoot(), 'apps/api-server/.env')
if (fs.existsSync(envPath)) {
  loadDotenv({ path: envPath })
}
