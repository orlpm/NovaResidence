import { test, expect, type APIRequestContext } from '@playwright/test'
import { API_BASE, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, loginAPI, loginUI, registerConfirmedUser, unwrapData, uniqueEmail } from './helpers/auth'
import { buildScenarioProfile } from './helpers/demo-data'
import { createAdminCondominiumScenario } from './helpers/condominium'

function plusHoursISO(hours: number): string {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
}

async function createResidentAndRegisterUser(
  request: APIRequestContext,
  superToken: string,
  unitId: string,
  prefix: string
): Promise<{ email: string; password: string; userId: string; residentId: string }> {
  const profile = buildScenarioProfile(prefix)
  const email = uniqueEmail(prefix)
  const password = 'Pass123.'

  const createResident = await request.post(`${API_BASE}/residents`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      unitId,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      email,
      phoneNumber: '5512345678',
      type: 'Owner'
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

  await registerConfirmedUser(request, {
    email,
    password,
    firstName: profile.residentFirstName,
    lastName: profile.residentLastName,
    invitationToken
  })

  const loginResult = await loginAPI(request, email, password)
  return { email, password, userId: loginResult.userId, residentId }
}

async function getResidentInfoByUser(request: APIRequestContext, token: string, userId: string): Promise<{ condominiumId: string; unitId: string }> {
  const response = await request.get(`${API_BASE}/residents/by-user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  expect(response.ok()).toBeTruthy()
  const data = unwrapData(await response.json())
  expect(data?.condominiumId).toBeTruthy()
  expect(data?.unitId).toBeTruthy()

  return {
    condominiumId: data.condominiumId as string,
    unitId: data.unitId as string
  }
}

test.describe('Resident visits + communications', () => {
  test('API: pending visit can be updated', async ({ request }) => {
    const scenario = await createAdminCondominiumScenario(request, 'resident.visit.api')
    const visitorProfile = buildScenarioProfile('resident.visit.api.visitor')

    const createVisit = await request.post(`${API_BASE}/visits`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        unitId: scenario.unitId,
        requestedById: scenario.adminUserId,
        visitorName: `${visitorProfile.residentFirstName} ${visitorProfile.residentLastName}`,
        type: 0,
        expectedArrival: plusHoursISO(6),
        expectedDeparture: plusHoursISO(8),
        visitorPhone: '5511122233',
        visitorCount: 1,
        purpose: 'Visita programada para entrega de documentos'
      }
    })

    expect(createVisit.status()).toBe(200)
    const visitId = unwrapData(await createVisit.json()) as string
    expect(visitId).toBeTruthy()

    const updatedVisitorName = 'Mariana Ortega'
    const updateVisit = await request.put(`${API_BASE}/visits/${visitId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        visitorName: updatedVisitorName,
        type: 2,
        expectedArrival: plusHoursISO(7),
        expectedDeparture: plusHoursISO(9),
        visitorIdentification: 'INE-MO-2026',
        visitorPhone: '5599988877',
        visitorEmail: 'mariana.ortega@demo.test',
        visitorCount: 2,
        vehiclePlate: 'MRA-210',
        vehicleDescription: 'Sedán azul',
        purpose: 'Entrega de documentos actualizada',
        notes: 'La visita fue reprogramada por el residente.'
      }
    })

    expect(updateVisit.status()).toBe(200)

    const getVisit = await request.get(`${API_BASE}/visits/${visitId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })
    expect(getVisit.ok()).toBeTruthy()
    const visitDetail = unwrapData(await getVisit.json())
    expect(visitDetail.visitorName).toBe(updatedVisitorName)
    expect(visitDetail.visitorCount).toBe(2)
    expect(visitDetail.purpose).toBe('Entrega de documentos actualizada')
  })

  test('Front+API: resident can edit pending visit and opening forum post increments views', async ({ request, page }) => {
    const scenario = await createAdminCondominiumScenario(request, 'resident.visit.forum')
    const visitorProfile = buildScenarioProfile('resident.visit.forum.visitor')

    const resident = await createResidentAndRegisterUser(request, scenario.superToken, scenario.unitId, 'resident.visits.forum')
    const residentAuth = await loginAPI(request, resident.email, resident.password)
    const residentInfo = await getResidentInfoByUser(request, residentAuth.token, residentAuth.userId)

    const originalVisitorName = `${visitorProfile.residentFirstName} ${visitorProfile.residentLastName}`
    const createVisit = await request.post(`${API_BASE}/visits`, {
      headers: { Authorization: `Bearer ${residentAuth.token}` },
      data: {
        condominiumId: residentInfo.condominiumId,
        unitId: residentInfo.unitId,
        requestedById: residentAuth.userId,
        visitorName: originalVisitorName,
        type: 0,
        expectedArrival: plusHoursISO(6),
        expectedDeparture: plusHoursISO(7),
        visitorPhone: '5512340000',
        visitorCount: 1,
        purpose: 'Acceso de invitado para reunion vecinal'
      }
    })

    expect(createVisit.status()).toBe(200)
    const visitId = unwrapData(await createVisit.json()) as string

    const forumTitle = 'Foro sobre mantenimiento de areas comunes'
    const createForumPost = await request.post(`${API_BASE}/communications/forum`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        authorId: scenario.adminUserId,
        authorUnitId: null,
        authorName: 'Administracion general',
        title: forumTitle,
        content: 'Contenido para validar el incremento de vistas al abrir una publicacion.',
        category: 0,
        allowComments: true
      }
    })
    expect(createForumPost.ok()).toBeTruthy()
    const forumPostId = unwrapData(await createForumPost.json()) as string

    const beforeForumResponse = await request.get(`${API_BASE}/communications/forum/${forumPostId}`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` }
    })
    expect(beforeForumResponse.ok()).toBeTruthy()
    const beforeForum = await beforeForumResponse.json()
    const beforeViewCount = (beforeForum?.viewCount ?? beforeForum?.ViewCount ?? 0) as number

    await loginUI(page, resident.email, resident.password)
    await page.goto('/resident/visits')

    const visitCard = page.locator('div', { hasText: originalVisitorName }).first()
    await expect(visitCard).toBeVisible({ timeout: 15000 })
    await visitCard.getByRole('button', { name: 'Editar' }).click()

    await expect(page).toHaveURL(new RegExp(`/resident/visits/${visitId}/edit`))

    const updatedVisitorName = 'Gabriela Salas'
    const visitorNameInput = page
      .locator('label', { hasText: 'Nombre del Visitante *' })
      .locator('xpath=following-sibling::input[1]')

    await visitorNameInput.fill(updatedVisitorName)
    await expect(visitorNameInput).toHaveValue(updatedVisitorName)
    await page.getByRole('button', { name: 'Guardar Cambios' }).click()

    await expect(page).toHaveURL(new RegExp(`/resident/visits/${visitId}$`), { timeout: 15000 })
    await expect
      .poll(async () => {
        const response = await request.get(`${API_BASE}/visits/${visitId}`, {
          headers: { Authorization: `Bearer ${residentAuth.token}` }
        })
        const payload = unwrapData(await response.json())
        return payload?.visitorName
      }, { timeout: 15000 })
      .toBe(updatedVisitorName)

    await page.goto(`/resident/visits/${visitId}`)
    await expect(page.getByText(updatedVisitorName).first()).toBeVisible({ timeout: 15000 })

    await page.goto('/resident/communications')
    await page.getByRole('button', { name: 'Foro' }).click()
    await expect(page.getByText(forumTitle)).toBeVisible({ timeout: 15000 })
    await page.getByText(forumTitle).click()
    await expect(page.getByRole('heading', { name: forumTitle })).toBeVisible({ timeout: 15000 })

    await expect
      .poll(async () => {
        const response = await request.get(`${API_BASE}/communications/forum/${forumPostId}`, {
          headers: { Authorization: `Bearer ${scenario.superToken}` }
        })
        const payload = await response.json()
        return (payload?.viewCount ?? payload?.ViewCount ?? 0) as number
      }, { timeout: 15000 })
      .toBeGreaterThan(beforeViewCount)
  })
})
