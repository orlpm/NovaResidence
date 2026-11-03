import { test, expect } from '@playwright/test'
import { loginUI } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

test.describe('Vehículos y cajones', () => {
  test('el admin da de alta un cajón y el residente registra su placa', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'vehicles')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'vehicles.resident')
    const spot = `A-${buildScenarioProfile('vehicles').unitNumber}`
    const plate = `PL${buildScenarioProfile('vehicles').unitNumber}`.replace(/[^A-Z0-9]/gi, '').slice(0, 8).toUpperCase()

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/parking')
    await expect(page.getByRole('heading', { name: 'Vehículos y cajones' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByPlaceholder('Código del cajón').fill(spot)
    await page.getByRole('button', { name: 'Registrar cajón' }).click()
    await expect(page.getByText('Cajón registrado')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(spot.toUpperCase())).toBeVisible()

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/vehicles')
    await expect(page.locator('select option', { hasText: spot.toUpperCase() })).toBeAttached({ timeout: 15000 })
    await page.getByPlaceholder('Placa').fill(plate)
    await page.getByPlaceholder('Marca').fill('Nissan')
    await page.locator('select').selectOption(spot.toUpperCase())
    await page.getByRole('button', { name: 'Registrar vehículo' }).click()
    await expect(page.getByText('Vehículo registrado')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(plate)).toBeVisible()

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/parking')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await expect(page.getByText(`${plate} · Nissan`)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(`${spot.toUpperCase()} · ${plate}`)).toBeVisible()
  })
})
