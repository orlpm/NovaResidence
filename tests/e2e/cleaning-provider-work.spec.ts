import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginAPI, loginUI, uniqueEmail } from './helpers/auth'
import { asId, createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { ensureCondominiumRole } from './helpers/sql'

async function createIncident(request: APIRequestContext, token: string, condominiumId: string, reportedById: string, title: string) {
  const response = await request.post(`${API_BASE}/incidents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      reportedById,
      title,
      description: 'Trabajo asignado al personal operativo',
      type: 0,
      priority: 2,
      location: 'Área común'
    }
  })
  expect(response.ok()).toBeTruthy()
  return asId(await response.json())
}

test.describe('Trabajo de limpieza y proveedor', () => {
  test('limpieza recibe una incidencia, la inicia y la resuelve', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'cleaning.work')
    const profile = buildScenarioProfile('cleaning.work')
    const email = uniqueEmail('cleaning.work')
    const password = 'Pass123.'
    const title = `Limpieza ${profile.readableLabel}`

    const staff = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email,
        password,
        firstName: profile.residentFirstName,
        lastName: profile.residentLastName,
        phoneNumber: '5512345678',
        role: 'Cleaning',
        condominiumId: scenario.condominiumId
      }
    })
    expect(staff.ok()).toBeTruthy()
    const cleaning = await loginAPI(request, email, password)

    const incidentId = await createIncident(request, scenario.superToken, scenario.condominiumId, scenario.superUserId, title)
    expect((await request.post(`${API_BASE}/incidents/${incidentId}/assign`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: { assigneeId: cleaning.userId }
    })).status()).toBe(204)

    await loginUI(page, email, password, /\/cleaning(\/|$)/)
    await page.goto('/cleaning/incidents')
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Estatus: En Progreso')).toBeVisible()
    await page.getByRole('button', { name: 'Resolver' }).click()
    await page.getByPlaceholder('Describe acciones y resultado...').fill('Área común limpia')
    await page.getByRole('button', { name: 'Confirmar resolución' }).click()
    await expect(page.getByText('Incidencia resuelta')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Estatus: Resuelta')).toBeVisible()
  })

  test('un proveedor del condominio atiende la incidencia que le asignan', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'provider.work')
    const profile = buildScenarioProfile('provider.work')
    const email = uniqueEmail('provider.work')
    const password = 'Pass123.'
    const title = `Servicio ${profile.readableLabel}`

    const register = await request.post(`${API_BASE}/auth/register`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email,
        password,
        firstName: profile.residentFirstName,
        lastName: profile.residentLastName,
        phoneNumber: '5512345678',
        role: 'Provider'
      }
    })
    expect(register.ok()).toBeTruthy()
    const provider = await loginAPI(request, email, password)
    await ensureCondominiumRole(provider.userId, scenario.condominiumId, 7)

    const incidentId = await createIncident(request, scenario.superToken, scenario.condominiumId, scenario.superUserId, title)
    expect((await request.post(`${API_BASE}/incidents/${incidentId}/assign`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: { assigneeId: provider.userId }
    })).status()).toBe(204)

    await loginUI(page, email, password, /\/provider(\/|$)/)
    await expect(page.getByRole('heading', { name: 'Panel de Proveedor' })).toBeVisible()
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Órdenes asignadas').locator('xpath=preceding-sibling::p')).toHaveText('1')
    await page.getByRole('button', { name: 'Concluir servicio' }).click()
    await page.getByPlaceholder('Describe el servicio realizado...').fill('Servicio concluido')
    await page.getByRole('button', { name: 'Confirmar' }).click()
    await expect(page.getByText('Servicio concluido')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('No tienes servicios pendientes.')).toBeVisible()
    await expect(page.getByText('Servicios completados').locator('xpath=preceding-sibling::p')).toHaveText('1')
  })

  test('el admin agenda una visita y el proveedor la ve en su panel', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'provider.agenda')
    const profile = buildScenarioProfile('provider.agenda')
    const email = uniqueEmail('provider.agenda')
    const password = 'Pass123.'
    const title = `Visita ${profile.readableLabel}`
    const when = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const pad = (value: number) => String(value).padStart(2, '0')
    const scheduledAt = `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}T10:30`

    const register = await request.post(`${API_BASE}/auth/register`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email,
        password,
        firstName: profile.residentFirstName,
        lastName: profile.residentLastName,
        phoneNumber: '5512345678',
        role: 'Provider'
      }
    })
    expect(register.ok()).toBeTruthy()
    const provider = await loginAPI(request, email, password)
    await ensureCondominiumRole(provider.userId, scenario.condominiumId, 7)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/provider-agenda')
    await expect(page.getByRole('heading', { name: 'Agenda de proveedores' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.locator('select').nth(1).selectOption(provider.userId)
    await page.getByPlaceholder('Mantenimiento de elevadores').fill(title)
    await page.locator('input[type="datetime-local"]').fill(scheduledAt)
    await page.getByRole('button', { name: 'Agendar visita' }).click()
    await expect(page.getByText('Visita agendada')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(title)).toBeVisible()

    await loginUI(page, email, password, /\/provider(\/|$)/)
    await expect(page.getByRole('heading', { name: 'Panel de Proveedor' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Agenda' })).toBeVisible()
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Próximas visitas').locator('xpath=preceding-sibling::p')).toHaveText('1')
  })

  test('limpieza reporta una incidencia de su condominio', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'cleaning.door')
    const profile = buildScenarioProfile('cleaning.door')
    const email = uniqueEmail('cleaning.door')
    const password = 'Pass123.'
    const title = `Limpieza ${profile.readableLabel}`
    const staff = await request.post(`${API_BASE}/auth/staff-users`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        email,
        password,
        firstName: profile.residentFirstName,
        lastName: profile.residentLastName,
        phoneNumber: '5512345678',
        role: 'Cleaning',
        condominiumId: scenario.condominiumId
      }
    })
    expect(staff.ok()).toBeTruthy()

    await loginUI(page, email, password, /\/cleaning(\/|$)/)
    await page.getByRole('link', { name: 'Reportar Incidencia' }).first().click()
    await expect(page).toHaveURL(/\/cleaning\/new-incident/)
    await expect(page.getByRole('heading', { name: 'Reportar Nueva Incidencia' })).toBeVisible()
    await page.getByPlaceholder('Ej: Fuga de agua en baño principal').fill(title)
    await page.getByPlaceholder('Describe el problema con el mayor detalle posible. Incluye desde cuándo ocurre, qué tan frecuente es, y cualquier otro dato relevante.').fill('El pasillo del primer piso necesita limpieza.')
    await page.getByPlaceholder('Ej: Lobby, estacionamiento o jardín').fill('Pasillo 1')
    await page.getByRole('button', { name: 'Reportar Incidencia' }).click()
    await expect(page.getByText('Incidencia reportada exitosamente')).toBeVisible({ timeout: 15000 })

    const session = await loginAPI(request, email, password)
    const reported = await request.get(`${API_BASE}/incidents/my-incidents/${session.userId}`, {
      headers: { Authorization: `Bearer ${session.token}` }
    })
    expect(reported.ok()).toBeTruthy()
    const incidents = await reported.json()
    const list = Array.isArray(incidents) ? incidents : incidents.data || []
    expect(list.some((item: { title?: string }) => item.title === title)).toBeTruthy()
  })
})
