import { test, expect } from '@playwright/test'
import { loginUI } from './helpers/auth'

test.describe('Datos demo de Pedregal', () => {
  test('áreas, plano y cámara del lobby ya están en el condominio demo', async ({ page }) => {
    test.setTimeout(120000)
    await loginUI(page, 'admin@novaresidence.com', 'Pass123.', /\/admin(\/|$)/)
    await page.goto('/admin/common-areas')
    await expect(page.getByRole('heading', { name: 'Jardín central' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Lobby principal' })).toBeVisible()

    await page.goto('/admin/maps')
    await expect(page.locator('option', { hasText: 'Plano general Pedregal' })).toBeAttached({ timeout: 15000 })

    await loginUI(page, 'security@novaresidence.com', 'Pass123.', /\/security(\/|$)/)
    await page.goto('/security/cameras')
    await expect(page.getByRole('heading', { name: 'Cámaras' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Cámara lobby Pedregal').first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByTitle('Transmisión en vivo')).toBeVisible()
  })
})
