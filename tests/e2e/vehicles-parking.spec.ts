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
    await expect(page.getByText(`${plate} · Nissan`)).toBeVisible()

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/parking')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await expect(page.getByRole('row', { name: new RegExp(`^${plate} Nissan`) })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('row', { name: new RegExp(`^${spot.toUpperCase()} .*${plate}`) })).toBeVisible()
  })

  test('registra una placa sin cajón y la placa de una visita no entra al padrón', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'vehicles.noslot')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'vehicles.noslot')
    const ownPlate = 'SIN101'
    const visitPlate = 'VIS202'

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    const vehiclesLoaded = page.waitForResponse(response => response.url().includes('/parking/vehicles/unit/') && response.ok())
    await page.goto('/resident/vehicles')
    await vehiclesLoaded
    await expect(page.getByRole('heading', { name: 'Mis vehículos' })).toBeVisible()
    await page.getByPlaceholder('Placa').fill(ownPlate)
    await page.getByPlaceholder('Marca').fill('Nissan')
    await page.locator('select').selectOption('')
    await page.getByRole('button', { name: 'Registrar vehículo' }).click()
    await expect(page.getByText(`${ownPlate} · Nissan`)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(`${ownPlate} · Nissan · Cajón`)).toHaveCount(0)

    await page.goto('/resident/visits/new')
    await expect(page.getByRole('heading', { name: 'Registrar Nueva Visita' })).toBeVisible()
    const arrival = new Date(Date.now() + 60 * 60 * 1000)
    const pad = (value: number) => String(value).padStart(2, '0')
    await page.getByPlaceholder('Nombre completo').fill('Visita sin cajón')
    await page.locator('input[type="datetime-local"]').first().fill(
      `${arrival.getFullYear()}-${pad(arrival.getMonth() + 1)}-${pad(arrival.getDate())}T${pad(arrival.getHours())}:${pad(arrival.getMinutes())}`
    )
    await page.getByPlaceholder('ABC-1234').fill(visitPlate)
    await page.getByRole('button', { name: 'Registrar Visita' }).click()
    await expect(page.getByText('Visita registrada exitosamente')).toBeVisible({ timeout: 15000 })

    await page.goto('/resident/vehicles')
    await expect(page.getByText(ownPlate)).toBeVisible()
    await expect(page.getByText(visitPlate)).toHaveCount(0)
  })
})
