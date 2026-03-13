import { test, expect } from '@playwright/test'
import { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, ensureConfirmedUserId, loginAPI, registerUser, submitLoginUI, uniqueEmail } from './helpers/auth'
import { getPasswordResetHash, seedEmailConfirmationToken, seedPasswordResetToken } from './helpers/sql'

test.describe('Auth email confirmation and recovery flows', () => {
  test('resident registration is blocked from login until email is confirmed, then login succeeds', async ({ page }) => {
    const email = uniqueEmail('auth.confirm')
    const password = 'Pass123.'

    await page.goto('/auth/register')
    await page.locator('input[placeholder="Nombre"]').fill('Confirm')
    await page.locator('input[placeholder="Apellido"]').fill('Flow')
    await page.locator('input[placeholder="tu@email.com"]').fill(email)
    await page.locator('input[placeholder="5512345678"]').fill('5512345678')
    await page.locator('input[placeholder="Minimo 6 caracteres"]').fill(password)
    await page.locator('input[placeholder="Repite tu contraseña"]').fill(password)

    const registerResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/register') && response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: 'Crear cuenta' }).click()
    const registerResponse = await registerResponsePromise
    expect(registerResponse.status()).toBe(200)

    await expect(page.getByRole('heading', { name: 'Revisa tu correo' })).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()

    await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 })

    const loginResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST'
    )

    await submitLoginUI(page, email, password)
    const loginResponse = await loginResponsePromise
    expect(loginResponse.status()).toBe(403)

    await expect(page.getByText('Tu correo aún no está confirmado')).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()

    const resendResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/resend-email-confirmation') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Reenviar correo de confirmación' }).click()
    const resendResponse = await resendResponsePromise
    expect(resendResponse.status()).toBe(200)

    const userId = await ensureConfirmedUserId(email)
    expect(userId).toBeTruthy()

    const confirmationToken = `confirm-token-${Date.now()}`
    seedEmailConfirmationToken(userId, confirmationToken)

    await page.goto(`/auth/confirm-email?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(confirmationToken)}`)
    await expect(page.getByText(/Correo confirmado correctamente|Tu correo ya había sido confirmado/)).toBeVisible({ timeout: 15000 })

    await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click()
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 })

    await submitLoginUI(page, email, password)
    await expect(page).toHaveURL(/\/resident(\/|$)/, { timeout: 15000 })
  })

  test('forgot-password UI requests a reset token and reset-password UI accepts a seeded token', async ({ page, request }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const email = uniqueEmail('auth.reset')
    const oldPassword = 'Pass123.'
    const newPassword = 'Pass123.!Nueva'

    await registerUser(request, {
      email,
      password: oldPassword,
      firstName: 'Auth',
      lastName: `Flow${Date.now().toString().slice(-4)}`,
      role: 'Resident',
      authenticatedToken: superadmin.token
    })
    const userId = await ensureConfirmedUserId(email)
    expect(userId).toBeTruthy()

    await page.goto('/auth/forgot-password')
    await page.locator('input[type="email"]').fill(email)

    const forgotResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/forgot-password') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Enviar enlace' }).click()
    const forgotResponse = await forgotResponsePromise
    expect(forgotResponse.status()).toBe(200)

    await expect(page.getByText('Si el correo existe, te enviamos un enlace para restablecerla.')).toBeVisible()
    expect(getPasswordResetHash(userId)).not.toBe('')

    const resetToken = `reset-token-${Date.now()}`
    seedPasswordResetToken(userId, resetToken)

    await page.goto(`/auth/reset-password?userId=${encodeURIComponent(userId)}&token=${encodeURIComponent(resetToken)}`)
    await page.locator('input[placeholder="Minimo 6 caracteres"]').fill(newPassword)
    await page.locator('input[placeholder="Repite tu contraseña"]').fill(newPassword)

    const resetResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/reset-password') && response.request().method() === 'POST'
    )
    await page.getByRole('button', { name: 'Actualizar contraseña' }).click()
    const resetResponse = await resetResponsePromise
    expect(resetResponse.status()).toBe(200)

    await expect(page.getByText('Tu contraseña se actualizó correctamente.')).toBeVisible({ timeout: 15000 })

    const login = await loginAPI(request, email, newPassword)
    expect(login.token).toBeTruthy()
  })
})