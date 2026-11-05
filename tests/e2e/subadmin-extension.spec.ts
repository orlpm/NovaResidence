import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, uniqueEmail } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { ensureCondominiumRole } from './helpers/sql'

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

  test('el subadmin consulta las visitas del condominio que administra', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'subadmin.operate')
    const subAdmin = await registerSubAdminUser(request)
    const subLogin = await loginAPI(request, subAdmin.email, subAdmin.password)
    expect(subLogin.userId).toBeTruthy()
    await grantSubAdminExtensionPermissions(request, scenario.superToken, subLogin.userId!)
    await ensureCondominiumRole(subLogin.userId!, scenario.condominiumId, 2)

    const visits = await request.get(`${API_BASE}/visits/condominium/${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${subLogin.token}` }
    })
    expect(visits.status(), await visits.text()).toBe(200)

    await loginUI(page, subAdmin.email, subAdmin.password, /\/subadmin(\/|$)/)
    await page.getByRole('link', { name: 'Visitas' }).first().click()
    await expect(page).toHaveURL(/\/subadmin\/visits/)
    await expect(page.getByRole('heading', { name: 'Gestión de Visitas' })).toBeVisible()
  })
})
