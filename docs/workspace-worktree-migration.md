# Workspace Worktree Migration Guide

This guide walks through migrating from clone mode to worktree mode for improved workflow execution performance.

## Overview

Vyrak supports two workspace modes:

- **Clone mode** (default): Each workflow run clones the repository into an isolated workspace
- **Worktree mode** (opt-in): Uses git worktree to create lightweight workspaces from a shared main repository

### Performance Comparison

**Clone Mode:**
- Workspace creation: 30-60s
- Disk per run: ~500MB
- 10 parallel runs: 7.5 min, 5GB

**Worktree Mode:**
- Workspace creation: 2-5s (6-12x faster)
- Disk per run: ~50MB (10x savings)
- 10 parallel runs: 30s (15x faster), 1GB (5x savings)

## Prerequisites

- Git >= 2.35 installed
- Epic 3.5 deployed
- Disk space for initial main repo clones (~500MB per unique repository)

## Configuration

### Environment Variables

Add these to your `apps/api-server/.env`:

```bash
# Workspace mode: 'clone' (safe, default) or 'worktree' (fast, production)
WORKSPACE_MODE=clone

# Main repos path (for worktree mode)
MAIN_REPOS_PATH=/var/vyrak/repos

# Workspaces path
WORKSPACES_PATH=/tmp/vyrak-workspaces

# Cleanup after workflow execution
WORKSPACE_CLEANUP_ON_SUCCESS=true
WORKSPACE_CLEANUP_ON_FAILURE=false

# Worktree-specific config
WORKTREE_BASE_BRANCH=main
WORKTREE_BRANCH_PREFIX=workflow/
WORKTREE_AUTO_FETCH=true
WORKTREE_AUTO_CLEANUP_BRANCH=true
```

### Configuration Options

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_MODE` | `clone` | Workspace mode: `clone` or `worktree` |
| `MAIN_REPOS_PATH` | `/var/vyrak/repos` | Directory for main repositories (worktree mode) |
| `WORKSPACES_PATH` | `/tmp/vyrak-workspaces` | Directory for workspace instances |
| `WORKSPACE_CLEANUP_ON_SUCCESS` | `true` | Clean workspace after successful run |
| `WORKSPACE_CLEANUP_ON_FAILURE` | `false` | Clean workspace after failed run (keep for debugging) |
| `WORKTREE_BASE_BRANCH` | `main` | Base branch for worktrees |
| `WORKTREE_BRANCH_PREFIX` | `workflow/` | Prefix for worktree branches |
| `WORKTREE_AUTO_FETCH` | `true` | Auto-fetch main repo before creating worktree |
| `WORKTREE_AUTO_CLEANUP_BRANCH` | `true` | Delete branch when cleaning up worktree |

## Migration Steps

### Phase 1: Enable Worktree Mode (Week 1)

**Goal:** Test worktree mode in staging environment.

#### 1. Update environment variables

```bash
# apps/api-server/.env
WORKSPACE_MODE=worktree
MAIN_REPOS_PATH=/var/vyrak/repos
WORKTREE_AUTO_FETCH=true
WORKTREE_AUTO_CLEANUP_BRANCH=true
```

#### 2. Create main repos directory

```bash
sudo mkdir -p /var/vyrak/repos
sudo chown -R $USER:$USER /var/vyrak/repos
```

#### 3. Deploy to staging

```bash
yarn build
yarn deploy:staging
```

#### 4. Monitor metrics

```bash
# Check workspace creation time
kubectl logs -f api-server | grep "workspace created"

# Check disk usage
du -sh /var/vyrak/repos/*
du -sh /tmp/vyrak-workspaces/*
```

#### 5. Run test workflows

Create 5 test workflows in parallel and verify:
- No conflicts between concurrent runs
- Workspace creation time < 5s
- Disk usage < 100MB per run
- Cleanup working correctly

### Phase 2: Production Rollout (Week 2)

**Goal:** Enable worktree mode in production.

#### 1. Health check main repos

```bash
yarn workspace:health --org-id <org> --project-id <project>
```

#### 2. Deploy to production

```bash
yarn deploy:production
```

#### 3. Monitor for 24 hours

Track these metrics:
- Workspace creation latency (p50, p99)
- Disk usage trend
- Error rate
- Stale worktree count

#### 4. Setup cleanup cron job

```bash
# Add to crontab
0 2 * * * cd /path/to/vyrak && yarn workspace:health --org-id <org> --project-id <project>
```

### Phase 3: Optimization (Week 3)

**Goal:** Fine-tune configuration and remove old clone-mode artifacts.

#### 1. List all workspaces

```bash
yarn workspace:list
```

#### 2. Clean stale clones (if needed)

```bash
# Manual cleanup of old clone-mode workspaces
find /tmp/vyrak-workspaces -type d -mtime +7 -exec rm -rf {} \;
```

#### 3. Update documentation

- Mark clone mode as legacy in internal docs
- Document worktree as default mode

## CLI Commands

### List Workspaces

```bash
# List all workspaces
yarn workspace:list

# List worktrees for specific org/project
yarn workspace:list --org-id org-123 --project-id project-456
```

### Health Check

```bash
# Check main repo and worktree health
yarn workspace:health --org-id org-123 --project-id project-456
```

## Rollback Plan

If issues occur, rollback to clone mode:

### 1. Revert environment variable

```bash
# apps/api-server/.env
WORKSPACE_MODE=clone
```

### 2. Redeploy

```bash
yarn deploy:production
```

### 3. Keep main repos

Main repos are harmless and can stay for future retry. They use minimal disk space when not actively creating worktrees.

## Verification Checklist

After migration, verify:

- [ ] Workspace creation < 5s
- [ ] No conflicts in parallel workflows
- [ ] Disk usage < 100MB per run
- [ ] Cleanup working (no stale worktrees accumulating)
- [ ] No regressions in existing workflows
- [ ] Metrics dashboards showing improved performance
- [ ] Documentation updated

## Monitoring

### Key Metrics

Monitor these metrics to ensure healthy operation:

```typescript
// Workspace creation latency
workspace.creation.time.p50
workspace.creation.time.p99

// Mode distribution
workspace.mode.clone
workspace.mode.worktree

// Resource usage
workspace.disk.usage.total
workspace.disk.usage.per_run

// Health
workspace.stale.count
workspace.cleanup.success_rate
main_repo.fetch.failures
```

### Recommended Alerts

```yaml
# Alert on stale worktrees
- alert: StaleWorktreesHigh
  expr: workspace_stale_count > 10
  for: 1h
  severity: warning

# Alert on cleanup failures
- alert: WorkspaceCleanupFailures
  expr: rate(workspace_cleanup_failures[5m]) > 0.05
  for: 15m
  severity: critical

# Alert on disk usage
- alert: MainRepoDiskUsageHigh
  expr: main_repo_disk_usage_bytes > 10e9  # 10GB
  for: 1h
  severity: warning
```

## Troubleshooting

### Worktree Creation Fails

**Symptom:** `git worktree add` command fails

**Solutions:**

1. Check main repo exists:
   ```bash
   yarn workspace:health --org-id <org> --project-id <project>
   ```

2. Try manual fetch:
   ```bash
   cd /var/vyrak/repos/<org>/<project>/main-repo
   git fetch --all
   ```

3. Verify Git version:
   ```bash
   git --version  # Should be >= 2.35
   ```

### Stale Worktrees Accumulating

**Symptom:** Many locked or prunable worktrees shown in health check

**Solutions:**

1. List worktrees:
   ```bash
   yarn workspace:list --org-id <org> --project-id <project>
   ```

2. Manual prune:
   ```bash
   cd /var/vyrak/repos/<org>/<project>/main-repo
   git worktree prune
   ```

3. Check for stuck processes:
   ```bash
   lsof +D /var/vyrak/repos/<org>/<project>/
   ```

### Main Repo Out of Date

**Symptom:** Workflows use old code despite recent commits

**Solutions:**

1. Manual fetch:
   ```bash
   cd /var/vyrak/repos/<org>/<project>/main-repo
   git fetch --all --prune
   ```

2. Enable auto-fetch (should be default):
   ```bash
   WORKTREE_AUTO_FETCH=true
   ```

3. Verify remote configuration:
   ```bash
   cd /var/vyrak/repos/<org>/<project>/main-repo
   git remote -v
   ```

### Disk Space Issues

**Symptom:** Main repos consuming too much disk space

**Solutions:**

1. Check disk usage:
   ```bash
   du -sh /var/vyrak/repos/*
   du -sh /tmp/vyrak-workspaces/*
   ```

2. Clean Git cache:
   ```bash
   cd /var/vyrak/repos/<org>/<project>/main-repo
   git gc --aggressive --prune=now
   ```

3. Remove unused repositories:
   ```bash
   # Only remove repos for deactivated projects
   rm -rf /var/vyrak/repos/<org>/<unused-project>/
   ```

## Best Practices

### Development

1. **Use clone mode for local development** - Simpler debugging and inspection
2. **Use worktree mode for staging/production** - Performance and efficiency

### Operations

1. **Monitor disk usage** - Set up alerts for main repos path
2. **Regular health checks** - Run `workspace:health` in monitoring
3. **Cleanup automation** - Prune stale worktrees automatically
4. **Backup strategy** - Main repos can be re-cloned if lost

### Security

1. **Path permissions** - Ensure proper ownership of main repos directory
2. **Branch isolation** - Each worktree gets unique branch for safety
3. **Cleanup on failure** - Keep workspaces for debugging (`CLEANUP_ON_FAILURE=false`)

## Next Steps

After successful migration:

1. Update default mode in documentation
2. Archive clone-mode code as legacy (keep for backward compatibility)
3. Document worktree best practices in team wiki
4. Train team on new CLI commands
5. Setup automated cleanup jobs
6. Monitor long-term disk usage trends
7. Consider retention policy for main repos

## FAQ

### Can I switch back to clone mode anytime?

Yes, simply change `WORKSPACE_MODE=clone` and redeploy. Both modes are fully supported.

### What happens to existing workspaces when switching modes?

They remain until explicitly cleaned up. New runs will use the configured mode.

### Do I need to change application code?

No, the workspace mode is transparent to workflow execution logic.

### How much disk space do main repos use?

Approximately 500MB per unique repository. Worktrees add only 50-100MB each.

### Can different projects use different modes?

Currently no, the mode is global. You can run separate instances with different configs if needed.

---

For questions or issues, contact the platform team or file a GitHub issue.
