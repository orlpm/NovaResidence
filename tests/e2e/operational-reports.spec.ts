import { test, expect } from '@playwright/test'
import { API_BASE, loginUI } from './helpers/auth'
import { asId, createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

function reportWindow() {
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const end = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  return { start, end }
}

test.describe('Reportes operativos', () => {
  test('operación, residentes, incidencias y comunicaciones reflejan los datos creados', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'reports.ops')
    await createResidentAccount(request, scenario.superToken, scenario.unitId, 'reports.resident')
    const profile = buildScenarioProfile('reports.ops')
    const { start, end } = reportWindow()

    const incident = await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        reportedById: scenario.superUserId,
        title: `Fuga ${profile.readableLabel}`,
        description: 'Incidencia para el reporte operativo',
        type: 0,
        priority: 1,
        location: 'Azotea'
      }
    })
    expect(incident.ok()).toBeTruthy()
    expect(asId(await incident.json())).toBeTruthy()

    const announcement = await request.post(`${API_BASE}/communications/announcements`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        title: `Aviso ${profile.readableLabel}`,
        content: 'Aviso para el reporte de comunicaciones',
        type: 0,
        priority: 1,
        publishImmediately: true
      }
    })
    expect(announcement.status()).toBe(201)

    const headers = { Authorization: `Bearer ${scenario.adminToken}` }
    const [operational, residents, incidents, communications] = await Promise.all([
      request.get(`${API_BASE}/reports/operational/${scenario.condominiumId}?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, { headers }),
      request.get(`${API_BASE}/reports/residents/${scenario.condominiumId}?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, { headers }),
      request.get(`${API_BASE}/reports/incidents/${scenario.condominiumId}?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, { headers }),
      request.get(`${API_BASE}/reports/communications/${scenario.condominiumId}?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`, { headers })
    ])

    expect(operational.ok()).toBeTruthy()
    expect(residents.ok()).toBeTruthy()
    expect(incidents.ok()).toBeTruthy()
    expect(communications.ok()).toBeTruthy()

    const operationalBody = await operational.json()
    const residentsBody = await residents.json()
    const incidentsBody = await incidents.json()
    const communicationsBody = await communications.json()
    expect(operationalBody.totalUnits).toBeGreaterThanOrEqual(1)
    expect(residentsBody.totalResidents).toBeGreaterThanOrEqual(1)
    expect(incidentsBody.totalIncidents).toBeGreaterThanOrEqual(1)
    expect(communicationsBody.totalAnnouncements).toBeGreaterThanOrEqual(1)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/reports')
    await page.getByRole('button', { name: 'Operacional' }).click()
    await expect(page.getByText('Total Unidades')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Residentes' }).click()
    await expect(page.getByText('Total Residentes')).toBeVisible()
    await page.getByRole('button', { name: 'Incidencias' }).click()
    await expect(page.getByText('Total Incidencias')).toBeVisible()
    await page.getByRole('button', { name: 'Comunicaciones' }).click()
    await expect(page.getByRole('heading', { name: 'Anuncios por Tipo' })).toBeVisible()
    expect(communicationsBody.totalAnnouncements).toBeGreaterThanOrEqual(1)
  })
})
