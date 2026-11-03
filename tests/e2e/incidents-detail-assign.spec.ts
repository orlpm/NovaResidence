import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { uniqueEmail } from './helpers/auth'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:5001/api'
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com'
const SUPERADMIN_PASSWORD = 'Pass123.'

async function loginAPI(request: APIRequestContext, email: string, password: string): Promise<{ token: string; userId: string }> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const token = data.data?.accessToken || data.accessToken || data.AccessToken
  const userId = data.data?.user?.id || data.user?.id || data.User?.Id || data.data?.User?.Id || data.data?.userId || data.userId
  expect(token).toBeTruthy()
  expect(userId).toBeTruthy()
  return { token, userId }
}

async function loginUI(page: Page, email: string, password: string, expectedPath: RegExp) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(expectedPath, { timeout: 15000 })
}

test.describe('Incidents detail assignment UX', () => {
  test('assigns staff inside detail modal without opening a second assignment popup', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'incidents.detail.assign')
    const maintenanceProfile = buildScenarioProfile('incidents.detail.assign.maintenance')
    const incidentProfile = buildScenarioProfile('incidents.detail.assign.incident')
    const condominiumId = scenario.condominiumId

    const maintenanceEmail = uniqueEmail('detail.assign.maintenance')
    const createMaintenance = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email: maintenanceEmail,
        password: 'Pass123.',
        firstName: maintenanceProfile.residentFirstName,
        lastName: maintenanceProfile.residentLastName,
        phoneNumber: '5551112222',
        role: 'Maintenance',
        condominiumId
      }
    })
    expect(createMaintenance.ok()).toBeTruthy()

    const incidentTitle = `Incidencia de asignacion ${incidentProfile.readableLabel}`
    const createIncident = await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId,
        reportedById: scenario.superUserId,
        title: incidentTitle,
        description: 'Incidencia para validar asignación en popup de detalle',
        type: 0,
        priority: 1,
        location: 'Entrada principal'
      }
    })
    expect(createIncident.status()).toBe(201)

    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)
    await page.evaluate(({ linkedUserId, condoId }) => {
      const raw = window.localStorage.getItem('auth-storage')
      if (!raw) return
      const parsed = JSON.parse(raw)
      parsed.state = parsed.state || {}
      parsed.state.user = {
        ...(parsed.state.user || {}),
        id: linkedUserId,
        role: 'admin',
        defaultRole: 'Admin',
        condominiumId: condoId
      }
      parsed.state.isAuthenticated = true
      window.localStorage.setItem('auth-storage', JSON.stringify(parsed))
    }, { linkedUserId: scenario.adminUserId, condoId: condominiumId })

    await page.goto('/admin/incidents')

    const condominiumSelect = page.locator('text=Seleccionar Condominio').locator('..').locator('select')
    await expect
      .poll(async () => await condominiumSelect.locator('option').count(), { timeout: 30000 })
      .toBeGreaterThan(0)

    const hasTargetCondominium = await condominiumSelect.locator(`option[value="${condominiumId}"]`).count()
    if (hasTargetCondominium > 0) {
      await condominiumSelect.selectOption(condominiumId)
    } else {
      const firstSelectable = await condominiumSelect.locator('option:not([value=""])').first().getAttribute('value')
      if (firstSelectable) {
        await condominiumSelect.selectOption(firstSelectable)
      }
    }

    await expect(page.locator('text=Cargando incidencias...')).not.toBeVisible({ timeout: 15000 })

    const row = page.locator('tr', { hasText: incidentTitle })
    await expect(row).toBeVisible({ timeout: 15000 })

    await row.locator('button').first().click()
    await page.click('button:has-text("Ver Detalle")')

    await expect(page.locator('h2:has-text("Detalle de Incidencia")')).toBeVisible()
    await expect(page.locator('text=Asignar Incidencia')).not.toBeVisible()

    const staffSelect = page.locator('text=Asignar personal operativo').locator('..').locator('select')
    await expect
      .poll(async () => await staffSelect.locator('option').count(), { timeout: 10000 })
      .toBeGreaterThan(1)
    await staffSelect.selectOption({ index: 1 })
    const selectedStaffLabel = await staffSelect.evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.text || '')
    const selectedStaffName = selectedStaffLabel.split(' - ')[0].trim()
    await page.locator('text=Asignar personal operativo').locator('..').locator('button:has-text("Asignar")').click()

    await expect(page.locator('text=Asignado a').locator('xpath=..').locator(`text=${selectedStaffName}`)).toBeVisible({ timeout: 10000 })
  })
})
