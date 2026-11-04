import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, registerConfirmedUser, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario as createSharedAdminCondominiumScenario } from './helpers/condominium'
import { expireResidentInvitation, waitForUserIdByEmail } from './helpers/sql'

type AdminCondominiumScenario = {
  superToken: string
  condominiumId: string
  unitId: string
  unitNumber: string
}

type InvitationScenario = {
  residentId: string
  email: string
  firstName: string
  lastName: string
  phoneNumber: string
  token: string
  invitationUrl: string
}

async function createAdminCondominiumScenario(request: APIRequestContext): Promise<AdminCondominiumScenario> {
  const scenario = await createSharedAdminCondominiumScenario(request, 'resident.invitation.public')

  const condominiumDetail = await request.get(`${API_BASE}/condominiums/${scenario.condominiumId}`, {
    headers: { Authorization: `Bearer ${scenario.superToken}` }
  })
  expect(condominiumDetail.ok()).toBeTruthy()
  const detailPayload = await condominiumDetail.json()
  const unitNumber = detailPayload?.data?.buildings?.[0]?.units?.[0]?.unitNumber || detailPayload?.buildings?.[0]?.units?.[0]?.unitNumber
  expect(unitNumber).toBeTruthy()

  return {
    superToken: scenario.superToken,
    condominiumId: scenario.condominiumId,
    unitId: scenario.unitId,
    unitNumber
  }
}

async function createResidentInvitation(
  request: APIRequestContext,
  superToken: string,
  unitId: string,
  prefix: string
): Promise<InvitationScenario> {
  const profile = buildScenarioProfile(prefix)
  const email = uniqueEmail(prefix)
  const firstName = profile.residentFirstName
  const lastName = profile.residentLastName
  const phoneNumber = '5512345678'

  const createResident = await request.post(`${API_BASE}/residents`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      unitId,
      firstName,
      lastName,
      email,
      phoneNumber,
      type: 'Tenant'
    }
  })

  expect(createResident.status()).toBe(201)
  const residentPayload = await createResident.json()
  const residentId = residentPayload?.data?.id || residentPayload?.id
  expect(residentId).toBeTruthy()

  const inviteResponse = await request.post(`${API_BASE}/residents/${residentId}/invite`, {
    headers: { Authorization: `Bearer ${superToken}` }
  })

  expect(inviteResponse.ok()).toBeTruthy()
  const invitePayload = await inviteResponse.json()
  const token = invitePayload?.data?.token || invitePayload?.token
  const invitationUrl = invitePayload?.data?.invitationUrl || invitePayload?.invitationUrl

  expect(token).toBeTruthy()
  expect(invitationUrl).toContain(`/invitation/register/${unitId}/${token}`)

  return {
    residentId,
    email,
    firstName,
    lastName,
    phoneNumber,
    token,
    invitationUrl
  }
}

test.describe('Resident invitation public registration', () => {
  test('public invitation screen preloads resident data, completes signup, and blocks token reuse', async ({ page, request }) => {
    const scenario = await createAdminCondominiumScenario(request)
    const invitation = await createResidentInvitation(request, scenario.superToken, scenario.unitId, 'resident.invite.public')
    const publicPath = `/invitation/register/${scenario.unitId}/${invitation.token}`

    await page.goto(publicPath)
    await expect(page.getByRole('heading', { name: 'Registro de Residente' })).toBeVisible()
    await expect(page.getByText(`Unidad: ${scenario.unitNumber}`)).toBeVisible()
    await expect(page.getByText('Tipo: Inquilino')).toBeVisible()
    await expect(page.locator('#firstName')).toHaveValue(invitation.firstName)
    await expect(page.locator('#lastName')).toHaveValue(invitation.lastName)
    await expect(page.locator('#email')).toHaveValue(invitation.email)
    await expect(page.locator('#email')).toBeDisabled()

    await page.locator('#phoneNumber').fill('5599990000')
    await page.locator('#password').fill('Pass123.')
    await page.locator('#confirmPassword').fill('Pass123.')

    const registerResponsePromise = page.waitForResponse((response) =>
      response.url().includes('/api/auth/register') && response.request().method() === 'POST'
    )

    await page.getByRole('button', { name: 'Crear Cuenta' }).click()
    const registerResponse = await registerResponsePromise
    expect(registerResponse.status()).toBe(200)

    const createdUserId = await waitForUserIdByEmail(invitation.email)
    expect(createdUserId).toBeTruthy()
    await page.waitForURL(/\/auth\/login$/, { timeout: 15000 })

    await page.goto(publicPath)
    await expect(page.getByRole('heading', { name: 'Invitación no disponible' })).toBeVisible()
    await expect(page.getByText('Esta invitación ya fue utilizada')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a iniciar sesión' })).toBeVisible()
  })

  test('expired resident invitation shows a stable public error state', async ({ page, request }) => {
    const scenario = await createAdminCondominiumScenario(request)
    const invitation = await createResidentInvitation(request, scenario.superToken, scenario.unitId, 'resident.invite.expired')

    await expireResidentInvitation(invitation.token)

    await page.goto(`/invitation/register/${scenario.unitId}/${invitation.token}`)
    await expect(page.getByRole('heading', { name: 'Invitación no disponible' })).toBeVisible()
    await expect(page.getByText('Token de invitación expirado')).toBeVisible()
    await expect(page.getByText('Solicita a la administración un nuevo enlace de invitación')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir a iniciar sesión' })).toBeVisible()
  })
})
