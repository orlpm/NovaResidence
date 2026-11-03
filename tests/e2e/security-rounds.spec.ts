import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginUI, uniqueEmail } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'

async function createSecurity(request: APIRequestContext, superToken: string, condominiumId: string) {
  const profile = buildScenarioProfile('rounds.security')
  const email = uniqueEmail('rounds.security')
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

test.describe('Bitácora de rondas', () => {
  test('vigilancia registra una ronda y no aparece en el registro de visitas', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'rounds')
    const security = await createSecurity(request, scenario.superToken, scenario.condominiumId)
    const notes = `Ronda nocturna ${buildScenarioProfile('rounds').readableLabel}`

    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await page.goto('/security/rounds')
    await expect(page.getByRole('heading', { name: 'Bitácora de rondas' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByPlaceholder('Zona recorrida').fill('Lobby')
    await page.getByPlaceholder('Notas de la ronda').fill(notes)
    await page.getByRole('button', { name: 'Registrar ronda' }).click()
    await expect(page.getByText('Ronda registrada')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(notes)).toBeVisible()

    await page.goto('/security/access-log')
    await expect(page.getByRole('heading', { name: 'Registro de Accesos' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(notes)).toHaveCount(0)
  })
})
