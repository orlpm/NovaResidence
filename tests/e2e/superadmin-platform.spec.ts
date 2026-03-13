import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginSuperadminAPI, loginUI, registerConfirmedUser, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'

async function registerAdminUser(request: APIRequestContext): Promise<{ email: string; password: string }> {
  const profile = buildScenarioProfile('superadmin.block.admin')
  const email = uniqueEmail('admin.superadmin.block')
  const { password } = await registerConfirmedUser(request, {
    email,
    firstName: profile.adminFirstName,
    lastName: profile.adminLastName,
    role: 'admin'
  })

  return { email, password }
}

test.describe('SuperAdmin Platform Features', () => {
  test('Backend endpoints for monitoring/system/database should respond', async ({ request }) => {
    const { token } = await loginSuperadminAPI(request)

    const monitoring = await request.get(`${API_BASE}/superadmin/monitoring`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(monitoring.status()).toBe(200)
    const monitoringData = await monitoring.json()
    expect(monitoringData.totalUsers).toBeGreaterThanOrEqual(0)
    expect(typeof monitoringData.databaseConnected).toBe('boolean')

    const systemSettings = await request.get(`${API_BASE}/superadmin/system/settings`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(systemSettings.status()).toBe(200)
    const settings = await systemSettings.json()
    expect(settings.supportEmail).toBeTruthy()

    const updateSystemSettings = await request.put(`${API_BASE}/superadmin/system/settings`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        maintenanceMode: settings.maintenanceMode,
        enableNewRegistrations: settings.enableNewRegistrations,
        sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
        supportEmail: settings.supportEmail,
        defaultTimeZone: settings.defaultTimeZone,
        announcementBanner: settings.announcementBanner || ''
      }
    })
    expect(updateSystemSettings.status()).toBe(200)

    const database = await request.get(`${API_BASE}/superadmin/database`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    expect(database.status()).toBe(200)
    const dbData = await database.json()
    expect(dbData.provider).toBeTruthy()
    expect(Array.isArray(dbData.tableStats)).toBeTruthy()
  })

  test('Frontend should render monitoring, system and database pages', async ({ page }) => {
    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)

    await page.goto('/superadmin/monitoring')
    await expect(page.getByRole('heading', { name: 'Monitoreo del Sistema' })).toBeVisible()
    await expect(page.getByText('Usuarios Totales')).toBeVisible()

    await page.goto('/superadmin/system')
    await expect(page.getByRole('heading', { name: 'Configuración del Sistema' })).toBeVisible()
    await expect(page.getByText('Email de soporte')).toBeVisible()

    await page.goto('/superadmin/database')
    await expect(page.getByRole('heading', { name: 'Base de Datos' })).toBeVisible()
    await expect(page.getByText('Conteo por Tabla')).toBeVisible()
  })

  test('API should deny admin role from superadmin endpoints', async ({ request }) => {
    const admin = await registerAdminUser(request)

    const adminLogin = await loginAPI(request, admin.email, admin.password)
    const adminToken = adminLogin.token
    expect(adminToken).toBeTruthy()

    const monitoring = await request.get(`${API_BASE}/superadmin/monitoring`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    expect(monitoring.status()).toBe(403)

    const system = await request.get(`${API_BASE}/superadmin/system/settings`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    })
    expect(system.status()).toBe(403)
  })

  test('Frontend should deny admin role from /superadmin route', async ({ page, request }) => {
    const admin = await registerAdminUser(request)
    await loginUI(page, admin.email, admin.password, /\/admin(\/|$)/)

    await page.goto('/superadmin/monitoring')
    await expect(page).toHaveURL(/\/unauthorized$/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Acceso Denegado' })).toBeVisible()
  })
})
