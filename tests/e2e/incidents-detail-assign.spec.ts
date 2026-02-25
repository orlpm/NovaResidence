import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

const API_BASE = 'http://localhost:5001/api'
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

async function getFirstCondominiumId(request: APIRequestContext, token: string, userId?: string): Promise<string | null> {
  const url = userId ? `${API_BASE}/condominiums?userId=${userId}` : `${API_BASE}/condominiums`
  const response = await request.get(url, {
    headers: { Authorization: `Bearer ${token}` }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const condominiums = Array.isArray(data)
    ? data
    : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.data) ? data.data.data : []))
  return condominiums.length > 0 ? (condominiums[0].id as string) : null
}

async function getUserWithCondominium(
  request: APIRequestContext,
  superToken: string
): Promise<{ userId: string; condominiumId: string }> {
  const usersResponse = await request.get(`${API_BASE}/auth/users`, {
    headers: { Authorization: `Bearer ${superToken}` }
  })

  expect(usersResponse.ok()).toBeTruthy()
  const users = await usersResponse.json()
  expect(Array.isArray(users)).toBeTruthy()

  for (const user of users) {
    const userId = user?.id as string | undefined
    if (!userId) continue

    const condominiumId = await getFirstCondominiumId(request, superToken, userId)
    if (condominiumId) {
      return { userId, condominiumId }
    }
  }

  throw new Error('No se encontró un usuario con condominios disponibles para la prueba')
}

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}@e2e.local`
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
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const linkedUser = await getUserWithCondominium(request, superadmin.token)
    const condominiumId = linkedUser.condominiumId

    const maintenanceEmail = uniqueEmail('detail.assign.maintenance')
    const createMaintenance = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: {
        email: maintenanceEmail,
        password: 'Pass123.',
        firstName: 'Detalle',
        lastName: 'Operador',
        phoneNumber: '5551112222',
        role: 'Maintenance',
        condominiumId
      }
    })
    expect(createMaintenance.ok()).toBeTruthy()

    const incidentTitle = `Incidencia detalle asignación ${Date.now()}`
    const createIncident = await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: {
        condominiumId,
        reportedById: superadmin.userId,
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
        role: 'maintenance',
        defaultRole: 'Maintenance',
        condominiumId: condoId
      }
      parsed.state.isAuthenticated = true
      window.localStorage.setItem('auth-storage', JSON.stringify(parsed))
    }, { linkedUserId: linkedUser.userId, condoId: condominiumId })

    await page.goto('/maintenance/incidents')

    const condominiumSelect = page.locator('text=Seleccionar Condominio').locator('..').locator('select')
    await expect
      .poll(async () => await condominiumSelect.locator('option').count(), { timeout: 30000 })
      .toBeGreaterThan(1)
    await condominiumSelect.selectOption({ index: 1 })
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
