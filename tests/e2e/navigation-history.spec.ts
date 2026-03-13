import { test, expect } from '@playwright/test'
import { SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginUI } from './helpers/auth'

test.describe('Navigation history', () => {
  test('browser back and forward reload superadmin pages correctly', async ({ page }) => {
    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)

    await page.goto('/superadmin/monitoring')
    await expect(page).toHaveURL(/\/superadmin\/monitoring$/)
    await expect(page.getByRole('heading', { name: 'Monitoreo del Sistema' })).toBeVisible()

    await page.goto('/superadmin/system')
    await expect(page).toHaveURL(/\/superadmin\/system$/)
    await expect(page.getByRole('heading', { name: 'Configuración del Sistema' })).toBeVisible()

    await page.goto('/superadmin/database')
    await expect(page).toHaveURL(/\/superadmin\/database$/)
    await expect(page.getByRole('heading', { name: 'Base de Datos' })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/superadmin\/system$/)
    await expect(page.getByRole('heading', { name: 'Configuración del Sistema' })).toBeVisible()

    await page.goBack()
    await expect(page).toHaveURL(/\/superadmin\/monitoring$/)
    await expect(page.getByRole('heading', { name: 'Monitoreo del Sistema' })).toBeVisible()

    await page.goForward()
    await expect(page).toHaveURL(/\/superadmin\/system$/)
    await expect(page.getByRole('heading', { name: 'Configuración del Sistema' })).toBeVisible()
  })
})