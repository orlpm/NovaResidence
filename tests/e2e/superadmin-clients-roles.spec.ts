import { test, expect } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, unwrapData } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'

test.describe('Clientes y roles de plataforma', () => {
  test('el superadmin consulta, suspende y reactiva el condominio cliente', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'platform.client')
    const detailResponse = await request.get(`${API_BASE}/condominiums/${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })
    expect(detailResponse.ok()).toBeTruthy()
    const condoName = unwrapData<any>(await detailResponse.json()).name as string

    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)
    await page.goto('/superadmin/clients')
    await page.getByPlaceholder('Buscar por nombre, email de admin o dirección...').fill(scenario.adminEmail)
    const row = page.locator('tr').filter({ hasText: scenario.adminEmail })
    await expect(row).toBeVisible({ timeout: 15000 })
    await row.getByTitle('Ver detalles').click()
    await expect(page.getByRole('heading', { name: 'Detalle del Condominio' })).toBeVisible()
    await expect(page.getByText(condoName).first()).toBeVisible()
    await page.getByRole('heading', { name: 'Detalle del Condominio' }).locator('xpath=..').getByRole('button').click()

    await row.getByTitle('Suspender').click()
    await expect(row.getByText('Suspendido')).toBeVisible({ timeout: 15000 })

    const after = unwrapData<any>(await (await request.get(`${API_BASE}/condominiums/${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })).json())
    expect(after.isActive).toBe(false)

    await page.locator('tr').filter({ hasText: condoName }).getByTitle('Activar').click()
    await expect.poll(async () => {
      const refreshed = unwrapData<any>(await (await request.get(`${API_BASE}/condominiums/${scenario.condominiumId}`, {
        headers: { Authorization: `Bearer ${scenario.superToken}` }
      })).json())
      return refreshed.isActive
    }).toBe(true)
  })

  test('el superadmin ve los roles y un permiso otorgado aparece en el rol', async ({ request, page }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const headers = { Authorization: `Bearer ${superadmin.token}` }
    const securityRole = 5

    const allResponse = await request.get(`${API_BASE}/permissions`, { headers })
    expect(allResponse.ok()).toBeTruthy()
    const allPermissions = unwrapData<Array<{ id?: string; code?: string; name?: string }>>(await allResponse.json())
    const roleResponse = await request.get(`${API_BASE}/permissions/role/${securityRole}`, { headers })
    expect(roleResponse.ok()).toBeTruthy()
    const rolePermissions = unwrapData<string[]>(await roleResponse.json())
    const candidate = allPermissions.find(permission => permission.code && !rolePermissions.includes(permission.code))
    expect(candidate?.code).toBeTruthy()

    const grant = await request.post(`${API_BASE}/permissions/role/${securityRole}/grant`, {
      headers,
      data: { permissionCode: candidate!.code }
    })
    expect(grant.ok()).toBeTruthy()

    try {
      await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)
      await page.goto('/superadmin/roles')
      await expect(page.getByRole('heading', { name: 'Vigilancia' })).toBeVisible({ timeout: 15000 })
      await page.getByRole('heading', { name: 'Vigilancia' }).click()
      await page.getByPlaceholder('Buscar permisos...').fill(candidate!.code!)
      const granted = page.getByText(candidate!.code!, { exact: true }).locator('xpath=ancestor::div[contains(@class,"rounded-lg")][1]')
      await expect(granted).toHaveClass(/border-green/)
    } finally {
      await request.post(`${API_BASE}/permissions/role/${securityRole}/revoke`, {
        headers,
        data: { permissionCode: candidate!.code }
      })
    }
  })
})
