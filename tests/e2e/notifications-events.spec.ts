import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import { API_BASE, loginAPI, loginUI, uniqueEmail, unwrapData } from './helpers/auth'
import { asId, createAdminCondominiumScenario } from './helpers/condominium'
import { buildScenarioProfile } from './helpers/demo-data'
import { createResidentAccount } from './helpers/resident'

function arrivalInsideToday() {
  const now = Date.now()
  const endOfLocalDay = new Date()
  endOfLocalDay.setHours(23, 59, 0, 0)
  const preferred = now + 3 * 60 * 1000
  const arrivalMs = preferred < endOfLocalDay.getTime() ? preferred : now + 20 * 1000
  return {
    arrival: new Date(arrivalMs).toISOString(),
    departure: new Date(arrivalMs + 30 * 60 * 1000).toISOString()
  }
}

async function createStaff(
  request: APIRequestContext,
  superToken: string,
  condominiumId: string,
  prefix: string,
  role: string
) {
  const profile = buildScenarioProfile(prefix)
  const email = uniqueEmail(prefix)
  const password = 'Pass123.'
  const response = await request.post(`${API_BASE}/auth/staff-users`, {
    headers: { Authorization: `Bearer ${superToken}` },
    data: {
      email,
      password,
      firstName: profile.residentFirstName,
      lastName: profile.residentLastName,
      phoneNumber: '5512345678',
      role,
      condominiumId
    }
  })
  expect(response.ok()).toBeTruthy()
  const login = await loginAPI(request, email, password)
  return { email, password, userId: login.userId }
}

async function openBell(page: Page, title: string) {
  await page.getByRole('button', { name: 'Notificaciones' }).click()
  await expect(page.getByText(title)).toBeVisible({ timeout: 15000 })
}

test.describe('Avisos operativos', () => {
  test('visitas, encuestas, asambleas e incidencias avisan a quien corresponde', async ({ request, page }) => {
    test.setTimeout(120000)
    const scenario = await createAdminCondominiumScenario(request, 'notify.ops')
    const resident = await createResidentAccount(request, scenario.superToken, scenario.unitId, 'notify.resident')
    const security = await createStaff(request, scenario.superToken, scenario.condominiumId, 'notify.security', 'SecurityGuard')
    const cleaning = await createStaff(request, scenario.superToken, scenario.condominiumId, 'notify.cleaning', 'Cleaning')
    const profile = buildScenarioProfile('notify.ops')

    const visitWindow = arrivalInsideToday()
    expect((await request.post(`${API_BASE}/visits`, {
      headers: { Authorization: `Bearer ${resident.token}` },
      data: {
        condominiumId: scenario.condominiumId,
        unitId: scenario.unitId,
        requestedById: resident.userId,
        visitorName: `Visitante ${profile.readableLabel}`,
        type: 0,
        expectedArrival: visitWindow.arrival,
        expectedDeparture: visitWindow.departure,
        visitorCount: 1,
        purpose: 'Entrega'
      }
    })).ok()).toBeTruthy()

    const poll = await request.post(`${API_BASE}/communications/polls`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        title: `Encuesta ${profile.readableLabel}`,
        description: 'Aviso de encuesta',
        type: 0,
        startDate: new Date(Date.now() - 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        options: ['Sí', 'No'],
        allowMultipleVotes: false,
        isAnonymous: false,
        requiresQuorum: false
      }
    })
    expect(poll.status()).toBe(201)
    const pollBody = await poll.json()
    const pollId = typeof pollBody === 'string' ? pollBody : asId(unwrapData(pollBody))
    expect((await request.post(`${API_BASE}/communications/polls/${pollId}/publish`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` }
    })).status()).toBe(204)

    const meeting = await request.post(`${API_BASE}/communications/meetings`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        title: `Asamblea ${profile.readableLabel}`,
        description: 'Convocatoria',
        type: 0,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        location: 'Salón',
        requiredQuorumPercentage: 50
      }
    })
    expect(meeting.status()).toBe(201)
    const meetingId = asId(unwrapData(await meeting.json()))
    expect((await request.post(`${API_BASE}/communications/meetings/${meetingId}/invite`, {
      headers: { Authorization: `Bearer ${scenario.adminToken}` },
      data: { unitId: scenario.unitId, residentId: resident.residentId, residentName: 'Residente' }
    })).ok()).toBeTruthy()

    const incident = await request.post(`${API_BASE}/incidents`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: {
        condominiumId: scenario.condominiumId,
        reportedById: scenario.superUserId,
        title: `Fuga ${profile.readableLabel}`,
        description: 'Aviso al personal',
        type: 0,
        priority: 2,
        location: 'Azotea'
      }
    })
    expect(incident.ok()).toBeTruthy()
    const incidentId = asId(await incident.json())
    expect((await request.post(`${API_BASE}/incidents/${incidentId}/assign`, {
      headers: { Authorization: `Bearer ${scenario.superToken}` },
      data: { assigneeId: cleaning.userId }
    })).status()).toBe(204)

    await loginUI(page, security.email, security.password, /\/security(\/|$)/)
    await openBell(page, 'Nueva visita')

    await loginUI(page, resident.email, resident.password, /\/resident(\/|$)/)
    await page.getByRole('button', { name: 'Notificaciones' }).click()
    await expect(page.getByText('Nueva encuesta')).toBeVisible({ timeout: 15000 })
    await expect(page.getByText('Invitación a asamblea')).toBeVisible()

    await loginUI(page, cleaning.email, cleaning.password, /\/cleaning(\/|$)/)
    await openBell(page, 'Incidencia asignada')
  })
})
