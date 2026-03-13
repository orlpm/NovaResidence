import { test, expect } from '@playwright/test'
import { buildScenarioProfile } from './helpers/demo-data'
import { uniqueEmail } from './helpers/auth'
import { seedEmailConfirmationToken, waitForUserIdByEmail } from './helpers/sql'

test.describe('Dedicated admin registration flow', () => {
  test('alta de administrador confirma correo y redirige al onboarding en el primer login', async ({ page }) => {
    const profile = buildScenarioProfile('free.registration')
    const email = uniqueEmail('free.registration.admin')
    const confirmationToken = 'admin-confirmation-flow-token'
    const dialogs: string[] = []
    page.on('dialog', async (dialog) => {
      dialogs.push(dialog.message())
      await dialog.dismiss()
    })

    await page.goto('/')
    await page.getByRole('button', { name: 'Comenzar Gratis' }).click()
    await expect(page).toHaveURL(/\/alta-administrador\?plan=basico&skipPlan=1/)

    await page.locator('input[placeholder="Juan"]').fill(profile.adminFirstName)
    await page.locator('input[placeholder="Pérez"]').fill(profile.adminLastName)
    await page.locator('input[placeholder="admin@condominio.com"]').fill(email)
    const passwordInputs = page.locator('input[placeholder="••••••••"]')
    await passwordInputs.nth(0).fill('Pass123.')
    await passwordInputs.nth(1).fill('Pass123.')
    await page.locator('input[placeholder="+52 123 456 7890"]').fill('5512345678')

    const registerResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/register') && response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: 'Continuar' }).click()

    const registerResponse = await registerResponsePromise
    expect(registerResponse.status()).toBe(200)

    await expect(page.getByText('Tu cuenta ya está lista')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: 'Ir al login de administrador' })).toBeVisible()

    const userId = await waitForUserIdByEmail(email)
    seedEmailConfirmationToken(userId, confirmationToken)

    await page.goto(`/auth/confirm-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(confirmationToken)}`)
    await expect(
      page.getByText(/Correo confirmado correctamente|Tu correo ya había sido confirmado/)
    ).toBeVisible({ timeout: 15000 })

    await page.getByRole('link', { name: 'Ir a configurar mi condominio' }).click()
    await expect(page).toHaveURL(/\/auth\/login\?email=.*next=(%2Fadmin%2Fonboarding|\/admin\/onboarding)/)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="email"]')).toHaveValue(email)

    await page.locator('input[type="password"]').fill('Pass123.')
    await page.getByRole('button', { name: 'Iniciar Sesión' }).click()

    await page.waitForURL(/\/admin\/onboarding$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Configuración del Condominio' })).toBeVisible()
    await expect(page.getByText('Alta incompleta')).toBeVisible()

    expect(dialogs.some((message) => message.includes('Unexpected token'))).toBeFalsy()
  })
})
