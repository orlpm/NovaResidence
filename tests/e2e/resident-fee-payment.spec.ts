import { test, expect } from '@playwright/test'
import { API_BASE, loginUI } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

test.describe('Pago de cuotas del residente', () => {
  test('el residente paga la cuota y consulta el recibo', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'fee.pay')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'fee.pay.resident')
    const concept = `Mantenimiento ${buildScenarioProfile('fee.pay').readableLabel}`
    const due = new Date()
    due.setDate(due.getDate() + 10)

    const charge = await request.post(`${API_BASE}/billing/charges`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        unitId: scenario.unitId,
        concept,
        feeType: 0,
        amount: 900,
        dueDate: due.toISOString(),
        billingPeriodMonth: due.getMonth() + 1,
        billingPeriodYear: due.getFullYear(),
        applyLateFee: false
      }
    })
    expect(charge.status(), await charge.text()).toBe(201)

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/payments')
    await expect(page.getByText('Estado de cuenta de tu unidad')).toBeVisible()
    await expect(page.getByText(concept)).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Pagar' }).click()
    await page.getByRole('button', { name: 'Efectivo' }).click()
    await page.getByRole('button', { name: 'Confirmar Pago' }).click()
    await expect(page.getByText('Pago registrado exitosamente')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Ver recibo' }).click()
    await expect(page.getByRole('heading', { name: 'Recibo de pago' })).toBeVisible()
    await expect(page.getByText(/Folio REC-/)).toBeVisible()
  })
})
