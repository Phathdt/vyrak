# GitHub App Setup Guide

This guide explains how to create and configure a GitHub App for Vyrak workflow automation.

## Why GitHub App?

GitHub Apps provide better security and scalability compared to Personal Access Tokens (PAT):

- **Short-lived tokens**: 1-hour expiry (auto-refreshed) vs permanent PAT
- **Fine-grained permissions**: Only request what you need
- **Better audit trail**: Track which app performed actions
- **Scalable**: One app serves entire organization
- **Cached tokens**: 50-minute cache reduces API calls

## Creating a GitHub App

### 1. Navigate to GitHub App Settings

- **Organization**: `https://github.com/organizations/{YOUR_ORG}/settings/apps`
- **Personal**: `https://github.com/settings/apps`

### 2. Click "New GitHub App"

### 3. Configure Basic Settings

- **GitHub App name**: `vyrak-workflow-bot` (must be globally unique)
- **Homepage URL**: Your Vyrak instance URL or repository
- **Webhook**: Uncheck "Active" (not needed for MVP)

### 4. Set Repository Permissions

Required permissions:

- **Contents**: Read and write
- **Pull requests**: Read and write
- **Metadata**: Read-only (auto-selected)

### 5. Subscribe to Events

Not required for MVP (webhook disabled).

### 6. Install On

- **Only on this account** (recommended)

### 7. Create App

Click "Create GitHub App".

## Post-Creation Setup

### 1. Generate Private Key

- Scroll to "Private keys" section
- Click "Generate a private key"
- Save the downloaded `.pem` file securely
- **Important**: This key cannot be retrieved again

### 2. Note the App ID

- Found at top of app settings page
- Format: 6-digit number (e.g., `123456`)

### 3. Install the App

- Click "Install App" in left sidebar
- Choose your organization
- Select repositories:
  - **All repositories** (easiest)
  - **Only select repositories** (more secure)
- Click "Install"

### 4. Get Installation ID

After installation, check the URL:
```
https://github.com/organizations/{ORG}/settings/installations/{INSTALLATION_ID}
```

The number at the end is your Installation ID.

## Configuration

### Environment Variables (apps/worker/.env)

```bash
# GitHub App Authentication
GIT__GITHUB_APP__APP_ID=123456
GIT__GITHUB_APP__INSTALLATION_ID=789012

# Option 1: Multi-line private key (escape newlines with \n)
GIT__GITHUB_APP__PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----"

# Option 2: Load from file (recommended for production)
GIT__GITHUB_APP__PRIVATE_KEY_PATH=/var/secrets/github-app.pem

# Git commit identity
GIT__USER_NAME=vyrak-bot
GIT__USER_EMAIL=vyrak-bot@users.noreply.github.com
```

### Config YAML (config/production.yaml)

```yaml
git:
  githubApp:
    appId: 123456
    installationId: 789012
    # privateKey: replace_me
    privateKeyPath: /var/secrets/github-app.pem
  userName: vyrak-bot
  userEmail: vyrak-bot@users.noreply.github.com
```

## Verification

### 1. Start Worker

```bash
pnpm dev:worker
```

Expected log output:
```
[WorkflowCoreModule] GitHub App authentication configured
[RepoCacheService] Using GitHub App (installation: 789012)
```

### 2. Check Redis Cache

```bash
redis-cli KEYS "github-app:token:*"
```

Should show: `github-app:token:{installationId}` after first git operation.

### 3. Test Git Operations

Create a workflow linked to a private repository:
```bash
curl -X POST http://localhost:3000/api/workflows \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"repositoryUrl": "https://github.com/org/private-repo", ...}'
```

Watch worker logs for successful clone/fetch/push.

### 4. Verify PR Creation

After implementation phase completes, check GitHub for created PR.

## Security Best Practices

### Production

1. **Store private key securely**:
   - Use Kubernetes Secrets or AWS Secrets Manager
   - Mount as file: `GIT__GITHUB_APP__PRIVATE_KEY_PATH`
   - Never commit `.pem` files to git

2. **Rotate keys regularly**:
   - Generate new private key every 90 days
   - Update secrets in production
   - Restart worker after key rotation

3. **Restrict installations**:
   - Install only on repositories that need automation
   - Review installation settings quarterly

4. **Monitor token generation**:
   - Normal rate: 10-50 tokens/hour
   - High rate (>100/hour): Check cache issues

### Development

1. **Use separate GitHub App** for dev/staging/production
2. **Test with public repos first** before adding private access
3. **Check logs** for token redaction (ghs_ tokens should not appear in logs)

## Troubleshooting

### Error: "GitHub App configuration is incomplete"

**Cause**: Missing `appId`, `installationId`, or `privateKey`.

**Fix**: Verify all three values are set in environment or config YAML.

### Error: "Failed to read private key from {path}"

**Cause**: File not found or insufficient permissions.

**Fix**:
```bash
ls -l /var/secrets/github-app.pem
chmod 600 /var/secrets/github-app.pem
```

### Error: "Failed to generate token: Bad credentials"

**Cause**: Invalid private key or wrong App ID.

**Fix**:
1. Regenerate private key in GitHub App settings
2. Verify App ID matches
3. Restart worker after updating secrets

### Cache Not Working

**Symptoms**: Worker generates new token every request.

**Check**:
```bash
redis-cli PING
redis-cli TTL "github-app:token:{installationId}"
```

**Fix**: Verify Redis connection in worker config.

### PR Creation Fails

**Cause**: `gh` CLI not authenticated.

**Check worker logs** for:
```
Failed to get GitHub App token: ...
```

**Fix**: Verify GitHub App has Pull Requests (R/W) permission.

## Migrating from PAT (v1.x → v2.0)

**BREAKING CHANGE**: Personal Access Token (PAT) authentication is no longer supported.

### Migration Steps

1. **Create GitHub App** (see above)
2. **Update environment variables**:
   - Remove: `GIT__TOKEN=ghp_xxxxx`
   - Add: `GIT__GITHUB_APP__APP_ID`, `GIT__GITHUB_APP__INSTALLATION_ID`, `GIT__GITHUB_APP__PRIVATE_KEY`
3. **Update config YAML files** (if using file-based config)
4. **Restart worker service**
5. **Verify**: Check worker logs for successful authentication

### Rollback

If you need to revert to PAT:
- Downgrade to v1.x
- Restore `GIT__TOKEN` environment variable
- Note: v1.x and GitHub App cannot coexist

## FAQ

**Q: Can I use one GitHub App for multiple Vyrak instances?**

A: Yes, if they're in the same organization. Each instance needs the same `appId` and `installationId`.

**Q: Does this work with GitHub Enterprise?**

A: Yes, GitHub Enterprise supports GitHub Apps. Use your enterprise domain in repository URLs.

**Q: Can I test without creating a GitHub App?**

A: For public repositories, leave `GIT__GITHUB_APP__*` empty. For private repos, you must create an app.

**Q: What happens when the private key expires?**

A: Keys don't expire, but you should rotate them for security. After rotation, restart the worker.

**Q: How many tokens does Vyrak generate?**

A: With caching, typically 10-50/hour. Tokens are cached for 50 minutes and reused across workflows.

## Related Documentation

- [Workspace Configuration](./workspace-worktree-migration.md)
- [GitHub Apps Documentation](https://docs.github.com/en/apps)
- [Claude Code GitHub Integration](../CLAUDE.md#git-workflow)

---

*Last updated: 2026-11-06*
