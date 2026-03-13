import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, unwrapData, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'

async function getUserWithCondominium(request: APIRequestContext, superToken: string): Promise<{ userId: string; condominiumId: string }> {
  const usersResponse = await request.get(`${API_BASE}/auth/users`, {
    headers: { Authorization: `Bearer ${superToken}` }
  })

  expect(usersResponse.ok()).toBeTruthy()
  const users = await usersResponse.json()
  expect(Array.isArray(users)).toBeTruthy()

  for (const user of users) {
    const userId = user?.id as string | undefined
    if (!userId) continue

    const condoResponse = await request.get(`${API_BASE}/condominiums?userId=${userId}`, {
      headers: { Authorization: `Bearer ${superToken}` }
    })
    if (!condoResponse.ok()) continue

    const condoPayload = unwrapData(await condoResponse.json())
    if (Array.isArray(condoPayload) && condoPayload.length > 0) {
      return { userId, condominiumId: condoPayload[0].id as string }
    }
  }

  throw new Error('No se encontró un usuario con condominios disponibles para la prueba')
}

async function createBuildingAndUnit(request: APIRequestContext, token: string, condominiumId: string): Promise<{ unitId: string }> {
  const profile = buildScenarioProfile('resident-procedure-building')
  const createBuilding = await request.post(`${API_BASE}/buildings`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      condominiumId,
      name: profile.buildingName,
      totalFloors: 4,
      description: 'Edificio para seguimiento de gestiones residenciales',
      startsAtGroundFloor: true
    }
  })

  expect(createBuilding.status()).toBe(201)
  const buildingPayload = unwrapData(await createBuilding.json())
  const buildingId = buildingPayload?.id
  expect(buildingId).toBeTruthy()

  const createUnit = await request.post(`${API_BASE}/units`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      buildingId,
      unitNumber: profile.unitNumber,
      floor: 1,
      area: 82,
      bedrooms: 2,
      bathrooms: 1,
      monthlyMaintenanceFee: 950
    }
  })

  expect(createUnit.status()).toBe(201)
  const unitPayload = unwrapData(await createUnit.json())
  const unitId = unitPayload?.id
  expect(unitId).toBeTruthy()

  return { unitId }
}

async function createResidentAndRegisterUser(
  request: APIRequestContext,
  superToken: string,
  unitId: string,
  prefix: string
): Promise<{ residentId: string; email: string; password: string; userId: string; fullName: string }> {
  const profile = buildScenarioProfile(prefix)
  const email = uniqueEmail(prefix)
  const password = 'Pass123.'
  const firstName = profile.residentFirstName
  const lastName = profile.residentLastName

  const createResident = await request.post(`${API_BASE}/residents`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      unitId,
      firstName,
      lastName,
      email,
      phoneNumber: '5512345678',
      type: 'Tenant'
    }
  })

  expect(createResident.status()).toBe(201)
  const residentPayload = unwrapData(await createResident.json())
  const residentId = residentPayload?.id
  expect(residentId).toBeTruthy()

  const inviteResponse = await request.post(`${API_BASE}/residents/${residentId}/invite`, {
    headers: { Authorization: `Bearer ${superToken}` }
  })
  expect(inviteResponse.ok()).toBeTruthy()

  const invitePayload = unwrapData(await inviteResponse.json())
  const invitationToken = invitePayload?.token
  expect(invitationToken).toBeTruthy()

  const residentRegistration = await registerConfirmedUser(request, {
    email,
    password,
    firstName,
    lastName,
    invitationToken
  })

  const residentLogin = await loginAPI(request, residentRegistration.email, residentRegistration.password)

  return {
    residentId,
    email,
    password,
    userId: residentLogin.userId,
    fullName: `${firstName} ${lastName}`
  }
}

test.describe('Resident procedures workflow', () => {
  test('API: admin can assign procedure and resident can list it', async ({ request }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const linked = await getUserWithCondominium(request, superadmin.token)
    const profile = buildScenarioProfile('resident.procedure.api')

    const { unitId } = await createBuildingAndUnit(request, superadmin.token, linked.condominiumId)
    const resident = await createResidentAndRegisterUser(request, superadmin.token, unitId, 'resident.procedure.api')

    const createProcedure = await request.post(`${API_BASE}/procedures`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: {
        condominiumId: linked.condominiumId,
        residentId: resident.residentId,
        type: 0,
        title: `Actualizacion de contrato de energia ${profile.readableLabel}`,
        description: 'Debes acudir a la compañía para actualizar titular del contrato.',
        requirements: 'INE, contrato de arrendamiento y comprobante de domicilio',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        isMandatory: true
      }
    })

    expect(createProcedure.ok()).toBeTruthy()

    const residentProcedures = await request.get(`${API_BASE}/procedures/resident/${resident.userId}`, {
      headers: { Authorization: `Bearer ${superadmin.token}` }
    })

    expect(residentProcedures.ok()).toBeTruthy()
    const items = unwrapData(await residentProcedures.json()) as any[]
    expect(Array.isArray(items)).toBeTruthy()
    expect(items.some((item) => item.residentId === resident.residentId)).toBeTruthy()
  })

  test('Front: admin assigns procedure and resident marks it completed', async ({ request, page }) => {
    const superadmin = await loginAPI(request, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD)
    const linked = await getUserWithCondominium(request, superadmin.token)
    const adminProfile = buildScenarioProfile('resident.procedure.ui.admin')
    const residentProfile = buildScenarioProfile('resident.procedure.ui.resident')

    const { unitId } = await createBuildingAndUnit(request, superadmin.token, linked.condominiumId)
    const resident = await createResidentAndRegisterUser(request, superadmin.token, unitId, 'resident.procedure.ui')

    await loginUI(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, /\/superadmin(\/|$)/)

    await page.evaluate(({ linkedUserId, condoId }) => {
      const raw = window.localStorage.getItem('auth-storage')
      if (!raw) return
      const parsed = JSON.parse(raw)
      parsed.state = parsed.state || {}
      parsed.state.user = {
        ...(parsed.state.user || {}),
        id: linkedUserId,
        role: 'admin',
        defaultRole: 'Admin',
        condominiumId: condoId
      }
      parsed.state.isAuthenticated = true
      window.localStorage.setItem('auth-storage', JSON.stringify(parsed))
    }, { linkedUserId: linked.userId, condoId: linked.condominiumId })

    await page.goto('/admin/procedures')

    const dueDateInput = page.locator('input[type="datetime-local"]').first()
    const dueValue = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
    const adminDescription = 'Actualiza los datos de servicios basicos conforme al reglamento interno.'

    const condominiumSelect = page.locator('label:has-text("Condominio")').locator('..').locator('select')
    await condominiumSelect.selectOption(linked.condominiumId)

    // Wait for the condominium data load cycle to complete before reading residents.
    const loadingIndicator = page.getByText('Cargando...')
    await loadingIndicator.waitFor({ state: 'hidden', timeout: 30000 }).catch(() => undefined)

    const residentSelect = page.locator('label:has-text("Residente")').locator('..').locator('select')
    await expect.poll(async () => {
      return await residentSelect.evaluate((el) => {
        const select = el as HTMLSelectElement
        return Array.from(select.options).some(o => !!o.value)
      })
    }, { timeout: 45000 }).toBeTruthy()

    const availableResidentOption = await residentSelect.evaluate((el) => {
      const select = el as HTMLSelectElement
      const option = Array.from(select.options).find(o => o.value)
      return option?.value || ''
    })
    expect(availableResidentOption).toBeTruthy()
    await residentSelect.selectOption(availableResidentOption)
    await page.locator('label:has-text("Título")').locator('..').locator('input').fill(`Actualizacion de servicios ${adminProfile.readableLabel}`)
    await page.locator('label:has-text("Descripción")').locator('..').locator('textarea').fill(adminDescription)
    await dueDateInput.fill(dueValue)
    await page.locator('label:has-text("Requisitos")').locator('..').locator('textarea').fill('INE, comprobante de domicilio y formato de administración.')

    await page.getByRole('button', { name: 'Asignar Trámite' }).click()
    await expect(page.getByText(adminDescription).first()).toBeVisible({ timeout: 15000 })

    const residentDescription = 'Entrega la documentacion solicitada en administracion.'
    const createForResident = await request.post(`${API_BASE}/procedures`, {
      headers: { Authorization: `Bearer ${superadmin.token}` },
      data: {
        condominiumId: linked.condominiumId,
        residentId: resident.residentId,
        type: 0,
        title: `Actualizacion documental ${residentProfile.readableLabel}`,
        description: residentDescription,
        requirements: 'INE y comprobante de domicilio',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        isMandatory: true
      }
    })
    expect(createForResident.ok()).toBeTruthy()

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.goto('/resident/procedures')

    await expect(page.getByRole('heading', { name: 'Mis Trámites' })).toBeVisible()

    const pendingCard = page.locator('div', { hasText: residentDescription }).first()
    await expect(pendingCard).toBeVisible({ timeout: 15000 })
    await pendingCard.getByRole('button', { name: 'Marcar completado' }).first().click()

    await expect(page.getByText('Completado').first()).toBeVisible({ timeout: 15000 })
  })
})
