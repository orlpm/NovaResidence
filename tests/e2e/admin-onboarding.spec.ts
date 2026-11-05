import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_BASE, loginAPI, loginUI, registerConfirmedUser, uniqueEmail, unwrapData } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'

type AdminScenario = {
  userId: string
  email: string
  password: string
  token: string
}

async function createAdminScenario(request: APIRequestContext, prefix: string): Promise<AdminScenario> {
  const profile = buildScenarioProfile(prefix)
  const admin = await registerConfirmedUser(request, {
    email: uniqueEmail(prefix),
    firstName: profile.adminFirstName,
    lastName: profile.adminLastName,
    role: 'admin'
  })

  const login = await loginAPI(request, admin.email, admin.password)

  return {
    userId: admin.userId,
    email: admin.email,
    password: admin.password,
    token: login.token
  }
}

async function openOnboarding(page: Page, admin: AdminScenario) {
  await loginUI(page, admin.email, admin.password, /\/admin(\/|$)/)
  await page.goto('/admin/onboarding')
  await expect(page.getByRole('heading', { name: 'Configuración del Condominio' })).toBeVisible()
  await expect(page.getByText('Asistente de Configuración')).toBeVisible()
}

async function completeCondominiumStep(page: Page, condoName: string) {
  await expect(page.getByRole('heading', { name: 'Información del Condominio' })).toBeVisible()

  const inputs = page.locator('form input')
  await inputs.nth(0).fill(condoName)
  await inputs.nth(1).fill('Av. Onboarding 123')
  await inputs.nth(2).fill('Ciudad de Mexico')

  await page.waitForFunction(() => {
    const selects = Array.from(document.querySelectorAll('form select')) as HTMLSelectElement[]
    return selects.length >= 2 && selects[1].options.length > 1
  })

  await page.locator('form select').nth(1).selectOption({ index: 1 })
  await inputs.nth(3).fill('03100')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Tipo de Edificios' })).toBeVisible()
}

async function chooseVerticalBuilding(page: Page) {
  await page.getByRole('heading', { name: 'Vertical' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Configuración de Unidades' })).toBeVisible()
}

async function addBuilding(page: Page, buildingName: string) {
  await page.getByPlaceholder('Ej: Torre A, Edificio Norte, Manzana 1').fill(buildingName)

  const numberInputs = page.locator('input[type="number"]')
  await numberInputs.nth(0).fill('4')
  await numberInputs.nth(1).fill('2')

  await page.getByRole('button', { name: 'Agregar Edificio' }).click()
  await expect(page.getByText(buildingName)).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Invitar Residentes' })).toBeVisible()
}

async function getAdminCondominiums(request: APIRequestContext, admin: AdminScenario) {
  const response = await request.get(`${API_BASE}/condominiums?userId=${admin.userId}`, {
    headers: { Authorization: `Bearer ${admin.token}` }
  })
  expect(response.ok()).toBeTruthy()
  const payload = await response.json()
  return payload?.data ?? []
}

test.describe('Administrative onboarding flow', () => {
  test('blocks required fields and mandatory steps until the setup is complete', async ({ page, request }) => {
    const admin = await createAdminScenario(request, 'admin.onboarding.required')
    const profile = buildScenarioProfile('admin.onboarding.required.condo')

    await openOnboarding(page, admin)

    await page.getByRole('button', { name: 'Continuar' }).click()
    await expect(page.getByText('Nombre del condominio requerido')).toBeVisible()
    await expect(page.getByText('Dirección requerida')).toBeVisible()
    await expect(page.getByText('Ciudad requerida')).toBeVisible()
    await expect(page.getByText('Código postal requerido')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Información del Condominio' })).toBeVisible()

    await completeCondominiumStep(page, profile.condominiumName)

    const continueStep2 = page.getByRole('button', { name: 'Continuar' })
    await expect(continueStep2).toBeDisabled()

    await page.getByRole('heading', { name: 'Vertical' }).click()
    await expect(continueStep2).toBeEnabled()
    await continueStep2.click()
    await expect(page.getByRole('heading', { name: 'Configuración de Unidades' })).toBeVisible()

    const continueStep3 = page.getByRole('button', { name: 'Continuar' })
    await expect(continueStep3).toBeDisabled()
  })

  test('persists wizard progress and resumes the saved step after reload', async ({ page, request }) => {
    const admin = await createAdminScenario(request, 'admin.onboarding.resume')
    const condoName = buildScenarioProfile('admin.onboarding.resume.condo').condominiumName

    await openOnboarding(page, admin)
    await completeCondominiumStep(page, condoName)

    const savedState = await page.evaluate(() => JSON.parse(localStorage.getItem('onboarding_wizard_state') || 'null'))
    expect(savedState?.currentStep).toBe(2)
    expect(savedState?.data?.condominium?.name).toBe(condoName)

    await page.goto('/admin/dashboard')
    await page.goto('/admin/onboarding')
    await expect(page.getByRole('heading', { name: 'Tipo de Edificios' })).toBeVisible()
    await expect(page.getByText('Paso 2 de 4')).toBeVisible()

    await page.getByRole('button', { name: 'Atrás' }).click()
    await expect(page.getByRole('heading', { name: 'Información del Condominio' })).toBeVisible()
    await expect(page.locator('form input').nth(0)).toHaveValue(condoName)
    await expect(page.locator('form input').nth(1)).toHaveValue('Av. Onboarding 123')
  })

  test('completes the initial setup and creates the condominium for the admin', async ({ page, request }) => {
    const admin = await createAdminScenario(request, 'admin.onboarding.complete')
    const profile = buildScenarioProfile('admin.onboarding.complete.condo')
    const condoName = profile.condominiumName
    const buildingName = profile.buildingName

    await openOnboarding(page, admin)
    await completeCondominiumStep(page, condoName)
    await chooseVerticalBuilding(page)
    await addBuilding(page, buildingName)

    await page.getByRole('button', { name: 'Finalizar Configuración' }).click()
    await page.waitForURL(/\/admin\/dashboard$/, { timeout: 15000 })

    const condos = await getAdminCondominiums(request, admin)
    expect(condos.some((item: any) => item.name === condoName)).toBeTruthy()

    const savedData = await page.evaluate(() => JSON.parse(localStorage.getItem('onboarding_wizard_data') || 'null'))
    expect(savedData?.condominium?.name).toBe(condoName)
    expect(savedData?.buildings?.length).toBe(1)
    expect(savedData?.invitationMethod).toBe('link')
  })

  test('el asistente muestra las unidades generadas e invita al residente de esa unidad', async ({ page, request }) => {
    test.setTimeout(120000)
    const admin = await createAdminScenario(request, 'admin.onboarding.invite')
    const residentEmail = uniqueEmail('onboarding.resident')
    const condoName = 'Condominio Invitados'
    const buildingName = 'Torre Invitados'

    await openOnboarding(page, admin)
    await completeCondominiumStep(page, condoName)
    await chooseVerticalBuilding(page)
    await page.getByPlaceholder('Ej: Torre A, Edificio Norte, Manzana 1').fill(buildingName)
    await page.locator('input[type="number"]').nth(0).fill('2')
    await page.locator('input[type="number"]').nth(1).fill('1')
    await page.getByRole('button', { name: 'Agregar Edificio' }).click()
    await expect(page.getByRole('button', { name: '101' })).toBeVisible()
    await page.getByRole('button', { name: 'Continuar' }).click()

    await expect(page.getByRole('heading', { name: 'Invitar Residentes' })).toBeVisible()
    await page.getByRole('heading', { name: 'Invitación Manual' }).click()
    await page.getByRole('button', { name: 'Agregar Residente' }).click()
    await page.getByPlaceholder('Juan').fill('Elena')
    await page.getByPlaceholder('Pérez').fill('Rivas')
    await page.getByPlaceholder('residente@email.com').fill(residentEmail)
    await page.locator('select').last().selectOption({ label: `${buildingName} - Unidad 101` })
    await page.getByRole('button', { name: 'Agregar Residente' }).click()
    await expect(page.getByText(residentEmail)).toBeVisible()
    await page.getByRole('button', { name: 'Finalizar Configuración' }).click()
    await page.waitForURL(/\/admin\/dashboard/, { timeout: 20000 })

    const condominiums = await getAdminCondominiums(request, admin)
    const created = condominiums.find((item: { name?: string; id?: string }) => item.name === condoName)
    expect(created?.id).toBeTruthy()

    const detailResponse = await request.get(`${API_BASE}/condominiums/${created.id}`, {
      headers: { Authorization: `Bearer ${admin.token}` }
    })
    expect(detailResponse.ok()).toBeTruthy()
    const detail = unwrapData<{ buildings?: Array<{ units?: Array<{ unitNumber?: string }> }> }>(await detailResponse.json())
    const unitNumbers = (detail.buildings ?? []).flatMap(building => building.units ?? []).map(unit => unit.unitNumber)
    expect(unitNumbers).toContain('101')

    const residentsResponse = await request.get(`${API_BASE}/residents/condominium/${created.id}`, {
      headers: { Authorization: `Bearer ${admin.token}` }
    })
    expect(residentsResponse.ok()).toBeTruthy()
    const residents = unwrapData<Array<{ email?: string }>>(await residentsResponse.json())
    expect(residents.some(resident => resident.email === residentEmail)).toBeTruthy()
  })
})