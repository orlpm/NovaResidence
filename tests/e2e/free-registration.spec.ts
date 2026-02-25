import { test, expect } from '@playwright/test'

test.describe('Free registration (localhost)', () => {
  test('Comenzar Gratis registra admin sin error de parseo y termina en login', async ({ page }) => {
    const dialogs: string[] = []
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message())
      await dialog.dismiss()
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Comenzar Gratis' }).click()

    await page.locator('input[placeholder="Juan"]').fill('QA')
    await page.locator('input[placeholder="Pérez"]').fill('Localhost')
    await page.locator('input[placeholder="admin@condominio.com"]').fill(`qa.free.${Date.now()}@e2e.local`)
    await page.locator('input[placeholder="••••••••"]').fill('Pass123.')
    await page.locator('input[placeholder="+52 123 456 7890"]').fill('5512345678')

    const registerResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/register') && response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: 'Continuar' }).click()

    const registerResponse = await registerResponsePromise
    expect(registerResponse.status()).toBe(200)

    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 })
    await expect(page.locator('input[type="email"]')).toBeVisible()

    expect(dialogs.some((message) => message.includes('Unexpected token'))).toBeFalsy()
  })
})
