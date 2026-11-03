import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginUI, uniqueEmail } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

async function createSecurity(request: APIRequestContext, superToken: string, condominiumId: string) {
  const profile = buildScenarioProfile('pkg.security')
  const email = uniqueEmail('pkg.security')
  const password = 'Pass123.'
  expect((await request.post(`${API_BASE}/auth/staff-users`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      email,
      password,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      phoneNumber: '5512345678',
      role: 'SecurityGuard',
      condominiumId
    }
  })).ok()).toBeTruthy()
  return { email, password }
}

test.describe('Paquetería', () => {
  test('vigilancia registra un paquete y el residente recibe el aviso', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'packages')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'packages.resident')
    const security = await createSecurity(request, scenario.superToken, scenario.condominiumId)
    const carrier = `Estafeta ${buildScenarioProfile('packages').readableLabel}`

    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await page.goto('/security/packages')
    await expect(page.getByRole('heading', { name: 'Paquetería' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await expect(page.locator('select').nth(1).locator(`option[value="${scenario.unitId}"]`)).toBeAttached({ timeout: 15000 })
    await page.locator('select').nth(1).selectOption(scenario.unitId)
    await page.getByPlaceholder('Paquetería').fill(carrier)
    await page.getByPlaceholder('Descripción del paquete').fill('Caja pequeña')
    await page.getByRole('button', { name: 'Registrar paquete' }).click()
    await expect(page.getByText('Paquete registrado')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    await expect(page.getByText('Paquete recibido')).toBeVisible({ timeout: 15000 })
    await page.goto('/resident/packages')
    await expect(page.getByText(carrier)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Caja pequeña')).toBeVisible()
  })
})
