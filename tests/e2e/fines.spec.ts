import { test, expect } from '@playwright/test'
import { loginUI } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

test.describe('Multas', () => {
  test('la multa del admin aparece en el estado de cuenta del residente', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'fines')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'fines.resident')
    const concept = `Ruido ${buildScenarioProfile('fines').readableLabel}`

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/fines')
    await expect(page.getByRole('heading', { name: 'Multas' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await expect(page.locator('select').nth(1).locator(`option[value="${scenario.unitId}"]`)).toBeAttached({ timeout: 15000 })
    await page.locator('select').nth(1).selectOption(scenario.unitId)
    await page.getByPlaceholder('Motivo de la multa').fill(concept)
    await page.locator('input[type="number"]').fill('350')
    await page.getByRole('button', { name: 'Registrar multa' }).click()
    await expect(page.getByText('Multa registrada')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    await expect(page.getByText('Nueva multa')).toBeVisible({ timeout: 15000 })
    await page.goto('/resident/payments')
    await expect(page.getByText('Estado de cuenta de tu unidad')).toBeVisible()
    await expect(page.getByText(concept)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('$350.00').first()).toBeVisible()
  })
})
