import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginAPI, loginUI, uniqueEmail, unwrapData } from './helpers/auth'
import { createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

async function createSecurity(request: APIRequestContext, superToken: string, condominiumId: string, prefix: string) {
  const profile = buildScenarioProfile(prefix)
  const email = uniqueEmail(prefix)
  const password = 'Pass123.'
  expect((await request.post(`${API_BASE}/auth/staff-users`, {
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
  })).ok()).toBeTruthy()
  const login = await loginAPI(request, email, password)
  return { email, password, token: login.token }
}

async function createVisit(
  request: APIRequestContext,
  resident: { token: string; userId?: string | null },
  scenario: { condominiumId: string; unitId: string },
  visitorName: string,
  arrivalOffsetMs = 3 * 60 * 1000
) {
  const arrival = Date.now() + arrivalOffsetMs
  const response = await request.post(`${API_BASE}/visits`, {
    headers: { Authorization: `Bearer ${resident.token}` },
    data: {
      condominiumId: scenario.condominiumId,
      unitId: scenario.unitId,
      requestedById: resident.userId,
      visitorName,
      type: 0,
      expectedArrival: new Date(arrival).toISOString(),
      expectedDeparture: new Date(arrival + 60 * 60 * 1000).toISOString(),
      visitorCount: 2,
      vehiclePlate: 'QRA-123',
      purpose: 'Comida familiar'
    }
  })
  expect(response.ok()).toBeTruthy()
  return unwrapData<string>(await response.json())
}

async function getAccessCode(request: APIRequestContext, token: string, visitId: string) {
  const response = await request.get(`${API_BASE}/visits/${visitId}/access-pass`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  return unwrapData<{ accessCode: string }>(await response.json()).accessCode
}

const postAccess = (request: APIRequestContext, token: string, action: 'scan' | 'check-in' | 'check-out', code: string) =>
  request.post(`${API_BASE}/visits/access/${action}`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { code }
  })

test.describe('Acceso de visitas con QR', () => {
  test('el residente muestra su pase QR y vigilancia lo escanea para registrar entrada y salida', async ({ request, page }) => {
    test.setTimeout(180000)
    const scenario = await createAdminCondominiumScenario(request, 'qr.access')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'qr.access.resident')
    const security = await createSecurity(request, scenario.superToken, scenario.condominiumId, 'qr.access.security')
    const visitorName = `Visitante QR ${buildScenarioProfile('qr.access.visitor').readableLabel}`
    const visitId = await createVisit(request, resident, scenario, visitorName)

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto(`/resident/visits/${visitId}`)
    const pass = page.getByRole('region', { name: 'Pase de acceso QR' })
    await expect(pass).toBeVisible({ timeout: 15000 })
    await expect(pass.getByTestId('visit-access-code')).toHaveText(/^NRV-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    const qrImage = await pass.getByTestId('visit-access-qr').screenshot()

    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await page.getByRole('link', { name: 'Acceso con QR' }).click()
    await expect(page.getByRole('heading', { name: 'Acceso con QR' })).toBeVisible({ timeout: 15000 })
    await page.getByLabel('Foto del código QR').setInputFiles({ name: 'pase.png', mimeType: 'image/png', buffer: qrImage })

    const result = page.getByRole('region', { name: 'Resultado del pase' })
    await expect(result.getByRole('heading', { name: visitorName })).toBeVisible({ timeout: 15000 })
    await expect(result.getByText('Pase válido')).toBeVisible()
    await expect(result.getByText(/2 persona\(s\) · Placa QRA-123/)).toBeVisible()

    await result.getByRole('button', { name: 'Registrar entrada' }).click()
    await expect(page.getByText('Entrada registrada')).toBeVisible({ timeout: 15000 })
    await expect(result.getByText('En el sitio')).toBeVisible()
    await expect(result.getByRole('button', { name: 'Registrar entrada' })).toHaveCount(0)

    await result.getByRole('button', { name: 'Registrar salida' }).click()
    await expect(page.getByText('Salida registrada')).toBeVisible({ timeout: 15000 })
    await expect(result.getByText('Finalizada')).toBeVisible()
    await expect(result.getByText('El pase ya fue utilizado')).toBeVisible()

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    await expect(page.getByText('Tu visita llegó')).toBeVisible({ timeout: 15000 })
  })

  test('el pase solo sirve en su condominio, dentro de su horario y una sola vez', async ({ request, page }) => {
    test.setTimeout(180000)
    const scenario = await createAdminCondominiumScenario(request, 'qr.rules')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'qr.rules.resident')
    const security = await createSecurity(request, scenario.superToken, scenario.condominiumId, 'qr.rules.security')
    const otherScenario = await createAdminCondominiumScenario(request, 'qr.rules.other')
    const otherSecurity = await createSecurity(request, otherScenario.superToken, otherScenario.condominiumId, 'qr.rules.other.security')

    const visitId = await createVisit(request, resident, scenario, `Visitante reglas ${buildScenarioProfile('qr.rules.today').readableLabel}`)
    const code = await getAccessCode(request, resident.token, visitId)

    expect((await postAccess(request, security.token, 'scan', 'NRV-0000-0000-0000')).status()).toBe(404)
    expect((await postAccess(request, otherSecurity.token, 'scan', code)).status()).toBe(404)
    expect((await postAccess(request, otherSecurity.token, 'check-in', code)).status()).toBe(404)
    expect((await postAccess(request, resident.token, 'scan', code)).status()).toBe(403)

    const compactLowercase = code.replace(/-/g, '').toLowerCase()
    const scan = unwrapData<any>(await (await postAccess(request, security.token, 'scan', compactLowercase)).json())
    expect(scan.visitId).toBe(visitId)
    expect(scan.canCheckIn).toBe(true)

    expect((await postAccess(request, security.token, 'check-out', code)).status()).toBe(400)
    expect((await postAccess(request, security.token, 'check-in', code)).ok()).toBeTruthy()
    const secondEntry = await postAccess(request, security.token, 'check-in', code)
    expect(secondEntry.status()).toBe(400)
    expect((await secondEntry.json()).message).toBe('El visitante ya está dentro del condominio')

    const tomorrowVisitId = await createVisit(request, resident, scenario, 'Visitante de mañana', 26 * 60 * 60 * 1000)
    const tomorrowCode = await getAccessCode(request, resident.token, tomorrowVisitId)
    const early = unwrapData<any>(await (await postAccess(request, security.token, 'scan', tomorrowCode)).json())
    expect(early.canCheckIn).toBe(false)
    expect(early.message).toBe('El pase aún no está vigente')
    expect((await postAccess(request, security.token, 'check-in', tomorrowCode)).status()).toBe(400)

    const cancelledVisitId = await createVisit(request, resident, scenario, 'Visitante cancelado')
    const cancelledCode = await getAccessCode(request, resident.token, cancelledVisitId)
    expect((await request.post(`${API_BASE}/visits/${cancelledVisitId}/cancel`, {
      headers: { Authorization: `Bearer ${resident.token}` }
    })).ok()).toBeTruthy()

    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await page.goto('/security/qr-access')
    await page.getByLabel('Código de acceso').fill(cancelledCode)
    await page.getByRole('button', { name: 'Validar código' }).click()
    const result = page.getByRole('region', { name: 'Resultado del pase' })
    await expect(result.getByText('La visita fue cancelada')).toBeVisible({ timeout: 15000 })
    await expect(result.getByRole('button', { name: 'Registrar entrada' })).toHaveCount(0)

    await page.getByLabel('Código de acceso').fill('NRV-ZZZZ-ZZZZ-ZZZZ')
    await page.getByRole('button', { name: 'Validar código' }).click()
    await expect(page.getByText('Código QR no válido para este condominio')).toBeVisible({ timeout: 15000 })
  })
})
