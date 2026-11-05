import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginUI, uniqueEmail } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
)

async function createSecurityUser(request: APIRequestContext, superToken: string, condominiumId: string) {
  const profile = buildScenarioProfile('maps.security')
  const email = uniqueEmail('maps.security')
  const password = 'Pass123.'
  const response = await request.post(`${API_BASE}/auth/staff-users`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      email,
      password,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      phoneNumber: '5512345678',
      role: 'SecurityGuard',
      condominiumId
    }
  })
  expect(response.ok()).toBeTruthy()
  return { email, password }
}

test.describe('Áreas comunes, mapas y cámaras', () => {
  test('admin crea y desactiva un área, y el residente solo ve las activas', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'common.area')
    const profile = buildScenarioProfile('common.area.name')
    const areaName = `Lobby ${profile.readableLabel}`
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'common.area.resident')

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/common-areas')
    await expect(page.getByRole('heading', { name: 'Áreas Comunes' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByRole('button', { name: 'Nueva área' }).click()
    const areaDialog = page.locator('.fixed').filter({ hasText: 'Nueva área común' })
    await areaDialog.locator('input').first().fill(areaName)
    await areaDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Área común creada')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: areaName })).toBeVisible()

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/common-areas')
    await expect(page.getByRole('heading', { name: 'Áreas Comunes' })).toBeVisible()
    await expect(page.getByText(areaName)).toBeVisible({ timeout: 15000 })

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/common-areas')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.locator('div').filter({ has: page.getByRole('heading', { name: areaName }) }).getByRole('button', { name: 'Desactivar' }).click()
    await expect(page.getByText('Área desactivada')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/common-areas')
    await expect(page.getByText(areaName)).toHaveCount(0)
  })

  test('el admin publica un mapa con marcador de cámara y vigilancia lo ve en Cámaras', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'condo.map')
    const profile = buildScenarioProfile('condo.map.name')
    const mapName = `Plano ${profile.unitNumber}`
    const cameraLabel = `Cámara ${profile.readableLabel}`
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'condo.map.resident')

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/maps')
    await expect(page.getByRole('heading', { name: 'Mapa del Condominio' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByRole('button', { name: 'Nuevo mapa' }).click()
    const mapDialog = page.locator('.fixed').filter({ hasText: 'Nuevo mapa' })
    await mapDialog.getByPlaceholder('Nombre').fill(mapName)
    await mapDialog.getByPlaceholder('Referencia (ej. Torre A / Nivel 2)').fill('Nivel 1')
    await mapDialog.locator('select').nth(1).selectOption('upload')
    await mapDialog.locator('input[type="file"]').setInputFiles({ name: 'plano.png', mimeType: 'image/png', buffer: tinyPng })
    await mapDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Mapa creado')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Nuevo marcador' }).click()
    const markerDialog = page.locator('.fixed').filter({ hasText: 'Nuevo marcador' })
    await markerDialog.getByPlaceholder('Etiqueta').fill(cameraLabel)
    await markerDialog.getByPlaceholder('Capa').fill('cctv')
    await markerDialog.getByPlaceholder('URL de monitoreo (opcional)').fill('https://example.com/camara-lobby')
    await markerDialog.getByRole('button', { name: 'Guardar marcador' }).click()
    await expect(page.getByText('Marcador creado')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/map')
    await expect(page.getByRole('heading', { name: 'Mapa del Condominio' })).toBeVisible()
    await expect(page.getByText(cameraLabel, { exact: true })).toBeVisible({ timeout: 15000 })

    const security = await createSecurityUser(request, scenario.superToken, scenario.condominiumId)
    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await page.goto('/security/cameras')
    await expect(page.getByRole('heading', { name: 'Cámaras' })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(cameraLabel).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('link', { name: 'Abrir fuente' })).toBeVisible()
    await expect(page.getByTitle('Transmisión en vivo')).toBeVisible()
  })

  test('el residente reserva un área común y el admin la aprueba', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'area.reserve')
    const areaName = `Salón ${buildScenarioProfile('area.reserve').readableLabel}`
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'area.reserve.resident')
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/common-areas')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByRole('button', { name: 'Nueva área' }).click()
    const areaDialog = page.locator('.fixed').filter({ hasText: 'Nueva área común' })
    await areaDialog.locator('input').first().fill(areaName)
    await areaDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Área común creada')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/common-areas')
    const areaCard = page.locator('div.rounded-xl').filter({ has: page.getByRole('heading', { name: areaName }) })
    await areaCard.getByRole('button', { name: 'Reservar' }).click()
    const reserveDialog = page.locator('.fixed').filter({ hasText: 'Reservar área' })
    await reserveDialog.locator('input[type="date"]').fill(tomorrow)
    await reserveDialog.getByPlaceholder('Motivo de la reservación').fill('Reunión familiar')
    await reserveDialog.getByRole('button', { name: 'Solicitar reservación' }).click()
    await expect(page.getByText('Reservación enviada')).toBeVisible({ timeout: 15000 })
    await expect(areaCard.getByText('Pendiente')).toBeVisible()

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/common-areas')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByRole('button', { name: 'Aprobar' }).click()
    await expect(page.getByText('Reservación aprobada')).toBeVisible({ timeout: 15000 })

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/common-areas')
    await expect(page.locator('div.rounded-xl').filter({ has: page.getByRole('heading', { name: areaName }) }).getByText('Aprobada')).toBeVisible({ timeout: 15000 })
  })

  test('un marcador de jardín no es cámara y una fuente mp4 se reproduce en video', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'maps.media')
    const security = await createSecurityUser(request, scenario.superToken, scenario.condominiumId)
    const mapName = `Mapa ${buildScenarioProfile('maps.media').readableLabel}`

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto('/admin/maps')
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await page.getByRole('button', { name: 'Nuevo mapa' }).click()
    const mapDialog = page.locator('.fixed').filter({ hasText: 'Nuevo mapa' })
    await mapDialog.getByPlaceholder('Nombre').fill(mapName)
    await mapDialog.getByPlaceholder('Referencia (ej. Torre A / Nivel 2)').fill('Jardines')
    await mapDialog.locator('select').nth(1).selectOption('upload')
    await mapDialog.locator('input[type="file"]').setInputFiles({ name: 'plano.png', mimeType: 'image/png', buffer: tinyPng })
    await mapDialog.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByText('Mapa creado')).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Nuevo marcador' }).click()
    const gardenDialog = page.locator('.fixed').filter({ hasText: 'Nuevo marcador' })
    await gardenDialog.getByPlaceholder('Etiqueta').fill('Jardín')
    await gardenDialog.getByPlaceholder('Capa').fill('General')
    await gardenDialog.getByRole('button', { name: 'Guardar marcador' }).click()
    await expect(page.getByText('Jardín', { exact: true })).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: 'Nuevo marcador' }).click()
    const cameraDialog = page.locator('.fixed').filter({ hasText: 'Nuevo marcador' })
    await cameraDialog.getByPlaceholder('Etiqueta').fill('Cámara jardín')
    await cameraDialog.getByPlaceholder('Capa').fill('CCTV')
    await cameraDialog.getByPlaceholder('URL de monitoreo (opcional)').fill('https://example.com/jardin.mp4')
    await cameraDialog.getByRole('button', { name: 'Guardar marcador' }).click()
    await expect(page.getByText('Cámara jardín', { exact: true })).toBeVisible({ timeout: 15000 })

    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await page.goto('/security/cameras')
    await expect(page.getByRole('heading', { name: 'Cámaras' })).toBeVisible()
    await page.locator('select').first().selectOption(scenario.condominiumId)
    await expect(page.getByText('Cámara jardín', { exact: true }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Jardín', { exact: true })).toHaveCount(0)
    await expect(page.locator('video[title="Transmisión en vivo"]')).toBeVisible()
    await expect(page.locator('iframe[title="Transmisión en vivo"]')).toHaveCount(0)
  })
})
