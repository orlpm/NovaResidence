import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginUI, uniqueEmail, unwrapData } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

function arrivalInsideToday(): { arrival: string; departure: string } {
  const now = Date.now()
  const endOfLocalDay = new Date()
  endOfLocalDay.setHours(23, 59, 0, 0)
  const preferred = now + 3 * 60 * 1000
  const arrivalMs = preferred < endOfLocalDay.getTime() ? preferred : now + 20 * 1000
  return {
    arrival: new Date(arrivalMs).toISOString(),
    departure: new Date(arrivalMs + 30 * 60 * 1000).toISOString()
  }
}

async function createSecurityUser(request: APIRequestContext, superToken: string, condominiumId: string) {
  const profile = buildScenarioProfile('visit.security')
  const email = uniqueEmail('visit.security')
  const password = 'Pass123.'
  const response = await request.post(`${API_BASE}/auth/staff-users`, {
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
  })
  expect(response.ok()).toBeTruthy()
  return { email, password }
}

async function createTodayVisit(request: APIRequestContext, token: string, condominiumId: string, unitId: string, requestedById: string, visitorName: string) {
  const visitWindow = arrivalInsideToday()
  const response = await request.post(`${API_BASE}/visits`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      unitId,
      requestedById,
      visitorName,
      type: 0,
      expectedArrival: visitWindow.arrival,
      expectedDeparture: visitWindow.departure,
      visitorCount: 1,
      purpose: 'Entrega del día'
    }
  })
  expect(response.ok()).toBeTruthy()
  return unwrapData<string>(await response.json())
}

test.describe('Control de acceso de visitas', () => {
  test('vigilancia aprueba, registra entrada y salida, y rechaza otra visita del día', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'visit.access')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'visit.access.resident')
    const security = await createSecurityUser(request, scenario.superToken, scenario.condominiumId)
    const approvedName = `Visitante ${buildScenarioProfile('visit.access.in').readableLabel}`
    const rejectedName = `Visitante ${buildScenarioProfile('visit.access.out').readableLabel}`

    const approvedVisitId = await createTodayVisit(request, resident.token, scenario.condominiumId, scenario.unitId, resident.userId, approvedName)
    const rejectedVisitId = await createTodayVisit(request, resident.token, scenario.condominiumId, scenario.unitId, resident.userId, rejectedName)

    const accessPermission = 'security.manage_access_control'
    const roleHeaders = { Authorization: `Bearer ${scenario.superToken}` }
    const rolePermissions = unwrapData<string[]>(await (await request.get(`${API_BASE}/permissions/role/5`, { headers: roleHeaders })).json())
    const grantedForTest = !rolePermissions.includes(accessPermission)
    if (grantedForTest) {
      expect((await request.post(`${API_BASE}/permissions/role/5/grant`, {
        headers: roleHeaders,
        data: { permissionCode: accessPermission }
      })).ok()).toBeTruthy()
    }

    try {
    page.on('dialog', dialog => dialog.accept('No está en la lista autorizada'))
    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await page.goto('/security/access-control')
    await expect(page.getByRole('heading', { name: 'Control de Accesos' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(approvedName)).toBeVisible({ timeout: 15000 })

    const rowFor = (visitorName: string) => page.getByText(visitorName, { exact: true }).locator('xpath=ancestor::div[contains(@class,"justify-between")][1]')
    await rowFor(approvedName).getByRole('button', { name: 'Aprobar' }).click()
    await expect(page.getByText('Visita aprobada')).toBeVisible({ timeout: 15000 })

    await rowFor(approvedName).getByRole('button', { name: 'Registrar Entrada' }).click()
    await expect(page.getByText('Entrada registrada')).toBeVisible({ timeout: 15000 })

    await rowFor(approvedName).getByRole('button', { name: 'Registrar Salida' }).click()
    await expect(page.getByText('Salida registrada')).toBeVisible({ timeout: 15000 })

    await rowFor(rejectedName).getByRole('button', { name: 'Rechazar' }).click()
    await expect(page.getByText('Visita rechazada')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(rejectedName)).toHaveCount(0)

    await page.goto('/security/access-log')
    await expect(page.getByRole('heading', { name: 'Registro de Accesos' })).toBeVisible()
    await page.getByPlaceholder('Nombre, teléfono, placa...').fill(approvedName)
    const accessRow = page.locator('div.grid').filter({ hasText: approvedName })
    await expect(accessRow.getByText(approvedName, { exact: true })).toBeVisible({ timeout: 15000 })
    await expect(accessRow.getByText('Finalizada', { exact: true })).toBeVisible()
    } finally {
      if (grantedForTest) {
        await request.post(`${API_BASE}/permissions/role/5/revoke`, {
          headers: roleHeaders,
          data: { permissionCode: accessPermission }
        })
      }
    }
  })
})
