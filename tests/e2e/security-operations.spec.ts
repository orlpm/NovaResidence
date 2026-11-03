import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { createAdminCondominiumScenario, asId } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'

const API_BASE = process.env.E2E_API_BASE || 'http://localhost:5001/api'
const SUPERADMIN_EMAIL = 'superadmin@novaresidence.com'
const SUPERADMIN_PASSWORD = 'Pass123.'

async function loginAPI(request: APIRequestContext): Promise<{ token: string }> {
  const response = await request.post(`${API_BASE}/auth/login`, {
    data: { email: SUPERADMIN_EMAIL, password: SUPERADMIN_PASSWORD }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const payload = data.data || data
  const token = payload.accessToken || payload.AccessToken
  expect(token).toBeTruthy()

  return { token }
}

function unwrapData<T = any>(payload: any): T {
  if (payload?.data?.data !== undefined) return payload.data.data as T
  if (payload?.data !== undefined) return payload.data as T
  return payload as T
}

async function loginUI(page: Page) {
  await page.goto('/auth/login')
  await page.fill('input[type="email"]', SUPERADMIN_EMAIL)
  await page.fill('input[type="password"]', SUPERADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/superadmin(\/|$)/, { timeout: 15000 })
}

test.describe('Security operational flows', () => {
  test('API security feed endpoints should return real security data for a clean condominium scenario', async ({ request }) => {
    const superLogin = await loginAPI(request)
    const scenario = await createAdminCondominiumScenario(request, 'security.ops.api')
    const incidentProfile = buildScenarioProfile('security.ops.api.incident')
    const mapProfile = buildScenarioProfile('security.ops.api.map')
    const visitProfile = buildScenarioProfile('security.ops.api.visit')

    const incidentTitle = `Incidente de seguridad ${incidentProfile.readableLabel} ${incidentProfile.unitNumber}`
    const incidentResponse = await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        reportedById: scenario.superUserId,
        title: incidentTitle,
        description: 'Incidencia para feed operativo de seguridad',
        type: 0,
        priority: 2,
        location: 'Acceso principal'
      }
    })
    expect(incidentResponse.status()).toBe(201)

    const mapName = `Mapa de vigilancia ${mapProfile.unitNumber}`
    const createMapResponse = await request.post(`${API_BASE}/condominiummaps`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        name: mapName,
        description: 'Mapa operativo para vigilancia',
        scopeType: 0,
        scopeReference: 'lobby',
        backgroundImageUrl: null
      }
    })
    expect(createMapResponse.ok()).toBeTruthy()
    const mapId = asId(unwrapData(await createMapResponse.json()))

    const visitorName = `${visitProfile.residentFirstName} ${visitProfile.residentLastName}`
    const expectedArrival = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    const createVisitResponse = await request.post(`${API_BASE}/visits`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        unitId: scenario.unitId,
        requestedById: scenario.adminUserId,
        visitorName,
        type: 0,
        expectedArrival,
        visitorIdentification: `SEG-${visitProfile.unitNumber.replace('-', '')}`,
        visitorPhone: '5511112222',
        visitorCount: 1,
        purpose: 'Acceso programado para ronda de vigilancia'
      }
    })
    expect(createVisitResponse.status()).toBe(200)

    const [visitsResponse, incidentsResponse, mapsResponse, statsResponse] = await Promise.all([
      request.get(`${API_BASE}/visits/today/${scenario.condominiumId}`, { headers: { Authorization: `Bearer ${superLogin.token}` } }),
      request.get(`${API_BASE}/incidents/condominium/${scenario.condominiumId}`, { headers: { Authorization: `Bearer ${superLogin.token}` } }),
      request.get(`${API_BASE}/condominiummaps/condominium/${scenario.condominiumId}`, { headers: { Authorization: `Bearer ${superLogin.token}` } }),
      request.get(`${API_BASE}/dashboard/stats?condominiumId=${scenario.condominiumId}`, { headers: { Authorization: `Bearer ${superLogin.token}` } })
    ])

    expect(visitsResponse.status()).toBe(200)
    const visits = unwrapData<Array<{ visitorName?: string }>>(await visitsResponse.json())
    expect(visits.some(visit => visit.visitorName === visitorName)).toBeTruthy()

    expect(incidentsResponse.status()).toBe(200)
    const incidents = await incidentsResponse.json()
    expect(Array.isArray(incidents)).toBeTruthy()
    expect(incidents.some((incident: { title?: string }) => incident.title === incidentTitle)).toBeTruthy()

    expect(mapsResponse.status()).toBe(200)
    const maps = unwrapData<Array<{ id?: string; name?: string }>>(await mapsResponse.json())
    expect(maps.some(map => map.id === mapId && map.name === mapName)).toBeTruthy()

    expect(statsResponse.status()).toBe(200)
    const stats = unwrapData<{ openIncidents?: number; totalUnits?: number }>(await statsResponse.json())
    expect(typeof stats.openIncidents).toBe('number')
    expect(typeof stats.totalUnits).toBe('number')
  })

  test('Frontend should render security dashboard and connected security modules', async ({ page, request }) => {
    await createAdminCondominiumScenario(request, 'security.ops.ui')
    await loginUI(page)

    await page.goto('/security/dashboard')
    await expect(page.getByRole('heading', { name: 'Panel de Vigilancia' })).toBeVisible()
    await expect(page.getByText('Visitantes Hoy')).toBeVisible()
    await expect(page.getByText('Accesos Registrados')).toBeVisible()
    await expect(page.getByText('Incidencias Activas')).toBeVisible()
    await expect(page.getByText('Cámaras Detectadas')).toBeVisible()

    await page.goto('/security/access-log')
    await expect(page.getByRole('heading', { name: 'Registro de Accesos' })).toBeVisible()

    await page.goto('/security/access-control')
    await expect(page.getByRole('heading', { name: 'Control de Accesos' })).toBeVisible()

    await page.goto('/security/cameras')
    await expect(page.getByRole('heading', { name: 'Cámaras' })).toBeVisible()

    await expect(page.getByText('Coming Soon')).toHaveCount(0)
  })
})
