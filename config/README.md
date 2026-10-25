# Shared Build Configurations

This directory contains shared base configurations for consistent builds across all workspace packages.

## Rolldown Configuration

### `rolldown.base.mjs`

Base Rolldown configuration factory functions:

#### `createLibConfig(options?)`

Creates Rolldown config for library packages in `libs/`.

**Default behavior:**
- Input: `src/index.ts`
- Output: `dist/` (CommonJS with sourcemaps)
- External: All `@scoped` packages and npm packages (regex: `/^@/`, `/^[a-z]/`)
- TypeScript: Uses `../../tsconfig.json`

**Usage in `libs/*/rolldown.config.mjs`:**

```javascript
import { createLibConfig } from '../../config/rolldown.base.mjs'

export default createLibConfig()
```

**Custom options:**

```javascript
export default createLibConfig({
  input: 'src/custom-entry.ts',
  outDir: 'build',
  external: [/^custom-pattern/],
  tsconfig: './tsconfig.build.json'
})
```

#### `createAppConfig(options)`

Creates Rolldown config for application packages in `apps/`.

**Required option:**
- `appName`: App directory name (e.g., 'api-server', 'worker')

**Default behavior:**
- Input: `{ main: 'src/main.ts' }`
- Output: `../../dist/apps/${appName}/` (CommonJS with sourcemaps)
- External: Common NestJS/Node packages (see code for full list)
- TypeScript: Uses `../../tsconfig.json`

**Usage in `apps/*/rolldown.config.mjs`:**

```javascript
import { createAppConfig } from '../../config/rolldown.base.mjs'

export default createAppConfig({
  input: { main: 'src/main.ts' },
  appName: 'api-server'
})
```

**Multiple entry points:**

```javascript
export default createAppConfig({
  input: {
    main: 'src/main.ts',
    'generate-openapi': 'src/generate-openapi.ts'
  },
  appName: 'api-server'
})
```

**Custom externals:**

```javascript
export default createAppConfig({
  input: { main: 'src/main.ts' },
  appName: 'worker',
  external: [
    /^@nestjs\//,
    /^bullmq$/,
    /^ioredis$/,
    // ... custom patterns
  ]
})
```

## TypeScript Configuration

### `tsconfig.base.json`

Base TypeScript compiler options used by all packages:

- **Target:** ES2022
- **Module:** CommonJS with `bundler` resolution
- **Strict mode:** Enabled (all strict checks)
- **Decorators:** Experimental decorators + metadata emission
- **Source maps:** Enabled for debugging
- **Declaration:** Enabled for type exports

### `tsconfig.lib.json`

Extends base config for library packages in `libs/`:

- **Output:** `dist/` directory
- **Root:** `src/` directory
- **Types:** Node.js types
- **Declaration only:** Emit only `.d.ts` files (Rolldown handles JS output)

**Usage in `libs/*/tsconfig.json`:**

```json
{
  "extends": "../../config/tsconfig.lib.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

### `tsconfig.app.json`

Extends base config for application packages in `apps/`:

- **Output:** `../../dist/apps/` directory
- **No emit:** Type checking only (Rolldown handles compilation)
- **No composite:** Apps are not referenced by other packages

**Usage in `apps/*/tsconfig.json`:**

```json
{
  "extends": "../../config/tsconfig.app.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts", "**/*.test.ts"]
}
```

## Adding a New Package

### New Library

1. Create `libs/my-lib/rolldown.config.mjs`:

```javascript
import { createLibConfig } from '../../config/rolldown.base.mjs'

export default createLibConfig()
```

2. Create `libs/my-lib/tsconfig.json`:

```json
{
  "extends": "../../config/tsconfig.lib.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"]
}
```

### New Application

1. Create `apps/my-app/rolldown.config.mjs`:

```javascript
import { createAppConfig } from '../../config/rolldown.base.mjs'

export default createAppConfig({
  input: { main: 'src/main.ts' },
  appName: 'my-app'
})
```

2. Create `apps/my-app/tsconfig.json`:

```json
{
  "extends": "../../config/tsconfig.app.json",
  "include": ["src/**/*"],
  "exclude": ["node_modules", "**/*.spec.ts"]
}
```

## Benefits

- **DRY:** No duplicate config code across packages
- **Consistency:** All packages use same compiler/bundler settings
- **Maintainability:** Change once, apply everywhere
- **Simplicity:** New packages need only 2-3 lines of config
- **Type Safety:** Base configs are tested and validated

## Maintenance

When modifying base configs:

1. Run `yarn build` to verify all packages still build
2. Run `yarn typecheck` to verify TypeScript compilation
3. Update this README if behavior changes
4. Test with both libs and apps

## See Also

- [CLAUDE.md](../CLAUDE.md) - Full project documentation
- [Rolldown Documentation](https://rolldown.rs)
- [TypeScript Documentation](https://www.typescriptlang.org/tsconfig)
