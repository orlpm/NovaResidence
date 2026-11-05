import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { createAdminCondominiumScenario, asId } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { uniqueEmail } from './helpers/auth'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:5001/api'
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com'
const SUPERADMIN_PASSWORD = 'Pass123.'

function uniqueIncidentTitle(prefix: string): string {
  const profile = buildScenarioProfile(prefix)
  return `Reporte de mantenimiento ${profile.readableLabel}`
}

async function loginAPI(request: APIRequestContext, email: string, password: string): Promise<{ token: string; userId?: string }> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email, password }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const payload = data.data || data
  const user = payload.user || payload.User || {}
  const token = payload.accessToken || payload.AccessToken
  const userId = user.id || user.Id || payload.userId || payload.UserId
  expect(token).toBeTruthy()

  return { token, userId }
}

async function createMaintenanceUser(request: APIRequestContext, superToken: string, condominiumId: string): Promise<{ email: string; password: string }> {
  const profile = buildScenarioProfile('maintenance.ops.user')
  const email = uniqueEmail('maintenance.ops')
  const password = 'Pass123.'

  const response = await request.post(`${API_BASE}/auth/staff-users`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      email,
      password,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      phoneNumber: '5512345678',
      role: 'Maintenance',
      condominiumId
    }
  })

  expect(response.ok()).toBeTruthy()
  return { email, password }
}

async function createAndAssignIncident(
  request: APIRequestContext,
  token: string,
  condominiumId: string,
  reportedById: string,
  assigneeId: string,
  title: string
): Promise<string> {
  const createResponse = await request.post(`${API_BASE}/incidents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      reportedById,
      title,
      description: 'Incidencia para validar el flujo operativo de mantenimiento.',
      type: 0,
      priority: 2,
      location: 'Zona común'
    }
  })

  expect(createResponse.ok()).toBeTruthy()
  const incidentId = asId(await createResponse.json())

  const assignResponse = await request.post(`${API_BASE}/incidents/${incidentId}/assign`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { assigneeId }
  })

  expect(assignResponse.ok()).toBeTruthy()
  return incidentId
}

async function loginUIAs(page: Page, email: string, password: string) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', password)
  await page.click('button[type="submit"]')
}

test.describe('Maintenance operational flow', () => {
  test('API should support technician assigned flow and status transitions', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'maintenance.ops.api')

    const maintenance = await createMaintenanceUser(request, scenario.superToken, scenario.condominiumId)
    const maintenanceLogin = await loginAPI(request, maintenance.email, maintenance.password)
    expect(maintenanceLogin.userId).toBeTruthy()

    const incidentId = await createAndAssignIncident(
      request,
      scenario.superToken,
      scenario.condominiumId,
      scenario.superUserId,
      maintenanceLogin.userId!,
      uniqueIncidentTitle('INC-MAINT-API')
    )

    const assigned = await request.get(`${API_BASE}/incidents/assigned/${maintenanceLogin.userId}`, {
      headers: { Authorization: `Bearer ${maintenanceLogin.token}` }
    })
    expect(assigned.ok()).toBeTruthy()

    const startProgress = await request.post(`${API_BASE}/incidents/${incidentId}/start-progress`, {
      headers: { Authorization: `Bearer ${maintenanceLogin.token}` }
    })
    expect(startProgress.ok()).toBeTruthy()

    const resolve = await request.post(`${API_BASE}/incidents/${incidentId}/resolve`, {
      headers: { Authorization: `Bearer ${maintenanceLogin.token}` },
      data: {
        resolvedById: maintenanceLogin.userId,
        resolutionNotes: 'Resuelto por el tecnico asignado',
        actualCost: 120.5
      }
    })
    expect(resolve.ok()).toBeTruthy()

    const close = await request.post(`${API_BASE}/incidents/${incidentId}/close`, {
      headers: { Authorization: `Bearer ${maintenanceLogin.token}` }
    })
    expect(close.ok()).toBeTruthy()
  })

  test('Frontend should show maintenance dashboard and technician incidents flow', async ({ page, request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'maintenance.ops.ui')

    const maintenance = await createMaintenanceUser(request, scenario.superToken, scenario.condominiumId)
    const maintenanceLogin = await loginAPI(request, maintenance.email, maintenance.password)
    expect(maintenanceLogin.userId).toBeTruthy()

    const incidentTitle = uniqueIncidentTitle('INC-MAINT-UI')
    const incidentId = await createAndAssignIncident(
      request,
      scenario.superToken,
      scenario.condominiumId,
      scenario.superUserId,
      maintenanceLogin.userId!,
      incidentTitle
    )

    await loginUIAs(page, maintenance.email, maintenance.password)
    await page.waitForURL(/\/maintenance(\/|$)/, { timeout: 15000 })

    await page.goto('/maintenance/dashboard')
    await expect(page.getByRole('heading', { name: 'Panel de Mantenimiento' })).toBeVisible()
    await expect(page.getByText('Asignadas', { exact: true })).toBeVisible()
    await expect(page.getByText('Mis Tareas Asignadas')).toBeVisible()

    await page.goto('/maintenance/incidents')
    await expect(page.getByRole('heading', { name: 'Mis Incidencias Asignadas' })).toBeVisible()
    await expect(page.getByText(incidentTitle)).toBeVisible()

    const card = page.locator('div.rounded-xl').filter({ hasText: incidentTitle }).first()
    await expect(card).toBeVisible()

    const startButton = card.getByRole('button', { name: 'Iniciar progreso' })
    if (await startButton.count()) {
      await startButton.click()
    }

    await page.waitForTimeout(500)

    const resolveButton = card.getByRole('button', { name: 'Resolver' })
    if (await resolveButton.count()) {
      await resolveButton.click()
      await page.fill('textarea[placeholder="Describe acciones y resultado..."]', 'Resolucion registrada desde el panel operativo')
      await page.fill('input[placeholder="0.00"]', '95')
      await page.getByRole('button', { name: 'Confirmar resolución' }).click()
    }

    const closeApi = await request.post(`${API_BASE}/incidents/${incidentId}/close`, {
      headers: { Authorization: `Bearer ${maintenanceLogin.token}` }
    })
    expect([200, 204, 400]).toContain(closeApi.status())
  })

  test('mantenimiento reporta una incidencia de su condominio', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'maintenance.door')
    const maintenance = await createMaintenanceUser(request, scenario.superToken, scenario.condominiumId)
    const title = uniqueIncidentTitle('maintenance.report')

    await loginUIAs(page, maintenance.email, maintenance.password)
    await page.waitForURL(/\/maintenance(\/|$)/, { timeout: 15000 })
    await page.getByRole('link', { name: 'Reportar Incidencia' }).first().click()
    await expect(page).toHaveURL(/\/maintenance\/new-incident/)
    await expect(page.getByRole('heading', { name: 'Reportar Nueva Incidencia' })).toBeVisible()
    await page.getByPlaceholder('Ej: Fuga de agua en baño principal').fill(title)
    await page.getByPlaceholder('Describe el problema con el mayor detalle posible. Incluye desde cuándo ocurre, qué tan frecuente es, y cualquier otro dato relevante.').fill('La luminaria del lobby no enciende.')
    await page.getByPlaceholder('Ej: Lobby, estacionamiento o jardín').fill('Lobby')
    await page.getByRole('button', { name: 'Reportar Incidencia' }).click()
    await expect(page.getByText('Incidencia reportada exitosamente')).toBeVisible({ timeout: 15000 })

    const session = await loginAPI(request, maintenance.email, maintenance.password)
    const reported = await request.get(`${API_BASE}/incidents/my-incidents/${session.userId}`, {
      headers: { Authorization: `Bearer ${session.token}` }
    })
    expect(reported.ok()).toBeTruthy()
    const incidents = await reported.json()
    const list = Array.isArray(incidents) ? incidents : incidents.data || []
    expect(list.some((item: { title?: string }) => item.title === title)).toBeTruthy()
  })
})
