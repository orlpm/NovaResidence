import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, loginUI, registerConfirmedUser, unwrapData, uniqueEmail } from './helpers/auth'
import { createAdminCondominiumScenario, asId } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'

type CountryCatalogItem = {
  id: string
  code?: string
  name: string
}

type StateCatalogItem = {
  id: string
  countryId?: string
  name: string
}

async function getCountries(request: APIRequestContext): Promise<CountryCatalogItem[]> {
  const response = await request.get(`${API_BASE}/catalogs/countries`)
  expect(response.ok()).toBeTruthy()
  return unwrapData<CountryCatalogItem[]>(await response.json())
}

async function getStates(request: APIRequestContext, countryId: string): Promise<StateCatalogItem[]> {
  const response = await request.get(`${API_BASE}/catalogs/states?countryId=${countryId}`)
  expect(response.ok()).toBeTruthy()
  return unwrapData<StateCatalogItem[]>(await response.json())
}

async function getCondominiumDetail(request: APIRequestContext, token: string, condominiumId: string) {
  const response = await request.get(`${API_BASE}/condominiums/${condominiumId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  return unwrapData<any>(await response.json())
}

async function createResident(
  request: APIRequestContext,
  token: string,
  unitId: string,
  prefix: string,
  type: 'Owner' | 'Tenant' | 'FamilyMember' | 'Authorized' = 'Owner'
) {
  const email = uniqueEmail(prefix)
  const profile = buildScenarioProfile(prefix)
  const firstName = profile.residentFirstName
  const lastName = `${type} ${profile.unitNumber}`

  const response = await request.post(`${API_BASE}/residents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      unitId,
      firstName,
      lastName,
      email,
      phoneNumber: '5512345678',
      type
    }
  })

  expect(response.status()).toBe(201)
  const residentId = asId(unwrapData(await response.json()))

  return {
    residentId,
    email,
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`
  }
}

test.describe('Condominium management business rules', () => {
  test('API keeps edit catalogs consistent and rejects mismatched country/state updates', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'condo.mgmt.catalogs')
    const profile = buildScenarioProfile('condo.mgmt.catalogs.update')
    const countries = await getCountries(request)
    const mexico = countries.find(country => country.code === 'MX')
    expect(mexico).toBeTruthy()

    const mexicoStates = await getStates(request, mexico!.id)
    expect(mexicoStates.length).toBeGreaterThan(0)
    const selectedState = mexicoStates[Math.min(1, mexicoStates.length - 1)]

    const differentCountry = countries.find(country => country.id !== mexico!.id)
    expect(differentCountry).toBeTruthy()

    const invalidUpdate = await request.put(`${API_BASE}/condominiums/${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        name: `${profile.condominiumName} catalogo cruzado`,
        description: 'Intento inválido por catálogos cruzados',
        street: 'Av. Catálogos 10',
        city: 'Ciudad de México',
        state: selectedState.name,
        stateId: selectedState.id,
        postalCode: '03100',
        country: differentCountry!.name,
        countryId: differentCountry!.id
      }
    })

    expect(invalidUpdate.status()).toBe(400)
    const invalidPayload = await invalidUpdate.json()
    const invalidMessage = invalidPayload?.message || invalidPayload?.data?.message || JSON.stringify(invalidPayload)
    expect(String(invalidMessage)).toContain('no pertenece al país')

    const updatedName = `${profile.condominiumName} actualizado`
    const updatedStreet = 'Av. Catálogos 123'
    const validUpdate = await request.put(`${API_BASE}/condominiums/${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        name: updatedName,
        description: 'Edición válida con catálogo dependiente',
        street: updatedStreet,
        city: 'Guadalajara',
        state: selectedState.name,
        stateId: selectedState.id,
        postalCode: '44100',
        country: mexico!.name,
        countryId: mexico!.id
      }
    })

    expect(validUpdate.status()).toBe(200)

    const detail = await getCondominiumDetail(request, scenario.adminToken, scenario.condominiumId)
    expect(detail.name).toBe(updatedName)
    expect(detail.address.street).toBe(updatedStreet)
    expect(detail.address.city).toBe('Guadalajara')
    expect(detail.address.country).toBe(mexico!.name)
    expect(detail.address.countryId).toBe(mexico!.id)
    expect(detail.address.state).toBe(selectedState.name)
    expect(detail.address.stateId).toBe(selectedState.id)
  })

  test('API preserves building-unit-resident relationships and resident registration restrictions', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'condo.mgmt.residents')
    const buildingProfile = buildScenarioProfile('condo.mgmt.residents.building')
    const buildingName = `${buildingProfile.buildingName} relacion`

    const createBuildingResponse = await request.post(`${API_BASE}/buildings`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        name: buildingName,
        totalFloors: 2,
        description: 'Edificio para validar relación de negocio',
        startsAtGroundFloor: true
      }
    })

    expect(createBuildingResponse.status()).toBe(201)
    const buildingId = asId(unwrapData(await createBuildingResponse.json()))

    const unitNumber = buildingProfile.unitNumber
    const createUnitResponse = await request.post(`${API_BASE}/units`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        buildingId,
        unitNumber,
        floor: 1,
        area: 88,
        bedrooms: 2,
        bathrooms: 2,
        monthlyMaintenanceFee: 1300
      }
    })

    expect(createUnitResponse.status()).toBe(201)
    const unitId = asId(unwrapData(await createUnitResponse.json()))

    const owner = await createResident(request, scenario.adminToken, unitId, 'condo.mgmt.owner', 'Owner')

    const condominiumResidentsResponse = await request.get(`${API_BASE}/residents/condominium/${scenario.condominiumId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(condominiumResidentsResponse.ok()).toBeTruthy()
    const condominiumResidents = unwrapData<any[]>(await condominiumResidentsResponse.json())
    const residentProjection = condominiumResidents.find(resident => resident.id === owner.residentId)
    expect(residentProjection).toBeTruthy()
    expect(residentProjection.unitId).toBe(unitId)
    expect(residentProjection.unitNumber).toBe(unitNumber)
    expect(residentProjection.buildingName).toBe(buildingName)

    const invitationResponse = await request.post(`${API_BASE}/residents/${owner.residentId}/invite`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(invitationResponse.status()).toBe(200)
    const invitation = unwrapData<{ token: string }>(await invitationResponse.json())
    expect(invitation.token).toBeTruthy()

    const registeredResident = await registerConfirmedUser(request, {
      email: owner.email,
      password: 'Pass123.',
      firstName: owner.firstName,
      lastName: owner.lastName,
      invitationToken: invitation.token
    })

    const residentByUserResponse = await request.get(`${API_BASE}/residents/by-user/${registeredResident.userId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(residentByUserResponse.status()).toBe(200)
    const residentByUser = unwrapData<any>(await residentByUserResponse.json())
    expect(residentByUser.unitId).toBe(unitId)
    expect(residentByUser.unitNumber).toBe(unitNumber)
    expect(residentByUser.buildingName).toBe(buildingName)
    expect(residentByUser.condominiumId).toBe(scenario.condominiumId)

    const reinviteResponse = await request.post(`${API_BASE}/residents/${owner.residentId}/invite`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(reinviteResponse.status()).toBe(400)

    const deleteResidentResponse = await request.delete(`${API_BASE}/residents/${owner.residentId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(deleteResidentResponse.status()).toBe(200)

    const unitResidentsResponse = await request.get(`${API_BASE}/residents/unit/${unitId}`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })
    expect(unitResidentsResponse.status()).toBe(200)
    const unitResidents = unwrapData<any[]>(await unitResidentsResponse.json())
    expect(unitResidents.some(resident => resident.id === owner.residentId)).toBe(false)
  })

  test('UI allows admins to edit condominium data and manage building-unit-resident flows across admin routes', async ({ page, request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'condo.mgmt.ui')
    const expansionProfile = buildScenarioProfile('condo.mgmt.ui.expansion')
    const residentProfile = buildScenarioProfile('condo.mgmt.ui.resident')
    const initialDetail = await getCondominiumDetail(request, scenario.adminToken, scenario.condominiumId)

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)

    await page.goto('/admin/condominiums')
    await expect(page.getByRole('heading', { name: 'Condominios' })).toBeVisible()
    await expect(page.getByText(scenario.condominiumId).first()).toHaveCount(0)
    await expect(page.getByText(initialDetail.description)).toBeVisible({ timeout: 15000 })

    await page.goto(`/admin/condominiums/${scenario.condominiumId}`)
    await expect(page.getByRole('heading', { name: new RegExp(initialDetail.name, 'i') })).toBeVisible()
    await expect(page.getByText('Información General')).toBeVisible()
    await expect(page.getByText('Edificios/Torres')).toBeVisible()
    await expect(page.getByText('Total Unidades')).toBeVisible()

    await page.goto(`/admin/condominiums/${scenario.condominiumId}/edit`)
    await expect(page.getByRole('heading', { name: 'Editar Condominio' })).toBeVisible()

    const editedName = `${initialDetail.name} actualizado`
    await page.locator('input[name="name"]').fill(editedName)
    await page.locator('textarea[name="description"]').fill('Edición UI validada por E2E')
    await page.locator('input[name="street"]').fill('Av. UI 321')
    await page.locator('input[name="city"]').fill('Monterrey')
    await page.locator('select').first().selectOption({ label: 'México' })
    await expect.poll(async () => await page.locator('select').count(), { timeout: 15000 }).toBeGreaterThan(1)
    const stateSelect = page.locator('select').nth(1)
    await expect.poll(async () => await stateSelect.locator('option').count(), { timeout: 15000 }).toBeGreaterThan(1)
    await stateSelect.selectOption({ label: 'Nuevo León' })
    await page.locator('input[name="postalCode"]').fill('64000')
    await page.getByRole('button', { name: 'Guardar Cambios' }).click()

    await page.waitForURL(new RegExp(`/admin/condominiums/${scenario.condominiumId}$`), { timeout: 15000 })
    await expect(page.getByRole('heading', { name: editedName })).toBeVisible()
    await expect(page.getByText(/Av\. UI 321, Monterrey/).first()).toBeVisible()
    await expect(page.getByText(/Monterrey/).first()).toBeVisible()

    await page.goto(`/admin/condominiums/${scenario.condominiumId}/units`)
    await expect(page.getByRole('heading', { name: 'Edificios y Unidades' })).toBeVisible()

    const buildingName = `${expansionProfile.buildingName} ampliacion`
    await page.getByTitle('Agregar Edificio').click()
    const addBuildingModal = page.locator('div.fixed').filter({ hasText: 'Nuevo Edificio' }).first()
    await addBuildingModal.locator('input[placeholder="Ej: Torre A, Edificio Norte"]').fill(buildingName)
    await addBuildingModal.locator('input[type="number"]').first().fill('1')
    await addBuildingModal.getByLabel('Auto-generar unidades').uncheck()
    await addBuildingModal.getByRole('button', { name: 'Crear Edificio' }).click()
    const buildingCard = page.getByRole('heading', { name: buildingName, exact: true })
    await expect(buildingCard).toBeVisible({ timeout: 15000 })

    await buildingCard.click()
    await page.getByRole('button', { name: 'Nueva Unidad' }).click()
    const unitNumber = expansionProfile.unitNumber
    const addUnitModal = page.locator('div.fixed').filter({ hasText: 'Nueva Unidad' }).first()
    await addUnitModal.locator('input[placeholder="Ej: 101, A-201"]').fill(unitNumber)
    await addUnitModal.locator('input[type="number"]').fill('3')
    await addUnitModal.getByRole('button', { name: 'Crear Unidad' }).click()
    await expect(page.getByText(unitNumber)).toBeVisible({ timeout: 15000 })

    await page.goto('/admin/residents')
    await expect(page.getByRole('heading', { name: 'Residentes' })).toBeVisible()
    await page.getByRole('button', { name: 'Nuevo Residente' }).click()

    const residentName = residentProfile.residentFirstName
    const addResidentModal = page.locator('div.fixed').filter({ hasText: 'Nuevo Residente' }).first()
    await expect(addResidentModal.getByRole('heading', { name: 'Nuevo Residente' })).toBeVisible()
    const residentSelects = addResidentModal.locator('select')
    const unitSelect = residentSelects.nth(0)
    await expect.poll(async () => {
      return await unitSelect.locator('option').evaluateAll(options =>
        options.map(option => ({ label: option.textContent?.trim() ?? '', value: option.getAttribute('value') ?? '' }))
      )
    }, { timeout: 15000 }).toContainEqual(expect.objectContaining({ label: expect.stringContaining(unitNumber) }))
    const unitOptionValue = await unitSelect.locator('option').evaluateAll((options, targetUnitNumber) => {
      const match = options.find(option => (option.textContent ?? '').includes(String(targetUnitNumber)))
      return match?.getAttribute('value') ?? null
    }, unitNumber)
    expect(unitOptionValue).toBeTruthy()
    await unitSelect.selectOption(unitOptionValue!)
    await addResidentModal.locator('input[type="text"]').nth(0).fill(residentName)
    await addResidentModal.locator('input[type="text"]').nth(1).fill(residentProfile.residentLastName)
    await addResidentModal.locator('input[type="email"]').fill(uniqueEmail('condo.mgmt.ui.resident'))
    await addResidentModal.locator('input[type="tel"]').fill('5511122233')
    await residentSelects.nth(1).selectOption('Tenant')
    await addResidentModal.getByRole('button', { name: 'Crear Residente' }).click()

    const residentFullName = `${residentName} ${residentProfile.residentLastName}`
    const residentRow = page.locator('tr').filter({ hasText: residentFullName }).first()
    await expect(page.getByText(buildingName)).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(unitNumber)).toBeVisible()
    await expect(page.getByText(residentFullName)).toBeVisible()
    await expect(residentRow.getByText('Inquilino')).toBeVisible()

    await page.goto(`/admin/condominiums/${scenario.condominiumId}/units`)
    await page.getByRole('heading', { name: buildingName, exact: true }).click()
    await page.getByText(unitNumber).click()
    await expect(page.getByRole('heading', { name: `Editar Unidad ${unitNumber}` })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Residentes' })).toBeVisible()
    const residentCard = page.locator('div').filter({ hasText: residentFullName }).first()
    await expect(residentCard).toBeVisible({ timeout: 15000 })
    await expect(residentCard.getByText('Inquilino')).toBeVisible()
  })

  test('crear un edificio genera las unidades cuando la opción viene activa', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'condo.autounits')
    const buildingName = `Torre ${buildScenarioProfile('condo.autounits').readableLabel}`

    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.goto(`/admin/condominiums/${scenario.condominiumId}/units`)
    await expect(page.getByRole('heading', { name: 'Edificios y Unidades' })).toBeVisible()
    await page.getByRole('button', { name: 'Agregar Edificio' }).click()
    const dialog = page.locator('.fixed').filter({ hasText: 'Nuevo Edificio' })
    await dialog.getByPlaceholder('Ej: Torre A, Edificio Norte').fill(buildingName)
    await expect(dialog.getByLabel('Auto-generar unidades')).toBeChecked()
    await dialog.getByRole('button', { name: 'Crear Edificio (4 unidades)' }).click()

    const buildingCard = page.locator('div').filter({ has: page.getByRole('heading', { name: buildingName }) }).first()
    await expect(buildingCard.getByText('4 unidades')).toBeVisible({ timeout: 15000 })
    await buildingCard.click()
    await expect(page.getByText('101', { exact: true })).toBeVisible()
    await expect(page.getByText('104', { exact: true })).toBeVisible()
  })

  test('el administrador abre Visitas desde su menú', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'admin.visits.door')
    await loginUI(page, scenario.adminEmail, scenario.adminPassword, /\/admin(\/|$)/)
    await page.getByRole('link', { name: 'Visitas' }).first().click()
    await expect(page).toHaveURL(/\/admin\/visits/)
    await expect(page.getByRole('heading', { name: 'Gestión de Visitas' })).toBeVisible()
  })
})