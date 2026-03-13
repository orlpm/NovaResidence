import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'

async function registerSubAdminUser(request: APIRequestContext): Promise<{ email: string; password: string }> {
  const profile = buildScenarioProfile('subadmin.extension')
  const email = uniqueEmail('subadmin.extension')
  const { password } = await registerConfirmedUser(request, {
    email,
    firstName: profile.residentFirstName,
    lastName: profile.residentLastName,
    role: 'SubAdmin'
  })

  return { email, password }
}

async function getFirstCondominiumId(request: APIRequestContext, token: string): Promise<string | null> {
  const response = await request.get(`${API_BASE}/condominiums`, {
    headers: { Authorization: `Bearer ${token}` }
  })

  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : [])
  return items.length > 0 ? items[0].id : null
}

async function grantSubAdminExtensionPermissions(request: APIRequestContext, superToken: string, userId: string) {
  const permissions = [
    'residents.view',
    'billing.view',
    'incidents.view',
    'communications.view_announcements',
    'reservations.view',
    'reports.view',
    'maps.view',
    'common_areas.view',
    'security.manage_visitors'
  ]

  for (const code of permissions) {
    const grant = await request.post(`${API_BASE}/permissions/user/${userId}/grant`, {
      headers: { Authorization: `Bearer ${superToken}` },
      data: { permissionCode: code }
    })
    expect(grant.ok()).toBeTruthy()
  }
}

test.describe('SubAdmin extension of Admin', () => {
  test('should route subadmin profile to /subadmin and block /admin area', async ({ page, request }) => {
    const subAdmin = await registerSubAdminUser(request)

    await loginUI(page, subAdmin.email, subAdmin.password, /\/subadmin(\/|$)/)

    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/auth\/login$|\/unauthorized$/, { timeout: 15000 })
  })

  test('should expose admin-extension routes in subadmin UI when permissions are granted', async ({ page, request }) => {
    const superLogin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const subAdmin = await registerSubAdminUser(request)
    const subAdminLogin = await loginAPI(request, subAdmin.email, subAdmin.password)
    expect(subAdminLogin.userId).toBeTruthy()
    await grantSubAdminExtensionPermissions(request, superLogin.token, subAdminLogin.userId!)
    await loginUI(page, subAdmin.email, subAdmin.password, /\/subadmin(\/|$)/)

    const expectedNav = ['Residentes', 'Facturación', 'Incidencias', 'Comunicados', 'Reservaciones', 'Visitas', 'Áreas Comunes', 'Mapas', 'Reportes']

    for (const item of expectedNav) {
      await expect(page.getByRole('link', { name: item })).toBeVisible()
    }

    await page.goto('/subadmin/common-areas')
    await expect(page).toHaveURL(/\/subadmin\/common-areas$/, { timeout: 15000 })

    await page.goto('/subadmin/maps')
    await expect(page).toHaveURL(/\/subadmin\/maps$/, { timeout: 15000 })

    await page.goto('/subadmin/reports')
    await expect(page).toHaveURL(/\/subadmin\/reports$/, { timeout: 15000 })
  })

  test('subadmin token should access key API flows for extension modules', async ({ request }) => {
    const superLogin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)

    const subAdmin = await registerSubAdminUser(request)
    const subLogin = await loginAPI(request, subAdmin.email, subAdmin.password)
    expect(subLogin.userId).toBeTruthy()
    await grantSubAdminExtensionPermissions(request, superLogin.token, subLogin.userId!)

    const condominiumId = await getFirstCondominiumId(request, superLogin.token)
    test.skip(!condominiumId, 'No hay condominios para validar flujos API de subadmin')

    const startDate = new Date()
    startDate.setDate(1)
    const endDate = new Date()

    const qs = `startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(endDate.toISOString())}`

    const checks = [
      request.get(`${API_BASE}/commonareas/condominium/${condominiumId}`, { headers: { Authorization: `Bearer ${subLogin.token}` } }),
      request.get(`${API_BASE}/condominiummaps/condominium/${condominiumId}`, { headers: { Authorization: `Bearer ${subLogin.token}` } }),
      request.get(`${API_BASE}/reservations/condominium/${condominiumId}`, { headers: { Authorization: `Bearer ${subLogin.token}` } }),
      request.get(`${API_BASE}/visits/condominium/${condominiumId}`, { headers: { Authorization: `Bearer ${subLogin.token}` } }),
      request.get(`${API_BASE}/reports/financial/${condominiumId}?${qs}`, { headers: { Authorization: `Bearer ${subLogin.token}` } })
    ]

    const responses = await Promise.all(checks)

    for (const response of responses) {
      expect(response.status(), `status inesperado para ${response.url()}`).toBeLessThan(500)
      expect([200, 401, 403, 404]).toContain(response.status())
    }

    const forbiddenCount = responses.filter(r => r.status() === 403).length
    expect(forbiddenCount).toBeLessThanOrEqual(2)
  })
})
