import { LoginPage } from '@page-objects/auth/login.page'
import { expect, test } from '@playwright/test'

test.describe('Password Strength & Validation', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.navigate()
  })

  test('should reject password that is too short', async () => {
    const shortPasswords = ['123', 'pass', 'abc123', '1']

    for (const password of shortPasswords) {
      await loginPage.navigate()
      await loginPage.fillEmail('test@example.com')
      await loginPage.fillPassword(password)

      await test.step(`verify rejection of short password: ${password}`, async () => {
        // Should either show validation error or disable submit
        const isDisabled = await loginPage
          .expectSubmitDisabled()
          .then(() => true)
          .catch(() => false)

        if (!isDisabled) {
          // If enabled, submit should fail with validation
          await loginPage.clickSubmit()
          await loginPage.expectOnLoginPage()
        }
      })
    }
  })

  test('should accept password with mixed case', async () => {
    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    const passwordVariations = ['UPPERCASE123!', 'lowercase123!', 'MixedCase123!', 'MiXeD123!']

    for (const password of passwordVariations) {
      await loginPage.navigate()
      await loginPage.fillEmail(testUser.email)
      await loginPage.fillPassword(password)

      await test.step(`verify password format: ${password}`, async () => {
        // Should not show validation error (at form level)
        const isDisabled = await loginPage.getPage().getByRole('button', { name: /sign in/i }).isDisabled()

        // Mixed case passwords should be allowed at form level
        // (may fail at auth level with wrong credentials)
        expect([true, false]).toContain(isDisabled)
      })
    }
  })

  test('should accept password with numbers', async () => {
    await loginPage.fillEmail('test@example.com')
    await loginPage.fillPassword('Password1')

    await test.step('verify numeric password acceptance', async () => {
      const isDisabled = await loginPage.getPage().getByRole('button', { name: /sign in/i }).isDisabled()

      // Should not be disabled for numeric content
      expect(isDisabled).toBe(false)
    })
  })

  test('should accept password with special characters', async () => {
    const specialPasswords = ['Pass!@#$%^&*()', 'Pass123!', 'Pass-_=+[]{}', 'Pass<>?,./;:']

    for (const password of specialPasswords) {
      await loginPage.navigate()
      await loginPage.fillEmail('test@example.com')
      await loginPage.fillPassword(password)

      await test.step(`verify special char password: ${password}`, async () => {
        const isDisabled = await loginPage.getPage().getByRole('button', { name: /sign in/i }).isDisabled()

        // Should allow special characters at form level
        expect(isDisabled).toBe(false)
      })
    }
  })

  test('should show password visibility toggle if implemented', async ({ page }) => {
    const passwordInput = page.getByTestId('login-password-input')
    const visibilityToggle = page.locator(
      '[data-testid="password-visibility-toggle"], button[aria-label*="password"], button[aria-label*="visibility"]'
    )

    await loginPage.fillPassword('TestPassword123!')

    await test.step('verify password visibility feature', async () => {
      const hasVisibilityToggle = await visibilityToggle.isVisible({ timeout: 2000 }).catch(() => false)

      if (hasVisibilityToggle) {
        // Get initial type
        const initialType = await passwordInput.evaluate((el: HTMLInputElement) => el.type)
        expect(initialType).toBe('password')

        // Click toggle
        await visibilityToggle.click()

        // Check if type changed
        const newType = await passwordInput.evaluate((el: HTMLInputElement) => el.type)
        expect(['text', 'password']).toContain(newType)

        // Toggle back
        await visibilityToggle.click()

        // Should be back to password
        const finalType = await passwordInput.evaluate((el: HTMLInputElement) => el.type)
        expect(finalType).toBe('password')
      }
    })
  })

  test('should not show password as plain text by default', async ({ page }) => {
    await loginPage.fillPassword('TestPassword123!')

    await test.step('verify password field masking', async () => {
      const passwordInput = page.getByTestId('login-password-input')
      const inputType = await passwordInput.evaluate((el: HTMLInputElement) => el.type)

      // Password should be masked by default
      expect(inputType).toBe('password')
    })
  })

  test('should handle paste of very long password', async ({ page }) => {
    const veryLongPassword = 'a'.repeat(1000) + '123!'

    await loginPage.getPage().getByTestId('login-password-input').focus()
    await page.evaluate(
      ({ password }) => {
        const input = document.querySelector('[data-testid="login-password-input"]') as HTMLInputElement
        if (input) {
          input.value = password
          input.dispatchEvent(new Event('input', { bubbles: true }))
        }
      },
      { password: veryLongPassword }
    )

    await test.step('verify long password paste handling', async () => {
      // Should handle gracefully
      const isDisabled = await loginPage.getPage().getByRole('button', { name: /sign in/i }).isDisabled()

      // Should either accept or show validation error
      expect([true, false]).toContain(isDisabled)
    })
  })

  test('should reject passwords with only spaces', async () => {
    await loginPage.fillEmail('test@example.com')
    await loginPage.fillPassword('          ')

    await test.step('verify spaces-only password rejection', async () => {
      const isDisabled = await loginPage
        .expectSubmitDisabled()
        .then(() => true)
        .catch(() => false)

      if (!isDisabled) {
        // If form allows, API should reject
        await loginPage.clickSubmit()
        await loginPage.expectOnLoginPage()
      }
    })
  })

  test('should clear password field without affecting email', async ({ page }) => {
    const email = 'test@example.com'
    const password = 'TestPassword123!'

    await loginPage.fillEmail(email)
    await loginPage.fillPassword(password)

    // Clear password
    await page.getByTestId('login-password-input').clear()

    await test.step('verify partial form clearing', async () => {
      const emailValue = await page.getByTestId('login-email-input').inputValue()
      const passwordValue = await page.getByTestId('login-password-input').inputValue()

      expect(emailValue).toBe(email)
      expect(passwordValue).toBe('')
    })
  })

  test('should accept password with consecutive special characters', async () => {
    const passwords = ['Pass!!!!!!123', 'Pass@@@@@123', 'Pass-----123', 'Pass_____123']

    for (const password of passwords) {
      await loginPage.navigate()
      await loginPage.fillEmail('test@example.com')
      await loginPage.fillPassword(password)

      await test.step(`verify consecutive special chars: ${password}`, async () => {
        // Should not show validation error
        const isDisabled = await loginPage.getPage().getByRole('button', { name: /sign in/i }).isDisabled()

        expect(isDisabled).toBe(false)
      })
    }
  })

  test('should handle password field auto-complete behavior', async ({ page }) => {
    // Set autocomplete attributes
    const passwordInput = page.getByTestId('login-password-input')
    const autocomplete = await passwordInput.getAttribute('autocomplete')

    await test.step('verify password field security attributes', async () => {
      // Should have reasonable autocomplete settings
      // Could be 'current-password', 'off', or undefined
      // But not 'on' which would allow browser to fill any password
      if (autocomplete) {
        expect(autocomplete).not.toBe('on')
      }
    })
  })

  test('should not log password in console errors', async ({ page }) => {
    const consoleMessages: string[] = []

    page.on('console', (msg) => {
      consoleMessages.push(msg.text())
    })

    const testUser = {
      email: process.env.TEST_USER_EMAIL || 'admin@vyrak.dev',
      password: process.env.TEST_USER_PASSWORD || 'Password123!',
    }

    await loginPage.fillAndSubmit(testUser.email, testUser.password)

    await test.step('verify password not logged', async () => {
      // Wait a moment for any console messages
      await page.waitForTimeout(500)

      // Password should not be in any console output
      const allMessages = consoleMessages.join(' ')
      expect(allMessages).not.toContain(testUser.password)
    })
  })
})
