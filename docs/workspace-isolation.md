# Workspace Isolation

**Last Updated:** 2026-10-25  
**Module:** `libs/agent-runtime`  
**Epic:** Epic 3 - Agent Runtime Integration

---

## Overview

The Vyrak AI-SDLC platform provides isolated workspace environments for each workflow run to ensure:

- **No interference** between parallel workflow executions
- **Clean state** for each agent execution
- **Resource efficiency** through git worktree reuse
- **Safe cleanup** without affecting other runs

---

## Architecture

### Workspace Structure

```
/var/vyrak/repos/
└── {orgId}/
    └── {projectId}/
        └── main-repo/           ← Shared main repository
            └── .git/            ← Shared git database

/tmp/vyrak-workspaces/
└── {runId}/
    ├── repo/                    ← Git worktree (isolated branch)
    ├── artifacts/               ← Agent outputs
    └── .metadata.json           ← Workspace metadata
```

### Two Isolation Modes

#### 1. Full Clone Mode (Default - Epic 3)

**Use case:** Simple setup, one-off workflows, testing

```typescript
const workspace = await workspaceManager.createWorkspace(
  runId,
  repoUrl
)
// Creates: /tmp/vyrak-workspaces/{runId}/
//   ├── repo/        ← Full git clone
//   └── artifacts/
```

**Pros:**
- Simple implementation
- Independent workspace
- Easy cleanup

**Cons:**
- Slow (30-60s for large repos)
- High disk usage (~500MB per run)
- Not suitable for parallel runs

#### 2. Git Worktree Mode (Epic 3.5)

**Use case:** Parallel workflows, production deployments, frequent runs

```typescript
const workspace = await workspaceManager.createWorkspaceWithWorktree(
  runId,
  repoUrl,
  'main'  // base branch
)
// Creates worktree: /tmp/vyrak-workspaces/{runId}/repo
// Branch: workflow/{runId}
```

**Pros:**
- ⚡ Fast creation (~2-5s)
- 💾 Disk efficient (shared .git)
- 🔄 Parallel-safe (isolated branches)
- 🧹 Easy cleanup

**Cons:**
- Requires main repo setup
- Slightly more complex

---

## Implementation

### WorkspaceManager Interface

```typescript
interface IWorkspaceManager {
  // Full clone mode (Epic 3)
  createWorkspace(
    runId: string,
    repoUrl: string
  ): Promise<WorkspaceInfo>

  // Worktree mode (Epic 3.5)
  createWorkspaceWithWorktree(
    runId: string,
    repoUrl: string,
    baseBranch?: string,
    newBranch?: string
  ): Promise<WorkspaceInfo>

  // Cleanup
  cleanupWorkspace(runId: string): Promise<void>

  // List workspaces
  listWorkspaces(): Promise<WorkspaceMetadata[]>
  
  // List worktrees for a project
  listWorktrees(projectId: string): Promise<WorktreeInfo[]>
}

interface WorkspaceInfo {
  workspacePath: string      // /tmp/vyrak-workspaces/{runId}
  repoPath: string           // /tmp/vyrak-workspaces/{runId}/repo
  artifactsPath: string      // /tmp/vyrak-workspaces/{runId}/artifacts
  branchName?: string        // workflow/{runId} (worktree only)
  isWorktree: boolean        // true for worktree mode
  mainRepoPath?: string      // /var/vyrak/repos/{org}/{project}
}
```

### Worktree Workflow

```typescript
// 1. Create workspace with worktree
const workspace = await workspaceManager.createWorkspaceWithWorktree(
  'run-abc-123',
  'https://github.com/org/repo.git',
  'main'
)

// 2. Agent executes in isolated branch
const result = await agentExecutor.execute({
  agentType: AgentType.IMPLEMENTER,
  input: { requirement: '...' },
  workspacePath: workspace.repoPath,
})

// 3. Commit changes to workflow branch
await git.commit('feat: implement feature')

// 4. Create PR from workflow/{runId} → main
await gh.pr.create({
  head: workspace.branchName,
  base: 'main',
  title: 'AI Implementation: Feature XYZ'
})

// 5. Cleanup after merge
await workspaceManager.cleanupWorkspace('run-abc-123')
```

---

## Worktree Benefits

### 1. Performance Comparison

| Operation | Full Clone | Worktree | Improvement |
|-----------|------------|----------|-------------|
| Initial setup | 30-60s | 2-5s | **6-12x faster** |
| Disk per run | ~500MB | ~50MB | **10x savings** |
| Parallel runs | ❌ Conflicts | ✅ Isolated | Safe |

### 2. Resource Efficiency

**Example: 10 parallel workflows**

**Full Clone Mode:**
- Time: 10 × 45s = 7.5 minutes
- Disk: 10 × 500MB = 5GB
- Result: Sequential execution

**Worktree Mode:**
- Time: 10 × 3s = 30 seconds (parallel)
- Disk: 1 × 500MB + 10 × 50MB = 1GB
- Result: **15x faster, 5x less disk**

### 3. Parallel Safety

```
Main repo: /var/vyrak/repos/org-123/project-456/

Worktree 1 (branch: workflow/run-001)
├── Feature A implementation
└── No conflicts with others

Worktree 2 (branch: workflow/run-002)
├── Feature B implementation
└── Independent branch

Worktree 3 (branch: workflow/run-003)
├── Bug fix C
└── Isolated changes
```

---

## Configuration

### Environment Variables

```bash
# Workspace mode
WORKSPACE_MODE=worktree  # or "clone"

# Main repos location
MAIN_REPOS_PATH=/var/vyrak/repos

# Workspace temp location
WORKSPACES_PATH=/tmp/vyrak-workspaces

# Cleanup policy
WORKSPACE_CLEANUP_ON_SUCCESS=true
WORKSPACE_CLEANUP_ON_FAILURE=false  # Keep for debugging
```

### Project-level Configuration

```typescript
// libs/custom-config/src/workspace.config.ts
export interface WorkspaceConfig {
  mode: 'clone' | 'worktree'
  mainReposPath: string
  workspacesPath: string
  cleanupOnSuccess: boolean
  cleanupOnFailure: boolean
  worktreeOptions?: {
    baseBranch: string         // Default: 'main'
    branchPrefix: string       // Default: 'workflow/'
    autoFetch: boolean         // Fetch before creating worktree
    autoCleanupBranch: boolean // Delete branch after cleanup
  }
}
```

---

## Cleanup Strategy

### Automatic Cleanup

```typescript
// On workflow completion
async function onWorkflowComplete(runId: string, status: string) {
  const config = await getWorkspaceConfig()
  
  const shouldCleanup = 
    (status === 'succeeded' && config.cleanupOnSuccess) ||
    (status === 'failed' && config.cleanupOnFailure)
  
  if (shouldCleanup) {
    await workspaceManager.cleanupWorkspace(runId)
  }
}
```

### Manual Cleanup

```bash
# List all workspaces
yarn workspace:list

# Clean specific workspace
yarn workspace:clean <runId>

# Clean all completed workspaces
yarn workspace:clean-all

# Clean stale workspaces (>24h old)
yarn workspace:clean-stale
```

### Worktree-specific Cleanup

```typescript
async cleanupWorkspace(runId: string) {
  const workspace = await this.getWorkspaceInfo(runId)
  
  if (workspace.isWorktree) {
    // 1. Remove worktree
    await execCommand(
      `git worktree remove ${workspace.repoPath} --force`
    )
    
    // 2. Delete branch (optional)
    if (config.autoCleanupBranch) {
      await execCommand(
        `git branch -D ${workspace.branchName}`
      )
    }
  }
  
  // 3. Remove workspace directory
  await fs.rm(workspace.workspacePath, { recursive: true })
}
```

---

## Best Practices

### 1. Use Worktree for Production

```typescript
// Production: Always use worktree
if (process.env.NODE_ENV === 'production') {
  workspace = await workspaceManager.createWorkspaceWithWorktree(...)
} else {
  workspace = await workspaceManager.createWorkspace(...)
}
```

### 2. Main Repo Maintenance

```typescript
// Periodic cleanup of stale worktrees
async function cleanupStaleWorktrees(projectId: string) {
  const worktrees = await workspaceManager.listWorktrees(projectId)
  
  for (const worktree of worktrees) {
    const age = Date.now() - worktree.createdAt.getTime()
    const maxAge = 24 * 60 * 60 * 1000 // 24 hours
    
    if (age > maxAge && !worktree.isActive) {
      await workspaceManager.cleanupWorkspace(worktree.runId)
    }
  }
}
```

### 3. Branch Naming Convention

```typescript
// Good: Descriptive and namespaced
workflow/{runId}
workflow/run-abc-123
workflow/feature-authentication

// Bad: Generic names cause conflicts
feature-branch
implementation
temp
```

### 4. Error Handling

```typescript
try {
  const workspace = await workspaceManager.createWorkspaceWithWorktree(...)
} catch (error) {
  if (error.message.includes('already exists')) {
    // Worktree exists, clean up and retry
    await workspaceManager.cleanupWorkspace(runId)
    workspace = await workspaceManager.createWorkspaceWithWorktree(...)
  } else {
    throw error
  }
}
```

---

## Migration Path

### Phase 1: Full Clone (Epic 3) ✅

- Simple workspace isolation
- Full git clone per run
- Good for MVP and testing

### Phase 2: Worktree Support (Epic 3.5) 🔄

- Add worktree implementation
- Make mode configurable
- Default to clone for compatibility

### Phase 3: Worktree Default (Future)

- Switch default to worktree
- Optimize main repo management
- Add monitoring and alerts

---

## Troubleshooting

### Issue: Worktree creation fails

```bash
# Check existing worktrees
cd /var/vyrak/repos/org-123/project-456
git worktree list

# Prune stale worktrees
git worktree prune

# Force remove
git worktree remove /tmp/vyrak-workspaces/run-abc-123 --force
```

### Issue: Branch already exists

```bash
# Delete branch
git branch -D workflow/run-abc-123

# Or use force flag in code
await workspaceManager.createWorkspaceWithWorktree(
  runId,
  repoUrl,
  'main',
  { force: true }  // Recreate if exists
)
```

### Issue: Main repo out of sync

```bash
# Update main repo
cd /var/vyrak/repos/org-123/project-456
git fetch --all --prune
```

---

## References

- **Epic 3:** Agent Runtime Integration (Basic workspace isolation)
- **Epic 3.5:** Worktree Enhancement (This document)
- **WorkspaceManager:** `libs/agent-runtime/src/application/services/workspace-manager.service.ts`
- **Git Worktree Docs:** https://git-scm.com/docs/git-worktree

---

_For implementation details, see Epic 3.5 plan in `plans/261025-HHMM-epic-3.5-worktree/`_
