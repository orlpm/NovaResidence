import { test, expect } from '@playwright/test'
import { API_BASE, loginUI, unwrapData } from './helpers/auth'
import { asId, createAdminCondominiumScenario } from './helpers/condominium'
import { createResidentAccount } from './helpers/resident'

test.describe('Mi unidad', () => {
  test('el residente ve su unidad y el cargo pendiente', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'my.unit')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'my.unit.resident')

    const unitResponse = await request.get(`${API_BASE}/units/${scenario.unitId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(unitResponse.ok()).toBeTruthy()
    const unitNumber = unwrapData<any>(await unitResponse.json()).unitNumber as string

    const charge = await request.post(`${API_BASE}/billing/charges`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        unitId: scenario.unitId,
        concept: `Mantenimiento ${unitNumber}`,
        feeType: 0,
        amount: 640,
        dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        billingPeriodMonth: new Date().getMonth() + 1,
        billingPeriodYear: new Date().getFullYear(),
        applyLateFee: false
      }
    })
    expect(charge.status()).toBe(201)
    expect(asId(await charge.json())).toBeTruthy()

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/my-unit')
    await expect(page.getByRole('heading', { name: 'Mi Unidad' })).toBeVisible()
    await expect(page.getByRole('heading', { name: `Unidad ${unitNumber}` })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Total Cargado')).toBeVisible()
    await expect(page.getByText('$640.00').first()).toBeVisible()
  })
})
