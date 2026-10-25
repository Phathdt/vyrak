# E2E Testing với Playwright

E2E test suite cho dự án Vyrak sử dụng Playwright Test framework.

## Setup

### Prerequisites

- Node.js >= 22
- Yarn >= 1.22
- PostgreSQL database đang chạy
- API server và web app đang chạy (hoặc sẽ được tự động start bởi Playwright)

### Installation

```bash
# Install dependencies
yarn install

# Install Playwright browsers (chỉ chromium cho development)
yarn workspace @vyrak/e2e install:browsers

# Seed test user vào database
yarn db:seed:test
```

### Environment Variables

Tạo file `.env` trong `apps/e2e/` (copy từ `.env.example`):

```env
BASE_URL=http://localhost:5173
API_URL=http://localhost:3000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=Test123456!
```

## Running Tests

### Local Development

```bash
# Run all tests (headless)
yarn test:e2e

# Run tests với browser visible
yarn test:e2e:headed

# Run tests với UI mode (interactive)
yarn test:e2e:ui

# Run tests với debug mode
yarn workspace @vyrak/e2e test:debug

# Run specific browser
yarn workspace @vyrak/e2e test:chromium
yarn workspace @vyrak/e2e test:firefox
yarn workspace @vyrak/e2e test:webkit
```

### CI Environment

Trong CI, tests sẽ tự động:
- Start PostgreSQL service
- Run database migrations
- Seed test data
- Start API server và web app
- Run tests
- Upload test reports

```bash
# Simulate CI run locally
CI=true yarn test:e2e
```

## Test Structure

```
apps/e2e/
├── config/               # Configuration files
│   ├── playwright.config.ts
│   ├── test.config.ts
│   └── urls.config.ts
├── fixtures/            # Test fixtures và data factories
│   ├── auth.fixture.ts
│   └── test-data.fixture.ts
├── helpers/             # Utility helpers
│   ├── api.helper.ts
│   └── storage.helper.ts
├── page-objects/        # Page object models
│   ├── base.page.ts
│   ├── auth/
│   │   ├── login.page.ts
│   │   └── register.page.ts
│   └── dashboard/
│       └── dashboard.page.ts
└── tests/               # Test specs
    ├── auth/
    │   ├── login.spec.ts
    │   ├── register.spec.ts
    │   ├── session-persistence.spec.ts
    │   └── auth-guard.spec.ts
    └── dashboard/
        ├── dashboard.spec.ts
        └── login-to-dashboard.spec.ts
```

## Test Coverage

### Authentication Tests
- Login flow (happy path + validation)
- Registration flow
- Session persistence (reload, new tab)
- Logout functionality
- Auth guards (protected routes)

### Dashboard Tests
- Dashboard access after login
- Dashboard content display
- Navigation from dashboard

## Writing Tests

### Page Object Pattern

Mỗi page có một class riêng với:
- **Locators**: private getters cho elements
- **Actions**: public methods để interact
- **Assertions**: public methods để verify state

```typescript
export class LoginPage extends BasePage {
  // Locators
  private get emailInput() {
    return this.page.getByPlaceholder(/email/i)
  }

  // Actions
  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email)
  }

  // Assertions
  async expectOnLoginPage(): Promise<void> {
    await this.expectUrlToMatch(/\/login/)
  }
}
```

### Authentication Fixture

Sử dụng `authenticatedPage` fixture để có page đã login sẵn:

```typescript
import { test, expect } from '@fixtures/auth.fixture'

test('should access dashboard', async ({ authenticatedPage }) => {
  const dashboardPage = new DashboardPage(authenticatedPage)
  await dashboardPage.navigate()
  await dashboardPage.expectOnDashboard()
})
```

### Test Data Factory

Sử dụng `TestDataFactory` để tạo test data:

```typescript
import { TestDataFactory } from '@fixtures/test-data.fixture'

const newUser = TestDataFactory.createUser()
const uniqueEmail = TestDataFactory.uniqueEmail('test')
```

## Test Reports

### HTML Report

Sau khi run tests, mở HTML report:

```bash
yarn workspace @vyrak/e2e test:report
```

Report sẽ mở tại `http://localhost:9323/`

### CI Artifacts

Trong GitHub Actions, test reports được upload as artifacts:
- `playwright-report/` - HTML report
- `test-results/` - Screenshots, videos, traces của failed tests

## Debugging

### Debug Mode

```bash
yarn workspace @vyrak/e2e test:debug
```

Playwright Inspector sẽ mở và cho phép:
- Step through tests
- Inspect locators
- View console logs

### Traces

Traces được capture automatically khi test fails. View traces trong HTML report hoặc:

```bash
npx playwright show-trace test-results/.../trace.zip
```

## Best Practices

1. **Use Page Object Pattern**: Encapsulate page logic trong page objects
2. **Wait for Elements**: Playwright auto-waits, nhưng thêm explicit waits khi cần
3. **Unique Test Data**: Dùng timestamps hoặc UUIDs để tránh conflicts
4. **Clean Up**: Cleanup test data sau tests nếu cần
5. **Stable Selectors**: Dùng `data-testid`, roles, hoặc semantic selectors
6. **Auth State Reuse**: Sử dụng storage state để tránh login lại mỗi test

## Troubleshooting

### Tests Fail Locally

1. Verify API server đang chạy: `curl http://localhost:3000/health`
2. Verify web app đang chạy: `curl http://localhost:5173`
3. Verify test user exists: `yarn db:seed:test`
4. Check `.env` file trong `apps/e2e/`

### Auth State Issues

Delete saved auth state và run lại:

```bash
rm -rf apps/e2e/test-results/.auth/
yarn test:e2e
```

### Timeout Errors

Increase timeouts trong `config/test.config.ts` nếu machine chậm.

## CI Integration

GitHub Actions workflow: `.github/workflows/e2e.yml`

- Chạy trên: PRs và pushes to main/develop
- PostgreSQL service container
- Auto-start API và web app
- Upload test reports as artifacts
- Retention: 7 days

## Additional Commands

```bash
# Typecheck
yarn workspace @vyrak/e2e typecheck

# List all installed browsers
npx playwright list

# Update Playwright
yarn upgrade @playwright/test --latest
yarn workspace @vyrak/e2e install:browsers
```
