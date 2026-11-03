import { test, expect } from '@playwright/test'
import { loginUI } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

test.describe('Documentos del condominio', () => {
  test('el admin publica un reglamento y el residente lo consulta', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'documents')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'documents.resident')
    const title = `Reglamento ${buildScenarioProfile('documents').readableLabel}`

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/documents')
    await expect(page.getByRole('heading', { name: 'Documentos' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByPlaceholder('Reglamento interno').fill(title)
    await page.locator('select').nth(1).selectOption('5')
    await page.locator('input[type="file"]').setInputFiles({ name: 'reglamento.png', mimeType: 'image/png', buffer: tinyPng })
    await page.getByRole('button', { name: 'Publicar documento' }).click()
    await expect(page.getByText('Documento publicado')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(title)).toBeVisible()

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/documents')
    await expect(page.getByRole('heading', { name: 'Documentos' })).toBeVisible()
    await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Reglamento', { exact: true })).toBeVisible()
  })
})
